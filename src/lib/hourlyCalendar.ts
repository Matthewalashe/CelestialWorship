import { hourlyPrayersForDate, hourLabel } from '../utils/dateUtils';
import { tr } from '../i18n';

/**
 * The hourly prayers as a calendar file: the phone's own calendar then rings at each hour, like an alarm,
 * even when the app is closed. Each hour repeats on the weekdays it is kept (a service takes its place
 * on some days, unless the reader prays at home).
 */

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
// A week without a first Thursday or a feast, to read the weekly pattern from (Sunday 14 June 2026)
const SAMPLE_SUNDAY = new Date(2026, 5, 14);

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const escape = (s: string) => s.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n');

export function hourlyPrayerCalendar(hours: number[], atHome: boolean): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = `${tomorrow.getFullYear()}${pad(tomorrow.getMonth() + 1)}${pad(tomorrow.getDate())}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CelestialWorship//Hourly prayer//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const hour of [...hours].sort((a, b) => a - b)) {
    const days = DAYS.filter((_, i) => {
      const d = new Date(SAMPLE_SUNDAY);
      d.setDate(d.getDate() + i);
      return hourlyPrayersForDate(d, atHome).includes(hour);
    });
    if (!days.length) continue;
    const title = `${tr('Hourly prayer')} · ${tr(hourLabel(hour))}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:hourly-prayer-${hour}${atHome ? '-home' : ''}@celestialworship.online`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${day}T${pad(hour)}0000`,
      'DURATION:PT15M',
      days.length === 7 ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')}`,
      `SUMMARY:${escape(`Àdúrà Wákàtí · ${title}`)}`,
      `DESCRIPTION:${escape(tr('Opening hymn, prayer (thanksgiving, sanctification, blessing and mercy), Bible reading, silent prayer, closing hymn and closing prayer.'))}`,
      'URL:https://celestialworship.online/devotion?service=hourly_prayer',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${escape(title)}`, 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadHourlyPrayerCalendar(hours: number[], atHome: boolean) {
  const url = URL.createObjectURL(new Blob([hourlyPrayerCalendar(hours, atHome)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hourly-prayer.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
