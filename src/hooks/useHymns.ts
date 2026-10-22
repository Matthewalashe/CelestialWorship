import { useState, useEffect, useMemo } from 'react';
import { Hymn, HymnCategory, HymnVerse } from '../types';
import { searchHymns, filterByCategory } from '../utils/search';

// Cache the in-flight promise so pages mounting together share one fetch
let hymnsPromise: Promise<Hymn[]> | null = null;

function loadHymns(): Promise<Hymn[]> {
  if (!hymnsPromise) {
    hymnsPromise = fetchHymns().catch(err => {
      hymnsPromise = null; // allow a retry after a failure
      throw err;
    });
  }
  return hymnsPromise;
}

async function fetchHymns(): Promise<Hymn[]> {
  const response = await fetch('/data/hymns.json');
  if (!response.ok) throw new Error(`Couldn't load hymns (HTTP ${response.status})`);
  const raw: any[] = await response.json();

  // Map snake_case JSON fields (written by scripts/build_hymns.py) to the camelCase interface
  return raw.map(h => {
    const verses: HymnVerse[] = (h.verses || []).map((v: any) => ({
      kind: v.kind === 'chorus' ? 'chorus' : 'verse',
      number: v.number ?? null,
      englishLines: v.english_lines ?? [],
      yorubaLines: v.yoruba_lines ?? [],
      repeat: v.repeat ?? false,
    }));

    return {
      number: h.number,
      yorubaTitle: h.yoruba_title ?? null,
      englishTitle: h.english_title ?? null,
      section: h.section ?? null,
      yorubaLyrics: h.yoruba_lyrics ?? h.yorubaLyrics ?? '',
      englishLyrics: h.english_lyrics ?? h.englishLyrics ?? '',
      solfaNotation: h.solfa_notation ?? h.solfaNotation ?? null,
      categories: h.categories ?? [],
      needsClergyReview: h.needs_clergy_review ?? h.needsClergyReview ?? false,
      needsVerseSplitReview: h.needs_verse_split_review ?? h.needsVerseSplitReview ?? false,
      verses,
    };
  });
}

export function useHymns() {
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHymns()
      .then(setHymns)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { hymns, loading, error };
}

export function useHymnSearch(query: string, categories: HymnCategory[] = []) {
  const { hymns, loading, error } = useHymns();

  const results = useMemo(() => {
    let filtered = hymns;
    if (categories.length > 0) {
      filtered = filterByCategory(filtered, categories);
    }
    if (query.trim()) {
      filtered = searchHymns(filtered, query);
    }
    return filtered;
  }, [hymns, query, categories]);

  return { results, loading, error, total: hymns.length, hymns };
}

export function useHymn(number: number) {
  const { hymns, loading, error } = useHymns();

  const { hymn, prevNumber, nextNumber } = useMemo(() => {
    const index = hymns.findIndex(h => h.number === number);
    return {
      hymn: index >= 0 ? hymns[index] : null,
      // Hymn numbers have gaps (reserved ranges), so neighbours come from the list itself
      prevNumber: index > 0 ? hymns[index - 1].number : null,
      nextNumber: index >= 0 && index < hymns.length - 1 ? hymns[index + 1].number : null,
    };
  }, [hymns, number]);

  return { hymn, prevNumber, nextNumber, loading, error };
}

export function useHymnsByCategory(category: HymnCategory) {
  const { hymns, loading, error } = useHymns();

  const results = useMemo(
    () => hymns.filter(h => h.categories.includes(category)),
    [hymns, category]
  );

  return { results, loading, error };
}
