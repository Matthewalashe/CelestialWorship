import { useEffect, useState } from 'react';
import { createJsonResource } from './jsonResource';
import { PLACES } from '../data/bibleLands';
import { SPREAD } from '../data/christianity';
import { trackEvent } from '../hooks/useAnalytics';

/**
 * Postcards to collect: a card for each Bible place found in the map games, and for each stop on the story of the
 * Church. A card shows the place as it is today (a free photograph, credited), its name then and now, and a fact.
 * Kept on this device.
 */

export interface Postcard {
  id: string;
  then: string;
  now: string;
  country: string;
  fact: string;
  ref: string;
  photo?: { src: string; credit: string; license: string; source: string };
  kind: 'place' | 'story';
}

/** The photographs (public/data/postcards.json, scripts/build_postcards.py), fetched when cards are shown */
const photoResource = createJsonResource<Record<string, Postcard['photo']>, Record<string, Postcard['photo']>>('/data/postcards.json', 'the postcards', d => d);
export const usePostcardPhotos = () => photoResource.useResource({}).data;

export const POSTCARDS: Postcard[] = [
  ...PLACES.map(p => ({ id: p.id, then: p.name, now: p.today, country: p.country, fact: p.note, ref: p.refs, kind: 'place' as const })),
  ...SPREAD.map(s => ({ id: `spread-${s.id}`, then: s.title, now: `${s.place} · ${s.when}`, country: s.today, fact: s.didYouKnow, ref: s.source, kind: 'story' as const })),
];

const KEY = 'cw-postcards';
const EVENT = 'cw-postcards-changed';

export function collectedPostcards(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

/** Add a card; true when it is new */
export function collectPostcard(id: string): boolean {
  const have = collectedPostcards();
  if (have.includes(id) || !POSTCARDS.some(p => p.id === id)) return false;
  try { localStorage.setItem(KEY, JSON.stringify([...have, id])); } catch {}
  window.dispatchEvent(new Event(EVENT));
  trackEvent('postcard', { id });
  return true;
}

export function useCollectedPostcards(): string[] {
  const [have, setHave] = useState(collectedPostcards);
  useEffect(() => {
    const sync = () => setHave(collectedPostcards());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return have;
}
