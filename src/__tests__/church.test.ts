import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { lessonEvents, churchObservances } from '../utils/churchCalendar';
import { MEN_RANKS, WOMEN_RANKS, HIERARCHY, ASSETS } from '../data/ranks';
import { continentOf } from '../hooks/useParishes';

const pub = (p: string) => resolve(__dirname, '../../public', p);
const read = (p: string) => JSON.parse(readFileSync(pub(p), 'utf-8'));

describe('events from the Bible lessons', () => {
  const lessons: { date: string; time?: string; occasion: string | null }[] = read('data/lessons.json');
  const events = lessonEvents(lessons, churchObservances(2026));

  it('turns the named occasions into calendar events', () => {
    expect(events.length).toBeGreaterThan(30);
    for (const e of events) {
      expect(e.title, e.id).not.toMatch(/^(Morning|Evening)\b/i);
      expect(e.title).not.toMatch(/\[|\]/);
      expect(Number.isNaN(Date.parse(e.starts_at))).toBe(false);
    }
  });

  it('puts the headquarters events in the right place', () => {
    const imeko = events.filter(e => /Imeko/i.test(e.title));
    expect(imeko.length).toBeGreaterThan(0);
    for (const e of imeko) expect(e.location).toMatch(/Imeko/);
  });

  it('lists each occasion once a day', () => {
    const keys = events.map(e => `${e.starts_at.slice(0, 10)}|${e.title.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('strips the service-time prefix and keeps the occasion', () => {
    const [e] = lessonEvents([{ date: '2026-03-01', time: '09:00', occasion: 'Morning - Imeko Adult Harvest [note]' }]);
    expect(e.title).toBe('Imeko Adult Harvest');
    expect(e.category).toBe('harvest');
    expect(lessonEvents([{ date: '2026-03-01', occasion: 'Morning' }])).toHaveLength(0);
  });
});

describe('ranks and structure', () => {
  it('numbers each list from the most senior without gaps', () => {
    for (const list of [MEN_RANKS, WOMEN_RANKS]) {
      expect(list.map(r => r.order)).toEqual(list.map((_, i) => i + 1));
      expect(new Set(list.map(r => r.name)).size).toBe(list.length);
      for (const r of list) {
        expect(r.garment.length, r.name).toBeGreaterThan(3);
        if (r.robe) expect(r.robe).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it('cites a source for the hierarchy and the symbols', () => {
    for (const h of HIERARCHY) expect(h.source, h.level).toBeTruthy();
    for (const a of ASSETS) expect(a.source, a.title).toBeTruthy();
  });
});

describe('parishes from the Church’s published list', () => {
  const listed: { id: string; name: string; continent: string; country: string; city: string | null; kind: string }[] = read('data/parishes_listed.json');

  it('has a unique id, a name, a country and its continent', () => {
    expect(listed.length).toBeGreaterThan(100);
    expect(new Set(listed.map(p => p.id)).size).toBe(listed.length);
    for (const p of listed) {
      expect(p.id).toMatch(/^listed-/);
      expect(p.name.trim(), p.id).toBeTruthy();
      expect(p.country, p.id).toBeTruthy();
      // The country alone places it on the right continent
      expect(continentOf({ country: p.country } as Parameters<typeof continentOf>[0]), p.id).toBe(p.continent);
    }
  });
});

describe('French Bible (Louis Segond 1910)', () => {
  const books: { name: string; chapterCount: number }[] = read('data/bible/books.json');

  it('has every book with all its chapters', () => {
    const files = readdirSync(pub('data/bible/fr'));
    expect(files).toHaveLength(66);
    for (const b of books) {
      const data = read(`data/bible/fr/${b.name.replace(/ /g, '')}.json`);
      expect(data.chapters.length, b.name).toBe(b.chapterCount);
      for (const c of data.chapters) expect(c.verses.length, `${b.name} ${c.chapter}`).toBeGreaterThan(0);
    }
  });

  it('reads John 3:16 as in the Segond', () => {
    const john = read('data/bible/fr/John.json');
    expect(john.chapters[2].verses[15].text).toMatch(/^Car Dieu a tant aimé le monde/);
  });
});
