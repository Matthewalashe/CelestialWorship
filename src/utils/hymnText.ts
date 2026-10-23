import type { Hymn, HymnVerse } from '../types';

export type HymnLanguage = 'en' | 'yo';

export function stanzaLines(verse: HymnVerse, lang: HymnLanguage): string[] {
  return lang === 'en' ? verse.englishLines : verse.yorubaLines;
}

export function firstLine(hymn: Hymn, lang: HymnLanguage): string | null {
  for (const verse of hymn.verses) {
    const line = stanzaLines(verse, lang)[0];
    if (line) return line.replace(/[,;:.]+$/, '');
  }
  return null;
}

/**
 * Most CCC hymns have no printed title and are known by their first line,
 * so that is what lists and headers show when there is no title.
 */
export function displayTitle(hymn: Hymn, lang: HymnLanguage): string {
  const title = lang === 'en' ? hymn.englishTitle : hymn.yorubaTitle;
  return title || firstLine(hymn, lang) || firstLine(hymn, lang === 'en' ? 'yo' : 'en') || `Hymn ${hymn.number}`;
}

export function stanzaLabel(verse: HymnVerse, lang: HymnLanguage = 'en'): string {
  if (verse.kind === 'chorus') return lang === 'yo' ? 'Ègbè' : 'Chorus';
  return lang === 'yo' ? `Ẹsẹ ${verse.number ?? ''}`.trim() : `Verse ${verse.number ?? ''}`.trim();
}

export interface HymnSlide {
  verse: HymnVerse;
  /** Index into hymn.verses */
  stanzaIndex: number;
  label: string;
}

/**
 * Order in which stanzas are sung/projected. When a hymn prints its chorus once
 * (after the first verse), it is sung after every verse, so it is repeated there.
 */
export function buildSlides(hymn: Hymn, repeatChorus = true): HymnSlide[] {
  const slides: HymnSlide[] = hymn.verses.map((verse, stanzaIndex) => ({
    verse, stanzaIndex, label: stanzaLabel(verse),
  }));
  const choruses = slides.filter(s => s.verse.kind === 'chorus');
  const verses = slides.filter(s => s.verse.kind === 'verse');
  if (!repeatChorus || choruses.length !== 1 || verses.length < 2) return slides;

  const chorus = choruses[0];
  const result: HymnSlide[] = [];
  for (const slide of slides) {
    if (slide.verse.kind === 'chorus') continue;
    result.push(slide);
    result.push(chorus);
  }
  return result;
}
