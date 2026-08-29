import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLessons } from '../hooks/useLessons';
import { usePageTitle } from '../hooks/usePageTitle';
import { getDatesInMonth, formatDate, toISODate } from '../utils/dateUtils';
import type { BibleLesson } from '../types';
import { Calendar, BookOpen } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Lessons() {
  usePageTitle('lessons');
  const { lessons, loading } = useLessons();
  const [year] = useState(2026);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.getFullYear() === 2026 ? now.getMonth() : 0;
  });
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const monthLessons = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return lessons.filter(l => l.date.startsWith(prefix));
  }, [lessons, year, month]);

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, BibleLesson[]>();
    for (const l of monthLessons) {
      const existing = map.get(l.date) || [];
      existing.push(l);
      map.set(l.date, existing);
    }
    return map;
  }, [monthLessons]);

  const calendarDates = useMemo(() => getDatesInMonth(year, month), [year, month]);
  const firstDayOffset = calendarDates[0]?.getDay() || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Loading lessons...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">
          <><Calendar size={24} className="inline-block mr-2 align-text-bottom" /> Bible Lessons 2026</>
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Lectionary calendar for the Celestial Church of Christ
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setMonth(m => Math.max(0, m - 1))}
          disabled={month === 0}
          className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-primary)] disabled:opacity-30 hover:bg-[var(--color-bg-card-hover)] transition-colors"
        >
          ← Prev
        </button>
        <h2 className="text-lg font-semibold text-[var(--color-accent-gold)] font-[Outfit]">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={() => setMonth(m => Math.min(11, m + 1))}
          disabled={month === 11}
          className="p-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-primary)] disabled:opacity-30 hover:bg-[var(--color-bg-card-hover)] transition-colors"
        >
          Next →
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'calendar'
              ? 'bg-[var(--color-accent-gold)] text-[#0A1628]'
              : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === 'list'
              ? 'bg-[var(--color-accent-gold)] text-[#0A1628]'
              : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]'
          }`}
        >
          List
        </button>
      </div>

      {view === 'calendar' ? (
        /* Calendar Grid */
        <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_HEADERS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-[var(--color-text-muted)] py-1">
                {d}
              </div>
            ))}
          </div>
          {/* Date cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {calendarDates.map(date => {
              const iso = toISODate(date);
              const dayLessons = lessonsByDate.get(iso);
              const hasSpecial = dayLessons?.some(l => l.occasion);
              const isToday =
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear();

              return (
                <Link
                  key={iso}
                  to={dayLessons ? `/lessons/${iso}` : '#'}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative ${
                    dayLessons
                      ? 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-accent-gold)]/20 cursor-pointer'
                      : 'opacity-40 cursor-default'
                  } ${isToday ? 'ring-2 ring-[var(--color-accent-gold)]' : ''}`}
                >
                  <span className={`font-medium ${dayLessons ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                    {date.getDate()}
                  </span>
                  {dayLessons && (
                    <div className="flex gap-0.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-[var(--color-accent-gold)]' : 'bg-blue-400'}`} />
                      {dayLessons.length > 1 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Service day</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent-gold)]" />
              <span>Special occasion</span>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {monthLessons.map((lesson, i) => (
            <Link
              key={`${lesson.date}-${i}`}
              to={`/lessons/${lesson.date}`}
              className="block bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-accent-gold)]/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {lesson.day}, {lesson.date} {lesson.time && `• ${lesson.time}`}
                  </div>
                  {lesson.occasion && (
                    <div className="text-sm font-medium text-[var(--color-accent-gold)] mt-1">
                      ✦ {lesson.occasion}
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    {lesson.firstLesson && (
                      <div className="text-sm text-[var(--color-text-primary)]">
                        <><BookOpen size={14} className="inline mr-1" /> {lesson.firstLesson.raw}</>
                      </div>
                    )}
                    {lesson.secondLesson && (
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        <><BookOpen size={14} className="inline mr-1" /> {lesson.secondLesson.raw}</>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[var(--color-text-muted)]">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
