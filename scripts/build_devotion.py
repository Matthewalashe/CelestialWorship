"""Build public/data/devotion.json: the Order of Service as worshippers follow it.

Each step of each service is broken into parts, so the screen can show apart
  - what is done (an act) and who does it: service conductor, congregation, shepherd, reader…
  - the words that are said or sung, in full (the Lord's Prayer, Gloria and the Creed are written out)
  - songs, with their number in the hymnal when the words match
  - psalms, with the holy name called before them and the verses
  - instructions for doing it well (shown apart, never in brackets)
Steps the guide runs together (a hymn and a psalm, a prayer "then sermon") become separate steps.

    python -I -X utf8 scripts/build_devotion.py            # writes the file and a review report
Source: data-src/order_of_service_guide.txt (see scripts/devotion_parse.py) and public/data/services.json.
Hand corrections live in OVERRIDES below.
"""
import json
import pathlib
import re
import sys
import unicodedata

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))  # python -I leaves the script's folder out
from devotion_parse import services as guide_services  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'devotion.json'
REPORT = ROOT / 'data-src' / 'devotion_report.md'
HYMNS = json.loads((ROOT / 'public' / 'data' / 'hymns.json').read_text(encoding='utf-8'))
SERVICES = {s['id']: s for s in json.loads((ROOT / 'public' / 'data' / 'services.json').read_text(encoding='utf-8'))}

# ── People ────────────────────────────────────────────────────

WHO = [
    (r'female member|\bwom[ae]n\b', 'female'),
    (r'member not higher in rank|by (?:a|any) member|members? (?:most|highest) (?:senior|in rank)', 'member'),
    (r'service conduct(?:or|er)?', 'conductor'),
    (r'shepherd(?:\s*[–-]\s*in\s*[–-]?\s*charge)?', 'shepherd'),
    (r'congregations?', 'congregation'),
    (r'preacher', 'preacher'),
    (r'incense (?:bearer|carrier|man)', 'incense'),
    (r'choir|choristers?', 'choir'),
    (r'parish secretary', 'secretary'),
    (r'(?:a )?prophet(?:ess)?\b[^.]*?(?:highest|most senior) in rank', 'prophet'),
    (r'female member', 'female'),
    (r'(?:seven )?elders', 'elders'),
    (r'parents?', 'parents'),
    (r'couple|bride(?:groom)?', 'couple'),
    (r'readers?', 'reader'),
    (r'\ball\b', 'all'),
]


def who_of(text):
    t = text.lower()
    for pattern, who in WHO:
        if re.search(pattern, t):
            return who
    return None


# ── Words said in full ────────────────────────────────────────

# From the service guide (the forms Celestians use). Yorùbá: standard church wording — to be checked.
PRAYERS = {
    'lords_prayer': {
        'title': "The Lord's Prayer",
        'en': "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give me this day my daily bread, and forgive me my trespasses, as I forgive those who trespass against me; and lead me not into temptation, but deliver me from evil. For thine is the kingdom, the power and the glory, for ever and ever. Amen.",
        'yo': "Baba wa ti mbẹ li ọrun, ọwọ̀ ni orukọ rẹ. Ki ijọba rẹ de. Ifẹ tirẹ ni ki a ṣe li aiye, bi a ti nṣe li ọrun. Fun mi li onjẹ oọjọ mi loni. Dari gbese mi ji mi, bi mo ti ndari ji awọn ti o jẹ mi ni gbese. Ma si fà mi sinu idẹwò, ṣugbọn gbà mi lọwọ bilisi. Nitori ijọba ni tirẹ, ati agbara, ati ogo, lai ati lailai. Amin.",
    },
    'gloria': {
        'title': 'Gloria',
        'en': "Glory be to the Father, and to the Son, and to the Holy Ghost; as it was in the beginning, is now, and ever shall be, world without end. Amen.",
        'yo': "Ogo ni fun Baba, ati fun Ọmọ, ati fun Ẹmi Mimọ; bi o ti wà li atetekọṣe, bẹ̃ni nisisiyi, bẹ̃ni yio si ri lai ati lailai. Amin.",
    },
    'creed': {
        'title': 'The Creed',
        'en': "I believe in God, the Father Almighty, maker of heaven and earth; and in Jesus Christ his only Son our Lord, who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, dead and buried. He descended into hell; the third day he rose again from the dead; he ascended into heaven, and sitteth at the right hand of God the Father Almighty; from thence he shall come to judge the living and the dead. I believe in the Holy Ghost, the Celestial Church of Christ, the Communion of Saints, the forgiveness of sins, and the life everlasting. Amen.",
        'yo': "Mo gbà Ọlọrun Baba Olodumare gbọ́, Ẹlẹda ọrun on aiye; ati Jesu Kristi Ọmọ bibi rẹ̀ kanṣoṣo, Oluwa wa, ẹniti a lóyun rẹ̀ lati ọdọ Ẹmi Mimọ, ti a bí ninu Maria Wundia, ti o jìya labẹ Pontiu Pilatu, ti a kàn mọ agbelebu, o kú, a si sin i; o sọkalẹ lọ si ipo-oku; ni ijọ kẹta o jinde kuro ninu oku; o gòke re ọrun, o si joko li ọwọ ọtún Ọlọrun Baba Olodumare; lati ibẹ̀ ni yio ti wá ṣe idajọ ãye ati okú. Mo gbà Ẹmi Mimọ gbọ́; Ijọ Mimọ ti Kristi lati Ọrun wá; Idapọ awọn eniyan mimọ; Idariji ẹ̀ṣẹ; ati iye ainipẹkun. Amin.",
    },
    'holy_holy': {
        'title': 'Words of adoration',
        'en': "Holy! Holy! Holy! To the Lord God of Hosts.",
        'yo': "Mimọ! Mimọ! Mimọ! Ni Oluwa Ọlọrun awọn ọmọ-ogun.",
        'repeat': 3,
    },
}

