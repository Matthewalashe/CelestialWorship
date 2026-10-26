"""Machine-translation drafts for strings that have no translation yet (Google Translate's public endpoint).

    python -I -X utf8 scripts/translate_mt.py strings.json yo fr fon

Each result is cached in data-src/mt/<lang>.json, so a string is translated once; a human translation in
public/i18n/<lang>.json always wins over the machine draft. Gun (Egun) is not offered by Google: the closest
language it has is Fon ("fon"), a related Gbe language, used only as a draft for a Gun speaker to correct.
"""
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / 'data-src' / 'mt'


def translate(text, target):
    url = 'https://translate.googleapis.com/translate_a/single?' + urllib.parse.urlencode({'client': 'gtx', 'sl': 'en', 'tl': target, 'dt': 't', 'q': text})
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (CelestialWorship build)'})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read().decode('utf-8'))
            return ''.join(seg[0] for seg in data[0] if seg and seg[0])
        except Exception:
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    strings = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
    CACHE.mkdir(parents=True, exist_ok=True)
    for lang in sys.argv[2:]:
        path = CACHE / f'{lang}.json'
        cache = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
        todo = [s for s in strings if s not in cache]
        print(lang, len(todo), 'to translate')
        with ThreadPoolExecutor(max_workers=4) as pool:
            for s, t in zip(todo, pool.map(lambda s: translate(s, lang), todo)):
                if t:
                    cache[s] = t
        path.write_text(json.dumps(dict(sorted(cache.items())), ensure_ascii=False, indent=0) + '\n', encoding='utf-8', newline='\n')
        print(lang, len(cache), 'cached')


if __name__ == '__main__':
    main()
