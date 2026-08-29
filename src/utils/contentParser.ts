/**
 * Content Parser — Structures flat service step text into typed segments
 * for distinct visual rendering of instructions, hymns, and scripture.
 */

export interface InstructionSegment {
  type: 'instruction';
  text: string;
}

export interface HymnSegment {
  type: 'hymn';
  title: string;
  lines: string[];
}

export interface ScriptureSegment {
  type: 'scripture';
  reference: string;
  verses: { number: string; text: string }[];
}

export type ContentSegment = InstructionSegment | HymnSegment | ScriptureSegment;

// Common Psalm patterns in CCC liturgy
const PSALM_PATTERN = /Psalm\s+(\d+)/i;
const VERSE_NUMBER_PATTERN = /^(\d+)[.):\s]+(.+)/;
const HYMN_LINE_INDICATORS = ['Amen', 'Hallelujah', 'Halleluyah', 'Hosanna', 'Hossanah'];

/**
 * Parse step text into structured content segments.
 * Splits mixed content (instruction + hymn lyrics + psalm text) into
 * distinct typed segments for structured rendering.
 */
export function parseStepContent(text: string, textLines: string[], type: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const fullText = textLines.length > 0 ? textLines.join('\n') : text;

  if (!fullText.trim()) return segments;

  // Check for Psalm content
  const psalmMatch = fullText.match(PSALM_PATTERN);

  if (type === 'hymn') {
    // Try to separate instruction prefix from hymn lyrics
    const parts = splitInstructionFromContent(fullText);
    if (parts.instruction) {
      segments.push({ type: 'instruction', text: parts.instruction });
    }
    if (parts.content) {
      const lines = parts.content.split(/\n/).filter(l => l.trim());
      // Try to detect stanza structure from lines
      const hymnLines = parseHymnLines(lines);
      segments.push({
        type: 'hymn',
        title: parts.instruction || '',
        lines: hymnLines,
      });
    } else if (!parts.instruction) {
      segments.push({ type: 'instruction', text: fullText });
    }
  } else if (type === 'scripture' || psalmMatch) {
    const parts = splitInstructionFromContent(fullText);
    if (parts.instruction) {
      segments.push({ type: 'instruction', text: parts.instruction });
    }
    const content = parts.content || fullText;
    const verses = parseVerseNumbers(content);
    if (verses.length > 0) {
      segments.push({
        type: 'scripture',
        reference: psalmMatch ? `Psalm ${psalmMatch[1]}` : '',
        verses,
      });
    } else {
      // No verse numbers found, treat as instruction
      if (!parts.instruction) {
        segments.push({ type: 'instruction', text: fullText });
      }
    }
  } else {
    // Default: instruction type
    segments.push({ type: 'instruction', text: fullText });
  }

  return segments.length > 0 ? segments : [{ type: 'instruction', text: fullText }];
}

/**
 * Split text at the boundary between an instruction prefix and content body.
 * Looks for patterns like "The service conductor reads Psalm 51:" followed by verse text.
 */
function splitInstructionFromContent(text: string): { instruction: string; content: string } {
  // Pattern: instruction text followed by a colon, then content with verse-like numbers
  const colonSplit = text.indexOf(':');
  if (colonSplit > 10 && colonSplit < text.length - 20) {
    const before = text.substring(0, colonSplit + 1).trim();
    const after = text.substring(colonSplit + 1).trim();
    
    // Check if 'after' looks like verse/hymn content (starts with number, or has line breaks)
    if (VERSE_NUMBER_PATTERN.test(after) || after.includes('\n')) {
      return { instruction: before, content: after };
    }
  }
  
  // Look for Psalm references that separate instruction from content
  const psalmIdx = text.search(/Psalm\s+\d+/i);
  if (psalmIdx > 20) {
    // Check if there's verse content after the psalm reference
    const psalmRefEnd = text.indexOf(' ', psalmIdx + 6);
    if (psalmRefEnd > 0) {
      const afterPsalm = text.substring(psalmRefEnd).trim();
      if (/^\d/.test(afterPsalm)) {
        return {
          instruction: text.substring(0, psalmRefEnd).trim(),
          content: afterPsalm,
        };
      }
    }
  }
  
  return { instruction: '', content: text };
}

/** Parse content for verse numbers (1. text, 2. text, etc.) */
function parseVerseNumbers(text: string): { number: string; text: string }[] {
  const verses: { number: string; text: string }[] = [];
  
  // Try splitting by verse number pattern
  const parts = text.split(/(?=\b\d{1,3}[.):]\s)/);
  
  for (const part of parts) {
    const match = part.trim().match(VERSE_NUMBER_PATTERN);
    if (match) {
      verses.push({ number: match[1], text: match[2].trim() });
    }
  }
  
  return verses;
}

/** Parse hymn content into clean lines */
function parseHymnLines(lines: string[]): string[] {
  // If we have actual line breaks, use them
  if (lines.length > 1) return lines.map(l => l.trim()).filter(l => l);
  
  // Single long line — try to split at sentence boundaries that look like lyrics
  const singleLine = lines[0] || '';
  
  // Look for repeated patterns or Amen endings
  const splitAtAmen = singleLine.split(/(?<=Amen)\s+(?=[A-Z])/g);
  if (splitAtAmen.length > 1) return splitAtAmen.map(l => l.trim());
  
  return [singleLine.trim()];
}

/**
 * Get a display icon for a service step type
 */
export function getStepIcon(type: string): string {
  switch (type) {
    case 'hymn': return '🎵';
    case 'scripture': return '📖';
    case 'prayer': return '🙏';
    case 'rubric': return '✦';
    default: return '';
  }
}

/**
 * Get accent color CSS variable for a step type
 */
export function getStepAccentColor(type: string): string {
  switch (type) {
    case 'hymn': return 'var(--color-accent-gold)';
    case 'scripture': return 'var(--color-accent-blue)';
    case 'prayer': return 'var(--color-accent-brand)';
    default: return 'var(--color-border)';
  }
}
