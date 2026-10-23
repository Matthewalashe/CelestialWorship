"""Download the Louis Segond 1910 French Bible (public domain) from getbible.net
and write it in the app's per-book format to public/data/bible/fr/<Book>.json.

    python -I -X utf8 scripts/build_bible_fr.py
"""
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'bible' / 'fr'
BOOKS = json.loads((ROOT / 'public' / 'data' / 'bible' / 'books.json').read_text(encoding='utf-8'))


def fetch(n):
    url = f'https://api.getbible.net/v2/ls1910/{n}.json'
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'CelestialWorship/1.0 (build script)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2 + attempt * 2)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for n, book in enumerate(BOOKS, start=1):
        name = book['name']
        target = OUT / (name.replace(' ', '') + '.json')
        if target.exists():
            continue
        data = fetch(n)
        chapters = [{
            'chapter': str(c['chapter']),
            'verses': [{'verse': str(v['verse']), 'text': ' '.join(v['text'].split())} for v in c['verses']],
        } for c in data['chapters']]
        if len(chapters) != book['chapterCount']:
            print(f'warning: {name} has {len(chapters)} chapters, expected {book["chapterCount"]}')
        with open(target, 'w', encoding='utf-8', newline='\n') as f:
            json.dump({'book': name, 'chapters': chapters}, f, ensure_ascii=False, separators=(',', ':'))
        print(name, len(chapters))


if __name__ == '__main__':
    main()
