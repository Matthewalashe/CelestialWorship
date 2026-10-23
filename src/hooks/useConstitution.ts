import { useMemo } from 'react';
import type { ConstitutionData, ConstitutionSection } from '../types';
import { createJsonResource } from '../lib/jsonResource';

const constitutionResource = createJsonResource<ConstitutionData, ConstitutionData | null>('/data/constitution.json', 'the constitution', d => d);

export function useConstitution() {
  return constitutionResource.useResource(null);
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
