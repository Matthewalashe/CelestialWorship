/**
 * Simple input sanitizer for search fields.
 * Strips HTML tags and trims whitespace.
 * For the Bible/Hymnal search inputs which are rendered as text (not innerHTML),
 * this is a defense-in-depth measure.
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')  // Strip HTML tags
    .replace(/[<>"'&]/g, '')  // Strip potential injection characters
    .trim()
    .slice(0, 200);           // Cap length
}
