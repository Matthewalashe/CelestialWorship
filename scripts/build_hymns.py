"""
Rebuild public/data/hymns.json from the two-column PDF text extract.

The hymnal PDF prints Yoruba on the left and English on the right. The extract
(`data-src/hymns_extracted_raw.txt`, produced with layout-preserving pdftotext)
keeps that layout, so each line is split into its two columns here, then each
column is broken into stanzas and PDF line-wraps are re-joined.

Titles and categories are carried over from the existing hymns.json, which is
where clergy-reviewed metadata lives.

Usage:  python scripts/build_hymns.py [--report]
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = ROOT / 'data-src' / 'hymns_extracted_raw.txt'
OUT_PATH = ROOT / 'public' / 'data' / 'hymns.json'

HEADER_TOKEN = re.compile(r'(?i)\b(orin|h?ymn)\s*(\d{1,4})\b')  # "ymn 602" is a typo in the source
# "Orin 5   Hymn 5", "Hymn78   Hymn78", "Hymn 326:   Hymn 326:", "Orin 609   Hymn"
HEADER_LINE = re.compile(r'(?i)^\s*(?:(?:orin|h?ymn)\s*\d{0,4}\s*:?\s*){1,2}$')
COLUMN_HEADER = re.compile(r'(?i)^(orin|h?ymn)\s*\d{0,4}\s*:?$')
# "Hymns 20 – 50 are reserved", "Hymn s 333 – 350 is Reserved", "Hymns 83 125 are reserved"
RESERVED_LINE = re.compile(r'(?i)hymn\s*s?\s+\d+\s*\S?\s*\d*\s+(are|is)\s+reserved')
RESERVED_RANGE = re.compile(r'(?i)hymn\s*s?\s+(\d+)\s*\S?\s*(\d*)\s+(?:are|is)\s+reserved')
FUSED_HEADER = re.compile(r'(?i)^(\s*orin\s*\d{1,4})\s{2,}hymn\s+([^\d\s].*)$')
SOLFA_LINE = re.compile(r'^[\sdrmfsltDRMFSLT:;,.\'’|\-–_()0-9]+$')
SOLFA_NOTE = re.compile(r'\b[drmfslt]\s*[:;]', re.I)
STANZA_NUMBER = re.compile(r'^(\d{1,2})\s*[:.)]\s*(.*)$')
CHORUS_MARK = re.compile(r'(?i)^(chorus|cr|egbe|ègbè|refrain)\b\s*[:.\-]?\s*(.*)$')
AMEN = re.compile(r'(?i)\s*\b(amin|amen)\b\.?\s*$')
TERMINAL_PUNCT = re.compile(r'[.,;:!?)\]’\'"]$')


# Hymnal section headings (English side, as printed) -> id, corrected English label, category
# used to fill in hymns that have no category yet.
SECTIONS = {
    'hymns for palm sunday': ('palm_sunday', 'Palm Sunday', 'christ_the_king'),
    'mercy and during passion week': ('passion_week', 'Mercy & Passion Week', 'forgiveness_of_sins'),
    'easter day songs': ('easter', 'Easter', 'christ_the_king'),
    'songs for god’s glory and ascension': ('ascension', 'Glory & Ascension', 'praise_or_glory'),
    'holy spirit songs': ('holy_spirit', 'Holy Spirit', 'holy_spirit_or_power'),
    'spiritual power’s songs': ('spiritual_power', 'Spiritual Power', 'holy_spirit_or_power'),
    'songs for good news': ('good_news', 'Good News', 'evangelism'),
    'praises songs': ('praise', 'Praise', 'praise_or_glory'),
    'glory songs': ('glory', 'Glory', 'praise_or_glory'),
    'songs of joy': ('joy', 'Joy', 'praise_or_glory'),
    'songs for thanksgiving': ('thanksgiving', 'Thanksgiving', 'thanksgiving'),
    'blessing song': ('blessing', 'Blessing', 'mercy_or_blessing'),
    'harvest songs': ('harvest', 'Harvest', 'thanksgiving'),
    'victory songs': ('victory', 'Victory', 'christ_the_king'),
    'healing songs': ('healing', 'Healing', 'healing'),
    'baptism songs': ('baptism', 'Baptism', 'sanctification'),
    'song’s of faith': ('faith', 'Faith', 'faith_and_trust'),
    'hymns for judgement': ('judgement', 'Judgement', 'forgiveness_of_sins'),
    'hymns for the coming of christ': ('second_coming', 'Coming of Christ', 'christ_the_king'),
    'hymns for god’s work': ('gods_work', 'God’s Work', 'evangelism'),
    'hymns of warning': ('warning', 'Warning', 'forgiveness_of_sins'),
    'songs for burial and remembrance': ('burial', 'Burial & Remembrance', 'faith_and_trust'),
    'songs of call to heaven': ('heavenly_call', 'Call to Heaven', 'faith_and_trust'),
    'songs for divine call': ('heavenly_call', 'Call to Heaven', 'faith_and_trust'),
    'hymns for heavenly call': ('heavenly_call', 'Call to Heaven', 'faith_and_trust'),
    'revelation hymns': ('revelation', 'Revelation', 'holy_spirit_or_power'),
    'sanctification hymns': ('sanctification', 'Sanctification', 'sanctification'),
    'house opening hymns': ('house_dedication', 'House Opening & Dedication', 'mercy_or_blessing'),
    'hymns for divine love': ('divine_love', 'Divine Love', 'faith_and_trust'),
    'holy re- union hymns': ('reunion', 'Holy Reunion', 'praise_or_glory'),
    'holy communication hymns': ('holy_communion', 'Holy Communion', 'sanctification'),
    'wedding hymns': ('wedding', 'Wedding', 'mercy_or_blessing'),
    'prayer’s hymns': ('prayer', 'Prayer', 'mercy_or_blessing'),
    'protection and journey hymns': ('protection_journey', 'Protection & Journey', 'faith_and_trust'),
    'children’s hymns': ('children', 'Children', 'praise_or_glory'),
    'birth of christ hymns': ('christmas', 'Birth of Christ', 'christ_the_king'),
    'seeking god’s favour hymns': ('seeking_favour', 'Seeking God’s Favour', 'mercy_or_blessing'),
    'promise hymns': ('promise', 'Promise', 'faith_and_trust'),
    'praise and worship hymns': ('praise_worship', 'Praise & Worship', 'praise_or_glory'),
}


def section_info(raw):
    """Normalise a raw (yoruba, english) heading into {'id', 'english', 'yoruba'}."""
    if not raw:
        return None, None
    yo, en = raw
    key = re.sub(r'\s+', ' ', en.strip().lower()).replace("'", '’')
    if key not in SECTIONS:
        print(f'  ! unknown section heading: {en!r}', file=sys.stderr)
        return {'id': re.sub(r'\W+', '_', key).strip('_'), 'english': en.strip(), 'yoruba': yo.strip()}, None
    sid, label, category = SECTIONS[key]
    return {'id': sid, 'english': label, 'yoruba': yo.strip()}, category


def is_solfa(text: str) -> bool:
    text = text.strip()
    return bool(text) and bool(SOLFA_LINE.match(text)) and len(SOLFA_NOTE.findall(text)) >= 2


def segments(line: str):
    """Split a line into (start_col, text) runs separated by 2+ spaces."""
    return [(m.start(), m.group().strip()) for m in re.finditer(r'\S+(?: \S+)*', line)]


def find_boundary(lines):
    """The right column's start = the most common start position of right-hand runs."""
    starts = Counter()
    for line in lines:
        for start, _ in segments(line)[1:]:
            if start >= 20:
                starts[start] += 1
        stripped = line.lstrip(' ')
        indent = len(line) - len(stripped)
        if stripped and indent >= 25:
            starts[indent] += 1
    if not starts:
        return None
    # Cluster nearby positions (character width drift from curly quotes etc.)
    best, best_score = None, -1
    for pos in starts:
        score = sum(c for p, c in starts.items() if abs(p - pos) <= 3)
        if score > best_score:
            best, best_score = pos, score
    return best


