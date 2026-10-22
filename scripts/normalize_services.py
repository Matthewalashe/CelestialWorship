"""
Clean public/data/services.json (the Order of Service):

- The title line of each order ("ORDER OF MORNING SERVICE [6AM]") is marked as a header.
- A hymn slot belongs only to its hymn step (prayer steps had copies of the previous hymn's slot).
- "Hymn 674 [...]" steps get their fixed hymn number when it was missing.
- Bible references in the text ("[John 11: 25 – 26]", "Bible Lesson – Revelation 14: 6 – 13",
  "Reading of Psalm 90") are extracted into scripture_references so the app can link and show them.
- Steps that are a Bible lesson are typed as 'scripture'.

Run after editing services.json: python scripts/normalize_services.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / 'public' / 'data' / 'services.json'
KJV = ROOT / 'public' / 'data' / 'bible' / 'en'
HYMNS = {h['number'] for h in json.loads((ROOT / 'public' / 'data' / 'hymns.json').read_text(encoding='utf-8'))}

BOOKS = [p.stem for p in KJV.glob('*.json')]
BOOK_NAMES = {re.sub(r'(\d)', r'\1 ', b).strip(): b for b in BOOKS}  # "1Corinthians" -> "1 Corinthians"
BOOK_NAMES['Song of Solomon'] = 'SongofSolomon'
ALIASES = {
    'psalm': 'Psalms', 'ps': 'Psalms', 'gen': 'Genesis', 'exo': 'Exodus', 'exod': 'Exodus', 'lev': 'Leviticus',
    'deut': 'Deuteronomy', 'matt': 'Matthew', 'mat': 'Matthew', 'rom': 'Romans', 'rev': 'Revelation', 'heb': 'Hebrews',
    'isa': 'Isaiah', 'jer': 'Jeremiah', 'eph': 'Ephesians', 'phil': 'Philippians', 'col': 'Colossians', 'prov': 'Proverbs',
    # "Tim 6:7" in the burial order quotes "we brought nothing into this world" — that is 1 Timothy 6:7
    'tim': '1 Timothy',
}

VERSE_COUNTS = {}


def verse_count(book_file, chapter):
    key = (book_file, chapter)
    if key not in VERSE_COUNTS:
        data = json.loads((KJV / f'{book_file}.json').read_text(encoding='utf-8'))
        ch = next((c for c in data['chapters'] if int(c['chapter']) == chapter), None)
        VERSE_COUNTS[key] = len(ch['verses']) if ch else 0
    return VERSE_COUNTS[key]


def resolve_book(name):
    name = re.sub(r'\s+', ' ', name.strip().rstrip('.'))
    roman = re.match(r'^(I{1,3})\s+(.*)$', name)
    if roman:
        name = f'{len(roman.group(1))} {roman.group(2)}'
    for display, file in BOOK_NAMES.items():
        if display.lower() == name.lower():
            return display, file
    alias = ALIASES.get(name.lower())
    if alias:
        return alias, alias.replace(' ', '')
    for display, file in BOOK_NAMES.items():
        if len(name) >= 3 and display.lower().startswith(name.lower()):
            return display, file
    return None


BOOK_PATTERN = r'((?:[1-3]|I{1,3})\s?)?[A-Z][a-z]+(?:\s(?:of\s)?[A-Z][a-z]+)?'
# "\s*" before the chapter also catches typos such as "John14: 1 – 3"
REF_RE = re.compile(rf'({BOOK_PATTERN})\.?\s*(\d{{1,3}})\s*:\s*(\d{{1,3}})(?:\s*[-–—]\s*(\d{{1,3}}))?')
PSALM_RE = re.compile(r'\b(?:Reading of\s+)?Psalm\s+(\d{1,3})\b(?!\s*:)')


def extract_refs(text):
    refs = []
    for m in REF_RE.finditer(text):
        resolved = resolve_book(m.group(1))
        if not resolved:
            continue
        display, file = resolved
        chapter, v1 = int(m.group(3)), int(m.group(4))
        v2 = int(m.group(5)) if m.group(5) else v1
        if v2 < v1:
            v2 = v1
        count = verse_count(file, chapter)
        if not count or v1 > count:
            continue
        v2 = min(v2, count)
        refs.append({'raw': f'{display} {chapter}:{v1}' + (f'-{v2}' if v2 > v1 else ''),
                     'book': display, 'chapter': chapter, 'verse_start': v1, 'verse_end': v2})
    # Whole psalms read in the service ("Reading of Psalm 90")
    for m in PSALM_RE.finditer(text):
        chapter = int(m.group(1))
        count = verse_count('Psalms', chapter)
        if count and not any(r['book'] == 'Psalms' and r['chapter'] == chapter for r in refs):
            refs.append({'raw': f'Psalm {chapter}', 'book': 'Psalms', 'chapter': chapter, 'verse_start': 1, 'verse_end': count})
    seen = set()
    unique = []
    for r in refs:
        if r['raw'] not in seen:
            seen.add(r['raw'])
            unique.append(r)
    return unique


def main():
    services = json.loads(PATH.read_text(encoding='utf-8'))
    stats = {'headers': 0, 'slots_removed': 0, 'fixed_added': 0, 'refs': 0, 'scripture_typed': 0, 'unknown_hymns': []}
    for svc in services:
        for i, step in enumerate(svc['steps']):
            text = step.get('text', '')
            if i == 0 and re.match(r'^\s*ORDER OF', text) and not step.get('isHeader'):
                step['isHeader'] = True
                stats['headers'] += 1
            if step.get('type') != 'hymn' and step.get('hymnSlot'):
                step['hymnSlot'] = None
                stats['slots_removed'] += 1
            if step.get('type') == 'hymn':
                m = re.match(r'^\s*(?:Closing\s+)?Hymn\s+(\d{1,3})\b', text, re.I)
                slot = step.get('hymnSlot') or {}
                if m and not slot.get('fixedHymnNumber') and not slot.get('category'):
                    step['hymnSlot'] = {'fixedHymnNumber': int(m.group(1))}
                    stats['fixed_added'] += 1
                fixed = (step.get('hymnSlot') or {}).get('fixedHymnNumber')
                if fixed and fixed not in HYMNS:
                    stats['unknown_hymns'].append(f"{svc['id']} step {step.get('stepNumber')}: {fixed}")
            refs = extract_refs(text)
            if refs:
                step['scripture_references'] = refs
                stats['refs'] += len(refs)
                if step.get('type') == 'instruction' and re.match(r'^\s*(Bible (Lesson|Reading)|Reading of Psalm|Lesson)', text, re.I):
                    step['type'] = 'scripture'
                    stats['scripture_typed'] += 1
    PATH.write_text(json.dumps(services, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(stats, indent=1))


if __name__ == '__main__':
    main()
