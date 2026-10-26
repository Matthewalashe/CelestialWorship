/**
 * Date utilities for CCC service day detection and formatting.
 */

/**
 * The regular services, mirroring the `day` and `time` fields of public/data/services.json
 * (the Order of Service data). A test checks the two agree, so this is the one schedule used
 * by Home, reminders, Devotion and the Hymn Selector.
 */
interface ScheduledService {
  id: string;
  name: string;
  icon: string;
  /** 0 = Sunday … 6 = Saturday; 'daily'; or 'first-thursday' of the month; or a fixed 'MM-DD' date */
  when: number[] | 'daily' | 'first-thursday' | `${number}-${number}`;
  hour: number;
  minute: number;
}

export const SERVICE_SCHEDULE: ScheduledService[] = [
  { id: 'morning_service', name: 'Morning Service', icon: '☀️', when: 'daily', hour: 6, minute: 0 },
  { id: 'lords_day_service', name: "Lord's Day Service", icon: '✝️', when: [0], hour: 10, minute: 0 },
  { id: 'evening_service_lords_day', name: 'Evening Service', icon: '🌅', when: [0], hour: 18, minute: 0 },
  { id: 'seekers_service', name: 'Seekers Service', icon: '🕯️', when: [3], hour: 9, minute: 0 },
  { id: 'mercy_day_service', name: 'Mercy Day Service', icon: '🙏', when: [3], hour: 18, minute: 0 },
  { id: 'prophets_prophetess_dreamers', name: 'Prophets, Prophetesses & Dreamers', icon: '⭐', when: [5], hour: 12, minute: 0 },
  { id: 'power_day_service', name: 'Power Day Service', icon: '⚡', when: [5], hour: 18, minute: 0 },
  { id: 'new_moon', name: 'New Moon Service', icon: '🌑', when: 'first-thursday', hour: 22, minute: 0 },
  { id: 'end_of_year', name: 'End of Year Service', icon: '🎆', when: '12-31', hour: 22, minute: 0 },
];

function occursOn(s: ScheduledService, date: Date): boolean {
  if (s.when === 'daily') return true;
  if (s.when === 'first-thursday') return date.getDay() === 4 && date.getDate() <= 7;
  if (typeof s.when === 'string') {
    const [m, d] = s.when.split('-').map(Number);
    return date.getMonth() + 1 === m && date.getDate() === d;
  }
  return s.when.includes(date.getDay());
}

/** Service ids held on a date, in time order */
export function getServiceTypesForDate(date: Date): string[] {
  return getServiceScheduleForDate(date).map(s => s.id);
}

/**
 * Format a date for display
 */
/** Dates follow the app language (Gungbe uses the French of Benin) */
function dateLocale(): string {
  try {
    const l = localStorage.getItem('cw-ui-language');
    return l === 'yo' ? 'yo-NG' : l === 'fr' ? 'fr-FR' : 'en-GB';
  } catch {
    return 'en-GB';
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(dateLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a date as ISO string (YYYY-MM-DD)
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an ISO date string to a Date object
 */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get all dates in a month (for calendar views)
 */
export function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Service schedule with times for notification scheduling */
export interface ServiceScheduleItem {
  id: string;
  name: string;
  icon: string;
  hour: number;
  minute: number;
}

/** Get all services with their scheduled times for a given date, in time order */
export function getServiceScheduleForDate(date: Date): ServiceScheduleItem[] {
  return SERVICE_SCHEDULE
    .filter(s => occursOn(s, date))
    .map(({ id, name, icon, hour, minute }) => ({ id, name, icon, hour, minute }))
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
}

/** "6:00 PM" */
export function formatServiceTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}
