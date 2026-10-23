import { getEasterDate } from './liturgical';
import type { ChurchEvent } from '../lib/community';

/**
 * Observances kept by the whole Church every year, computed rather than stored.
 * Dates follow the 1980 Constitution (clause 99) and current practice.
 */

function nthWeekday(year: number, month: number, weekday: number, n = 1): Date {
  const d = new Date(year, month, 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + 7 * (n - 1));
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function at(date: Date, hour = 0, minute = 0): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function builtIn(id: string, title: string, date: Date, description: string, category: ChurchEvent['category'] = 'service', hour?: number, location: string | null = null, lastDay?: Date): ChurchEvent {
  return {
    id: `builtin-${id}-${date.getFullYear()}`,
    title, description, category, location,
    starts_at: at(date, hour ?? 0),
    ends_at: lastDay ? at(lastDay, 23, 59) : null,
    all_day: hour === undefined,
    parish_id: null, scope: 'church', contact: null, status: 'published', submitted_by: null, builtIn: true,
  };
}

export function churchObservances(year: number): ChurchEvent[] {
  const easter = getEasterDate(year);
  return [
    builtIn('new-year', 'New Year', new Date(year, 0, 1), 'Thanksgiving for the new year.'),
    builtIn('palm-sunday', 'Palm Sunday', addDays(easter, -7), 'Hossanah! The beginning of Passion Week.'),
    builtIn('washing-of-feet', 'Washing of Feet (Holy Thursday)', addDays(easter, -3),
      'The annual washing of feet in every parish, in memory of the Last Supper (John 13:5-9). Holy Communion is also held on Holy Thursday.'),
    builtIn('good-friday', 'Good Friday', addDays(easter, -2),
      'Services at 9:00 a.m., 12:00 noon and 3:00 p.m. in remembrance of the arrest, trial, crucifixion and burial of Jesus Christ.', 'service', 9),
    builtIn('easter', 'Easter Sunday', easter, 'A service of joy and victory: Christ is risen.'),
    builtIn('juvenile-harvest', 'Juvenile Harvest', nthWeekday(year, 5, 0),
      'Juvenile Harvest Thanksgiving is celebrated by all parishes on the first Sunday in June.', 'harvest'),
    builtIn('holy-mary', 'Holy Mary’s Day', nthWeekday(year, 6, 5),
      'Commemorating the appearance of Holy Mary to the Pastor Founder on 15 July 1977. Kept on the first Friday of July.'),
    builtIn('founding', 'Founding Anniversary', new Date(year, 8, 29),
      'The Celestial Church of Christ came into the world by Divine Order on 29 September 1947 in Porto-Novo.', 'anniversary'),
    builtIn('founder-birthday', 'Pastor Founder’s Birthday', new Date(year, 9, 11),
      `Rev. Samuel Bilewu Joseph Oshoffa, Pastor Founder of the Celestial Church of Christ, was born on 11 October 1909 (${year - 1909} years). Remembered by the whole Church.`, 'anniversary'),
    builtIn('christmas-convocation', `Imeko ${year} — Christmas Convocation`, new Date(year, 11, 21),
      'The annual pilgrimage and Christmas convocation at the Celestial City, Imeko, ending with the Christmas service. Dates vary a little each year: confirm with your parish.',
      'convention', undefined, 'Celestial City, Imeko, Ogun State', new Date(year, 11, 25)),
    builtIn('pastor-birthday', 'Birthday of the Pastor, Rev. Emmanuel Mobiyina Oshoffa', new Date(year, 11, 25),
      `Rev. Emmanuel Mobiyina Oshoffa was born on 25 December 1948 (${year - 1948} years) and installed as Pastor in December 2002. Observed by the International Headquarters, Ketu, which recognises him as Pastor and Spiritual Head; other branches of the Church recognise other leaders.`,
      'anniversary', undefined, 'International Headquarters, Ketu, Lagos'),
    builtIn('christmas', 'Christmas Day', new Date(year, 11, 25), 'The birth of our Lord Jesus Christ. Holy Communion.'),
    builtIn('watchnight', 'Watch-night service', new Date(year, 11, 31), 'Crossing over into the new year in prayer.', 'service', 22),
  ];
}

/** Download an .ics file so the event can be added to the phone's calendar */
export function downloadIcs(event: ChurchEvent) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateOnly = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  };
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`);
  const start = event.all_day ? `DTSTART;VALUE=DATE:${dateOnly(event.starts_at)}` : `DTSTART:${stamp(event.starts_at)}`;
  const endIso = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + (event.all_day ? 86_400_000 : 2 * 3_600_000)).toISOString();
  // All-day DTEND is exclusive: the day after the last day
  const end = event.all_day
    ? `DTEND;VALUE=DATE:${dateOnly(event.ends_at ? new Date(new Date(event.ends_at).getTime() + 86_400_000).toISOString() : endIso)}`
    : `DTEND:${stamp(endIso)}`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CelestialWorship//Events//EN', 'BEGIN:VEVENT',
    `UID:${event.id}@celestialworship`, `DTSTAMP:${stamp(new Date().toISOString())}`, start, end,
    `SUMMARY:${escape(event.title)}`,
    event.description ? `DESCRIPTION:${escape(event.description)}` : '',
    event.location ? `LOCATION:${escape(event.location)}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${event.title.replace(/[^\w]+/g, '-')}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