PRAYER_MATCH = [
    (re.compile(r"\blord[’'`]?s?\s+prayer\b|our father who art", re.I), 'lords_prayer'),
    (re.compile(r'^\s*gloria\b|glory (?:be )?to the father', re.I), 'gloria'),
    (re.compile(r'^\s*the\s+creed\b', re.I), 'creed'),
]

# Holy names called before psalms in the guide (each is called three times; the congregation answers "Holy")
NAME_ANY = re.compile(r"\b(Eyiba|Jehovah\s+Ramah|Jehovah\s+Lass|Eli[\s-]?ya(?:h)?|Eli[\s-]?bamah|Eli[\s-]?yabah)\b", re.I)
NAME_RE = re.compile(r"\b(Eyiba|Jehovah\s+Ramah|Jehovah\s+Lass|Eli[\s-]?ya(?:h)?|Eli[\s-]?bamah(?:\s+or\s+Eli[\s-]?yabah)?|Eli[\s-]?yabah|Jehovah\s+Jireh|Jehovah\s+Nissi|Jehovah\s+Shalom|Jehovah|El\s+Shaddai|Elohim|Adonai|Yah\s*rah\s*man)\b(?=[^.\n]{0,12}\[?\s*3\s*c)", re.I)


def tidy_name(n):
    n = re.sub(r'\s+', ' ', n.strip())
    n = re.sub(r'Eli[\s-]?bamah or Eli[\s-]?yabah', 'Eli Bamah or Eli Yabah', n, flags=re.I)
    n = re.sub(r'^Eli[\s-]?yah?$', 'Eli Yah', n, flags=re.I)
    return ' '.join(w if w.lower() == 'or' else w[0].upper() + w[1:].lower() for w in n.split())


# ── Hymn matching ─────────────────────────────────────────────

def squash(text):
    text = unicodedata.normalize('NFD', text)
    return re.sub(r'[^a-z]', '', ''.join(c for c in text if not unicodedata.combining(c)).lower())


def grams(text, n=3):
    s = squash(text)
    return {s[i:i + n] for i in range(len(s) - n + 1)}


HYMN_GRAMS = []
for h in HYMNS:
    first = h['verses'][0] if h['verses'] else {}
    for key in ('english_lines', 'yoruba_lines'):
        lines = first.get(key) or []
        if lines:
            HYMN_GRAMS.append((h['number'], grams(' '.join(lines[:4])), grams(' '.join(lines[:2]))))


def match_hymn(lines):
    """The hymnal number of a song quoted in the order, when its first lines match one closely"""
    best, score = None, 0.0
    for take in (2, 4):
        g = grams(' '.join(lines[:take]))
        if len(g) < 12:
            continue
        for number, hg, hg2 in HYMN_GRAMS:
            other = hg2 if take == 2 else hg
            if not other:
                continue
            s = len(g & other) / len(g | other)
            if s > score:
                best, score = number, s
    return best if score >= 0.42 else None


# ── Reading a step ────────────────────────────────────────────

REPEAT = re.compile(r'\s*(?:\[\s*3\s*c(?:e)?\s*\]|\(\s*3\s*c(?:e)?\s*\)|\bx\s*3\b|\b3ce\b|three times)\s*', re.I)
BRACKET = re.compile(r'\[([^\]]+)\]')
INSTRUCTION_WORDS = re.compile(r'\b(to lead|should|must|is to|are to|will then|allow|nobody|not allowed|important|ensure|before he|wait for|slowly|line by line|can either|may|it is|if there be|NB|note)\b', re.I)


