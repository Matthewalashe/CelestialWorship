"""
Tile the antique map "Palestine in the time of Christ" (Edward Weller, after Wilson, Kiepert & Menke, London: Strahan,
c. 1884; public domain, Wikimedia Commons) onto the web map, so it lines up with today's map and zooms like it.

    python scripts/build_old_maps.py <Edward_Weller_Palestine_in_the_time_of_Christ.jpg>   (the 5997 x 8821 scan)

Needs Pillow. Writes public/maps/weller/{z}/{x}/{y}.jpg for zooms 6 to 11.

How the scan was placed (measured on a 2000-px-wide copy, then scaled to the scan):
  parallels are straight and evenly spaced, 640 px a degree: 34° N at y = 200, 30° N at y = 2759;
  meridians are straight, every 30', converging northwards about the 36° E meridian at x = 1323;
  a degree of longitude is 543 px at y = 365 (33.7° N) and 576 px at y = 2645 (30.2° N), in between linearly.
Checked against Jerusalem, the north end of the Dead Sea and the Sea of Galilee.
"""
import math
import pathlib
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'maps' / 'weller'

WEST, EAST, SOUTH, NORTH = 34.0, 37.0, 30.0, 34.0
ZOOMS = range(6, 12)
TILE = 256
CELLS = 8  # mesh cells per tile side


def to_source(lat, lon, scale):
    """Where a point lies on the scan (pixels of the full-size image)"""
    y = 200 + (34.0 - lat) * 640
    k = 543 + (576 - 543) * (y - 365) / (2645 - 365)
    x = 1323 + (lon - 36.0) * k
    return x * scale, y * scale


def tile_bounds(z, x, y):
    n = 2 ** z
    lon_w = x / n * 360 - 180
    lon_e = (x + 1) / n * 360 - 180
    lat_n = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_s = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lon_w, lon_e, lat_s, lat_n


def lat_at(z, y_px):
    n = 2 ** z * TILE
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y_px / n))))


def tile_range(z):
    n = 2 ** z
    def tx(lon): return int((lon + 180) / 360 * n)
    def ty(lat): return int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return range(tx(WEST), tx(EAST) + 1), range(ty(NORTH), ty(SOUTH) + 1)


def main():
    src = Image.open(sys.argv[1]).convert('RGB')
    scale = src.size[0] / 2000
    count = 0
    for z in ZOOMS:
        xs, ys = tile_range(z)
        for tx in xs:
            for ty in ys:
                mesh = []
                for i in range(CELLS):
                    for j in range(CELLS):
                        x0, y0 = j * TILE // CELLS, i * TILE // CELLS
                        x1, y1 = (j + 1) * TILE // CELLS, (i + 1) * TILE // CELLS
                        def corner(px, py):
                            lon = (tx * TILE + px) / (2 ** z * TILE) * 360 - 180
                            lat = lat_at(z, ty * TILE + py)
                            return to_source(lat, lon, scale)
                        quad = [*corner(x0, y0), *corner(x0, y1), *corner(x1, y1), *corner(x1, y0)]
                        mesh.append(((x0, y0, x1, y1), quad))
                tile = src.transform((TILE, TILE), Image.Transform.MESH, mesh, Image.Resampling.BICUBIC, fillcolor=(236, 226, 200))
                path = OUT / str(z) / str(tx) / f'{ty}.jpg'
                path.parent.mkdir(parents=True, exist_ok=True)
                tile.save(path, quality=72, optimize=True, progressive=True)
                count += 1
        print('zoom', z, 'done')
    print(count, 'tiles')


if __name__ == '__main__':
    main()
