import { describe, it, expect } from 'vitest';
import { getEasterDate, getLiturgicalSeason, getLiturgicalExclamation } from '../utils/liturgical';
import { parseReference } from '../utils/parseReference';
import { toISODate } from '../utils/dateUtils';

describe('liturgical calendar', () => {
  it('computes Easter Sunday', () => {
    expect(toISODate(getEasterDate(2026))).toBe('2026-04-05');
    expect(toISODate(getEasterDate(2027))).toBe('2027-03-28');
    expect(toISODate(getEasterDate(2025))).toBe('2025-04-20');
  });

  it('names the seasons around Easter', () => {
    expect(getLiturgicalSeason(new Date(2026, 2, 29)).season).toBe('palm_sunday');
    expect(getLiturgicalSeason(new Date(2026, 3, 2)).season).toBe('passion_week');
    expect(getLiturgicalSeason(new Date(2026, 3, 5)).season).toBe('easter');
    expect(getLiturgicalSeason(new Date(2026, 4, 24)).season).toBe('pentecost');
    expect(getLiturgicalSeason(new Date(2026, 11, 25)).season).toBe('christmas');
    expect(getLiturgicalSeason(new Date(2026, 6, 1)).season).toBe('ordinary');
  });

  it('uses Hossanah on Palm Sunday and Hallelujah in Easter week', () => {
    expect(getLiturgicalExclamation(new Date(2026, 2, 29))).toBe('Hossanah');
    expect(getLiturgicalExclamation(new Date(2026, 3, 5))).toBe('Halleluyah');
    expect(getLiturgicalExclamation(new Date(2026, 3, 7))).toBe('Hallelujah');
    expect(getLiturgicalExclamation(new Date(2026, 6, 1))).toBe('Halleluyah');
  });
});

describe('parseReference', () => {
  it('parses full and abbreviated references', () => {
    expect(parseReference('John 3:16')).toMatchObject({ book: 'John', chapter: 3, verseStart: 16, verseEnd: 16 });
    expect(parseReference('Gen 1')).toMatchObject({ book: 'Genesis', chapter: 1 });
    expect(parseReference('1 Cor 13:4-7')).toMatchObject({ book: '1 Corinthians', chapter: 13, verseStart: 4, verseEnd: 7 });
    expect(parseReference('Psalm 23')).toMatchObject({ book: 'Psalms', chapter: 23 });
    expect(parseReference('Song of Solomon 2:1–5')).toMatchObject({ book: 'Song of Solomon', verseEnd: 5 });
  });

  it('rejects nonsense', () => {
    expect(parseReference('hello')).toBeNull();
    expect(parseReference('Foo 3')).toBeNull();
  });
});