def paragraphs(lines):
    """Prose lines joined; indented lines (song lyrics) and numbered verses kept apart"""
    out = []
    for raw in lines:
        if not raw.strip():
            out.append(('blank', ''))
            continue
        indented = raw.startswith('   ') and not re.match(r'\s+[a-z]\.\s', raw)
        line = raw.strip()
        verse = re.match(r'^(\d{1,3})[.)]\s+(.*)$', line)
        item = re.match(r'^([a-h])[.)]\s+(.*)$', line)
        if verse:
            out.append(('verse', (int(verse.group(1)), verse.group(2))))
        elif item:
            out.append(('item', item.group(2)))
        elif indented:
            out.append(('lyric', line))
        else:
            # Continuation of the previous prose, verse or item
            heading = out and out[-1][0] == 'prose' and len(out[-1][1]) < 60 and HYMN_LINE.match(out[-1][1]) and line[:1].isupper()
            last = next((k for k in range(len(out) - 1, -1, -1) if out[k][0] != 'blank'), None)
            if last is not None and last != len(out) - 1 and out[last][0] == 'prose' and line[:1].islower() and not out[last][1].rstrip().endswith(('.', ':', '!', '?')):
                out[last] = ('prose', out[last][1] + ' ' + line)
                del out[last + 1:]
                continue
            if out and out[-1][0] == 'prose' and not heading and not re.search(r'[:]\s*-?$', out[-1][1]):
                out[-1] = ('prose', out[-1][1] + ' ' + line)
            elif out and out[-1][0] == 'verse' and not line[0].isupper():
                n, t = out[-1][1]
                out[-1] = ('verse', (n, t + ' ' + line))
            elif out and out[-1][0] == 'verse' and not re.match(r'^(Psalm|Gloria|Eyiba|Jehovah|Eli)', line, re.I):
                n, t = out[-1][1]
                out[-1] = ('verse', (n, t + ' ' + line))
            elif out and out[-1][0] == 'item' and not line[0].isupper():
                out[-1] = ('item', out[-1][1] + ' ' + line)
            else:
                out.append(('prose', line))
    return [p for p in out if p[0] != 'blank']


def split_brackets(text):
    """Visible text without brackets, the repeat count, and what the brackets said"""
    repeat = 3 if REPEAT.search(text) else None
    text = REPEAT.sub(' ', text)
    notes = [b.strip() for b in BRACKET.findall(text)]
    text = BRACKET.sub(' ', text)
    return re.sub(r'\s{2,}', ' ', text).strip(' ,;:-–'), repeat, notes


def bracket_blocks(notes):
    """Bracketed asides become their own parts: who does it, "then …", or a quiet note"""
    blocks, who, then = [], None, []
    for n in notes:
        low = n.lower().strip(' .')
        if low in ('amen',):
            continue
        if low in ('male', 'female', 'shepherd', 'service conductor', 'congregation'):
            who = who_of(low) or low
            continue
        m = re.match(r'then\s+(.*)', low)
        if m:
            then.append(m.group(1))
            continue
        if re.match(r'(?:\d\s*)?(?:am|pm)$', low):
            continue
        blocks.append({'kind': 'note', 'text': n[0].upper() + n[1:]})
    return blocks, who, then


def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z])', text) if s.strip()]


HYMN_LINE = re.compile(r'^(?:(processional|recessional|closing|opening)\s+)?hymn\b\s*(\d{1,3})?\s*(?:for\s+([^:–-]+))?\s*[:–-]?\s*(.*)$', re.I)


def hymn_label(rest):
    rest = rest.strip(' :-–')
    return rest[0].upper() + rest[1:] if rest else None


