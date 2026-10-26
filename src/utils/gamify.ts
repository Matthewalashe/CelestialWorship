import { toISODate } from './dateUtils';

/**
 * Points, levels, badges and the daily challenge for quizzes and map games.
 * Stored on the device (PRINCIPLES §2); a weekly total can be posted to the leaderboard by signed-in players.
 */

const KEY = 'cw-game';

export interface GameState {
  xp: number;
  /** XP earned per ISO week (Monday date), for the weekly leaderboard */
  weeks: Record<string, number>;
  badges: string[];
  bestCombo: number;
  rounds: number;
  perfectRounds: number;
  mapRounds: number;
  topicsPlayed: string[];
  daily: { last: string | null; streak: number; best: number; results: Record<string, string> };
}

const EMPTY: GameState = {
  xp: 0, weeks: {}, badges: [], bestCombo: 0, rounds: 0, perfectRounds: 0, mapRounds: 0, topicsPlayed: [],
  daily: { last: null, streak: 0, best: 0, results: {} },
};

export function readGame(): GameState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...EMPTY, ...s, daily: { ...EMPTY.daily, ...s.daily } };
  } catch {
    return { ...EMPTY };
  }
}

function writeGame(s: GameState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new Event('cw-game-change'));
}

export function weekStart(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return toISODate(x);
}

// ── Levels: titles from Scripture, not Church ranks ─────────────

export const LEVELS: { xp: number; title: string; verse: string }[] = [
  { xp: 0, title: 'Seeker', verse: 'Seek, and ye shall find: Matthew 7:7' },
  { xp: 150, title: 'Listener', verse: 'Swift to hear: James 1:19' },
  { xp: 400, title: 'Disciple', verse: 'Learn of me: Matthew 11:29' },
  { xp: 800, title: 'Berean', verse: 'Searched the scriptures daily: Acts 17:11' },
  { xp: 1400, title: 'Scribe of the Kingdom', verse: 'Things new and old: Matthew 13:52' },
  { xp: 2200, title: 'Watchman', verse: 'I have set thee a watchman: Ezekiel 33:7' },
  { xp: 3300, title: 'Faithful Steward', verse: 'Well done, good and faithful: Matthew 25:21' },
  { xp: 4800, title: 'Wise Heart', verse: 'An understanding heart: 1 Kings 3:9' },
  { xp: 7000, title: 'Light on a Hill', verse: 'Ye are the light of the world: Matthew 5:14' },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const next = LEVELS[i + 1];
  return {
    level: i + 1, ...LEVELS[i],
    next: next ?? null,
    progress: next ? (xp - LEVELS[i].xp) / (next.xp - LEVELS[i].xp) : 1,
  };
}

// ── Scoring ─────────────────────────────────────────────────────

/** Answer time limit in a timed round */
export const ANSWER_MS = 20_000;

export function comboMultiplier(combo: number): number {
  return combo >= 8 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1.5 : 1;
}

/**
 * Points for one answer: 10 per difficulty level, a speed bonus of up to 10 in timed rounds,
 * multiplied by the current combo.
 */
export function answerPoints(opts: { correct: boolean; difficulty: 1 | 2 | 3; ms?: number; combo: number }): number {
  if (!opts.correct) return 0;
  const base = 10 * opts.difficulty;
  const speed = opts.ms === undefined ? 0 : Math.max(0, Math.round(10 * (1 - opts.ms / ANSWER_MS)));
  return Math.round((base + speed) * comboMultiplier(opts.combo));
}

// ── Badges ──────────────────────────────────────────────────────

