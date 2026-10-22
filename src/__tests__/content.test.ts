import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SERVICE_SCHEDULE, getServiceTypesForDate, formatServiceTime } from '../utils/dateUtils';
import { QUESTION_BANKS } from '../data/quizzes';
import { shuffleOptions, seededShuffle } from '../utils/quiz';
import { churchObservances } from '../utils/churchCalendar';
import { toISODate } from '../utils/dateUtils';

const read = (p: string) => JSON.parse(readFileSync(resolve(__dirname, '../../public/data', p), 'utf-8'));

describe('service schedule', () => {
  const services: { id: string; day: string; time: string }[] = read('services.json');

  it('matches the day and time written in services.json', () => {
    for (const s of SERVICE_SCHEDULE) {
      const row = services.find(x => x.id === s.id);
      expect(row, s.id).toBeDefined();
      expect(row!.time).toBe(formatServiceTime(s.hour, s.minute));
      if (Array.isArray(s.when)) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        expect(row!.day).toBe(days[s.when[0]]);
      }
    }
  });

  it('lists the right services for a Sunday, Wednesday and Friday', () => {
    expect(getServiceTypesForDate(new Date(2026, 5, 14))).toEqual(['morning_service', 'lords_day_service', 'evening_service_lords_day']);
    expect(getServiceTypesForDate(new Date(2026, 5, 17))).toEqual(['morning_service', 'seekers_service', 'mercy_day_service']);
    expect(getServiceTypesForDate(new Date(2026, 5, 19))).toEqual(['morning_service', 'prophets_prophetess_dreamers', 'power_day_service']);
  });

  it('holds New Moon on the first Thursday only', () => {
    expect(getServiceTypesForDate(new Date(2026, 9, 1))).toContain('new_moon'); // Thu 1 Oct 2026
    expect(getServiceTypesForDate(new Date(2026, 9, 8))).not.toContain('new_moon');
  });
});

describe('quiz banks', () => {
  for (const [topic, bank] of Object.entries(QUESTION_BANKS)) {
    it(`${topic}: well-formed questions`, () => {
      const ids = new Set<string>();
      for (const q of bank) {
        expect(ids.has(q.id), q.id).toBe(false);
        ids.add(q.id);
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size, `${q.id} duplicate options`).toBe(q.options.length);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        expect(q.explanation.length).toBeGreaterThan(10);
        expect(q.source.length).toBeGreaterThan(2);
      }
    });
  }

  it('keeps the right answer when options are shuffled', () => {
    for (const q of QUESTION_BANKS.bible) {
      for (const seed of [1, 7, 99]) {
        const s = shuffleOptions(q, seed);
        expect(s.options[s.answer]).toBe(q.options[q.answer]);
      }
    }
  });

  it('does not always put the answer first', () => {
    const positions = QUESTION_BANKS.doctrine.map((q, i) => shuffleOptions(q, i * 13 + 5).answer);
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it('shuffles deterministically', () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 42)).toEqual(seededShuffle([1, 2, 3, 4, 5], 42));
  });
});

describe('church calendar', () => {
  it('places the observances on the right dates', () => {
    const byId = Object.fromEntries(churchObservances(2026).map(e => [e.id.replace(/-2026$/, ''), toISODate(new Date(e.starts_at))]));
    expect(byId['builtin-easter']).toBe('2026-04-05');
    expect(byId['builtin-palm-sunday']).toBe('2026-03-29');
    expect(byId['builtin-washing-of-feet']).toBe('2026-04-02');
    expect(byId['builtin-juvenile-harvest']).toBe('2026-06-07'); // first Sunday of June 2026
    expect(byId['builtin-holy-mary']).toBe('2026-07-03'); // first Friday of July 2026
    expect(byId['builtin-founding']).toBe('2026-09-29');
  });
});

describe('constitution data', () => {
  it('has clauses with text and no empty "following" lists', () => {
    const c = read('constitution.json');
    for (const s of c.sections) {
      for (const cl of s.clauses ?? []) {
        expect(cl.text.length).toBeGreaterThan(10);
        if (/:\s*$/.test(cl.text)) expect(cl.subClauses.length, `${cl.number} ends with ':' but has no items`).toBeGreaterThan(0);
      }
    }
  });
});