def split_columns(line: str, boundary: int):
    """Return (left, right) text for one row of the two-column layout."""
    if not line.strip():
        return '', ''
    segs = segments(line)
    if boundary is None:
        return ' '.join(t for _, t in segs), ''
    # Right column begins at the first run that starts near (or past) the boundary
    for i, (start, _) in enumerate(segs):
        if start >= boundary - 6:
            left = ' '.join(t for _, t in segs[:i])
            right = ' '.join(t for _, t in segs[i:])
            return left, right
    return ' '.join(t for _, t in segs), ''


def join_wraps(lines):
    """Re-join lines the PDF wrapped mid-phrase: a lowercase start after a line with no
    closing punctuation is a continuation of that line."""
    out = []
    for line in lines:
        if out and line[:1].islower() and not TERMINAL_PUNCT.search(out[-1]) and not AMEN.search(out[-1]):
            out[-1] = f'{out[-1]} {line}'
        else:
            out.append(line)
    return out


def clean_text(text: str) -> str:
    text = text.replace('\f', '')
    text = re.sub(r'\s+', ' ', text).strip()
    # Detach a trailing "Amin"/"Amen" spaced apart in the PDF, keep it on the same line
    return text


def to_stanzas(column_lines):
    """Group one column's rows into stanzas.

    New stanza on: "N:" numbering, a chorus marker, or a blank row when the column
    has no explicit numbering at all.
    """
    has_numbers = any(STANZA_NUMBER.match(l or '') for l in column_lines)
    stanzas = []
    current = None

    def start(kind, number):
        nonlocal current
        current = {'kind': kind, 'number': number, 'lines': []}
        stanzas.append(current)

    for raw in column_lines:
        line = clean_text(raw)
        if not line:
            if not has_numbers and current and current['lines']:
                current = None
            continue
        m_num = STANZA_NUMBER.match(line)
        m_cho = CHORUS_MARK.match(line)
        if m_num:
            start('verse', int(m_num.group(1)))
            line = m_num.group(2).strip()
        elif m_cho:
            start('chorus', None)
            line = m_cho.group(2).strip()
        elif current is None:
            start('verse', None)
        if line:
            # A chorus marker can also appear after a stanza's last line: "... Amin  Chorus: ..."
            current['lines'].append(line)

    for s in stanzas:
        s['lines'] = join_wraps(s['lines'])
    return [s for s in stanzas if s['lines'] or s['kind'] == 'chorus']


