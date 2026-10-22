/**
 * Verse of the Day: one KJV verse per day of the year, built by
 * scripts/build_daily_verses.py from the app's own KJV text (so the wording always matches).
 */
import VERSES from './dailyVerses.json';

export interface DailyVerse { reference: string; text: string; path: string }

export const DAILY_VERSES: DailyVerse[] = VERSES;

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Today's verse (day 1 = 1 January) */
export function getVerseOfTheDay(date: Date = new Date()): DailyVerse {
  return DAILY_VERSES[(dayOfYear(date) - 1 + DAILY_VERSES.length) % DAILY_VERSES.length];
}
