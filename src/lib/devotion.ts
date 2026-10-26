import { createJsonResource } from './jsonResource';
import type { HymnCategory } from '../types';
import type { PrayerRef } from '../data/prayers';

/**
 * The Order of Service as worshippers follow it (public/data/devotion.json, built by
 * scripts/build_devotion.py): each step in parts — what is done and by whom, the words in full,
 * songs with their hymnal number, psalms with the holy name called before them, and the guidance.
 */

export type Who = string;

export type Block =
  | { kind: 'act'; text: string; who?: Who; repeat?: number }
  | { kind: 'instruction'; text: string; who?: Who }
  | { kind: 'note'; text: string }
  | { kind: 'say'; text: string; who?: Who; repeat?: number }
  | { kind: 'prayer'; ref: PrayerRef; who?: Who }
  | { kind: 'song'; title: string; lines: string[]; hymn?: number; repeat?: number }
  | { kind: 'hymn'; label?: string; number?: number; title?: string }
  | { kind: 'psalm'; ref: string; chapter: number; verses: string[]; name?: string; range?: [number, number]; spiritLed?: boolean; follows?: string }
  | { kind: 'passage'; ref: string; book: string; chapter: number; verseStart: number; verseEnd: number; name?: string }
  | { kind: 'psalm_choice'; refs: string[] }
  | { kind: 'lesson'; which: 1 | 2 }
  | { kind: 'offering'; parts: boolean }
  | { kind: 'list'; items: { text: string; who?: Who }[] };

export type StepKind = 'prayer' | 'act' | 'blessing' | 'sermon' | 'reading' | 'song' | 'offering' | 'hymn' | 'psalm';

export interface DevotionStep {
  n: number;
  /** The guide's own step number (steps the guide runs together are split, so numbers can differ) */
  source: string;
  kind: StepKind;
  title: string;
  blocks: Block[];
  hymnSlot?: { category?: HymnCategory; fixedHymnNumber?: number } | null;
  scripture?: { book: string; chapter: number; verseStart?: number; verseEnd?: number }[];
}

export interface DevotionService {
  intro: Block[];
  steps: DevotionStep[];
}

const resource = createJsonResource<Record<string, DevotionService>, Record<string, DevotionService>>('/data/devotion.json', 'the order of service', d => d);
const EMPTY: Record<string, DevotionService> = {};

export function useDevotionData() {
  const { data, loading, error } = resource.useResource(EMPTY);
  return { services: data, loading, error };
}
