import { useState, useEffect } from 'react';
import { getBibleVersion, USFM_CODES, type BibleVersion } from '../data/bibleVersions';
import { resolveBookName } from '../data/bibleBooks';
import { contentDefaults } from '../i18n';

export interface BibleChapterData {
  book: string;
  chapter: number;
  verses: Record<string, string>;
  versionId: string;
  /** Copyright line to show under the text */
  copyright: string;
}

interface LocalBookFile {
  book: string;
  chapters: { chapter: number | string; verses: { verse: number | string; text: string }[] }[];
}

// One fetch per book file, shared by every chapter of that book
const bookCache = new Map<string, Promise<LocalBookFile | null>>();
const apiChapterCache = new Map<string, Promise<BibleChapterData | null>>();

function loadLocalBook(dir: string, book: string): Promise<LocalBookFile | null> {
  const key = `${dir}:${book}`;
  let pending = bookCache.get(key);
  if (!pending) {
    // Lessons write "Psalm 23", the file is Psalms
    const fileName = (resolveBookName(book) ?? book).replace(/\s+/g, '');
    pending = fetch(`/data/bible/${dir}/${fileName}.json`)
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
    pending.then(result => { if (!result) bookCache.delete(key); }); // allow a retry
    bookCache.set(key, pending);
  }
  return pending;
}

async function loadLocalChapter(version: BibleVersion & { source: { kind: 'local'; dir: string } }, book: string, chapter: number) {
  const data = await loadLocalBook(version.source.dir, book);
  const chapterData = data?.chapters?.find(c => Number(c.chapter) === chapter);
  if (!chapterData || !Array.isArray(chapterData.verses) || chapterData.verses.length === 0) return null;
  const verses: Record<string, string> = {};
  for (const v of chapterData.verses) verses[String(v.verse)] = v.text;
  return { book, chapter, verses, versionId: version.id, copyright: version.copyright };
}

let fumsLoaded = false;
/** API.Bible requires its Fair Use Management script to report each display */
function reportFums(fumsId: string | undefined) {
  if (!fumsId) return;
  const track = () => (window as any)._BAPI?.t?.(fumsId);
  if (fumsLoaded) { track(); return; }
  fumsLoaded = true;
  const script = document.createElement('script');
  script.src = 'https://cdn.scripture.api.bible/fums/fumsv2.min.js';
  script.async = true;
  script.onload = track;
  document.head.appendChild(script);
}

async function fetchApiChapter(version: BibleVersion & { source: { kind: 'api'; bibleId: string } }, book: string, chapter: number) {
  const code = USFM_CODES[book];
  if (!code) return null;
  const path = `/v1/bibles/${version.source.bibleId}/chapters/${code}.${chapter}`
    + '?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false';
  const proxy = import.meta.env.VITE_BIBLE_PROXY_URL as string | undefined;
  const response = proxy
    ? await fetch(`${proxy.replace(/\/$/, '')}${path}`)
    : await fetch(`https://api.scripture.api.bible${path}`, { headers: { 'api-key': import.meta.env.VITE_API_BIBLE_KEY } });
  if (!response.ok) return null;
  const json = await response.json();
  const content: string = json?.data?.content ?? '';
  // Text format: "[1] In the beginning … [2] And the earth …"
  const verses: Record<string, string> = {};
  const parts = content.split(/\[(\d+)\]/);
  for (let i = 1; i < parts.length; i += 2) {
    const text = parts[i + 1]?.replace(/\s+/g, ' ').trim();
    if (text) verses[parts[i]] = text;
  }
  if (Object.keys(verses).length === 0) return null;
  reportFums(json?.meta?.fumsId);
  return { book, chapter, verses, versionId: version.id, copyright: json?.data?.copyright || version.copyright };
}

/** The Bible version the reader chose, or the one that goes with the app language */
export function preferredBibleVersion(): string {
  try { return localStorage.getItem('cw-bible-version') || contentDefaults().bibleVersion; } catch { return contentDefaults().bibleVersion; }
}

/**
 * Load a chapter in a version. Resolves to null when the version doesn't have it
 * (e.g. a chapter of the 1900 text still being proofread).
 */
export function loadChapter(book: string, chapter: number, versionId: string = 'en'): Promise<BibleChapterData | null> {
  const version = getBibleVersion(versionId);
  if (version.source.kind === 'local') {
    return loadLocalChapter(version as any, book, chapter);
  }
  // Licensed text: kept in memory only, never written to the offline cache
  const key = `${version.id}:${book}:${chapter}`;
  let pending = apiChapterCache.get(key);
  if (!pending) {
    pending = fetchApiChapter(version as any, book, chapter).catch(() => null);
    apiChapterCache.set(key, pending);
    pending.then(r => { if (!r) apiChapterCache.delete(key); });
  }
  return pending;
}

export function useBible(book: string, chapter: number, versionId: string = 'en') {
  const [data, setData] = useState<BibleChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!book || !chapter) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadChapter(book, chapter, versionId)
      .then(result => {
        if (cancelled) return;
        setData(result);
        if (!result) setError(`${book} ${chapter} isn't available in ${getBibleVersion(versionId).name}`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [book, chapter, versionId]);

  return { data, loading, error };
}

/** Download every book of a local version so it can be read offline */
export async function downloadVersionForOffline(
  versionId: string,
  books: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const version = getBibleVersion(versionId);
  if (version.source.kind !== 'local') return 0;
  let done = 0;
  let ok = 0;
  for (const book of books) {
    // Fetching through the service worker stores the file in its "bible-books" cache
    const result = await loadLocalBook(version.source.dir, book);
    if (result) ok++;
    onProgress?.(++done, books.length);
  }
  return ok;
}