def number_unnumbered(stanzas):
    """Give unlabelled verses sequential numbers, continuing from any explicit ones."""
    n = 0
    for s in stanzas:
        if s['kind'] != 'verse':
            continue
        if s['number'] is None:
            n += 1
            s['number'] = n
        else:
            n = s['number']
    return stanzas


def pair_stanzas(yo, en):
    """Align Yoruba and English stanzas: verses by number, choruses in order."""
    result = []
    en_verses = {s['number']: s for s in en if s['kind'] == 'verse'}
    en_choruses = [s for s in en if s['kind'] == 'chorus']
    used_en = set()
    chorus_i = 0
    for s in yo:
        if s['kind'] == 'verse':
            match = en_verses.get(s['number'])
        else:
            match = en_choruses[chorus_i] if chorus_i < len(en_choruses) else None
            chorus_i += 1
        if match is not None:
            used_en.add(id(match))
        result.append({
            'kind': s['kind'],
            'number': s['number'],
            'yoruba_lines': s['lines'],
            'english_lines': match['lines'] if match else [],
        })
    # English-only stanzas (e.g. Yoruba side had fewer)
    for s in en:
        if id(s) not in used_en:
            result.append({'kind': s['kind'], 'number': s['number'], 'yoruba_lines': [], 'english_lines': s['lines']})
    return result


def expand_chorus_refs(stanzas):
    """A bare "Chorus" line (no text) means "repeat the chorus": copy the first chorus' lines."""
    first = next((s for s in stanzas if s['kind'] == 'chorus' and (s['yoruba_lines'] or s['english_lines'])), None)
    for s in stanzas:
        if s['kind'] == 'chorus' and not s['yoruba_lines'] and not s['english_lines'] and first:
            s['yoruba_lines'] = list(first['yoruba_lines'])
            s['english_lines'] = list(first['english_lines'])
            s['repeat'] = True
    return [s for s in stanzas if s['yoruba_lines'] or s['english_lines']]


