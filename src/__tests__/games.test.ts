import { describe, it, expect, beforeEach } from 'vitest';
import { answerPoints, comboMultiplier, levelFor, LEVELS, dailySeed, dailyShareText, recordDaily, recordRound, readGame, weekStart } from '../utils/gamify';
import { PLACES, JESUS_JOURNEY, BIBLE_LANDS, NT_REGIONS, placeById, distanceKm, distanceScore } from '../data/bibleLands';
import { dailyQuestions } from '../pages/Quiz';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  (globalThis as any).window = { dispatchEvent: () => true };
});

describe('scoring', () => {
  it('rewards difficulty, speed and combos', () => {
    expect(answerPoints({ correct: false, difficulty: 3, combo: 9 })).toBe(0);
    expect(answerPoints({ correct: true, difficulty: 1, combo: 1 })).toBe(10);
    expect(answerPoints({ correct: true, difficulty: 2, ms: 0, combo: 1 })).toBe(30);
    expect(answerPoints({ correct: true, difficulty: 1, ms: 20_000, combo: 5 })).toBe(20);
    expect(comboMultiplier(2)).toBe(1);
    expect(comboMultiplier(8)).toBe(3);
  });
  it('maps XP to levels', () => {
    expect(levelFor(0).title).toBe('Seeker');
    expect(levelFor(LEVELS[2].xp).level).toBe(3);
    expect(levelFor(999_999).next).toBeNull();
  });
});

describe('rounds and the daily challenge', () => {
  it('records XP, the week and badges', () => {
    const out = recordRound({ xp: 200, topic: 'bible', correct: 10, total: 10, bestCombo: 10 });
    expect(out.levelUp).toBe(true);
    expect(out.newBadges.map(b => b.id)).toEqual(expect.arrayContaining(['first-round', 'perfect', 'combo-5', 'combo-10']));
    expect(readGame().weeks[weekStart()]).toBe(200);
    expect(recordRound({ xp: 10, correct: 1, total: 2, bestCombo: 1 }).newBadges).toEqual([]);
  });
  it('keeps a daily streak and counts each day once', () => {
    expect(recordDaily([true, true, false, true, true], new Date(2026, 9, 20))).toBe(1);
    expect(recordDaily([true, true, true, true, true], new Date(2026, 9, 21))).toBe(2);
    expect(recordDaily([false, false, false, false, false], new Date(2026, 9, 21))).toBe(2);
    expect(recordDaily([true, true, true, true, true], new Date(2026, 9, 23))).toBe(1);
    expect(readGame().daily.best).toBe(2);
  });
  it('gives everyone the same daily questions', () => {
    const d = new Date(2026, 9, 23);
    expect(dailySeed(d)).toBe(dailySeed(new Date(2026, 9, 23, 20)));
    expect(dailyQuestions(d).map(q => q.id)).toEqual(dailyQuestions(d).map(q => q.id));
    expect(dailyQuestions(d)).toHaveLength(5);
    expect(dailyShareText('11011', 3, d)).toBe('CelestialWorship Daily #23 — 4/5\n🟩🟩🟥🟩🟩 🔥3');
  });
});

describe('Bible lands data', () => {
  const holyland = JSON.parse(readFileSync(join(__dirname, '../../public/data/maps/holyland.json'), 'utf-8'));
  const world = JSON.parse(readFileSync(join(__dirname, '../../public/data/maps/world.json'), 'utf-8'));

  it('has unique places inside their map', () => {
    expect(new Set(PLACES.map(p => p.id)).size).toBe(PLACES.length);
    for (const p of PLACES) {
      const m = p.map === 'holyland' ? holyland : world;
      const x = (p.lon - m.projection.west) * m.projection.k * m.projection.cos;
      const y = (m.projection.north - p.lat) * m.projection.k;
      expect(x >= 0 && x <= m.width && y >= 0 && y <= m.height, `${p.id} is off the ${p.map} map`).toBe(true);
    }
  });
  it('every journey stop and Bible land points to real data', () => {
    for (const s of JESUS_JOURNEY) expect(placeById(s.placeId), s.placeId).toBeTruthy();
    const ids = new Set(world.countries.map((c: any) => c.id));
    for (const l of BIBLE_LANDS) for (const c of l.countries) expect(ids.has(c), `${l.name}: ${c}`).toBe(true);
  });
  it('places regions on the holy land map', () => {
    for (const r of NT_REGIONS) expect(r.ring.length).toBeGreaterThan(5);
  });
  it('measures distance and scores guesses', () => {
    const km = distanceKm(placeById('bethlehem')!, placeById('jerusalem')!);
    expect(km).toBeGreaterThan(7);
    expect(km).toBeLessThan(10);
    expect(distanceScore(0)).toBe(100);
    expect(distanceScore(30)).toBeGreaterThan(0);
    expect(distanceScore(60)).toBe(0);
  });
});
