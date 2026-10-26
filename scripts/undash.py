"""
No em dashes in the app's words (house style). Scripture keeps its own punctuation and is never changed.

    python -I -X utf8 scripts/undash.py            # rewrite app text, translations and data
    from undash import undash, undash_all          # used by the data builders before they write

Each dash is replaced by looking only at what is right beside it, so a sentence in the code and the same
sentence as a translation key always come out the same:
  at the start of a text it goes; after a closing quote it becomes a space; between numbers an en dash;
  before a lowercase word a comma; otherwise a colon.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DASH = '\u2014'


def undash(s: str) -> str:
    if DASH not in s:
        return s
    s = re.sub(r'(\d(?:[ \t]?[ap]\.?m\.?|[ \t]?h)?)[ \t]*' + DASH + r'[ \t]*(?=\d)', '\\1\u2013', s, flags=re.I)
    s = re.sub(r'(^|[\'">\n(\[])[ \t]*' + DASH + r'[ \t]*', '\\1', s)
    s = re.sub(r'([\u201d"])[ \t]*' + DASH + r'[ \t]*', '\\1 ', s)
    s = re.sub(r'[ \t]*' + DASH + r'[ \t]*(?=(\S))', lambda m: ', ' if m.group(1).islower() else ': ', s)
    return re.sub(r'[ \t]*' + DASH, '', s)


def undash_all(value):
    """Every string in a JSON value, keys included"""
    if isinstance(value, str):
        return undash(value)
    if isinstance(value, list):
        return [undash_all(v) for v in value]
    if isinstance(value, dict):
        return {undash(k): undash_all(v) for k, v in value.items()}
    return value


# Code that reads an em dash typed by someone (e.g. in a Bible reference) keeps it
KEEP_LINE = re.compile(r'/\\s\*' + DASH)


def rewrite_text(path: pathlib.Path):
    text = path.read_text(encoding='utf-8')
    if DASH not in text:
        return 0
    lines = text.split('\n')
    out = [line if KEEP_LINE.search(line) else undash(line) for line in lines]
    new = '\n'.join(out)
    if new != text:
        path.write_text(new, encoding='utf-8', newline='\n')
        return 1
    return 0


def rewrite_json(path: pathlib.Path):
    raw = path.read_text(encoding='utf-8')
    if DASH not in raw:
        return 0
    data = json.loads(raw)
    stripped = raw.lstrip()
    if '\n' not in stripped[:200]:
        dumped = json.dumps(undash_all(data), ensure_ascii=False, separators=(',', ':'))
    else:
        indent = 0 if stripped.startswith('{\n"') or stripped.startswith('[\n{') else 2
        dumped = json.dumps(undash_all(data), ensure_ascii=False, indent=indent)
    end = '\n' if raw.endswith('\n') else ''
    path.write_text(dumped + end, encoding='utf-8', newline='\n')
    return 1


def main():
    changed = 0
    for p in list((ROOT / 'src').rglob('*.ts')) + list((ROOT / 'src').rglob('*.tsx')) + [ROOT / 'index.html'] + list((ROOT / 'docs').glob('*.md')):
        changed += rewrite_text(p)
    for p in (ROOT / 'public' / 'i18n').glob('*.json'):
        changed += rewrite_json(p)
    for p in (ROOT / 'public' / 'data').rglob('*.json'):
        if 'bible' in p.relative_to(ROOT / 'public' / 'data').parts:
            continue
        changed += rewrite_json(p)
    for name in ('parishes_listed.py', 'stories_original.py', 'constitution_1980.py'):
        changed += rewrite_text(ROOT / 'data-src' / name)
    print(changed, 'files changed')


if __name__ == '__main__':
    sys.exit(main())
