"""
Postcards to collect in the Bible games: a photograph of each place as it is today (freely licensed, from the lead
image of its Wikipedia article, via Wikimedia Commons), with the photographer and licence for the credit.

    python -I -X utf8 scripts/build_postcards.py

Reads the places from src/data/bibleLands.ts and src/data/christianity.ts (the ids and titles below) and writes
public/data/postcards.json. Only images Wikipedia marks as free are used (pilicense=free); places without one get
no picture and show their name on the card instead.
"""
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'postcards.json'
UA = {'User-Agent': 'CelestialWorship build (https://celestialworship.online)'}

# Place id → Wikipedia article (the place, or what stands there now)
ARTICLES = {
    'nazareth': 'Basilica of the Annunciation', 'cana': 'Cana', 'capernaum': 'Capernaum', 'magdala': 'Magdala',
    'bethsaida': 'Bethsaida', 'chorazin': 'Chorazin', 'gergesa': 'Kursi, Sea of Galilee', 'nain': 'Givat HaMoreh', 'tabor': 'Mount Tabor',
    'tabgha': 'Tabgha', 'caesarea-philippi': 'Caesarea Philippi', 'tyre': 'Tyre, Lebanon', 'sidon': 'Sidon', 'hermon': 'Mount Hermon',
    'dan': 'Tel Dan', 'megiddo': 'Tel Megiddo', 'carmel': 'Mount Carmel', 'sychar': "Jacob's Well", 'shechem': 'Shechem',
    'samaria': 'Sebastia, Nablus', 'shiloh': 'Shiloh (biblical city)', 'bethel': 'Bethel', 'jerusalem': 'Old City of Jerusalem',
    'temple': 'Western Wall', 'golgotha': 'Church of the Holy Sepulchre', 'gethsemane': 'Gethsemane', 'olives': 'Mount of Olives',
    'bethany': 'Al-Eizariya', 'bethlehem': 'Church of the Nativity', 'jericho': 'Jericho', 'wilderness': 'Judaean Desert',
    'bethabara': 'Al-Maghtas', 'emmaus': 'Emmaus Nicopolis', 'hebron': 'Cave of the Patriarchs', 'beersheba': 'Tel Be\'er Sheva',
    'joppa': 'Jaffa', 'caesarea': 'Caesarea Maritima', 'ashdod': 'Ashdod', 'masada': 'Masada', 'gadara': 'Umm Qais',
    'nebo': 'Mount Nebo', 'rabbah': 'Amman Citadel', 'machaerus': 'Machaerus', 'petra': 'Petra', 'egypt-flight': 'Coptic Cairo',
    'goshen': 'Zagazig', 'memphis': 'Memphis, Egypt', 'on': 'Heliopolis (ancient Egypt)', 'sinai': 'Mount Sinai',
    'kadesh': 'Kadesh (biblical)', 'ezion-geber': 'Ezion-Geber', 'ur': 'Ziggurat of Ur', 'haran': 'Harran', 'babylon': 'Babylon', 'nineveh': 'Nineveh',
    'shushan': 'Tomb of Daniel', 'damascus': 'Damascus', 'antioch': 'Church of Saint Peter', 'tarsus': 'Tarsus, Mersin', 'ephesus': 'Ephesus', 'patmos': 'Patmos',
    'philippi': 'Philippi', 'athens': 'Areopagus', 'corinth': 'Acrocorinth', 'rome': 'Rome', 'melita': "St. Paul's Bay",
    'paphos': 'Paphos', 'seleucia': 'Seleucia Pieria', 'salamis': 'Salamis, Cyprus', 'perga': 'Perga', 'attalia': 'Antalya',
    'pisidian-antioch': 'Antioch of Pisidia', 'iconium': 'Konya', 'derbe': 'Karaman', 'troas': 'Alexandria Troas',
    'neapolis': 'Kavala', 'thessalonica': 'Thessaloniki', 'berea': 'Veria', 'cenchreae': 'Cenchreae', 'miletus': 'Miletus',
    'myra': 'Myra', 'fair-havens': 'Kaloi Limenes', 'syracuse': 'Syracuse, Sicily', 'rhegium': 'Reggio Calabria', 'puteoli': 'Pozzuoli',
    'colossae': 'Honaz', 'laodicea': 'Laodicea on the Lycus', 'crete': 'Gortyn', 'ararat': 'Mount Ararat',
    'thebes': 'Karnak', 'cyrene': 'Cyrene, Libya',
    # No free lead photo of the city or province: Gaza's ancient church, and the castle hill of Ancyra, Galatia's capital
    'gaza': 'Church of Saint Porphyrius', 'galatia': 'Ankara Castle',
    # The story of the Church
    'spread-jerusalem': 'Old City of Jerusalem', 'spread-damascus': 'Damascus', 'spread-antioch': 'Church of Saint Peter',
    'spread-philippi': 'Philippi', 'spread-ephesus': 'Ephesus', 'spread-rome': 'Rome', 'spread-alexandria': 'Alexandria',
    'spread-armenia': 'Etchmiadzin Cathedral', 'spread-nicaea': 'Nicaea', 'spread-constantinople': 'Hagia Sophia', 'spread-axum': 'Aksum',
    'spread-carthage': 'Hippo Regius', 'spread-ireland': 'Saint Patrick', 'spread-kyiv': 'Saint Sophia Cathedral, Kyiv',
    'spread-wittenberg': 'All Saints\' Church, Wittenberg', 'spread-badagry': 'Badagry', 'spread-aladura': 'Christ Apostolic Church',
    'spread-porto-novo': 'Porto-Novo', 'spread-imeko': 'Imeko',
}


