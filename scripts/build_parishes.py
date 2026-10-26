"""
Write public/data/parishes_listed.json from data-src/parishes_listed.py (parishes transcribed from the
Celestial Church of Christ Worldwide "Parishes Worldwide" page).

    python -I scripts/build_parishes.py

Points on the map come from data-src/parish_geocode.json (scripts/geocode_parishes.py).
"""
import json, re, runpy, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = {'source': 'Celestial Church of Christ Worldwide — Parishes Worldwide (archived list, 2005–2012)',
          'url': 'http://www.celestialchurchofchrist-worldwide.org/parishes_worldwide.htm'}

geo_path = ROOT / 'data-src' / 'parish_geocode.json'
geo = json.loads(geo_path.read_text(encoding='utf-8')) if geo_path.exists() else {}
rows = runpy.run_path(str(ROOT / 'data-src' / 'parishes_listed.py'))['LISTED']
out, seen = [], set()
for r in rows:
    pid = 'listed-' + re.sub(r'[^a-z0-9]+', '-', f"{r['country']}-{r['city'] or ''}-{r['name']}".lower()).strip('-')
    if pid in seen:
        raise SystemExit(f'duplicate: {pid}')
    seen.add(pid)
    own = r.pop('source', None)
    listing = {'source': own[0], 'url': own[1]} if own else SOURCE
    at = geo.get(pid)
    point = {'latitude': at['lat'], 'longitude': at['lng'], 'geo_precision': at['precision']} if at else {}
    out.append({'id': pid, **r, **point, 'kind': 'parish', 'listing': listing})
(ROOT / 'public' / 'data' / 'parishes_listed.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8', newline='\n')
print(len(out), 'parishes')