export const BADGES: { id: string; title: string; description: string; icon: string; earned: (s: GameState) => boolean }[] = [
  { id: 'first-round', title: 'First steps', description: 'Finish your first round', icon: '👣', earned: s => s.rounds >= 1 },
  { id: 'perfect', title: 'Without spot', description: 'A round with every answer right', icon: '💯', earned: s => s.perfectRounds >= 1 },
  { id: 'combo-5', title: 'On fire', description: 'Five right answers in a row', icon: '🔥', earned: s => s.bestCombo >= 5 },
  { id: 'combo-10', title: 'Pillar of fire', description: 'Ten right answers in a row', icon: '🕯️', earned: s => s.bestCombo >= 10 },
  { id: 'all-topics', title: 'Well rounded', description: 'Play every quiz topic', icon: '🧭', earned: s => ['bible', 'hymns', 'constitution', 'geography', 'doctrine'].every(t => s.topicsPlayed.includes(t)) },
  { id: 'daily-3', title: 'Three days', description: 'Daily challenge three days running', icon: '📅', earned: s => s.daily.best >= 3 },
  { id: 'daily-7', title: 'A full week', description: 'Daily challenge seven days running', icon: '🌈', earned: s => s.daily.best >= 7 },
  { id: 'daily-40', title: 'Forty days', description: 'Daily challenge forty days running', icon: '⛰️', earned: s => s.daily.best >= 40 },
  { id: 'explorer', title: 'Explorer', description: 'Play a map game', icon: '🗺️', earned: s => s.mapRounds >= 1 },
  { id: 'pilgrim', title: 'Pilgrim', description: 'Play ten map games', icon: '🐪', earned: s => s.mapRounds >= 10 },
  { id: 'level-4', title: 'Berean', description: 'Reach level 4', icon: '📜', earned: s => s.xp >= LEVELS[3].xp },
  { id: 'level-7', title: 'Faithful steward', description: 'Reach level 7', icon: '👑', earned: s => s.xp >= LEVELS[6].xp },
];

export interface RoundOutcome { xpGained: number; total: number; levelUp: boolean; newBadges: typeof BADGES }

/** Record a finished round and return what changed, for the celebration screen */
export function recordRound(opts: { xp: number; topic?: string; correct: number; total: number; bestCombo: number; map?: boolean }): RoundOutcome {
  const s = readGame();
  const before = levelFor(s.xp).level;
  const had = new Set(s.badges);
  s.xp += opts.xp;
  const wk = weekStart();
  s.weeks = { ...Object.fromEntries(Object.entries(s.weeks).slice(-8)), [wk]: (s.weeks[wk] ?? 0) + opts.xp };
  s.rounds += 1;
  if (opts.total > 0 && opts.correct === opts.total) s.perfectRounds += 1;
  s.bestCombo = Math.max(s.bestCombo, opts.bestCombo);
  if (opts.map) s.mapRounds += 1;
  if (opts.topic && !s.topicsPlayed.includes(opts.topic)) s.topicsPlayed = [...s.topicsPlayed, opts.topic];
  const newBadges = BADGES.filter(b => !had.has(b.id) && b.earned(s));
  s.badges = [...s.badges, ...newBadges.map(b => b.id)];
  writeGame(s);
  return { xpGained: opts.xp, total: s.xp, levelUp: levelFor(s.xp).level > before, newBadges };
}

// ── Daily challenge ─────────────────────────────────────────────

/** Same five questions for everyone on a given day */
export function dailySeed(date = new Date()): number {
  const d = toISODate(date);
  let h = 2166136261;
  for (const c of d) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Day number since the app's first daily challenge, for the share text */
export function dailyNumber(date = new Date()): number {
  const start = Date.UTC(2026, 9, 1);
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((day - start) / 86_400_000) + 1;
}

export function dailyDoneToday(date = new Date()): string | null {
  return readGame().daily.results[toISODate(date)] ?? null;
}

/** marks: one per question, true = right. Returns the updated streak. */
export function recordDaily(marks: boolean[], date = new Date()): number {
  const s = readGame();
  const today = toISODate(date);
  if (s.daily.results[today]) return s.daily.streak;
  const yesterday = new Date(date); yesterday.setDate(yesterday.getDate() - 1);
  const streak = s.daily.last === toISODate(yesterday) ? s.daily.streak + 1 : 1;
  const keep = Object.entries(s.daily.results).slice(-60);
  s.daily = { last: today, streak, best: Math.max(s.daily.best, streak), results: { ...Object.fromEntries(keep), [today]: marks.map(m => (m ? '1' : '0')).join('') } };
  writeGame(s);
  return streak;
}

export function dailyShareText(marks: string, streak: number, date = new Date()): string {
  const grid = [...marks].map(m => (m === '1' ? '🟩' : '🟥')).join('');
  const right = [...marks].filter(m => m === '1').length;
  return `CelestialWorship Daily #${dailyNumber(date)}: ${right}/${marks.length}\n${grid}${streak > 1 ? ` 🔥${streak}` : ''}`;
}
