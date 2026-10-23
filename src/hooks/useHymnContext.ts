import { useEffect, useMemo, useState } from 'react';
import type { BibleLesson, ScriptureReference } from '../types';
import type { MatchContext } from '../utils/hymnMatcher';
import { churchObservances } from '../utils/churchCalendar';
import { loadChapter } from './useBible';
import { useLessons } from './useLessons';

/**
 * Everything the hymn suggestions need to know about a day: its set verses (English and Yorùbá),
 * the occasion printed in the Bible lessons, and the Church's observances on the calendar.
 */

/** The verses a reference sets, not the whole chapter */
async function passage(ref: ScriptureReference, version: 'en' | 'yo'): Promise<string> {
  try {
    const ch = await loadChapter(ref.book, ref.chapter, version);
    if (!ch) return '';
    const from = ref.verseStart || 1;
    const to = ref.verseEnd || Number.MAX_SAFE_INTEGER;
    return Object.entries(ch.verses).filter(([v]) => Number(v) >= from && Number(v) <= to).map(([, t]) => t).join(' ');
  } catch {
    return '';
  }
}

/** Occasions without the service-time prefix and editorial notes: "Morning - Imeko Harvest [x]" → "Imeko Harvest" */
export function dayOccasions(date: string, lessons: BibleLesson[]): string[] {
  const fromLessons = lessons.filter(l => l.date === date && l.occasion)
    .map(l => l.occasion!.replace(/\[[^\]]*\]/g, '').replace(/^(Morning|Evening)\s*[-–]\s*/i, '').trim())
    .filter(t => t && !/^(morning|evening)$/i.test(t));
  const year = Number(date.slice(0, 4));
  const observed = churchObservances(year).filter(e => e.starts_at.slice(0, 10) === date).map(e => e.title);
  return [...new Set([...fromLessons, ...observed])];
}

export async function buildHymnContext(date: string, lessons: BibleLesson[], serviceId?: string): Promise<MatchContext> {
  const day = lessons.filter(l => l.date === date);
  const refs = day.flatMap(l => [l.firstLesson, l.secondLesson]).filter((r): r is ScriptureReference => !!r);
  const [en, yo] = await Promise.all([
    Promise.all(refs.map(r => passage(r, 'en'))),
    Promise.all(refs.map(r => passage(r, 'yo'))),
  ]);
  return {
    date, serviceId,
    lessonRefs: refs.map(r => ({ book: r.book, chapter: r.chapter })),
    lessonText: en.join(' '), lessonTextYo: yo.join(' '),
    occasions: dayOccasions(date, lessons),
  };
}

/** The day's context: occasions straight away, the readings once their text has loaded */
export function useHymnContext(date: string, serviceId?: string): MatchContext {
  const { lessons } = useLessons();
  const base = useMemo<MatchContext>(() => ({ date, serviceId, occasions: dayOccasions(date, lessons) }), [date, serviceId, lessons]);
  const [loaded, setLoaded] = useState<{ key: string; ctx: MatchContext } | null>(null);
  const key = `${date}|${serviceId ?? ''}|${lessons.length}`;
  useEffect(() => {
    let live = true;
    buildHymnContext(date, lessons, serviceId).then(ctx => { if (live) setLoaded({ key, ctx }); });
    return () => { live = false; };
  }, [date, serviceId, lessons, key]);
  return loaded?.key === key ? loaded.ctx : base;
}
