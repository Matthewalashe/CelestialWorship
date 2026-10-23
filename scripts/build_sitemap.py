"""
Write public/sitemap.xml from the app's data: main pages, every hymn, every Order of Service,
the first chapter of every Bible book and every children's Bible story.

Usage: python scripts/build_sitemap.py [base_url]
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://celestialworship.vercel.app').rstrip('/')
TODAY = date.today().isoformat()

PAGES = [
    ('/', '1.0', 'daily'), ('/hymns', '0.9', 'weekly'), ('/bible', '0.9', 'monthly'), ('/services', '0.8', 'monthly'),
    ('/devotion', '0.8', 'daily'), ('/lessons', '0.8', 'weekly'), ('/events', '0.7', 'daily'), ('/our-church', '0.7', 'yearly'),
    ('/constitution', '0.6', 'yearly'), ('/quiz', '0.6', 'monthly'), ('/articles', '0.6', 'daily'), ('/directory', '0.6', 'weekly'),
    ('/live', '0.5', 'daily'), ('/learn', '0.7', 'monthly'), ('/install', '0.8', 'monthly'), ('/stories', '0.8', 'monthly'), ('/maps', '0.6', 'monthly'),
]


def url(path, priority, freq):
    return f'  <url><loc>{BASE}{path}</loc><lastmod>{TODAY}</lastmod><changefreq>{freq}</changefreq><priority>{priority}</priority></url>'


def main():
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    lines += [url(*p) for p in PAGES]
    for h in json.loads((DATA / 'hymns.json').read_text(encoding='utf-8')):
        lines.append(url(f"/hymns/{h['number']}", '0.6', 'monthly'))
    for s in json.loads((DATA / 'services.json').read_text(encoding='utf-8')):
        lines.append(url(f"/services/{s['id']}", '0.6', 'monthly'))
    for b in json.loads((DATA / 'bible' / 'books.json').read_text(encoding='utf-8')):
        name = b['name'] if isinstance(b, dict) else b
        lines.append(url(f"/bible/{name.lower().replace(' ', '-')}/1", '0.5', 'yearly'))
    for c in json.loads((DATA / 'stories' / 'index.json').read_text(encoding='utf-8'))['collections']:
        for st in c['stories']:
            lines.append(url(f"/stories/{st['id']}", '0.6', 'yearly'))
    lines.append('</urlset>')
    (ROOT / 'public' / 'sitemap.xml').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'wrote {len(lines) - 3} urls')


if __name__ == '__main__':
    main()
