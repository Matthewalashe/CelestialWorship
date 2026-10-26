"""The Egun (Gun) translation sheet, for Gun speakers to fill in.

    python -I -X utf8 scripts/egun_review.py export   # write data-src/i18n_review/egun.csv (keeps what is already filled in)
    python -I -X utf8 scripts/egun_review.py import   # copy the filled-in Egun column into public/i18n/egun.json

The sheet lists every word of the app (scripts/i18n-strings.json, from `node scripts/i18n.cjs extract`) and of the
Order of Service (data-src/devotion_strings.snapshot.json), with the French and Yorùbá beside the English to help.
Google Translate has no Gun, so nothing here is machine translated: a row is used only once a person has written it.
Open the CSV in Excel or Google Sheets, fill the "egun" column, save as CSV (UTF-8) and run `import`.
"""
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEET = ROOT / 'data-src' / 'i18n_review' / 'egun.csv'
CATALOG = ROOT / "public" / "i18n" / "egun.json"  # created on the first import; add egun to UI_LANGUAGES when it is ready


def load(path):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}


def export():
    ui = load(ROOT / 'scripts' / 'i18n-strings.json')
    ui = list(ui) if isinstance(ui, (list, dict)) else []
    devotion = load(ROOT / 'data-src' / 'devotion_strings.snapshot.json')
    yo, fr, egun = (load(ROOT / 'public' / 'i18n' / f'{l}.json') for l in ('yo', 'fr', 'egun'))
    done = {}
    if SHEET.exists():
        with SHEET.open(encoding='utf-8-sig', newline='') as f:
            done = {r['english']: r['egun'] for r in csv.DictReader(f) if r.get('egun')}
    rows, seen = [], set()
    # Only words people read: the catalogs hold a translation for those (identifiers and CSS never get one)
    for where, strings in (('app', ui), ('order of service', devotion)):
        for s in strings:
            if s in seen or (s not in yo and s not in fr):
                continue
            seen.add(s)
            rows.append({'where': where, 'english': s, 'french': fr.get(s, ''), 'yoruba': yo.get(s, ''),
                         'egun': done.get(s) or egun.get(s, '')})
    SHEET.parent.mkdir(parents=True, exist_ok=True)
    with SHEET.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['where', 'english', 'french', 'yoruba', 'egun'])
        w.writeheader()
        w.writerows(rows)
    print(len(rows), 'rows,', sum(1 for r in rows if r['egun']), 'in Egun ->', SHEET.relative_to(ROOT))


def import_():
    cat = load(CATALOG)
    with SHEET.open(encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            if r.get('egun', '').strip():
                cat[r['english']] = r['egun'].strip()
    CATALOG.write_text(json.dumps(dict(sorted(cat.items())), ensure_ascii=False, indent=0) + '\n', encoding='utf-8', newline='\n')
    print(len(cat), 'Egun entries ->', CATALOG.relative_to(ROOT))


if __name__ == '__main__':
    {'export': export, 'import': import_}[sys.argv[1]]()
