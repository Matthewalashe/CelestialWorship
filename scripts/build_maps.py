"""
Build the Bible-lands maps from Natural Earth (public domain, naturalearthdata.com).

    python -I scripts/build_maps.py <folder with Natural Earth GeoJSON>

Needs ne_10m_admin_0_countries, ne_50m_admin_0_countries, ne_10m_lakes and
ne_10m_rivers_lake_centerlines (.geojson, from github.com/nvkelso/natural-earth-vector).

Writes public/data/maps/{holyland,world}.json: SVG paths already projected
(equirectangular, scaled by cos(middle latitude)), with the projection so the app can place points.
"""
import json, math, sys, pathlib

SRC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'data' / 'maps'

REGIONS = {
    # The Nile Delta and Sinai to Galilee and the King's Highway
    'holyland': dict(west=30.8, east=37.0, south=28.2, north=33.9, k=100, tol=0.004,
                     countries='ne_10m_admin_0_countries', min_lake_area=0.0,
                     rivers={'Jordan', 'Yarmuk', 'Nile'}),
    # Rome to Persia, the Black Sea to the Nile's cataracts
    'world': dict(west=10.0, east=62.0, south=12.0, north=46.0, k=10, tol=0.04,
                  countries='ne_50m_admin_0_countries', min_lake_area=0.05,
                  rivers={'Nile', 'Euphrates', 'Tigris', 'Jordan', 'Orontes', 'Halys', 'Kızılırmak', 'Kizilirmak', 'Araks', 'Aras'}),
}


SHORT_NAMES = {'Turkish Republic of Northern Cyprus': 'Northern Cyprus', 'Bosnia and Herzegovina': 'Bosnia', 'United Arab Emirates': 'UAE'}


def load(name):
    with open(SRC / f'{name}.geojson', encoding='utf-8') as f:
        return json.load(f)['features']


def clip_ring(ring, w, e, s, n):
    """Sutherland–Hodgman against the bounding box (correct for a rectangle)."""
    def clip(points, inside, cross):
        out = []
        for i, cur in enumerate(points):
            prev = points[i - 1]
            if inside(cur):
                if not inside(prev): out.append(cross(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(cross(prev, cur))
        return out

    def x_at(a, b, x): t = (x - a[0]) / (b[0] - a[0]); return (x, a[1] + t * (b[1] - a[1]))
    def y_at(a, b, y): t = (y - a[1]) / (b[1] - a[1]); return (a[0] + t * (b[0] - a[0]), y)

    pts = [tuple(p[:2]) for p in ring]
    for inside, cross in (
        (lambda p: p[0] >= w, lambda a, b: x_at(a, b, w)),
        (lambda p: p[0] <= e, lambda a, b: x_at(a, b, e)),
        (lambda p: p[1] >= s, lambda a, b: y_at(a, b, s)),
        (lambda p: p[1] <= n, lambda a, b: y_at(a, b, n)),
    ):
        if not pts: break
        pts = clip(pts, inside, cross)
    return pts


def simplify(points, tol):
    """Douglas–Peucker."""
    if len(points) < 4: return points
    def dist(p, a, b):
        if a == b: return math.dist(p, a)
        (x, y), (x1, y1), (x2, y2) = p, a, b
        return abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / math.hypot(x2 - x1, y2 - y1)
    keep = [False] * len(points); keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        i, j = stack.pop()
        best, idx = 0, -1
        for k in range(i + 1, j):
            d = dist(points[k], points[i], points[j])
            if d > best: best, idx = d, k
        if best > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(points, keep) if k]


def polygons(geom):
    if geom['type'] == 'Polygon': return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon': return geom['coordinates']
    return []


def lines(geom):
    if geom['type'] == 'LineString': return [geom['coordinates']]
    if geom['type'] == 'MultiLineString': return geom['coordinates']
    return []


def ring_area(r):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2


def build(name, cfg):
    w, e, s, n, k, tol = (cfg[x] for x in ('west', 'east', 'south', 'north', 'k', 'tol'))
    cos = math.cos(math.radians((s + n) / 2))
    proj = lambda p: (round((p[0] - w) * k * cos, 1), round((n - p[1]) * k, 1))
    width, height = proj((e, s))

    def path(rings, closed=True):
        parts = []
        for r in rings:
            pts = [proj(p) for p in r]
            dedup = [pts[0]] + [p for a, p in zip(pts, pts[1:]) if p != a]
            if len(dedup) < (3 if closed else 2): continue
            parts.append('M' + 'L'.join(f'{x:g} {y:g}' for x, y in dedup) + ('Z' if closed else ''))
        return ''.join(parts)

    countries = []
    for f in load(cfg['countries']):
        p = f['properties']
        rings = []
        for poly in polygons(f['geometry']):
            for ring in poly[:1]:  # outer rings; lakes are drawn on top
                c = clip_ring(ring, w, e, s, n)
                if len(c) >= 3:
                    c = simplify(c + [c[0]], tol)
                    if len(c) >= 4 and ring_area(c) > tol * tol: rings.append(c)
        if rings:
            countries.append({
                'id': p.get('ADM0_A3') or p.get('ISO_A3'),
                'name': SHORT_NAMES.get(p.get('NAME_EN') or p.get('NAME'), p.get('NAME_EN') or p.get('NAME')),
                'd': path(rings),
                # label point: centre of the largest piece
                'label': (lambda r: proj((sum(q[0] for q in r) / len(r), sum(q[1] for q in r) / len(r))))(max(rings, key=ring_area)),
            })

    lakes = []
    for f in load('ne_10m_lakes'):
        for poly in polygons(f['geometry']):
            c = clip_ring(poly[0], w, e, s, n)
            if len(c) >= 3 and ring_area(c) >= cfg['min_lake_area']:
                c = simplify(c + [c[0]], tol / 2)
                if len(c) >= 4:
                    lakes.append({'name': f['properties'].get('name_en') or f['properties'].get('name'), 'd': path([c])})

    rivers = []
    for f in load('ne_10m_rivers_lake_centerlines'):
        nm = f['properties'].get('name_en') or f['properties'].get('name') or ''
        if not any(r.lower() in nm.lower() for r in cfg['rivers']): continue
        segs = []
        for line in lines(f['geometry']):
            # keep runs of points inside the box
            run = []
            for pt in line:
                if w <= pt[0] <= e and s <= pt[1] <= n: run.append(pt[:2])
                else:
                    if len(run) > 1: segs.append(run)
                    run = []
            if len(run) > 1: segs.append(run)
        segs = [simplify(sg, tol / 2) for sg in segs]
        if segs: rivers.append({'name': nm, 'd': path(segs, closed=False)})

    out = {
        'region': name,
        'source': 'Natural Earth (public domain), naturalearthdata.com. Borders are shown for orientation only and are not a position on any disputed territory.',
        'projection': {'west': w, 'north': n, 'k': k, 'cos': round(cos, 6)},
        'width': width, 'height': height,
        'countries': sorted(countries, key=lambda c: c['name']),
        'lakes': lakes, 'rivers': rivers,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    text = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    (OUT / f'{name}.json').write_text(text, encoding='utf-8', newline='\n')
    print(name, f'{len(text) // 1024} KB', len(countries), 'countries', len(lakes), 'lakes', len(rivers), 'rivers',
          '|', ', '.join(c['name'] for c in out['countries']))


for name, cfg in REGIONS.items():
    build(name, cfg)