def build_step(lines, slot):
    paras = paragraphs(lines)
    blocks = []
    i = 0
    pending_name = None
    while i < len(paras):
        kind, val = paras[i]

        if kind == 'prose':
            text = val
            # A prayer said in full
            for rx, key in PRAYER_MATCH:
                if rx.search(text) and len(text) < 80:
                    clean, repeat, notes = split_brackets(text)
                    extra, who, then = bracket_blocks(notes)
                    blocks.append({'kind': 'prayer', 'ref': key, **({'who': who} if who else {})})
                    blocks += extra
                    for t in then:
                        blocks.append({'kind': 'then', 'text': t})
                    break
            else:
                # The holy name before a psalm ("Eyiba [3ce]", "Jehovah Ramah [3ce] follows by Psalm 24")
                m = NAME_RE.search(text)
                if m:
                    pending_name = tidy_name(m.group(1))
                if re.search(r'seven\s+hall?el+u(?:i|y)ah', text, re.I):
                    clean, _, notes = split_brackets(text)
                    blocks.append({'kind': 'act', 'who': who_of(clean) or 'congregation', 'text': clean})
                    blocks.append({'kind': 'say', 'text': 'Halleluyah!', 'repeat': 7})
                    i += 1
                    continue
                # Words of adoration
                if re.search(r'holy!?\s*holy!*\s*holy!*\s*to the lord god of hosts', text, re.I):
                    before = re.split(r'holy!?\s*holy', text, flags=re.I)[0]
                    act, _, _ = split_brackets(before.rstrip(': '))
                    if act:
                        blocks.append({'kind': 'act', 'who': who_of(act) or 'congregation', 'text': act})
                    blocks.append({'kind': 'prayer', 'ref': 'holy_holy'})
                    i += 1
                    continue
                hm = HYMN_LINE.match(text)
                lyrics = []
                j = i + 1
                while j < len(paras) and paras[j][0] == 'lyric':
                    lyrics.append(paras[j][1])
                    j += 1
                if lyrics:
                    # A song quoted in the order: "Hymn for lighting the candles:", "while singing:"
                    intro, repeat, notes = split_brackets(text.rstrip(':- '))
                    extra, who, then = bracket_blocks(notes)
                    title = None
                    if hm and (hm.group(4) or '').lower().startswith('and '):
                        title = (hm.group(1) or '').capitalize() + ' hymn' if hm.group(1) else 'Hymn'
                        act = None
                        also = hm.group(4)[4:].strip()
                        extra.append({'kind': 'act', 'who': who_of(also) or 'incense', 'text': also[0].upper() + also[1:]})
                    elif hm:
                        title = hymn_label(hm.group(4)) or (hm.group(3) and 'Hymn for ' + hm.group(3).strip()) or (hm.group(1) and hm.group(1).capitalize() + ' hymn') or 'Hymn'
                        act = None
                    else:
                        act = intro
                    song_lines, rep = [], None
                    for l in lyrics:
                        t, r, _ = split_brackets(l)
                        rep = rep or r
                        song_lines.append(t)
                    number = match_hymn(song_lines)
                    if act:
                        blocks.append({'kind': 'act', 'who': who or who_of(act) or 'congregation', 'text': act})
                    blocks.append({'kind': 'song', 'title': title or song_lines[0], 'lines': song_lines, **({'hymn': number} if number else {}), **({'repeat': rep} if rep else {})})
                    blocks += extra
                    i = j
                    continue
                if hm and not re.search(r'\bpsalm\b', hm.group(4) or '', re.I):
                    # A hymn chosen for this point ("Hymn: Forgiveness of sins", "Hymn 205 [God the King…]")
                    clean, repeat, notes = split_brackets(text)
                    extra, who, then = bracket_blocks(notes)
                    m2 = HYMN_LINE.match(clean)
                    number = int(m2.group(2)) if m2 and m2.group(2) else (slot or {}).get('fixedHymnNumber')
                    label = hymn_label((m2.group(4) if m2 else '') or '') or (m2 and m2.group(1) and m2.group(1).capitalize() + ' hymn')
                    block = {'kind': 'hymn', **({'label': label} if label else {}), **({'number': number} if number else {})}
                    if not number and notes and not (who or then):
                        block['title'] = notes[0]
                        extra = [b for b in extra if b['text'] != notes[0]]
                    blocks.append(block)
                    blocks += extra
                    for t in then:
                        blocks.append({'kind': 'then', 'text': t})
                    i += 1
                    continue
                # Prose: acts and instructions, sentence by sentence
                clean, repeat, notes = split_brackets(text)
                extra, who_b, then = bracket_blocks(notes)
                for s in sentences(clean):
                    if re.match(r'^(NB|N\.B|Note|Important notice)\s*[:.]?', s, re.I):
                        s2 = re.sub(r'^(NB|N\.B|Note|Important notice)\s*[:.]?\s*', '', s, flags=re.I)
                        if s2:
                            blocks.append({'kind': 'note', 'text': s2})
                        continue
                    if re.fullmatch(r'(?:Eyiba|Jehovah[\w ]*|Eli[\w\- ]*)\s*(?:or [\w\- ]+)?\s*(?:Psalms?\s*\d+.*)?', s, re.I):
                        continue  # the name alone: shown with the psalm
                    if re.match(r'^follow(?:s|ed)?\s+by\s+psalm', s, re.I):
                        continue
                    if re.fullmatch(r'Psalm\s+\d+.*', s, re.I):
                        continue
                    if re.fullmatch(r'etc\.?', s.strip(), re.I):
                        continue
                    s = re.sub(r'\s*,?\s*etc\.?\s*$', '', s)
                    two = re.match(r'^(.*?)\s+while\s+(the\s+(?:service conductor|shepherd|congregation|incense \w+)\b.*)$', s, re.I)
                    if two and who_of(two.group(1)) and who_of(two.group(2)) and who_of(two.group(1)) != who_of(two.group(2)):
                        for part in (two.group(1), two.group(2)):
                            blocks.append({'kind': 'act', 'who': who_of(part), 'text': part[0].upper() + part[1:], **({'repeat': repeat} if repeat and who_of(part) == 'conductor' else {})})
                        continue
                    instruction = bool(INSTRUCTION_WORDS.search(s)) or bool(NAME_ANY.search(s)) and bool(re.search(r'psalm|holy', s, re.I))
                    w = who_b or who_of(s)
                    blk = {'kind': 'instruction' if instruction else 'act', 'text': s}
                    if w:
                        blk['who'] = w
                    if repeat and not instruction:
                        blk['repeat'] = repeat
                    blocks.append(blk)
                blocks += extra
                for t in then:
                    blocks.append({'kind': 'then', 'text': t})
            i += 1
            continue

        if kind in ('verse',) or (kind == 'prose' and re.match(r'^psalm\s+\d+', val, re.I)):
            i += 1
            continue

        if kind == 'item':
            items = []
            while i < len(paras) and paras[i][0] == 'item':
                t, _, notes = split_brackets(paras[i][1])
                _, who, _ = bracket_blocks(notes)
                items.append({'text': t, **({'who': who} if who else {})})
                i += 1
            blocks.append({'kind': 'list', 'items': items})
            continue

        if kind == 'lyric':
            # Lyrics without an introduction line
            lyr = []
            while i < len(paras) and paras[i][0] == 'lyric':
                lyr.append(split_brackets(paras[i][1])[0])
                i += 1
            number = match_hymn(lyr)
            blocks.append({'kind': 'song', 'title': lyr[0], 'lines': lyr, **({'hymn': number} if number else {})})
            continue
        i += 1

    # Psalms: "Psalm N" followed by numbered verses. A holy name belongs to the psalm that follows it.
    psalms = []
    current = None
    name = None
    for kind, val in paras:
        if kind == 'prose':
            events = [(m.start(), 'name', tidy_name(m.group(1))) for m in NAME_RE.finditer(val)]
            events += [(m.start(), 'psalm', m) for m in re.finditer(r'\bPsalms?\s*(\d{1,3})(?:\s*:\s*(\d+)\s*[–-]\s*(\d+))?', val, re.I)]
            for _, what, v in sorted(events, key=lambda e: e[0]):
                if what == 'name':
                    name = v
                    continue
                current = {'kind': 'psalm', 'ref': f'Psalm {v.group(1)}', 'chapter': int(v.group(1)), 'verses': []}
                if v.group(2):
                    current['range'] = [int(v.group(2)), int(v.group(3))]
                if name:
                    current['name'] = name
                psalms.append(current)
        elif kind == 'verse' and current is not None:
            current['verses'].append(val[1])
    # The guide often names a psalm in its instruction and again as a heading: keep one, with its verses and name
    seen = {}
    for p in psalms:
        prev = seen.get(p['chapter'])
        if prev is None:
            seen[p['chapter']] = p
            continue
        if p['verses'] and not prev['verses']:
            p.setdefault('name', prev.get('name'))
            seen[p['chapter']] = p
        elif not prev.get('name') and p.get('name'):
            prev['name'] = p['name']
    psalm_blocks = [p if p.get('name') else {k: v for k, v in p.items() if k != 'name'} for p in seen.values()]
    return blocks, psalm_blocks


