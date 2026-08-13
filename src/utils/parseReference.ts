import { ScriptureReference } from '../types';
import { resolveBookName } from '../data/bibleBooks';

/**
 * Parse a scripture reference string into a structured object.
 * Handles formats like:
 *   "Genesis 1:1-10"
 *   "1 Corinthians 4:1-6"
 *   "Psalm 51"
 *   "2 Kings 4:32-37"
 *   "John 13:1-17"
 *   "Deuteronomy 28:1-8"
 */
export function parseReference(raw: string): ScriptureReference | null {
  if (!raw || !raw.trim()) return null;

  const cleaned = raw.trim()
    .replace(/\s*–\s*/g, '-')  // en-dash to hyphen
    .replace(/\s*—\s*/g, '-')  // em-dash to hyphen
    .replace(/\s+/g, ' ');

  // Pattern: optional number prefix + book name + chapter:verseStart-verseEnd
  // Also handles: "1 John 3:7-10", "Song of Solomon 2:1-5", "Psalm 51"
  const match = cleaned.match(
    /^(\d?\s*[A-Za-z]+(?:\s+(?:of\s+)?[A-Za-z]+)*)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/
  );

  if (!match) return null;

  const bookInput = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verseStart = match[3] ? parseInt(match[3], 10) : 1;
  const verseEnd = match[4] ? parseInt(match[4], 10) : verseStart;

  const book = resolveBookName(bookInput);
  if (!book) return null;

  return {
    raw,
    book,
    chapter,
    verseStart,
    verseEnd,
  };
}

/**
 * Format a ScriptureReference back to a display string
 */
export function formatReference(ref: ScriptureReference): string {
  if (ref.verseStart === ref.verseEnd) {
    return `${ref.book} ${ref.chapter}:${ref.verseStart}`;
  }
  return `${ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
}

/**
 * Build a URL path for the Bible reader from a reference
 */
export function referenceToPath(ref: ScriptureReference): string {
  const bookSlug = ref.book.toLowerCase().replace(/\s+/g, '-');
  return `/bible/${bookSlug}/${ref.chapter}?v=${ref.verseStart}-${ref.verseEnd}`;
}
