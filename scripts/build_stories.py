"""
Build the children's Bible stories.

    <venv with Pillow>/python scripts/build_stories.py <lathbury.txt> <image cache dir>

Two collections:
  • Bible Stories — original retellings (data-src/stories_original.py)
  • Classic Bible Stories — Mary A. Lathbury, Child's Story of the Bible (1898), public domain
    (Project Gutenberg #25309)

Pictures: "Bible Illustrations by Sweet Media" on Wikimedia Commons — Jim Padgett, Sweet Publishing,
CC BY-SA 3.0. Each story takes a picture from its Bible chapter; downloaded once, saved as small WebP.

Writes public/data/stories/index.json, public/data/stories/<id>.json and public/stories/*.webp.
"""
import io, json, math, re, runpy, sys, time, pathlib, urllib.parse, urllib.request
from PIL import Image
import sys as _sys
_sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from undash import undash_all  # house style: no em dashes in the app's words

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DATA = ROOT / 'public' / 'data' / 'stories'
OUT_IMG = ROOT / 'public' / 'stories'
LATHBURY = pathlib.Path(sys.argv[1])
CACHE = pathlib.Path(sys.argv[2]); CACHE.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'CelestialWorship/1.0 (childrens Bible stories; contact askpadimi@gmail.com)'}

COMMONS_BOOK = {
    'Genesis': 'Book of Genesis', 'Exodus': 'Book of Exodus', 'Numbers': 'Book of Numbers', 'Joshua': 'Book of Joshua',
    'Judges': 'Book of Judges', 'Ruth': 'Book of Ruth', '1 Samuel': 'First Book of Samuel', '2 Samuel': 'Second Book of Samuel',
    '1 Kings': 'First Book of Kings', '2 Kings': 'Second Book of Kings', 'Esther': 'Book of Esther', 'Daniel': 'Book of Daniel',
    'Jonah': 'Book of Jonah', 'Matthew': 'Gospel of Matthew', 'Mark': 'Gospel of Mark', 'Luke': 'Gospel of Luke',
    'John': 'Gospel of John', 'Acts': 'Acts of the Apostles',
}

CREDIT = ('Pictures: Jim Padgett, Sweet Publishing, Ft. Worth, TX, and Gospel Light, Ventura, CA. Copyright 1984. '
          'CC BY-SA 3.0, via Wikimedia Commons.')

# Lathbury chapters: (passage, (book, chapter) for the picture)
LATHBURY_OT = [
    ('Genesis 1–3', ('Genesis', 1)), ('Genesis 6–9', ('Genesis', 7)), ('Genesis 12–22', ('Genesis', 22)), ('Genesis 24–27', ('Genesis', 24)),
    ('Genesis 28–33', ('Genesis', 28)), ('Genesis 37', ('Genesis', 37)), ('Genesis 39–41', ('Genesis', 41)), ('Genesis 42–50', ('Genesis', 45)),
    ('Exodus 2', ('Exodus', 2)), ('Exodus 2–4', ('Exodus', 3)), ('Exodus 5–12', ('Exodus', 12)), ('Exodus 13–20', ('Exodus', 14)),
    ('Numbers 13–14; Deuteronomy 34', ('Numbers', 13)), ('Joshua 1–6', ('Joshua', 6)), ('Judges 13–16', ('Judges', 16)), ('Ruth 1–4', ('Ruth', 2)),
    ('1 Samuel 1–3', ('1 Samuel', 3)), ('1 Samuel 8–10', ('1 Samuel', 10)), ('1 Samuel 16', ('1 Samuel', 16)), ('1 Samuel 17', ('1 Samuel', 17)),
    ('1 Samuel 18–20', ('1 Samuel', 20)), ('1 Samuel 21–26', ('1 Samuel', 24)), ('2 Samuel 5–9', ('2 Samuel', 6)), ('2 Samuel 11–12', ('2 Samuel', 12)),
    ('2 Samuel 15–18', ('2 Samuel', 18)), ('1 Kings 3–8', ('1 Kings', 6)), ('1 Kings 17–19', ('1 Kings', 18)), ('2 Kings 4', ('2 Kings', 4)),
    ('2 Kings 5', ('2 Kings', 5)), ('2 Kings 11–12; 22–23', ('2 Kings', 11)), ('Daniel 1', ('Daniel', 1)), ('Daniel 2–6', ('Daniel', 6)),
    ('Jonah 1–4', ('Jonah', 1)), ('Esther 1–10', ('Esther', 5)),
]
LATHBURY_NT = [
    ('Luke 1–2', ('Luke', 2)), ('Matthew 2', ('Matthew', 2)), ('Matthew 2:13-23', ('Matthew', 2)), ('Luke 2:40-52', ('Luke', 2)),
    ('Mark 6:1-6', ('Mark', 6)), ('Matthew 3', ('Matthew', 3)), ('Matthew 4:1-11', ('Matthew', 4)), ('John 1:35-51', ('John', 1)),
    ('John 2:1-11', ('John', 2)), ('John 2:13-25', ('John', 2)), ('John 3', ('John', 3)), ('John 4', ('John', 4)),
    ('Luke 4:16-30', ('Luke', 4)), ('Luke 5:1-11', ('Luke', 5)), ('Mark 1–2', ('Mark', 2)), ('Matthew 5–7', ('Matthew', 5)),
    ('Luke 7', ('Luke', 7)), ('Luke 7:11-17', ('Luke', 7)), ('Luke 7:36-8:3', ('Luke', 8)), ('Matthew 13', ('Matthew', 13)),
    ('Mark 4:35-41', ('Mark', 4)), ('Mark 5', ('Mark', 5)), ('Mark 6:7-13', ('Mark', 6)), ('Matthew 14', ('Matthew', 14)),
    ('Mark 7', ('Mark', 7)), ('Matthew 16', ('Matthew', 16)), ('Matthew 17', ('Matthew', 17)), ('Matthew 18', ('Matthew', 18)),
    ('Luke 10; John 10', ('Luke', 10)), ('Luke 15', ('Luke', 15)), ('John 11', ('John', 11)), ('Mark 10:17-31', ('Mark', 10)),
    ('Luke 18–19', ('Luke', 19)), ('Matthew 21:1-11', ('Matthew', 21)), ('Matthew 21:12-17', ('Matthew', 21)), ('Mark 12', ('Mark', 12)),
    ('Matthew 23', ('Matthew', 23)), ('Matthew 24–25', ('Matthew', 24)), ('Luke 22', ('Luke', 22)), ('Matthew 26', ('Matthew', 26)),
    ('Mark 14–15', ('Mark', 14)), ('John 18–19', ('John', 18)), ('John 19', ('John', 19)), ('Matthew 28', ('Matthew', 28)),
    ('Luke 24', ('Luke', 24)), ('John 21', ('John', 21)), ('Acts 1', ('Acts', 1)), ('Acts 2', ('Acts', 2)),
]


