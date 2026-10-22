"""
Build src/data/dailyVerses.json: one KJV verse (or short passage) for each day of the year.
References are listed here; the text is taken from public/data/bible/en so it always matches
the app's Bible. Invalid or duplicate references stop the build.

Usage: python scripts/build_daily_verses.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KJV = ROOT / 'public' / 'data' / 'bible' / 'en'
OUT = ROOT / 'src' / 'data' / 'dailyVerses.json'

REFS = """
Psalm 118:24; Proverbs 3:5-6; Philippians 4:13; Isaiah 41:10; Jeremiah 29:11; Romans 8:28; Joshua 1:9; Psalm 23:1;
Matthew 11:28; John 3:16; Psalm 46:1; Isaiah 40:31; Romans 12:2; Psalm 27:1; Hebrews 11:1; Psalm 37:4; 2 Timothy 1:7;
1 John 4:4; Psalm 91:1-2; Galatians 5:22-23; Ephesians 6:10; Psalm 119:105; Matthew 6:33; 1 Corinthians 10:13; James 1:5;
Psalm 34:8; Colossians 3:23; Psalm 100:4; 1 Peter 5:7; Isaiah 53:5; Lamentations 3:22-23; Psalm 121:1-2; John 14:27;
Romans 15:13; Psalm 55:22; Deuteronomy 31:6; Isaiah 26:3; Philippians 4:6-7; Psalm 16:11; John 16:33; Romans 5:8;
Ephesians 2:8-9; Psalm 103:2-3; Micah 6:8; Matthew 5:16; John 15:5; Psalm 19:14; 2 Corinthians 5:17; Hebrews 13:8;
Psalm 145:18; Proverbs 18:10; Isaiah 43:2; Psalm 30:5; Romans 10:9; John 11:25; Psalm 62:1-2; Nahum 1:7; 1 John 1:9;
Psalm 51:10; Matthew 7:7; Psalm 9:1; John 8:12; Psalm 32:8; Isaiah 9:6; 2 Chronicles 7:14; Psalm 40:1-2; Mark 11:24;
Psalm 84:11; Philippians 1:6; Psalm 139:14; Exodus 14:14; Zephaniah 3:17; Romans 8:31; Psalm 18:2; John 10:10;
Matthew 28:20; Psalm 4:8; Proverbs 16:3; Isaiah 54:17; Psalm 107:1; Hebrews 4:16; Psalm 73:26; 1 Thessalonians 5:16-18;
Psalm 150:6; John 14:6; Psalm 33:20-21; Romans 8:38-39; Psalm 63:1; Jeremiah 33:3; Psalm 5:3; Matthew 5:8;
Isaiah 12:2; Psalm 28:7; 2 Corinthians 12:9; Psalm 86:5; Galatians 2:20; Psalm 147:3; John 1:5; Psalm 31:24;
Proverbs 4:23; Isaiah 58:11; Psalm 125:1; Romans 12:12; Psalm 57:10; Matthew 6:34; Psalm 95:1-2; 1 Corinthians 13:4-5;
Psalm 20:7; Hebrews 12:1-2; Psalm 29:11; Ephesians 3:20; Psalm 42:11; John 13:34; Psalm 117:1-2; Isaiah 30:15;
Psalm 136:1; Colossians 3:15; Psalm 112:7; Matthew 19:26; Psalm 36:5; 1 Peter 2:9; Psalm 3:3; John 6:35; Psalm 61:2;
Deuteronomy 7:9; Psalm 66:20; Romans 6:23; Psalm 25:4-5; Mark 9:23; Psalm 89:1; James 4:8; Psalm 116:1-2; Isaiah 55:6;
Psalm 138:3; John 15:13; Psalm 143:8; Proverbs 3:9-10; Psalm 68:19; Joshua 24:15; Psalm 85:8; Luke 1:37; Psalm 113:3;
1 Corinthians 15:57; Psalm 144:1; Hebrews 10:23; Psalm 92:1-2; Matthew 5:14; Psalm 108:4; Romans 8:1; Psalm 130:5;
Isaiah 60:1; Psalm 71:5; John 4:24; Psalm 119:11; Ephesians 4:32; Psalm 62:8; 2 Thessalonians 3:3; Psalm 94:19;
Luke 6:38; Psalm 34:4; Malachi 3:10; Psalm 52:8; Acts 1:8; Psalm 46:10; James 1:12; Psalm 37:5; Matthew 22:37-39;
Psalm 119:165; Isaiah 1:18; Psalm 31:19; 1 John 5:14; Psalm 103:11-12; Romans 13:8; Psalm 126:5; John 20:29;
Psalm 145:9; Proverbs 22:6; Psalm 133:1; Hebrews 13:5; Psalm 81:10; Isaiah 61:1; Psalm 24:1; Mark 10:27; Psalm 34:18;
Exodus 15:2; Psalm 119:50; Matthew 18:20; Psalm 59:16; 2 Corinthians 4:16-17; Psalm 18:28; Ephesians 5:20; Psalm 37:23-24;
Isaiah 40:8; Psalm 90:12; John 14:1; Psalm 115:1; Proverbs 15:1; Psalm 23:4; Romans 1:16; Psalm 27:14; Galatians 6:9;
Psalm 65:11; 1 Timothy 6:6; Psalm 119:130; Habakkuk 3:19; Psalm 63:3; Luke 11:9; Psalm 56:3; Isaiah 49:15-16;
Psalm 145:3; Matthew 6:6; Psalm 9:9-10; John 17:17; Psalm 100:5; Revelation 3:20; Psalm 119:114; 2 Peter 3:9;
Psalm 34:1; Isaiah 43:19; Psalm 46:5; Philippians 4:19; Psalm 37:7; Matthew 11:29; Psalm 18:30; Romans 12:21;
Psalm 119:68; Proverbs 11:25; Psalm 40:8; Hebrews 6:19; Psalm 145:13; Joel 2:28; Psalm 121:7-8; John 3:30;
Psalm 50:15; Deuteronomy 8:18; Psalm 119:89; Colossians 1:13; Psalm 31:3; Isaiah 57:15; Psalm 22:3; Luke 2:10-11;
Psalm 96:1-2; Ephesians 1:3; Psalm 104:33; 1 Corinthians 2:9; Psalm 139:23-24; Proverbs 19:21; Psalm 23:6; John 12:46;
Psalm 118:6; Isaiah 35:4; Psalm 119:76; Matthew 7:24; Psalm 147:5; Romans 4:20-21; Psalm 16:8; 2 Corinthians 9:7;
Psalm 34:10; Ezekiel 36:26; Psalm 119:9; Acts 16:31; Psalm 37:39; Jeremiah 17:7; Psalm 148:13; 1 Peter 1:3;
Psalm 27:4; Isaiah 25:1; Psalm 105:4; Luke 18:27; Psalm 29:2; Hebrews 11:6; Psalm 32:7; Proverbs 10:22; Psalm 8:1;
John 1:12; Psalm 103:1; Isaiah 45:22; Psalm 36:7; Matthew 9:37-38; Psalm 25:10; Romans 5:1; Psalm 106:1; Daniel 2:20;
Psalm 119:72; Ephesians 6:18; Psalm 145:17; James 5:16; Psalm 57:1; 1 John 3:1; Psalm 89:15; Isaiah 50:7; Psalm 34:7;
John 5:24; Psalm 18:1-2; Proverbs 16:9; Psalm 116:12-13; Revelation 21:4; Psalm 13:5-6; Matthew 24:35; Psalm 71:14;
2 Corinthians 1:3-4; Psalm 119:2; Isaiah 33:2; Psalm 31:14-15; Luke 12:32; Psalm 145:1-2; Romans 14:8; Psalm 3:5;
Hosea 6:3; Psalm 119:18; Colossians 2:6-7; Psalm 30:11-12; Matthew 5:9; Psalm 46:7; 1 Chronicles 16:11; Psalm 86:11;
John 15:11; Psalm 95:6; Isaiah 32:17; Psalm 119:133; Philippians 2:3; Psalm 63:7; 1 Samuel 12:24; Psalm 18:46;
Galatians 5:1; Psalm 119:97; Mark 16:15; Psalm 138:8; Proverbs 27:1; Psalm 40:16; Isaiah 64:8; Psalm 61:1; 2 Timothy 2:15;
Psalm 31:1; Matthew 16:24; Psalm 43:3; Romans 15:4; Psalm 119:37; Acts 4:12; Psalm 33:4; Isaiah 26:4; Psalm 28:2;
John 14:13-14; Psalm 34:3; Ephesians 4:2-3; Psalm 72:18-19; Jude 1:24-25; Psalm 119:175; Revelation 22:20; Numbers 6:24-26;
Psalm 37:3; Isaiah 52:7; Psalm 84:10; Luke 2:14; Psalm 98:1; Matthew 1:21; Psalm 150:1-2; 2 Corinthians 13:14;
Psalm 62:5-6; Isaiah 46:4; Psalm 119:116; John 6:37; Psalm 3:8; Romans 8:18; Psalm 41:1; 1 Corinthians 16:13
"""

FILE_NAMES = {p.stem: p for p in KJV.glob('*.json')}


def load_book(book):
    name = 'Psalms' if book in ('Psalm', 'Psalms') else book
    path = FILE_NAMES.get(name.replace(' ', ''))
    if not path:
        raise ValueError(f'unknown book {book!r}')
    return name, json.loads(path.read_text(encoding='utf-8'))


def main():
    refs = [r.strip() for r in REFS.replace('\n', ' ').split(';') if r.strip()]
    seen, out, errors = set(), [], []
    for ref in refs:
        m = re.match(r'^(.+?) (\d+):(\d+)(?:-(\d+))?$', ref)
        if not m:
            errors.append(f'bad reference {ref}')
            continue
        if ref in seen:
            errors.append(f'duplicate {ref}')
            continue
        seen.add(ref)
        book, ch, v1, v2 = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4) or m.group(3))
        try:
            name, data = load_book(book)
        except ValueError as e:
            errors.append(str(e))
            continue
        chapter = next((c for c in data['chapters'] if int(c['chapter']) == ch), None)
        verses = {int(v['verse']): v['text'] for v in chapter['verses']} if chapter else {}
        texts = [verses.get(v) for v in range(v1, v2 + 1)]
        if not chapter or None in texts:
            errors.append(f'{ref} not in KJV data')
            continue
        slug = name.lower().replace(' ', '-')
        out.append({
            'reference': ref,
            'text': ' '.join(t.strip() for t in texts),
            'path': f'/bible/{slug}/{ch}?v={v1}-{v2}' if v2 > v1 else f'/bible/{slug}/{ch}?v={v1}',
        })

    if errors:
        sys.exit('\n'.join(errors))
    if len(out) < 366:
        print(f'note: {len(out)} verses (366 needed for a leap year; the list wraps)')
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
    print(f'wrote {len(out)} verses to {OUT}')


if __name__ == '__main__':
    main()
