import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from './useAnalytics';
import { toISODate } from '../utils/dateUtils';

/**
 * Reading progress and the daily streak.
 * Kept in localStorage and included in library export/import.
 */

const PROGRESS_KEY = 'cw-reading-progress';
const STREAK_KEY = 'cw-streak';
const CHANGE_EVENT = 'cw-progress-changed';

export interface LastRead {
  book: string;
  chapter: number;
  versionId: string;
  at: string;
}

interface ReadingProgress {
  last: LastRead | null;
  /** "Book|chapter" for every chapter read to the end */
  completed: string[];
  lastHymn?: { number: number; at: string } | null;
  lastDevotion?: { serviceId: string; step: number; at: string } | null;
}

export type StreakActivity = 'bible' | 'devotion' | 'quiz' | 'prayer' | 'hymn';

interface StreakData {
  /** ISO dates with at least one activity */
  days: string[];
  /** Activities done today, so each counts once per day */
  today: { date: string; activities: StreakActivity[] };
  best: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {}
  return fallback;
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const emptyProgress: ReadingProgress = { last: null, completed: [], lastHymn: null, lastDevotion: null };
const emptyStreak: StreakData = { days: [], today: { date: '', activities: [] }, best: 0 };

export function recordChapterOpened(book: string, chapter: number, versionId: string) {
  const p = read(PROGRESS_KEY, emptyProgress);
  write(PROGRESS_KEY, { ...p, last: { book, chapter, versionId, at: new Date().toISOString() } });
}

export function recordChapterCompleted(book: string, chapter: number) {
  const p = read(PROGRESS_KEY, emptyProgress);
  const key = `${book}|${chapter}`;
  if (!p.completed.includes(key)) write(PROGRESS_KEY, { ...p, completed: [...p.completed, key] });
  recordActivity('bible');
}

export function recordDevotionPosition(serviceId: string, step: number) {
  const p = read(PROGRESS_KEY, emptyProgress);
  write(PROGRESS_KEY, { ...p, lastDevotion: { serviceId, step, at: new Date().toISOString() } });
}

/** Count today towards the streak (once per activity per day) */
export function recordActivity(activity: StreakActivity) {
  const today = toISODate(new Date());
  const s = read(STREAK_KEY, emptyStreak);
  const todayActivities = s.today.date === today ? s.today.activities : [];
  if (todayActivities.includes(activity) && s.days.includes(today)) return;
  trackEvent('activity', { kind: activity });
  const days = s.days.includes(today) ? s.days : [...s.days, today].slice(-400);
  const next: StreakData = { days, today: { date: today, activities: [...todayActivities, activity] }, best: s.best };
  next.best = Math.max(next.best, currentStreak(next.days, today));
  write(STREAK_KEY, next);
}

/** Consecutive days up to today (or up to yesterday, so the streak isn't "lost" before today's activity) */
export function currentStreak(days: string[], today: string = toISODate(new Date())): number {
  const set = new Set(days);
  const cursor = new Date(`${today}T12:00:00`);
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (set.has(toISODate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function useStored<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const sync = () => setValue(read(key, fallback));
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

export function useReadingProgress() {
  const progress = useStored(PROGRESS_KEY, emptyProgress);
  const isCompleted = useCallback((book: string, chapter: number) => progress.completed.includes(`${book}|${chapter}`), [progress]);
  const completedInBook = useCallback(
    (book: string) => progress.completed.filter(k => k.startsWith(`${book}|`)).length,
    [progress],
  );
  return { ...progress, isCompleted, completedInBook };
}

export function useStreak() {
  const s = useStored(STREAK_KEY, emptyStreak);
  const today = toISODate(new Date());
  return {
    current: currentStreak(s.days, today),
    best: s.best,
    activeToday: s.days.includes(today),
    todayActivities: s.today.date === today ? s.today.activities : [],
    days: s.days,
  };
}