# ── Steps ─────────────────────────────────────────────────────

def classify(blocks, psalms, lines):
    text = split_brackets(' '.join(lines))[0].lower()
    if any(b['kind'] == 'say' and 'halleluyah' in b['text'].lower() for b in blocks):
        return 'act'
    kinds = {b['kind'] for b in blocks if not (b['kind'] == 'prayer' and b.get('ref') == 'holy_holy')}
    if psalms and any(p['verses'] for p in psalms):
        return 'psalm'
    if 'hymn' in kinds or ('song' in kinds and not any(b['kind'] == 'act' for b in blocks)):
        return 'hymn'
    if re.match(r'^(short |silent |closing |special )?prayer\b', text):
        return 'prayer'
    if re.search(r'\b(collections?|offerings?|tithe)\b', text) and 'psalm' not in kinds:
        return 'offering'
    if re.search(r'\bsermon\b', text):
        return 'sermon'
    if re.search(r'\blesson\b|\bbible reading\b|reading of', text):
        return 'reading'
    if 'prayer' in kinds or re.search(r'\bpray', text):
        return 'prayer'
    if 'song' in kinds:
        return 'song'
    if re.search(r'benediction', text):
        return 'blessing'
    return 'act'


def title_for(kind, blocks, psalms, lines):
    first = re.sub(r'\s+', ' ', ' '.join(lines)).strip()
    first = split_brackets(first)[0]
    if kind == 'psalm':
        return ' · '.join(p['ref'] for p in psalms[:1])
    for b in blocks:
        if b['kind'] == 'prayer' and b['ref'] != 'holy_holy':
            return PRAYERS[b['ref']]['title']
        if b['kind'] == 'hymn':
            return 'Hymn' + (f" — {b['label']}" if b.get('label') else '') if not b.get('number') else f"Hymn {b['number']}" + (f" — {b['label']}" if b.get('label') else '')
        if b['kind'] == 'song':
            return b['title'] if not b.get('hymn') else f"{b['title']} (Hymn {b['hymn']})"
    acts = [b for b in blocks if b['kind'] == 'act']
    if acts:
        first = acts[0]['text']
    m = re.match(r'^([^.:\[]{3,70})', first)
    t = (m.group(1) if m else first[:70]).strip(' ,;-–')
    # "Ringing of the bell three times by the service conductor" → "Ringing of the bell"
    t = re.sub(r'\s+by (?:the |a |an )?(?:service conductor|shepherd(?:\s*[–-]\s*in\s*[–-]?\s*charge)?|preacher|parish secretary|incense \w+|congregation|member[^,.]*|female member[^,.]*)', '', t, flags=re.I)
    t = re.split(r'\s+(?:while|three times|seven times|x3|to the four corners)\b', t, maxsplit=1)[0]
    return t[0].upper() + t[1:] if t else t


