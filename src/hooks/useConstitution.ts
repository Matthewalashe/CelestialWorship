import { useState, useEffect, useMemo } from 'react';
import type { ConstitutionData, ConstitutionSection } from '../types';

let constitutionCache: ConstitutionData | null = null;

async function loadConstitution(): Promise<ConstitutionData> {
  if (constitutionCache) return constitutionCache;

  const response = await fetch('/data/constitution.json');
  const data: ConstitutionData = await response.json();
  constitutionCache = data;
  return data;
}

export function useConstitution() {
  const [data, setData] = useState<ConstitutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConstitution()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useConstitutionSearch(query: string) {
  const { data, loading, error } = useConstitution();

  const filteredSections = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data.sections;

    const q = query.toLowerCase();
    return data.sections.filter((section: ConstitutionSection) => {
      // Search in title
      if (section.title.toLowerCase().includes(q)) return true;
      // Search in narrative content
      if (section.content?.toLowerCase().includes(q)) return true;
      if (section.paragraphs?.some(p => p.toLowerCase().includes(q))) return true;
      // Search in clauses
      if (section.clauses?.some(c =>
        c.text.toLowerCase().includes(q) ||
        c.number.toLowerCase().includes(q) ||
        c.subClauses?.some(sc => sc.text.toLowerCase().includes(q))
      )) return true;
      return false;
    });
  }, [data, query]);

  return { sections: filteredSections, meta: data?.meta ?? null, loading, error };
}
