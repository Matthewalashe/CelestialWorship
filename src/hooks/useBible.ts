import { useState, useEffect, useCallback } from 'react';

interface BibleChapterData {
  book: string;
  chapter: number;
  verses: Record<string, string>;
}

const chapterCache = new Map<string, BibleChapterData>();

/**
 * Load a Bible chapter from bundled JSON.
 * Books are stored at /data/bible/en/{BookName}.json
 * Each file contains: { book, chapters: [{ chapter, verses: [{verse, text}] }] }
 */
async function loadChapter(book: string, chapter: number): Promise<BibleChapterData | null> {
  const cacheKey = `${book}:${chapter}`;
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey)!;
  }

  try {
    // The aruljohn/Bible-kjv format uses the book name as filename
    const fileName = book.replace(/\s+/g, '');
    const response = await fetch(`/data/bible/en/${fileName}.json`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // The aruljohn format: { book, chapters: [{ chapter, verses: [{verse, text}] }] }
    const chapterData = data.chapters?.find(
      (c: { chapter: number | string }) => Number(c.chapter) === chapter
    );
    
    if (!chapterData) return null;

    // Convert verses array to record
    const verses: Record<string, string> = {};
    if (Array.isArray(chapterData.verses)) {
      for (const v of chapterData.verses) {
        verses[String(v.verse)] = v.text;
      }
    }

    const result: BibleChapterData = {
      book,
      chapter,
      verses,
    };

    chapterCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export function useBible(book: string, chapter: number) {
  const [data, setData] = useState<BibleChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!book || !chapter) return;
    
    setLoading(true);
    setError(null);
    
    loadChapter(book, chapter)
      .then(result => {
        if (result) {
          setData(result);
        } else {
          setError(`Could not load ${book} chapter ${chapter}`);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [book, chapter]);

  return { data, loading, error };
}

/**
 * Get specific verses from a chapter
 */
export function useVerseRange(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number
) {
  const { data, loading, error } = useBible(book, chapter);

  const verses = data
    ? Object.entries(data.verses)
        .filter(([num]) => {
          const n = parseInt(num, 10);
          return n >= verseStart && n <= verseEnd;
        })
        .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
    : [];

  return { verses, loading, error };
}

/**
 * Get the list of available Bible languages
 */
export function useBibleLanguages() {
  // For v1: English (KJV) and Yoruba (Bibeli Mimo)
  return [
    { code: 'en', name: 'English (KJV)', dir: 'bible/en' },
    { code: 'yo', name: 'Yoruba (Bibeli Mimo)', dir: 'bible/yo' },
  ];
}

/**
 * Preload a Bible book for offline use
 */
export function usePreloadBook() {
  return useCallback(async (book: string) => {
    const fileName = book.replace(/\s+/g, '');
    try {
      const response = await fetch(`/data/bible/en/${fileName}.json`);
      await response.json(); // Just load it into browser cache
    } catch {
      // Silently fail — will use service worker cache if available
    }
  }, []);
}
