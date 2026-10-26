"""QR codes for the install page and printed notices: public/qr/install{,-android,-ios}.svg

    pip install segno
    python -I scripts/build_install_qr.py [https://celestialworship.online]
"""
import pathlib
import sys

import segno

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'qr'
BASE = (sys.argv[1] if len(sys.argv) > 1 else 'https://celestialworship.online').rstrip('/')

LINKS = {
    'install': f'{BASE}/install',
    'install-android': f'{BASE}/install?device=android',
    'install-ios': f'{BASE}/install?device=ios',
}

OUT.mkdir(parents=True, exist_ok=True)
for name, url in LINKS.items():
    # High error correction: still scans when printed small or slightly damaged
    qr = segno.make(url, error='h')
    qr.save(str(OUT / f'{name}.svg'), scale=8, border=2, dark='#0A1628', light='#FFFFFF', xmldecl=False, svgns=True, title=url)
    print(name, url)