SPLIT_THEN = {'gloria': 'gloria', 'sermon': 'sermon'}


def expand(step_blocks, psalms, lines, slot, refs):
    """One guide step → one or more devotion steps (a hymn followed by a psalm, "… then Gloria")"""
    steps = []
    hymn_blocks = [b for b in step_blocks if b['kind'] in ('hymn',)]
    psalm_verses = [p for p in psalms if p['verses']]
    if hymn_blocks and psalms and not psalm_verses:
        # "Hymn: Forgiveness of sins. The service conductor can either read Psalm 118, Psalm 136 or Psalm 27"
        rest = [b for b in step_blocks if b['kind'] != 'hymn']
        steps.append({'kind': 'hymn', 'blocks': hymn_blocks, 'hymnSlot': slot})
        choices = [p['ref'] for p in psalms]
        steps.append({'kind': 'psalm', 'blocks': rest + [{'kind': 'psalm_choice', 'refs': choices}], 'scripture': [{'book': 'Psalms', 'chapter': p['chapter']} for p in psalms]})
        return steps
    main, thens = [], []
    for b in step_blocks:
        (thens if b['kind'] == 'then' else main).append(b)
    kind = classify(main, psalms, lines)
    step = {'kind': kind, 'blocks': main + psalms}
    if slot:
        step['hymnSlot'] = slot
    if refs:
        step['scripture'] = refs
    steps.append(step)
    for t in thens:
        key = t['text'].strip(' .').lower()
        if key == 'gloria':
            steps.append({'kind': 'prayer', 'title': 'Gloria', 'blocks': [{'kind': 'prayer', 'ref': 'gloria'}]})
        elif key == 'sermon':
            steps.append({'kind': 'sermon', 'title': 'Sermon', 'blocks': [{'kind': 'act', 'who': 'preacher', 'text': 'The preacher gives the sermon'}]})
        else:
            label = t['text'][0].upper() + t['text'][1:]
            steps.append({'kind': 'act', 'title': label, 'blocks': [{'kind': 'act', 'text': label}]})
    return steps


def json_slots(sid):
    """Hymn slots and Bible references from services.json, by the guide's step text"""
    svc = SERVICES.get(sid)
    out = []
    if not svc:
        return out
    for st in svc['steps']:
        if st.get('isHeader'):
            continue
        refs = [{'book': r.get('book'), 'chapter': r.get('chapter'), **({'verseStart': r['verse_start']} if r.get('verse_start') else {}), **({'verseEnd': r['verse_end']} if r.get('verse_end') else {})}
                for r in st.get('scripture_references') or [] if r.get('book')]
        out.append({'text': squash(st['text'])[:60], 'slot': st.get('hymnSlot'), 'refs': refs})
    return out


