import { useMemo } from 'react';
import { createJsonResource } from '../lib/jsonResource';
import type { ServiceOrder, ServiceStep, ScriptureReference } from '../types';


function mapScriptureRef(raw: any): ScriptureReference | null {
  if (!raw) return null;
  return {
    raw: raw.raw_text ?? raw.raw ?? `${raw.book} ${raw.chapter}:${raw.verse_start ?? raw.verseStart}-${raw.verse_end ?? raw.verseEnd}`,
    book: raw.book,
    chapter: raw.chapter,
    verseStart: raw.verse_start ?? raw.verseStart ?? 1,
    verseEnd: raw.verse_end ?? raw.verseEnd ?? raw.verse_start ?? raw.verseStart ?? 1,
  };
}

function mapStep(raw: any): ServiceStep {
  // Map scripture_references array
  const scriptureReferences: ScriptureReference[] = (raw.scripture_references ?? raw.scriptureReferences ?? [])
    .map(mapScriptureRef)
    .filter(Boolean) as ScriptureReference[];

  // Legacy single scriptureRef support
  const scriptureRef = raw.scriptureRef
    ? mapScriptureRef(raw.scriptureRef)
    : scriptureReferences.length > 0
      ? scriptureReferences[0]
      : null;

  // Text lines for structured rendering
  const textLines: string[] = raw.text_lines ?? raw.textLines ?? (raw.text ? raw.text.split('\n').filter((l: string) => l.trim()) : []);

  return {
    stepNumber: raw.stepNumber ?? raw.step ?? null,
    text: raw.text ?? '',
    textLines,
    type: raw.type ?? 'instruction',
    hymnSlot: raw.hymnSlot ?? raw.hymn_slot ?? null,
    scriptureRef,
    scriptureReferences,
    isHeader: raw.isHeader ?? raw.is_header ?? undefined,
  };
}

const servicesResource = createJsonResource<any[], ServiceOrder[]>('/data/services.json', 'services', data => data.map(s => ({
  id: s.id,
  displayName: s.displayName ?? s.display_name ?? s.id,
  day: s.day ?? '',
  time: s.time ?? '',
  description: s.description ?? '',
  steps: (s.steps || []).map(mapStep),
})));
const NO_SERVICES: ServiceOrder[] = [];

export function useServices() {
  const { data: services, loading, error } = servicesResource.useResource(NO_SERVICES);
  return { services, loading, error };
}

export function useService(serviceId: string) {
  const { services, loading, error } = useServices();

  const service = useMemo(
    () => services.find(s => s.id === serviceId) || null,
    [services, serviceId]
  );

  return { service, loading, error };
}
