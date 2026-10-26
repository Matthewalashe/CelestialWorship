"""Stage 1 of the devotion build: cut the service guide (data-src/order_of_service_guide.txt, extracted
from "Celestial Church of Christ Simplified Service Guides", Prophet Dele Bareck) into services and
numbered steps, keeping each step's own lines (song lines, psalm verses, lists).

Used by scripts/build_devotion.py.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
GUIDE = ROOT / 'data-src' / 'order_of_service_guide.txt'

# Heading in the guide → service id in public/data/services.json
HEADINGS = [
    ('ORDER OF MORNING SERVICE', 'morning_service'),
    ('ORDER OF SEEKERS SERVICE', 'seekers_service'),
    ('ORDER OF MERCY DAY SERVICE', 'mercy_day_service'),
    ('ORDER OF POWER DAY SERVICE', 'power_day_service'),
    ('ORDER OF EVENING SERVICE ON THE LORD', 'evening_service_lords_day'),
    ('ORDER OF SERVICE FOR PROPHETS', 'prophets_prophetess_dreamers'),
    ('ORDER OF SERVICE FOR PREGNANT WOMEN', 'pregnant_women'),
    ('ORDER OF SERVICE ON LORD', 'lords_day_service'),
    ('ORDER OF SERVICE FOR NEW MOON', 'new_moon'),
    ('ORDER OF SERVICE FOR BABY CHRISTENING', 'baby_christening'),
    ('ORDER OF SERVICE FOR BIRTHDAY', 'birthday'),
    ('ORDER OF SERVICE FOR HOLY MATRIMONY', 'holy_matrimony'),
    ('ORDER OF SERVICE FOR LAYING FOUNDATION', 'laying_foundation_stone'),
    ('ORDER OF SERVICE FOR PRIVATE HOUSE', 'private_house_dedication'),
    ('ORDER OF SERVICE FOR CHURCH DEDICATION', 'church_dedication'),
    ('ORDER OF SERVICE FOR BAPTISM', 'baptism'),
    ('WASHING OF THE FEET AND HOLY', 'washing_feet_communion'),
    ('ORDER OF SERVICE FOR CHRISTIAN WAKE', 'christian_wake'),
    ('ORDER OF SERVICE FOR BURIAL', 'burial'),
    ('ORDER OF SERVICE FOR REMEMBRANCE', 'remembrance'),
    ('ORDER OF SERVICE FOR THE END OF YEAR', 'end_of_year'),
]

# Orders that open with a numbered list of materials before the service starts at 1: how many items it has
PREP_STEPS = {'baby_christening': 5, 'new_moon': 2}

# Corrections to the guide, confirmed by the Church
LINE_FIXES = {
    # Before the service the shepherd reads Psalm 24 (Jehovah Ramah); "or Psalm 150" is not used
    'baby_christening': [('he will\nthe read Psalm 24 or Psalm 150', 'he will\nthen read Psalm 24'), ('he will the read Psalm 24 or Psalm 150', 'he will then read Psalm 24')],
}

STEP = re.compile(r'^\s{0,6}(\d{1,2}[a-z]?)\s*:\s*(.*)$')


def clean_lines(text):
    out = []
    for line in text.split('\n'):
        s = line.rstrip()
        # page furniture
        if s.strip().startswith('Reproduced under copyright') or s.strip() == '=== PAGE ===' or re.fullmatch(r'\s*-\s*\d+\s*-\s*', s):
            continue
        # the guide's PDF breaks "me" and "my" with an extra space: "upon me , o God" → "upon me, o God"
        s = re.sub(r'\b(me|my)\s+([,.;:])', r'\1\2', s)
        s = s.replace('li t the', 'light the')
        s = re.sub(r' {2,}', ' ', s) if not s.startswith('  ') else re.sub(r'(?<=\S) {2,}', ' ', s)
        out.append(s)
    return out


def services():
    lines = clean_lines(GUIDE.read_text(encoding='utf-8'))
    # The table of contents comes first: skip to the first real heading after it
    starts = []
    for i, line in enumerate(lines):
        for heading, sid in HEADINGS:
            if line.strip().startswith(heading) and not re.search(r'-\s*\d+\s*-\s*$', line) and i > 100:
                if not any(s == sid for _, s in starts):
                    starts.append((i, sid))
    starts.sort()
    result = {}
    for k, (i, sid) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
        block = lines[i:end]
        intro, steps, current = [], [], None
        for line in block:
            m = STEP.match(line)
            if m and (current is not None or len(intro) > 0):
                current = {'label': m.group(1), 'lines': [m.group(2).strip()] if m.group(2).strip() else []}
                steps.append(current)
            elif current is None:
                intro.append(line)
            else:
                current['lines'].append(line)
        n = PREP_STEPS.get(sid, 0)
        for prep in steps[:n]:
            intro.append(f"{prep['label']}: " + ' '.join(l.strip() for l in prep['lines'] if l.strip()))
        steps = steps[n:]
        if sid == 'baby_christening' and steps and steps[0]['lines'] and steps[0]['lines'][0].strip() == 'Incense':
            intro.append(f"{steps[0]['label']}: Incense")
            steps[0]['lines'] = steps[0]['lines'][1:]
            steps[0]['title'] = 'Before the service: receiving the baby'
        for s in steps:
            while s['lines'] and not s['lines'][-1].strip():
                s['lines'].pop()
            joined = '\n'.join(s['lines'])
            for old, new in LINE_FIXES.get(sid, []):
                joined = joined.replace(old, new)
            s['lines'] = joined.split('\n')
        result[sid] = {'intro': intro, 'steps': steps}
    return result


if __name__ == '__main__':
    import json
    import sys
    data = services()
    sid = sys.argv[1] if len(sys.argv) > 1 else 'lords_day_service'
    print(len(data), 'services;', {k: len(v['steps']) for k, v in data.items()})
    for s in data[sid]['steps']:
        print(f"[{s['label']}]", json.dumps(s['lines'], ensure_ascii=False)[:400])
