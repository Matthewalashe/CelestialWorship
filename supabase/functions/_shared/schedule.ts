// Weekly services for reminders. Keep in step with src/utils/dateUtils.ts SERVICE_SCHEDULE
// (both mirror public/data/services.json; the app's test checks the app copy).
export interface ScheduledService {
  id: string;
  name: string;
  when: number[] | 'daily' | 'first-thursday' | string; // weekdays (0 = Sunday), 'daily', 'first-thursday' or 'MM-DD'
  hour: number;
  minute: number;
}

export const SERVICE_SCHEDULE: ScheduledService[] = [
  { id: 'morning_service', name: 'Morning Service', when: 'daily', hour: 6, minute: 0 },
  { id: 'lords_day_service', name: "Lord's Day Service", when: [0], hour: 10, minute: 0 },
  { id: 'evening_service_lords_day', name: 'Evening Service', when: [0], hour: 18, minute: 0 },
  { id: 'seekers_service', name: 'Seekers Service', when: [3], hour: 9, minute: 0 },
  { id: 'mercy_day_service', name: 'Mercy Day Service', when: [3], hour: 18, minute: 0 },
  { id: 'prophets_prophetess_dreamers', name: 'Prophets, Prophetesses & Dreamers', when: [5], hour: 12, minute: 0 },
  { id: 'power_day_service', name: 'Power Day Service', when: [5], hour: 18, minute: 0 },
  { id: 'new_moon', name: 'New Moon Service', when: 'first-thursday', hour: 22, minute: 0 },
  { id: 'end_of_year', name: 'End of Year Service', when: '12-31', hour: 22, minute: 0 },
];

/** Wall-clock parts of an instant in a time zone */
export function localParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  }).formatToParts(date).map(p => [p.type, p.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    month: Number(parts.month), day: Number(parts.day), weekday,
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

export function occursOn(s: ScheduledService, p: { month: number; day: number; weekday: number }): boolean {
  if (s.when === 'daily') return true;
  if (s.when === 'first-thursday') return p.weekday === 4 && p.day <= 7;
  if (typeof s.when === 'string') {
    const [m, d] = s.when.split('-').map(Number);
    return p.month === m && p.day === d;
  }
  return s.when.includes(p.weekday);
}
