import { useState, useEffect, useMemo } from 'react';
import { BibleLesson } from '../types';
import { toISODate } from '../utils/dateUtils';

let lessonsCache: BibleLesson[] | null = null;

async function loadLessons(): Promise<BibleLesson[]> {
  if (lessonsCache) return lessonsCache;
  
  const response = await fetch('/data/lessons.json');
  const data: BibleLesson[] = await response.json();
  lessonsCache = data;
  return data;
}

export function useLessons() {
  const [lessons, setLessons] = useState<BibleLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLessons()
      .then(setLessons)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { lessons, loading, error };
}

export function useTodaysLessons() {
  const { lessons, loading, error } = useLessons();

  const todaysLessons = useMemo(() => {
    const today = toISODate(new Date());
    return lessons.filter(l => l.date === today);
  }, [lessons]);

  return { lessons: todaysLessons, loading, error };
}

export function useLessonsByDate(date: string) {
  const { lessons, loading, error } = useLessons();

  const dateLessons = useMemo(
    () => lessons.filter(l => l.date === date),
    [lessons, date]
  );

  return { lessons: dateLessons, loading, error };
}

export function useLessonsByMonth(year: number, month: number) {
  const { lessons, loading, error } = useLessons();

  const monthLessons = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return lessons.filter(l => l.date.startsWith(prefix));
  }, [lessons, year, month]);

  return { lessons: monthLessons, loading, error };
}
