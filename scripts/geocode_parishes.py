"""
Put the parishes shipped with the app (public/data/parishes_seed.json and the listed parishes) on the map.

    python -I -X utf8 scripts/geocode_parishes.py          # look up any parish not yet in the cache, then rebuild
    python -I scripts/build_parishes.py                     # (run by the above) writes the points into the JSON

Addresses are looked up with OpenStreetMap's Nominatim (one request a second, as its policy asks) and kept in
data-src/parish_geocode.json, so each parish is looked up once and a person can correct a point by hand there.
"precision" says how close the point is: "address" (the street), "place" (the church itself, found by name)
or "town" (only the town was found — the map says it is approximate).
"""
import json
import pathlib
import runpy
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / 'data-src' / 'parish_geocode.json'
SEED = ROOT / 'public' / 'data' / 'parishes_seed.json'
UA = 'CelestialWorship directory build (https://celestialworship.online)'


def search(**params):
    time.sleep(1.1)
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'format': 'jsonv2', 'limit': 1, **params})
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                rows = json.loads(r.read().decode('utf-8'))
            return (float(rows[0]['lat']), float(rows[0]['lon'])) if rows else None
        except Exception:
            time.sleep(5 * (attempt + 1))
    return None


def locate(p):
    country, state, city, address = p.get('country') or '', p.get('state_region') or '', p.get('city') or '', p.get('address') or ''
    tries = []
    if p['id'].startswith('seed-'):
        tries.append(('place', {'q': f"Celestial Church of Christ, {city}, {country}"}))
    # An address that is only the town name says nothing more than the town
    if address and address.strip().lower() not in {city.lower(), f'{city}, {state}'.lower()}:
        tries.append(('address', {'q': address if country.lower() in address.lower() else f'{address}, {country}'}))
    tries.append(('town', {'q': ', '.join(x for x in (city, state, country) if x)}))
    for precision, params in tries:
        hit = search(**params)
        if hit:
            return {'lat': round(hit[0], 6), 'lng': round(hit[1], 6), 'precision': precision}
    return None


def main():
    cache = json.loads(CACHE.read_text(encoding='utf-8')) if CACHE.exists() else {}
    listed = json.loads((ROOT / 'public' / 'data' / 'parishes_listed.json').read_text(encoding='utf-8'))
    seed = json.loads(SEED.read_text(encoding='utf-8'))
    todo = [p for p in seed + listed if p['id'] not in cache]
    print(len(todo), 'to look up')
    for i, p in enumerate(todo, 1):
        cache[p['id']] = locate(p)
        print(i, p['id'], cache[p['id']], flush=True)
        if i % 10 == 0:
            CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8', newline='\n')
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8', newline='\n')
    # The headquarters file is written here; the listed parishes by build_parishes.py
    for p in seed:
        hit = cache.get(p['id'])
        p['latitude'], p['longitude'] = (hit['lat'], hit['lng']) if hit else (None, None)
        if hit:
            p['geo_precision'] = hit['precision']
    SEED.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    runpy.run_path(str(ROOT / 'scripts' / 'build_parishes.py'))
    found = sum(1 for v in cache.values() if v)
    print(found, 'of', len(cache), 'on the map;', sum(1 for v in cache.values() if v and v['precision'] == 'town'), 'by town only')


if __name__ == '__main__':
    main()
