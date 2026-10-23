import { Hymn, HymnCategory } from '../types';

/**
 * Lowercase and strip Yoruba tone marks/under-dots and apostrophes, so "kawa" finds "K’awa"
 * and "ese" finds "ẹsẹ̀".
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘'`´]/g, '')
    .toLowerCase();
}

const hymnSearchText = new WeakMap<Hymn, string>();

/** Searchable text for a hymn, built once per hymn */
function searchableHymn(h: Hymn): string {
  let text = hymnSearchText.get(h);
  if (text === undefined) {
    text = normalizeForSearch([
      String(h.number),
      h.englishTitle || '',
      h.yorubaTitle || '',
      h.section ? `${h.section.english} ${h.section.yoruba}` : '',
      h.englishLyrics || '',
      h.yorubaLyrics || '',
    ].join(' '));
    hymnSearchText.set(h, text);
  }
  return text;
}

/**
 * Search hymns by number, English title, Yoruba title, or lyrics content.
 */
export function searchHymns(hymns: Hymn[], query: string): Hymn[] {
  const trimmed = query.trim();
  if (!trimmed) return hymns;

  // If the query is a number, try exact match first
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    const exact = hymns.filter(h => h.number === num);
    if (exact.length > 0) return exact;
    // Otherwise fall through to text search
  }

  const words = normalizeForSearch(trimmed).split(/\s+/).filter(Boolean);
  return hymns.filter(h => {
    const searchable = searchableHymn(h);
    return words.every(word => searchable.includes(word));
  });
}

/**
 * Filter hymns by one or more categories.
 */
export function filterByCategory(hymns: Hymn[], categories: HymnCategory[]): Hymn[] {
  if (categories.length === 0) return hymns;
  return hymns.filter(h =>
    h.categories.some(c => categories.includes(c))
  );
}