def is_section_row(lines, i):
    """Hymnal section headings ("Orin Emi Mimo   Holy Spirit Songs"): an indented row with
    blank rows around it, sitting just before a hymn header or a "reserved" note."""
    line = lines[i]
    if not line.strip() or len(segments(line)) != 2 or RESERVED_LINE.search(line):
        return False
    if is_title_row(line):
        return False  # hymn titles are printed in capitals; section headings are not
    before = lines[i - 1].strip() if i > 0 else ''
    # Headings are centred (indented); unindented ones only directly after a "reserved" note
    if len(line) - len(line.lstrip(' ')) < 5 and not RESERVED_LINE.search(before):
        return False
    after = lines[i + 1].strip() if i + 1 < len(lines) else ''
    if (before and not RESERVED_LINE.search(before)) or after:
        return False
    for j in range(i + 1, min(i + 6, len(lines))):
        nxt = lines[j]
        if HEADER_LINE.match(nxt) and HEADER_TOKEN.search(nxt) or RESERVED_LINE.search(nxt):
            return True
        if nxt.strip() and not is_title_row(nxt):
            return False
    return False


def parse_raw(text):
    """Return {number: {'body': [...], 'title': (yo, en) | None, 'section': (yo, en) | None}}."""
    raw_lines = text.replace('\r', '').replace('\f', '').split('\n')

    # "Orin 970        Hymn The way of salvation,": split into a header row and a lyric row
    lines = []
    for line in raw_lines:
        fused = FUSED_HEADER.match(line)
        if fused:
            lines.append(fused.group(1))
            lines.append(' ' * fused.start(2) + fused.group(2))
        else:
            lines.append(line)

    sections = {}  # line index -> (yoruba, english)
    for i in range(len(lines)):
        if is_section_row(lines, i):
            yo, en = [t for _, t in segments(lines[i])]
            sections[i] = (yo, en)

    headers = []  # (first_line, number, last_line)
    for i, line in enumerate(lines):
        if not HEADER_LINE.match(line):
            continue
        nums = [int(m.group(2)) for m in HEADER_TOKEN.finditer(line)]
        if not nums:
            continue
        # Typos such as "Hymn 353   Hymn 354": the later number is the right one
        num = max(nums)
        if headers and headers[-1][1] == num and i - headers[-1][2] <= 2:
            headers[-1] = (headers[-1][0], num, i)  # second half of a split header
        else:
            headers.append((i, num, i))

    hymns = {}
    current_section = None
    section_lines = sorted(sections)
    for idx, (start, num, header_end) in enumerate(headers):
        for si in section_lines:
            if si < start:
                current_section = sections[si]
        end = headers[idx + 1][0] if idx + 1 < len(headers) else len(lines)

        # Title row(s): all-caps lines directly above this header
        title = None
        j = start - 1
        while j >= 0 and not lines[j].strip():
            j -= 1
        if j >= 0 and is_title_row(lines[j]) and j not in sections:
            segs = [t for _, t in segments(lines[j])]
            title = (segs[0], segs[-1] if len(segs) > 1 else None)

        body = []
        for k in range(header_end + 1, end):
            if k in sections or RESERVED_LINE.search(lines[k]):
                continue
            body.append(lines[k])
        # Drop the next hymn's title row(s) and trailing blanks
        while body and not body[-1].strip():
            body.pop()
        if idx + 1 < len(headers):
            while body and body[-1].strip() and is_title_row(body[-1]):
                body.pop()
                while body and not body[-1].strip():
                    body.pop()
        if num in hymns:
            continue  # first occurrence wins
        hymns[num] = {'body': body, 'title': title, 'section': current_section}
    return hymns


def is_title_row(line):
    letters = [c for c in line if c.isalpha()]
    if not letters:
        return False
    upper = sum(1 for c in letters if c.isupper())
    return upper / len(letters) > 0.8 and not is_solfa(line)


def build_hymn(num, body):
    boundary = find_boundary([l for l in body if not is_solfa(l)])
    solfa_rows, yo_col, en_col = [], [], []
    lyrics_started = False
    for line in body:
        if not lyrics_started and is_solfa(line):
            left, _ = split_columns(line, boundary)
            solfa_rows.append(left or line.strip())
            continue
        if line.strip():
            lyrics_started = True
        left, right = split_columns(line, boundary)
        # Half of the header can be printed beside a lyric row ("1: Dariji awa elese,   Hymn 9")
        if COLUMN_HEADER.match(left):
            left = ''
        if COLUMN_HEADER.match(right):
            right = ''
        yo_col.append(left)
        en_col.append(right)

    yo = number_unnumbered(to_stanzas(yo_col))
    en = number_unnumbered(to_stanzas(en_col))
    stanzas = expand_chorus_refs(pair_stanzas(yo, en))
    issues = []
    if boundary is None:
        issues.append('no-english-column')
    if len([s for s in yo if s['kind'] == 'verse']) != len([s for s in en if s['kind'] == 'verse']):
        issues.append('stanza-count-mismatch')
    if any(not s['english_lines'] or not s['yoruba_lines'] for s in stanzas):
        issues.append('unpaired-stanza')
    return stanzas, '\n'.join(solfa_rows) or None, issues


