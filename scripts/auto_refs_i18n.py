"""Translate Bible references and dates in a strings snapshot by rule: book names from the catalog, months by name.

    python -I -X utf8 scripts/auto_refs_i18n.py data-src/i18n_games

"Acts 13:4; Romans 1:7" becomes "Ìṣe Àwọn Àpọ́sítélì 13:4; Róòmù 1:7" and "Actes 13:4 ; Romains 1:7";
"24 November 1958" becomes "24 Oṣù Kọkànlá 1958" and "24 novembre 1958". Writes auto.txt (N|yo|fr) in the folder,
merged with the hand translations by merge_content_i18n.py. Prints the strings still to translate by hand.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
folder = ROOT / sys.argv[1]
strings = json.loads((folder / 'strings.snapshot.json').read_text(encoding='utf-8'))
yo_cat = json.loads((ROOT / 'public/i18n/yo.json').read_text(encoding='utf-8'))
fr_cat = json.loads((ROOT / 'public/i18n/fr.json').read_text(encoding='utf-8'))

BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
         '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Psalm', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
         'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
         'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
         'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
         'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']
BOOK_RE = '|'.join(re.escape(b) for b in sorted(BOOKS, key=len, reverse=True))
ONE = rf'(?:{BOOK_RE})(?: \d+(?::[\d\-–, ]+)?)?'
REF = re.compile(rf'^{ONE}(?:; (?:{ONE}|\d+(?::[\d\-–, ]+)?))*$')
MONTHS = {'January': ('Oṣù Kìíní', 'janvier'), 'February': ('Oṣù Kejì', 'février'), 'March': ('Oṣù Kẹta', 'mars'), 'April': ('Oṣù Kẹrin', 'avril'),
          'May': ('Oṣù Karùn-ún', 'mai'), 'June': ('Oṣù Kẹfà', 'juin'), 'July': ('Oṣù Keje', 'juillet'), 'August': ('Oṣù Kẹjọ', 'août'),
          'September': ('Oṣù Kẹsàn-án', 'septembre'), 'October': ('Oṣù Kẹwàá', 'octobre'), 'November': ('Oṣù Kọkànlá', 'novembre'),
          'December': ('Oṣù Kejìlá', 'décembre'),
          'Jan': ('Oṣù Kìíní', 'janv.'), 'Feb': ('Oṣù Kejì', 'févr.'), 'Mar': ('Oṣù Kẹta', 'mars'), 'Apr': ('Oṣù Kẹrin', 'avr.'), 'Jun': ('Oṣù Kẹfà', 'juin'),
          'Jul': ('Oṣù Keje', 'juil.'), 'Aug': ('Oṣù Kẹjọ', 'août'), 'Sep': ('Oṣù Kẹsàn-án', 'sept.'), 'Oct': ('Oṣù Kẹwàá', 'oct.'), 'Nov': ('Oṣù Kọkànlá', 'nov.'), 'Dec': ('Oṣù Kejìlá', 'déc.')}
DATE = re.compile(r'^(\d{1,2}) (' + '|'.join(MONTHS) + r')(?: (\d{4}))?$')


def book(lang_cat, name):
    return lang_cat.get(name if name != 'Psalm' else 'Psalms', name)


def ref(s, cat):
    return re.sub(BOOK_RE, lambda m: book(cat, m.group(0)), s)


CLAUSE = re.compile(r'^Constitution, (clauses?) ([\d()a-z ,–\-]+)$')

rows, manual = [], []
for i, s in enumerate(strings):
    m = DATE.match(s)
    c = CLAUSE.match(s)
    if c:
        rows.append(f'{i}|Òfin Ìjọ, abala {c.group(2)}|Constitution, {c.group(1)} {c.group(2)}')
    elif REF.match(s):
        rows.append(f'{i}|{ref(s, yo_cat)}|{ref(s, fr_cat)}')
    elif m:
        d, mo, y = m.groups()
        rows.append(f"{i}|{d} {MONTHS[mo][0]}{' ' + y if y else ''}|{d} {MONTHS[mo][1]}{' ' + y if y else ''}")
    else:
        manual.append(i)
(folder / 'auto.txt').write_text('\n'.join(rows) + '\n', encoding='utf-8', newline='\n')
(folder / 'manual.json').write_text(json.dumps(manual), encoding='utf-8')
print(len(rows), 'by rule;', len(manual), 'by hand')