def api(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 + attempt * 3)
    raise RuntimeError('Commons API unavailable')


_listing = {}
def chapter_files(book, ch):
    key = (book, ch)
    if key not in _listing:
        prefix = f"{COMMONS_BOOK[book]} Chapter {ch}-".replace(' ', '_')
        d = api({'action': 'query', 'list': 'allimages', 'aiprefix': prefix, 'ailimit': '100'})
        names = [i['name'] for i in d['query']['allimages'] if 'Sweet_Media' in i['name']]
        num = lambda n: int(re.search(r'Chapter_\d+-(\d+)', n).group(1))
        _listing[key] = sorted(names, key=num)
    return _listing[key]


_used = {}
def picture(book, ch):
    """A picture from this chapter, a different one each time the chapter is used again."""
    files = chapter_files(book, ch)
    for near in (ch - 1, ch + 1, ch - 2):   # a chapter without pictures borrows from its neighbour
        if files or near < 1: break
        files = chapter_files(book, near)
    if not files:
        print('  no picture for', book, ch)
        return None
    n = _used.get((book, ch), 0); _used[(book, ch)] = n + 1
    # Start in the middle of the chapter's pictures (usually its main event), then step through
    name = files[(len(files) // 2 + n * 3) % len(files)]
    slug = re.sub(r'[^a-z0-9]+', '-', f'{book}-{ch}-{re.search(r"-(\d+)_", name).group(1)}'.lower())
    out = OUT_IMG / f'{slug}.webp'
    if not out.exists():
        cached = CACHE / name
        if not cached.exists():
            d = api({'action': 'query', 'titles': f'File:{name}', 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': '720'})
            info = next(iter(d['query']['pages'].values()))['imageinfo'][0]
            for attempt in range(5):
                try:
                    with urllib.request.urlopen(urllib.request.Request(info['thumburl'], headers=UA), timeout=60) as r:
                        cached.write_bytes(r.read())
                    break
                except Exception:
                    if attempt == 4: raise
                    time.sleep(3 + attempt * 4)
            time.sleep(0.5)
        img = Image.open(cached).convert('RGB')
        img.thumbnail((640, 640))
        OUT_IMG.mkdir(parents=True, exist_ok=True)
        img.save(out, 'WEBP', quality=62, method=6)
    return {'src': f'/stories/{out.name}', 'source': f'https://commons.wikimedia.org/wiki/File:{name}'}


def parse_lathbury():
    raw = LATHBURY.read_text(encoding='utf-8').replace('\r\n', '\n')
    toc = raw[raw.index('CONTENTS'):raw.index('AN AFTERWORD')]
    titles = re.findall(r'^\s+[IVXL]+\.\s+(.+)$', toc, re.M)
    ot_titles, nt_titles = titles[:34], titles[34:]

    start = raw.index("CHILD'S STORY OF THE BIBLE\n\n\nCHAPTER I.")
    nt_start = raw.index("CHILD'S STORY OF THE BIBLE.\n\nTHE NEW TESTAMENT.")
    end = raw.index('AN AFTERWORD', nt_start)
    strip = lambda part: re.sub(r'\[(Illustration|Frontispiece)[^\]]*\]', '', part, flags=re.S)
    ot_text, nt_text = strip(raw[start:nt_start]), strip(raw[nt_start:end])

    def chapters(part, count):
        pieces = re.split(r'\n\s*CHAPTER [IVXL]+\.\s*\n', part)[1:]
        assert len(pieces) == count, (len(pieces), count)
        return pieces

    def paragraphs(body):
        paras = [re.sub(r'\s+', ' ', p).strip().replace('_', '').replace('--', '—') for p in re.split(r'\n\s*\n', body)]
        paras = [p for p in paras if p]
        while paras and paras[0].upper() == paras[0]:   # the chapter heading in capitals
            paras.pop(0)
        return paras

    ot = [paragraphs(b) for b in chapters(ot_text, 34)]
    nt = [paragraphs(b) for b in chapters(nt_text, 48)]
    return ot_titles, ot, nt_titles, nt


def main():
    OUT_DATA.mkdir(parents=True, exist_ok=True)
    collections = []

    # ── Original retellings ──
    original = runpy.run_path(str(ROOT / 'data-src' / 'stories_original.py'))['STORIES']
    items = []
    for i, st in enumerate(original, 1):
        sid = f'bs-{i:02d}'
        pic = picture(*st['img'])
        part = 'New Testament' if st['img'][0] in ('Matthew', 'Mark', 'Luke', 'John', 'Acts') else 'Old Testament'
        story = {'id': sid, 'number': i, 'title': st['title'], 'ref': st['ref'], 'part': part, 'image': pic,
                 'paragraphs': st['paragraphs'], 'questions': st['questions']}
        (OUT_DATA / f'{sid}.json').write_text(json.dumps(undash_all(story), ensure_ascii=False), encoding='utf-8', newline='\n')
        items.append({k: story[k] for k in ('id', 'number', 'title', 'ref', 'part')} | {'image': pic['src'] if pic else None})
        print('ok', sid, st['title'].encode('ascii', 'replace').decode())
    collections.append({'id': 'bible-stories', 'title': 'Bible Stories',
                        'about': 'Short stories from the whole Bible for young readers, with questions to talk about. Written for CelestialWorship.',
                        'credit': CREDIT, 'stories': items})

    # ── Lathbury ──
    ot_titles, ot, nt_titles, nt = parse_lathbury()
    items = []
    n = 0
    for part, titles, bodies, meta, prefix in (('Old Testament', ot_titles, ot, LATHBURY_OT, 'cl-ot'), ('New Testament', nt_titles, nt, LATHBURY_NT, 'cl-nt')):
        for i, (title, paras) in enumerate(zip(titles, bodies), 1):
            n += 1
            ref, img = meta[i - 1]
            sid = f'{prefix}-{i:02d}'
            pic = picture(*img)
            story = {'id': sid, 'number': n, 'title': title.strip(), 'ref': ref, 'part': part, 'image': pic, 'paragraphs': paras, 'questions': []}
            (OUT_DATA / f'{sid}.json').write_text(json.dumps(undash_all(story), ensure_ascii=False), encoding='utf-8', newline='\n')
            items.append({k: story[k] for k in ('id', 'number', 'title', 'ref', 'part')} | {'image': pic['src'] if pic else None})
            print('ok', sid, len(paras), 'paragraphs')
    collections.append({'id': 'classic', 'title': 'Classic Bible Stories',
                        'about': 'Mary A. Lathbury, Child’s Story of the Bible (1898). Public domain, from Project Gutenberg. Quoted speech is in the words of the King James Version.',
                        'credit': CREDIT, 'stories': items})

    (OUT_DATA / 'index.json').write_text(json.dumps(undash_all({'collections': collections}), ensure_ascii=False), encoding='utf-8', newline='\n')
    total = sum(f.stat().st_size for f in OUT_IMG.glob('*.webp'))
    print('images', len(list(OUT_IMG.glob('*.webp'))), f'{total // 1024} KB')


main()
