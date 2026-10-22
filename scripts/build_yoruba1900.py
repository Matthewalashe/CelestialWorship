"""
Build the Bibeli Mimọ (1900) text from the OCR of the archive.org scan
(data-src/bibeli_mimo_1900_ocr.txt, one "=====PAGE=====" block per scanned page).

The OCR misreads verse numbers (20 -> 90, 22 -> 29, 13 -> 183) and sometimes
mixes columns, so nothing is trusted on its own:

1. Running headers and printed page numbers are removed from each page.
2. Chapter markers ("ORI 5." / "ORIN 23." in Psalms) are aligned to the known list of
   1,189 chapters (KJV versification, shared by the Yoruba Bible) with dynamic programming.
3. Inside each chapter, verse numbers are aligned to 1..N where N is the KJV verse count,
   tolerating typical OCR digit confusions.
4. A chapter is published only if every verse was found, few numbers needed a fuzzy match,
   and every verse length is plausible next to the KJV verse. Everything else is left out
   (the app then offers another version for that chapter).

Usage: python scripts/build_yoruba1900.py [--report]
Writes public/data/bible/yo1900/<Book>.json and data-src/yo1900_report.json
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OCR_PATH = ROOT / 'data-src' / 'bibeli_mimo_1900_ocr.txt'
KJV_DIR = ROOT / 'public' / 'data' / 'bible' / 'en'
OUT_DIR = ROOT / 'public' / 'data' / 'bible' / 'yo1900'
REPORT_PATH = ROOT / 'data-src' / 'yo1900_report.json'

BOOKS = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark',
    'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
    'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
]

UPPER = 'A-ZÀÁÈÉÌÍÒÓÙÚẸỌṢ'
# Running header at the top of a page: [page no.] BOOK NAME ch[, ch|—ch]. [page no.]
HEADER = re.compile(
    rf'^\s*(?:\d{{1,4}}\s+)?(?:[IV]{{1,3}}\.?\s*)?[{UPPER}][{UPPER}\'’\. ]{{2,40}}?\s+\d{{1,3}}(?:\s*[,—–\-]\s*\d{{1,3}})*\s*[.,]?\s*'
)
# "ORI 5." / "ORIN 23." plus OCR slips: "0RI", "ORL", a comma or nothing instead of the full stop
CHAPTER_MARK = re.compile(r'\b[O0]R[IL1](?:N)?\s+([0-9A-Za-z]{1,4})\s*[.,]?(?=\s)')
# Verse numbers, including OCR'd letter/digit mixes like "6B", "l5", "1S" (at least one digit)
NUMBER = re.compile(r'(?<![\w’\'])((?=[0-9SBOIlZg]{0,2}\d)[0-9SBOIlZg]{1,3})(?![\w’\'])')
LETTER_DIGITS = str.maketrans({'S': '5', 'B': '8', 'O': '0', 'I': '1', 'l': '1', 'Z': '2', 'g': '9'})


def load_kjv():
    """{book: [verse count per chapter]} and {(book, ch): {verse: text}}"""
    counts, texts = {}, {}
    for book in BOOKS:
        data = json.loads((KJV_DIR / f"{book.replace(' ', '')}.json").read_text(encoding='utf-8'))
        chapters = sorted(data['chapters'], key=lambda c: int(c['chapter']))
        counts[book] = [len(c['verses']) for c in chapters]
        for c in chapters:
            texts[(book, int(c['chapter']))] = {int(v['verse']): v['text'] for v in c['verses']}
    return counts, texts


def clean_page(index: int, page: str) -> str:
    text = re.sub(r'\s+', ' ', page)
    text = re.sub(r'^\s*Page \d+\s*', '', text)
    text = HEADER.sub(' ', text, count=1)
    # Printed page numbers run about three ahead of the scan index; drop one near the top
    head, tail = text[:40], text[40:]
    for n in range(index + 1, index + 6):
        head = re.sub(rf'(?<!\d){n}(?!\d)', ' ', head, count=1)
    return f'{head}{tail}'


def digit_variants(token: str) -> set[int]:
    """Numbers an OCR'd token may really be (9<->2, 6<->5/8, 8<->3, one extra/missing digit)"""
    swaps = {'9': '2', '6': '5', '8': '3', '5': '6', '3': '8', '0': '8', '1': '7', '7': '1'}
    out = set()
    token = token.translate(LETTER_DIGITS)
    candidates = {token}
    for i, ch in enumerate(token):
        if ch in swaps:
            candidates.add(token[:i] + swaps[ch] + token[i + 1:])
    for c in list(candidates):
        if len(c) > 1:
            for i in range(len(c)):
                candidates.add(c[:i] + c[i + 1:])  # inserted digit: "183" -> "13"
    for c in candidates:
        if c and c.isdigit():
            out.add(int(c))
    return out


