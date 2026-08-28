/**
 * Date utilities for CCC service day detection and formatting.
 */

/**
 * Get the CCC service type(s) for a given date.
 * - Sunday → Lord's Day (Morning + Evening)
 * - Wednesday → Seekers (9am) + Mercy Day (6pm)
 * - Friday → Power Day (6pm)
 * - Special days checked against the lessons calendar
 */
export function getServiceTypesForDate(date: Date): string[] {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
  switch (day) {
    case 0: // Sunday
      return ['lords_day_service', 'evening_service_lords_day'];
    case 1: // Monday (6am morning service)
      return ['morning_service'];
    case 2: // Tuesday (6am morning service)
      return ['morning_service'];
    case 3: // Wednesday
      return ['seekers_service', 'mercy_day_service'];
    case 4: // Thursday (6am morning service)
      return ['morning_service'];
    case 5: // Friday
      return ['power_day_service', 'prophets_prophetess_dreamers'];
    case 6: // Saturday (6am morning service)
      return ['morning_service'];
    default:
      return ['morning_service'];
  }
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
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
 * Get the day name from a Date
 */
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long' });
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

/**
 * Get the start of the current week (Sunday)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the next N service days from a given date
 */
export function getUpcomingServiceDays(from: Date, count: number): Date[] {
  const result: Date[] = [];
  const d = new Date(from);
  
  while (result.length < count) {
    result.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  
  return result;
}

/** Service schedule with times for notification scheduling */
export interface ServiceScheduleItem {
  id: string;
  name: string;
  icon: string;
  hour: number;
  minute: number;
}

/** Get all services with their scheduled times for a given date */
export function getServiceScheduleForDate(date: Date): ServiceScheduleItem[] {
  const day = date.getDay();
  const schedule: ServiceScheduleItem[] = [];

  // Every day has 6AM morning service
  schedule.push({ id: 'morning_service', name: 'Morning Service', icon: '☀️', hour: 6, minute: 0 });

  switch (day) {
    case 0: // Sunday
      schedule.push({ id: 'lords_day_service', name: "Lord's Day Service", icon: '✝️', hour: 10, minute: 0 });
      schedule.push({ id: 'evening_service_lords_day', name: 'Evening Service', icon: '🌅', hour: 18, minute: 0 });
      break;
    case 3: // Wednesday
      schedule.push({ id: 'seekers_service', name: 'Seekers Service', icon: '🕯️', hour: 9, minute: 0 });
      schedule.push({ id: 'mercy_day_service', name: 'Mercy Day Service', icon: '🙏', hour: 18, minute: 0 });
      break;
    case 5: // Friday
      schedule.push({ id: 'power_day_service', name: 'Power Day Service', icon: '⚡', hour: 18, minute: 0 });
      break;
  }

  return schedule;
}
