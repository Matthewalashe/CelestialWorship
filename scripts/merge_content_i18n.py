"""Merge hand translations of the app's content into the catalogs.

    python -I -X utf8 scripts/merge_content_i18n.py data-src/i18n_content

The folder holds strings.snapshot.json (the English, from `node scripts/content-strings.cjs`) and part*.txt files with
lines `N|yorùbá|français`, N indexing the snapshot. Strings left out (names, titles of music, credits) stay as they are.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
folder = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'data-src/i18n_content')
strings = json.loads((folder / 'strings.snapshot.json').read_text(encoding='utf-8'))

rows = {}
for part in sorted(folder.glob('part*.txt')):
    for n, line in enumerate(part.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip():
            continue
        idx, yo, fr = line.split('|', 2)
        i = int(idx)
        if i in rows:
            raise SystemExit(f'{part.name}:{n}: index {i} given twice')
        if i >= len(strings):
            raise SystemExit(f'{part.name}:{n}: index {i} is past the end of the snapshot')
        rows[i] = (yo.strip(), fr.strip())

for lang, col in (('yo', 0), ('fr', 1)):
    path = ROOT / 'public' / 'i18n' / f'{lang}.json'
    cat = json.loads(path.read_text(encoding='utf-8'))
    for i, pair in rows.items():
        if pair[col]:
            cat[strings[i]] = pair[col]
    path.write_text(json.dumps(dict(sorted(cat.items())), ensure_ascii=False, indent=0) + '\n', encoding='utf-8', newline='\n')
    print(lang, len(cat), 'entries')
print(len(rows), 'of', len(strings), 'translated')
