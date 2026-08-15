import { useState, useEffect, useMemo } from 'react';
import { Hymn, HymnCategory, HymnVerse } from '../types';
import { searchHymns, filterByCategory } from '../utils/search';

let hymnsCache: Hymn[] | null = null;

async function loadHymns(): Promise<Hymn[]> {
  if (hymnsCache) return hymnsCache;
  
  const response = await fetch('/data/hymns.json');
  const raw: any[] = await response.json();
  
  // Map snake_case JSON fields to camelCase TypeScript interface
  const data: Hymn[] = raw.map(h => {
    // Map structured verses
    const verses: HymnVerse[] = (h.verses || []).map((v: any) => ({
      number: v.number,
      englishLines: v.english_lines ?? v.englishLines ?? [],
      yorubaLines: v.yoruba_lines ?? v.yorubaLines ?? [],
    }));

    return {
      number: h.number,
      yorubaTitle: h.yoruba_title ?? h.yorubaTitle ?? null,
      englishTitle: h.english_title ?? h.englishTitle ?? null,
      yorubaLyrics: h.yoruba_lyrics ?? h.yorubaLyrics ?? '',
      englishLyrics: h.english_lyrics ?? h.englishLyrics ?? '',
      solfaNotation: h.solfa_notation ?? h.solfaNotation ?? null,
      categories: h.categories ?? [],
      needsClergyReview: h.needs_clergy_review ?? h.needsClergyReview ?? false,
      needsVerseSplitReview: h.needs_verse_split_review ?? h.needsVerseSplitReview ?? false,
      verses,
    };
  });
  
  hymnsCache = data;
  return data;
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

  return { results, loading, error, total: hymns.length };
}

export function useHymn(number: number) {
  const { hymns, loading, error } = useHymns();

  const hymn = useMemo(
    () => hymns.find(h => h.number === number) || null,
    [hymns, number]
  );

  return { hymn, loading, error };
}

export function useHymnsByCategory(category: HymnCategory) {
  const { hymns, loading, error } = useHymns();

  const results = useMemo(
    () => hymns.filter(h => h.categories.includes(category)),
    [hymns, category]
  );

  return { results, loading, error };
}