def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read())
        except Exception:
            time.sleep(2 * (attempt + 1))
    return {}


def main():
    cards = {}
    items = list(ARTICLES.items())
    for i in range(0, len(items), 40):
        batch = dict(items[i:i + 40])
        q = urllib.parse.urlencode({'action': 'query', 'titles': '|'.join(set(batch.values())), 'prop': 'pageimages',
                                    'piprop': 'name', 'pilicense': 'free', 'redirects': 1, 'format': 'json'})
        d = get('https://en.wikipedia.org/w/api.php?' + q).get('query', {})
        norm = {n['from']: n['to'] for n in d.get('normalized', []) + d.get('redirects', [])}
        files = {p['title']: p.get('pageimage') for p in d.get('pages', {}).values()}
        for pid, title in batch.items():
            t = norm.get(title, title)
            t = norm.get(t, t)
            if files.get(t):
                cards[pid] = {'file': files[t]}
        time.sleep(1)
    names = sorted({c['file'] for c in cards.values()})
    meta = {}
    for i in range(0, len(names), 40):
        q = urllib.parse.urlencode({'action': 'query', 'titles': '|'.join('File:' + n for n in names[i:i + 40]), 'prop': 'imageinfo',
                                    'iiprop': 'url|extmetadata', 'iiurlwidth': '640', 'format': 'json'})
        d = get('https://commons.wikimedia.org/w/api.php?' + q).get('query', {})
        norm = {n['to']: n['from'] for n in d.get('normalized', [])}
        for p in d.get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            em = ii.get('extmetadata', {})
            lic = em.get('LicenseShortName', {}).get('value', '')
            if not ii.get('thumburl') or not re.search(r'CC|Public domain|PD|GFDL', lic, re.I) or re.search(r'NC|ND', lic):
                continue
            artist = re.sub('<[^>]+>', '', em.get('Artist', {}).get('value', '')).strip()[:80] or 'Wikimedia Commons'
            title = p['title'][5:]
            meta[norm.get(p['title'], p['title'])[5:]] = {'src': ii['thumburl'], 'credit': artist, 'license': lic, 'source': ii.get('descriptionurl')}
            meta[title] = meta[norm.get(p['title'], p['title'])[5:]]
        time.sleep(1)
    out = {pid: meta[c['file'].replace('_', ' ')] for pid, c in cards.items() if meta.get(c['file'].replace('_', ' '))}
    OUT.write_text(json.dumps(dict(sorted(out.items())), ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print(len(out), 'postcards with photographs of', len(ARTICLES))
    print('without:', sorted(set(ARTICLES) - set(out)))


if __name__ == '__main__':
    main()
