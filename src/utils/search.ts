import { Hymn, HymnCategory } from '../types';

/**
 * Simple fuzzy search — matches if all query words appear somewhere in the target string.
 */
function fuzzyMatch(query: string, target: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerTarget = target.toLowerCase();
  return words.every(word => lowerTarget.includes(word));
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

  return hymns.filter(h => {
    const searchable = [
      String(h.number),
      h.englishTitle || '',
      h.yorubaTitle || '',
      h.englishLyrics || '',
      h.yorubaLyrics || '',
    ].join(' ');
    return fuzzyMatch(trimmed, searchable);
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

/**
 * Search service orders by name or step text.
 */
export function searchServices(
  services: { id: string; displayName: string; description: string }[],
  query: string
): typeof services {
  const trimmed = query.trim();
  if (!trimmed) return services;

  return services.filter(s => {
    const searchable = `${s.displayName} ${s.description}`.toLowerCase();
    return fuzzyMatch(trimmed, searchable);
  });
}

/**
 * Highlight matching text in a string (returns HTML with <mark> tags).
 */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;

  const words = query.trim().split(/\s+/).filter(Boolean);
  let result = text;

  for (const word of words) {
    const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
    result = result.replace(regex, '<mark class="bg-amber-500/30 text-white rounded px-0.5">$1</mark>');
  }

  return result;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