def align(tokens, expected, exact_cost=0.0, fuzzy_cost=1.0, skip_token=0.05, miss_cost=6.0):
    """
    Align observed number tokens [(value_str, pos)] to the expected sequence.
    Returns list of (expected_index -> token index or None, fuzzy flag).
    """
    m, n = len(tokens), len(expected)
    INF = float('inf')
    # dp[i][j]: best cost using first i tokens to place first j expected items
    dp = [[INF] * (n + 1) for _ in range(m + 1)]
    back = [[None] * (n + 1) for _ in range(m + 1)]
    variants = [digit_variants(t[0]) for t in tokens]
    for i in range(m + 1):
        dp[i][0] = i * skip_token
    for j in range(1, n + 1):
        dp[0][j] = j * miss_cost
        back[0][j] = ('miss', 0, j - 1)
    for i in range(1, m + 1):
        raw = tokens[i - 1][0]
        value = int(raw) if raw.isdigit() else -1  # letter/digit mixes can only match fuzzily
        for j in range(1, n + 1):
            best, step = dp[i - 1][j] + skip_token, ('skip', i - 1, j)
            if value == expected[j - 1]:
                cost = dp[i - 1][j - 1] + exact_cost
                if cost < best:
                    best, step = cost, ('exact', i - 1, j - 1)
            elif expected[j - 1] in variants[i - 1]:
                cost = dp[i - 1][j - 1] + fuzzy_cost
                if cost < best:
                    best, step = cost, ('fuzzy', i - 1, j - 1)
            cost = dp[i][j - 1] + miss_cost
            if cost < best:
                best, step = cost, ('miss', i, j - 1)
            dp[i][j] = best
            back[i][j] = step
    # Trace back from the best end (any number of trailing tokens may be skipped)
    i = min(range(m + 1), key=lambda k: dp[k][n])
    j = n
    result = [None] * n
    while j > 0:
        kind, pi, pj = back[i][j]
        if kind in ('exact', 'fuzzy'):
            result[j - 1] = (i - 1, kind == 'fuzzy')
        elif kind == 'miss':
            result[j - 1] = None
        i, j = pi, pj
    return result