def title_case(text):
    """Raw titles are printed in capitals; keep them as printed (the app styles them)."""
    return text.strip() if text and text.strip() else None


def word_bag(text):
    return Counter(w.lower() for w in re.findall(r"[^\W\d_]+(?:[’'][^\W\d_]+)*", text))


def main():
    report = '--report' in sys.argv
    raw = RAW_PATH.read_text(encoding='utf-8')
    bodies = parse_raw(raw)
    existing = {h['number']: h for h in json.loads(OUT_PATH.read_text(encoding='utf-8'))}

    # Numbers the hymnal marks as "Hymns 218 – 225 are reserved" have no hymn
    reserved = set()
    for m in RESERVED_RANGE.finditer(raw):
        lo = int(m.group(1))
        hi = int(m.group(2)) if m.group(2) else lo
        reserved.update(range(lo, max(lo, hi) + 1))

    out, problems, dropped = [], {}, []
    for num in sorted(existing):
        old = existing[num]
        parsed = bodies.get(num)
        if parsed is None:
            if num in reserved:
                dropped.append(num)  # placeholder record for a reserved number
                continue
            problems[num] = ['missing-in-raw']
            out.append(old)
            continue
        body = parsed['body']
        stanzas, solfa, issues = build_hymn(num, body)
        raw_title = parsed['title'] or (None, None)
        section, section_category = section_info(parsed['section'])
        categories = list(old.get('categories') or [])
        if not categories and section_category:
            categories = [section_category]

        # Safety net: every lyric word in the raw body must survive the rebuild
        raw_words = word_bag('\n'.join(l for l in body if not is_solfa(l)))
        new_words = word_bag('\n'.join(l for s in stanzas for l in s['yoruba_lines'] + s['english_lines']))
        for marker in ('chorus', 'cr', 'egbe', 'refrain', 'hymn', 'ymn', 'orin'):
            raw_words.pop(marker, None)
            new_words.pop(marker, None)
        lost = raw_words - new_words
        if lost:
            issues.append('lost-words:' + ','.join(sorted(lost)[:5]))
        if issues:
            problems[num] = issues

        verses = []
        for s in stanzas:
            entry = {
                'kind': s['kind'],
                'number': s['number'] if s['kind'] == 'verse' else None,
                'yoruba_lines': s['yoruba_lines'],
                'english_lines': s['english_lines'],
            }
            if s.get('repeat'):
                entry['repeat'] = True
            verses.append(entry)

        out.append({
            'number': num,
            'yoruba_title': old.get('yoruba_title') or title_case(raw_title[0]),
            'english_title': old.get('english_title') or title_case(raw_title[1]),
            'section': section,
            'yoruba_lyrics': '\n\n'.join('\n'.join(v['yoruba_lines']) for v in verses if v['yoruba_lines']),
            'english_lyrics': '\n\n'.join('\n'.join(v['english_lines']) for v in verses if v['english_lines']),
            'solfa_notation': solfa or old.get('solfa_notation'),
            'categories': categories,
            'needs_clergy_review': old.get('needs_clergy_review', True),
            # Only flag stanza structure for review when the automatic split looks doubtful
            'needs_verse_split_review': bool(issues),
            'verses': verses,
        })

    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

    kinds = Counter(p.split(':')[0] for ps in problems.values() for p in ps)
    multi = sum(1 for h in out if len(h['verses']) > 1)
    print(f'hymns: {len(out)}  multi-stanza: {multi}  flagged for review: {len(problems)}  {dict(kinds)}')
    print(f'dropped empty reserved-number records: {dropped}')
    if report:
        for num, ps in sorted(problems.items()):
            print(num, ps)


if __name__ == '__main__':
    main()
