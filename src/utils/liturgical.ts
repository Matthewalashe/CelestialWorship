/**
 * Liturgical calendar helpers shared by Home (greeting) and the Hymn Selector (seasonal hymns).
 */

/** Easter Sunday for a given year (Anonymous Gregorian algorithm) */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dayOnly(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export type LiturgicalSeason =
  | 'palm_sunday'
  | 'passion_week'
  | 'easter'
  | 'ascension'
  | 'pentecost'
  | 'christmas'
  | 'new_year'
  | 'ordinary';

export interface SeasonInfo {
  season: LiturgicalSeason;
  label: string;
  /** Hymnal sections that suit the season, most fitting first */
  sections: string[];
}

export function getLiturgicalSeason(date: Date): SeasonInfo {
  const t = dayOnly(date);
  const easter = getEasterDate(date.getFullYear());
  const palm = dayOnly(addDays(easter, -7));
  const easterDay = dayOnly(easter);
  const ascension = dayOnly(addDays(easter, 39));
  const pentecost = dayOnly(addDays(easter, 49));

  if (t === palm) return { season: 'palm_sunday', label: 'Palm Sunday', sections: ['palm_sunday', 'praise'] };
  if (t > palm && t < easterDay) return { season: 'passion_week', label: 'Passion Week', sections: ['passion_week', 'judgement'] };
  if (t >= easterDay && t < ascension) return { season: 'easter', label: 'Easter season', sections: ['easter', 'victory'] };
  if (t >= ascension && t < pentecost) return { season: 'ascension', label: 'Ascension', sections: ['ascension', 'glory'] };
  if (t >= pentecost && t <= dayOnly(addDays(easter, 56))) {
    return { season: 'pentecost', label: 'Pentecost', sections: ['holy_spirit', 'spiritual_power'] };
  }
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 11 && day >= 18) return { season: 'christmas', label: 'Christmas', sections: ['christmas', 'joy'] };
  if ((month === 11 && day === 31) || (month === 0 && day <= 7)) {
    return { season: 'new_year', label: 'New Year', sections: ['thanksgiving', 'promise', 'blessing'] };
  }
  return { season: 'ordinary', label: '', sections: [] };
}

/** "Halleluyah" greeting, with the forms CCC uses on Palm Sunday and in Easter week */
export function getLiturgicalExclamation(date: Date): string {
  const easter = getEasterDate(date.getFullYear());
  const t = dayOnly(date);
  if (t === dayOnly(addDays(easter, -7))) return 'Hossanah';
  // Easter week Mon–Sat only (Easter Sunday itself stays Halleluyah)
  if (t > dayOnly(easter) && t <= dayOnly(addDays(easter, 6))) return 'Hallelujah';
  return 'Halleluyah';
}
