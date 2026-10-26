"""Merge the hand translations of the Order of Service (data-src/i18n_devotion/part*.txt) into the app catalogs.

    python -I -X utf8 scripts/merge_devotion_i18n.py

Each line is `N|yorùbá|français`, where N indexes data-src/devotion_strings.snapshot.json (the English strings).
Lines left out (songs in tongues, names) stay in English. A translation already in public/i18n wins only when the
part files say nothing about that string.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
strings = json.loads((ROOT / 'data-src' / 'devotion_strings.snapshot.json').read_text(encoding='utf-8'))

rows = {}
for part in sorted((ROOT / 'data-src' / 'i18n_devotion').glob('part*.txt')):
    for n, line in enumerate(part.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip():
            continue
        idx, yo, fr = line.split('|', 2)
        i = int(idx)
        if i in rows:
            raise SystemExit(f'{part.name}:{n}: index {i} given twice')
        rows[i] = (yo.strip(), fr.strip())

for lang, col in (('yo', 0), ('fr', 1)):
    path = ROOT / 'public' / 'i18n' / f'{lang}.json'
    cat = json.loads(path.read_text(encoding='utf-8'))
    for i, pair in rows.items():
        if pair[col]:
            cat[strings[i]] = pair[col]
    path.write_text(json.dumps(dict(sorted(cat.items())), ensure_ascii=False, indent=0) + '\n', encoding='utf-8', newline='\n')
    print(lang, len(cat), 'entries')

missing = [i for i in range(len(strings)) if i not in rows]
print(len(rows), 'translated;', len(missing), 'left in English:', missing)