def main():
    report_mode = '--report' in sys.argv
    counts, kjv = load_kjv()
    pages = OCR_PATH.read_text(encoding='utf-8').split('=====PAGE=====')
    text = ' '.join(clean_page(i, p) for i, p in enumerate(pages))

    # ── Chapters ──
    expected_chapters = [(book, ch + 1) for book in BOOKS for ch in range(len(counts[book]))]
    marks = [(m.group(1), m.start(), m.end()) for m in CHAPTER_MARK.finditer(text)]
    mark_tokens = [(t if t.isdigit() else '0', s) for t, s, _ in marks]
    chapter_numbers = [ch for _, ch in expected_chapters]
    placement = align(mark_tokens, chapter_numbers, fuzzy_cost=1.5, skip_token=0.8, miss_cost=3.0)

    # Segment boundaries: chapter k runs from its marker to the next placed marker
    starts = {}
    for k, placed in enumerate(placement):
        if placed is not None:
            starts[k] = marks[placed[0]][2]
    placed_keys = sorted(starts)
    segments = {}
    for idx, k in enumerate(placed_keys):
        end = marks[placement[placed_keys[idx + 1]][0]][1] if idx + 1 < len(placed_keys) else len(text)
        # Only trust a segment if the next chapter was also placed (otherwise it may hold two chapters)
        if idx + 1 < len(placed_keys) and placed_keys[idx + 1] != k + 1:
            continue
        segments[k] = text[starts[k]:end]

    # ── Verses ──
    books_out = {book: [] for book in BOOKS}
    report = {'chapters_expected': len(expected_chapters), 'chapter_markers_found': len(marks), 'published': 0, 'rejected': {}}
    for k, (book, chapter) in enumerate(expected_chapters):
        seg = segments.get(k)
        if seg is None:
            report['rejected'][f'{book} {chapter}'] = 'chapter boundary not found'
            continue
        n_verses = counts[book][chapter - 1]
        tokens = [(m.group(1), m.start()) for m in NUMBER.finditer(seg)]
        # Verse 1 has no number in print: it starts right after the chapter marker
        placement_v = align(tokens, list(range(2, n_verses + 1)))
        fuzzy = sum(1 for p in placement_v if p and p[1])
        if fuzzy > max(2, n_verses * 0.35):
            report['rejected'][f'{book} {chapter}'] = f'too many unclear verse numbers ({fuzzy})'
            continue

        # (position of the verse's first character, length of its number) for verses 1..N
        boundaries = [(0, 0)] + [((tokens[p[0]][1], len(tokens[p[0]][0])) if p else None) for p in placement_v]
        missing = [i for i, b in enumerate(boundaries) if b is None]
        if len(missing) > max(2, n_verses // 10) or any(m + 1 in missing for m in missing):
            report['rejected'][f'{book} {chapter}'] = f'{len(missing)} verse numbers not found'
            continue
        inferred = 0
        for i in missing:
            # Verse i+1's number was lost by the OCR: split between its neighbours at the
            # sentence break that best matches the KJV proportion of the two verses.
            prev_start = boundaries[i - 1][0] + boundaries[i - 1][1]
            next_start = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(seg)
            span = seg[prev_start:next_start]
            a = len(kjv[(book, chapter)].get(i, '')) or 1
            b = len(kjv[(book, chapter)].get(i + 1, '')) or 1
            target = len(span) * a / (a + b)
            cuts = [m.end() for m in re.finditer(rf'[.;:?!]\s+(?:\S{{1,3}}\s+)?(?=[{UPPER}])', span)]
            if not cuts:
                break
            cut = min(cuts, key=lambda c: abs(c - target))
            if abs(cut - target) > len(span) * 0.25:
                break
            boundaries[i] = (prev_start + cut, 0)
            inferred += 1
        if inferred != len(missing):
            report['rejected'][f'{book} {chapter}'] = f'{len(missing)} verse numbers not found'
            continue
        if inferred:
            report.setdefault('inferred_boundaries', {})[f'{book} {chapter}'] = inferred
        verses = []
        ok = True
        for v in range(n_verses):
            start = boundaries[v][0] + boundaries[v][1]
            end = boundaries[v + 1][0] if v + 1 < len(boundaries) else len(seg)
            verse_text = re.sub(r'\s+', ' ', seg[start:end]).strip(' :;,')
            # OCR specks after the closing punctuation ("…rẹrọ. ô")
            verse_text = re.sub(r'([.;:?!])\s+\S{1,2}$', r'\1', verse_text)
            kjv_len = len(kjv[(book, chapter)].get(v + 1, '')) or 1
            ratio = len(verse_text) / kjv_len
            if not verse_text or ratio < 0.35 or ratio > 3.2:
                ok = False
                report['rejected'][f'{book} {chapter}'] = f'verse {v + 1} length looks wrong ({ratio:.2f}x KJV)'
                break
            verses.append({'verse': v + 1, 'text': verse_text})
        if not ok:
            continue
        books_out[book].append({'chapter': chapter, 'verses': verses})
        report['published'] += 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for book, chapters in books_out.items():
        path = OUT_DIR / f"{book.replace(' ', '')}.json"
        if chapters:
            path.write_text(json.dumps({'book': book, 'chapters': chapters}, ensure_ascii=False) + '\n', encoding='utf-8')
        elif path.exists():
            path.unlink()

    by_book = {b: f"{len(books_out[b])}/{len(counts[b])}" for b in BOOKS}
    report['by_book'] = by_book
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"published {report['published']} of {len(expected_chapters)} chapters "
          f"({report['published'] / len(expected_chapters):.0%}); markers found {len(marks)}")
    if report_mode:
        print(json.dumps(by_book, indent=0))


if __name__ == '__main__':
    main()