def find_slot(slots, lines):
    key = squash(' '.join(lines))[:60]
    if len(key) < 4:
        return None, []
    best, score = None, 0
    for s in slots:
        a, b = grams(key), grams(s['text'])
        if not a or not b:
            continue
        sc = len(a & b) / len(a | b)
        if sc > score:
            best, score = s, sc
    if best and score >= 0.5:
        return best['slot'], best['refs']
    return None, []


def intro_blocks(lines):
    """Before the first step: materials, preparation, notices — instructions, not acts"""
    text = [l for l in lines if l.strip()]
    if not text:
        return []
    # The first line(s) are the heading
    body = []
    for l in text[1:]:
        if re.fullmatch(r'\s*(Service|Order of Service)\s*:?\s*', l, re.I):
            continue
        body.append(l)
    blocks = []
    for kind, val in paragraphs(body):
        if kind in ('prose', 'lyric'):
            t, _, notes = split_brackets(val)
            if t:
                blocks.append({'kind': 'note', 'text': t})
        elif kind in ('item', 'verse'):
            t = val if isinstance(val, str) else val[1]
            blocks.append({'kind': 'note', 'text': '• ' + t})
    return blocks


KIND_HEADING = {'prayer': 'Prayer', 'act': 'Act of worship', 'blessing': 'Benediction', 'sermon': 'Sermon', 'reading': 'Bible lesson',
                'song': 'Song', 'offering': 'Offering', 'hymn': 'Hymn', 'psalm': 'Psalm'}
WHO_WORDS = r"(?:the |a |an )?(?:entire )?(?:service conduct(?:or|er)|congregations?|shepherd(?:\s*[–-]\s*in\s*[–-]?\s*charge)?|preacher|parish secretary|incense (?:bearer|carrier|man)|choir|members?|female member[^,.]*?|all)"


SINGLE = r"(?:the )?(?:service conduct(?:or|er)|shepherd(?:\s*[–-]\s*in\s*[–-]?\s*charge)?|preacher|parish secretary|incense (?:bearer|carrier|man))"


def tidy_act(text, who):
    """"The service conductor will render a prayer for …" → "Render a prayer for …" (who is shown beside it)"""
    lead = re.match(r'^' + WHO_WORDS + r'\s+(?:will|shall|should|to|must)?\s*', text, flags=re.I)
    t = text[lead.end():] if lead and who_of(lead.group(0)) == who else text
    t = re.sub(r'\s+by ' + SINGLE + r'(?=[\s.,;]|$)', '', t, flags=re.I) if who in ('conductor', 'shepherd', 'preacher', 'secretary', 'incense') else t
    t = t.strip(' .,;')
    if not t or len(t) < 4:
        return text
    return t[0].upper() + t[1:] + ('.' if not t.endswith(('.', '!', '?', ':')) and len(t) > 40 else '')


PHRASES = [
    (r'^(?:the congregation )?while bowing down their heads? recites? these words of adoration:?$', 'Bow your heads and say these words of adoration'),
    (r'^kneels?,? while singing:?$', 'Kneel and sing'),
    (r'^kneels? down$', 'Kneel down'),
    (r'^(?:ring(?:ing)?|jingling) (?:of )?the bell.*$', 'Ring the bell three times'),
    (r'^chant seven hall?el+u(?:i|y)ah facing the altar$', 'Facing the altar, say Halleluyah seven times'),
    (r'^seven hall?el+u(?:i|y)ah to the four corners of the world\.?$', 'Turn to the four corners of the world and say Halleluyah seven times'),
]


