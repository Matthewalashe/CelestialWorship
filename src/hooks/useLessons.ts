import { useMemo } from 'react';
import { BibleLesson } from '../types';
import { toISODate } from '../utils/dateUtils';
import { createJsonResource } from '../lib/jsonResource';

const lessonsResource = createJsonResource<BibleLesson[], BibleLesson[]>('/data/lessons.json', 'lessons', d => d);
const NO_LESSONS: BibleLesson[] = [];

export function useLessons() {
  const { data: lessons, loading, error } = lessonsResource.useResource(NO_LESSONS);
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
