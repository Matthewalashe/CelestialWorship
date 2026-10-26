"""
Today's countries for the world map (GeoJSON), from Natural Earth 1:50m (public domain, naturalearthdata.com).

    python -I scripts/build_world_geo.py <ne_50m_admin_0_countries.geojson>

Simplified (Douglas-Peucker, 0.03°) and rounded to three decimals so the whole world is a light download.
Keeps each country's English name, two-letter code (for its flag), label point and label rank. Borders are shown
for orientation only, not as a position on any disputed territory (PRINCIPLES §1).
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'maps' / 'countries.json'
TOL = 0.03


def simplify(points, tol):
    if len(points) < 4:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = points[a], points[b]
        dx, dy = x2 - x1, y2 - y1
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        far, idx = 0.0, None
        for i in range(a + 1, b):
            x, y = points[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm
            if d > far:
                far, idx = d, i
        if idx is not None and far > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]


def ring(r):
    # A closed ring starts and ends at one point: split it at the point farthest from the start
    x0, y0 = r[0]
    far = max(range(len(r)), key=lambda i: (r[i][0] - x0) ** 2 + (r[i][1] - y0) ** 2)
    s = simplify(r[:far + 1], TOL) + simplify(r[far:], TOL)[1:]
    s = [[round(x, 3), round(y, 3)] for x, y in s]
    return s if len(s) >= 4 else None


def main():
    data = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
    feats = []
    for f in data['features']:
        p = f['properties']
        if p.get('CONTINENT') == 'Antarctica':
            continue
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        out = []
        for poly in polys:
            rings = [r for r in (ring(rr) for rr in poly) if r]
            if rings:
                out.append(rings)
        if not out:
            continue
        iso = p.get('ISO_A2_EH') or p.get('ISO_A2')
        feats.append({'type': 'Feature', 'properties': {
            'name': p.get('NAME_EN') or p['NAME'], 'iso2': iso if iso and iso != '-99' else None, 'iso3': p.get('ADM0_A3'),
            'label': [round(p['LABEL_X'], 2), round(p['LABEL_Y'], 2)], 'rank': p.get('LABELRANK', 5)},
            'geometry': {'type': 'MultiPolygon', 'coordinates': out}})
    OUT.write_text(json.dumps({'type': 'FeatureCollection', 'source': 'Natural Earth 1:50m (public domain)', 'features': feats},
                              ensure_ascii=False, separators=(',', ':')), encoding='utf-8', newline='\n')
    print(len(feats), 'countries,', OUT.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