def tidy_step(st):
    for b in st['blocks']:
        if b['kind'] == 'act' and b.get('who') and b['who'] not in ('all',):
            b['text'] = tidy_act(b['text'], b['who'])
        if b['kind'] == 'act':
            for rx, plain in PHRASES:
                if re.match(rx, b['text'].strip().rstrip('.'), re.I):
                    b['text'] = plain
                    b.pop('repeat', None)  # the words say how many times
                    break
    # Names and prayer openings already shown elsewhere in the step
    names = {pb.get('name', '').lower() for pb in st['blocks'] if pb['kind'] == 'psalm'}
    st['blocks'] = [b for b in st['blocks'] if not (b['kind'] == 'note' and (
        tidy_name(b['text']).lower() in names or NAME_ANY.fullmatch(b['text'].strip()) or re.match(r'^our father', b['text'], re.I) or b['text'].strip().lower() in ('etc', 'etc.')))]
    title = st.get('title') or ''
    acts = [b for b in st['blocks'] if b['kind'] == 'act']
    words = lambda x: re.sub(r'[^a-z ]', '', x.lower()).split()
    # A heading that only repeats the first act: use the kind of step instead
    if not title or (acts and len(set(words(title)) - set(words(acts[0]['text']) + ['the', 'by', 'service', 'conductor'])) <= 1 and st['kind'] not in ('psalm',)):
        named = re.match(r"^(The Lord's Prayer|The Creed|Gloria|Hymn\b.*|Psalm \d+|Seven Halleluiah|Collections?|Thanks offering|Announcement|Benediction)", title)
        st['title'] = named.group(1) if named else KIND_HEADING.get(st['kind'], 'Act of worship')
    if len(st['title']) > 48:
        st['title'] = KIND_HEADING.get(st['kind'], st['title'][:48])


def main():
    guide = guide_services()
    out, report = {}, ['# Devotion build report', '']
    flags = []
    for sid, data in guide.items():
        slots = json_slots(sid)
        steps = []
        for gs in data['steps']:
            slot, refs = find_slot(slots, gs['lines'])
            blocks, psalms = build_step(gs['lines'], slot)
            for st in expand(blocks, psalms, gs['lines'], slot, refs):
                st['source'] = gs['label']
                collection = re.search(r'\bcollections?\b', ' '.join(gs['lines']), re.I)
                if st['kind'] == 'offering' and sid == 'lords_day_service' and collection:
                    st['blocks'] = [{'kind': 'offering', 'parts': True}] + [b for b in st['blocks'] if b['kind'] != 'act']
                    st['title'] = 'Offerings'
                elif st['kind'] == 'offering' and collection:
                    st['blocks'] = [{'kind': 'offering', 'parts': False}] + [b for b in st['blocks'] if b['kind'] == 'note']
                    st['title'] = 'Offerings'
                plain = split_brackets(' '.join(gs['lines']))[0]
                lesson = re.match(r'^(first|second)\s+(?:bible\s+)?lesson\b', plain, re.I)
                if st['kind'] == 'reading' and lesson:
                    st['blocks'] = [{'kind': 'lesson', 'which': 1 if lesson.group(1).lower() == 'first' else 2},
                                    {'kind': 'act', 'who': 'reader', 'text': f"The {lesson.group(1).lower()} lesson is read"}] + [b for b in st['blocks'] if b['kind'] == 'note']
                if re.match(r'^benediction\b', plain, re.I):
                    giver = who_of(plain) or next((b.get('who') for b in st['blocks'] if b.get('who')), None) or 'shepherd'
                    st['blocks'] = [{'kind': 'act', 'who': giver, 'text': 'Pronounces the benediction over the congregation'},
                                    {'kind': 'say', 'who': 'congregation', 'text': 'Amen.'}]
                    st['kind'] = 'blessing'
                st['title'] = title_for(st['kind'], st['blocks'], [b for b in st['blocks'] if b['kind'] == 'psalm'], gs['lines']) if 'title' not in st else st['title']
                steps.append(st)
        for st in steps:
            tidy_step(st)
        merged = []
        for st in steps:
            if merged and merged[-1]['kind'] == 'psalm' and all(b['kind'] in ('instruction', 'psalm_choice') for b in merged[-1]['blocks']) and st['kind'] == 'psalm':
                st['blocks'] = merged.pop()['blocks'] + st['blocks']
            merged.append(st)
        steps = merged
        for n, st in enumerate(steps, 1):
            st['n'] = n
            for b in st['blocks']:
                if b['kind'] == 'psalm' and b['verses'] and not b.get('name'):
                    flags.append(f"- {sid} step {n} ({b['ref']}): no holy name in the guide")
        out[sid] = {'intro': intro_blocks(data['intro']), 'steps': steps}
        report.append(f"## {sid} — {len(data['steps'])} guide steps → {len(steps)} devotion steps")
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    names = {}
    for sid, svc in out.items():
        for st in svc['steps']:
            for b in st['blocks']:
                if b['kind'] == 'psalm' and b.get('name'):
                    names.setdefault(f"{b['name']} → {b['ref']}", []).append(sid)
    report += ['', '## Holy names before psalms', ''] + [f'- {k} ({len(v)} services)' for k, v in sorted(names.items())]
    report += ['', '## Psalms without a holy name (to confirm)', ''] + flags
    REPORT.write_text('\n'.join(report) + '\n', encoding='utf-8')
    print('\n'.join(report))


if __name__ == '__main__':
    main()
