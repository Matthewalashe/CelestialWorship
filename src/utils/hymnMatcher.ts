import { Hymn, HymnCategory, ServiceOrder, HymnSlot } from '../types';
import { normalizeForSearch } from './search';
import { getLiturgicalSeason } from './liturgical';
import { toISODate } from './dateUtils';

/**
 * Hymn Selector: hymns that fit the day.
 *
 * Each hymn is scored for each slot of the Order of Service by how well it suits the day's occasion
 * (the occasion printed in the Bible lessons, the Church's observances, the season, the kind of service)
 * and the day's set readings (their words in English and in Yorùbá, and what they are about), then
 * by whether it is tagged for that slot and how recently it was sung. See scoreHymn() for the weights.
 *
 * planHymns() fills every slot together so no hymn is used twice in one service.
 * useHymnContext() gathers the day's readings and occasions for it.
 */

export interface ScoredHymnSuggestion {
  hymnNumber: number;
  hymn: Hymn;
  reason: string;
  score: number;
  matchType: 'exact' | 'category' | 'related' | 'manual';
  isRecentlyUsed?: boolean;
}

export interface MatchContext {
  /** Date the service will be held (YYYY-MM-DD) — drives season, recency and variety */
  date?: string;
  serviceId?: string;
  lessonRefs?: { book: string; chapter: number }[];
  /** Text of the day's set verses in English */
  lessonText?: string;
  /** The same verses in Yorùbá: matched against the hymns' Yorùbá words, which are the original */
  lessonTextYo?: string;
  /** What the day is: the lessons' occasion ("Imeko Adult Harvest") and observances ("Palm Sunday") */
  occasions?: string[];
}

// ── Usage history ────────────────────────────────────────────

const USAGE_KEY = 'cw-recent-hymns';

interface HymnUsage {
  number: number;
  date: string; // YYYY-MM-DD
}

export function getHymnUsage(): HymnUsage[] {
  try {
    const data = JSON.parse(localStorage.getItem(USAGE_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    // Older versions stored bare numbers with no date: treat them as used two weeks ago
    const legacyDate = toISODate(new Date(Date.now() - 14 * 86_400_000));
    return data
      .map((entry: unknown) =>
        typeof entry === 'number' ? { number: entry, date: legacyDate } : (entry as HymnUsage))
      .filter((u): u is HymnUsage => !!u && typeof u.number === 'number' && typeof u.date === 'string');
  } catch {
    return [];
  }
}

export function recordHymnUsage(hymnNumbers: number[], date: string = toISODate(new Date())): void {
  try {
    const others = getHymnUsage().filter(u => !(hymnNumbers.includes(u.number) && u.date === date));
    const updated = [...hymnNumbers.map(number => ({ number, date })), ...others].slice(0, 300);
    localStorage.setItem(USAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save hymn usage', e);
  }
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/** Most recent use of each hymn before the given date, in days */
function lastUsedDaysAgo(usage: HymnUsage[], date: string): Map<number, number> {
  const result = new Map<number, number>();
  for (const u of usage) {
    const ago = daysBetween(u.date, date);
    if (ago < 0) continue; // planned for a later date
    const prev = result.get(u.number);
    if (prev === undefined || ago < prev) result.set(u.number, ago);
  }
  return result;
}

// ── Slots ────────────────────────────────────────────────────

/**
 * Extract selectable hymn slots from a service.
 * - Fixed hymns (e.g. #674, #731) are constant ceremonial songs — excluded from selection.
 * - Duplicate categories are deduplicated (keep first occurrence).
 * - Capped at 7 selectable slots per CCC liturgy (max 7 service hymns).
 */
export function extractHymnSlots(service: ServiceOrder): {
  stepNumber: number;
  slotName: string;
  slot: HymnSlot;
}[] {
  const rawSlots = service.steps
    .filter(step => step.hymnSlot !== null)
    .map(step => ({
      stepNumber: step.stepNumber || 0,
      slotName: step.hymnSlot?.category
        ? categoryToSlotName(step.hymnSlot.category)
        : `Hymn ${step.hymnSlot?.fixedHymnNumber}`,
      slot: step.hymnSlot!,
    }));

  const selectableSlots = rawSlots.filter(({ slot }) => !slot.fixedHymnNumber);

  const seenCategories = new Set<string>();
  const deduped = selectableSlots.filter(({ slot }) => {
    if (!slot.category) return true;
    if (seenCategories.has(slot.category)) return false;
    seenCategories.add(slot.category);
    return true;
  });

  return deduped.slice(0, 7);
}

// ── Occasion ─────────────────────────────────────────────────

/** Hymnal sections that suit each service, most fitting first */
const SERVICE_SECTIONS: Record<string, string[]> = {
  burial: ['burial', 'heavenly_call', 'promise'],
  christian_wake: ['burial', 'heavenly_call', 'faith'],
  remembrance: ['burial', 'heavenly_call', 'promise'],
  holy_matrimony: ['wedding', 'blessing', 'divine_love'],
  baptism: ['baptism', 'sanctification'],
  baby_christening: ['children', 'blessing', 'thanksgiving'],
  birthday: ['thanksgiving', 'blessing', 'joy'],
  washing_feet_communion: ['holy_communion', 'sanctification', 'passion_week'],
  church_dedication: ['house_dedication', 'glory', 'praise'],
  private_house_dedication: ['house_dedication', 'blessing', 'protection_journey'],
  laying_foundation_stone: ['house_dedication', 'gods_work', 'blessing'],
  end_of_year: ['thanksgiving', 'promise', 'praise_worship'],
  new_moon: ['blessing', 'promise', 'protection_journey'],
  pregnant_women: ['blessing', 'protection_journey', 'healing'],
  mercy_day_service: ['seeking_favour', 'prayer', 'passion_week'],
  power_day_service: ['spiritual_power', 'holy_spirit', 'victory'],
  prophets_prophetess_dreamers: ['revelation', 'holy_spirit', 'spiritual_power'],
  seekers_service: ['seeking_favour', 'prayer', 'faith'],
  morning_service: ['prayer', 'praise', 'protection_journey'],
};

/**
 * What the day is: the occasion printed in the Bible lessons ("Imeko Adult Harvest", "Palm Sunday"…)
 * and the Church's observances on the calendar, mapped to hymnal sections, most fitting first.
 */
const OCCASION_SECTIONS: [RegExp, string[]][] = [
  [/harvest|first ?fruit/i, ['harvest', 'thanksgiving', 'praise_worship']],
  // Names of places (Imeko, Ketu, Porto-Novo) only say where; the words around them say what
  [/palm sunday|hosanna/i, ['palm_sunday', 'praise']],
  [/good friday|passion|crucifix|holy (thursday|week)|maundy/i, ['passion_week', 'judgement']],
  [/washing of feet|communion|lord'?s supper/i, ['holy_communion', 'passion_week', 'sanctification']],
  [/easter|resurrection/i, ['easter', 'victory']],
  [/ascension/i, ['ascension', 'glory', 'victory']],
  [/pentecost|holy spirit|power day/i, ['holy_spirit', 'spiritual_power']],
  [/christmas|nativity|advent/i, ['christmas', 'joy']],
  [/new year|cross ?over|watch ?night/i, ['thanksgiving', 'promise', 'blessing']],
  [/end of (the )?year|thanksgiving|anniversary|birthday/i, ['thanksgiving', 'joy', 'blessing']],
  [/founder|remembrance|memorial|burial|wake|service of songs|translation of/i, ['heavenly_call', 'burial', 'promise']],
  [/juvenile|children|youth/i, ['children', 'joy', 'blessing']],
  [/wedding|matrimony|marriage/i, ['wedding', 'blessing', 'divine_love']],
  [/baptism|christening|naming/i, ['baptism', 'children', 'blessing']],
  [/dedication|foundation/i, ['house_dedication', 'gods_work', 'blessing']],
  [/convocation|convention|pilgrimage|imeko|crusade|revival|evangel|outreach/i, ['good_news', 'gods_work', 'revelation', 'spiritual_power']],
  [/healing|deliverance/i, ['healing', 'spiritual_power']],
  [/mercy/i, ['seeking_favour', 'prayer']],
  [/prophet|vision|dream/i, ['revelation', 'holy_spirit']],
  [/women|mothers|holy mary/i, ['blessing', 'divine_love', 'protection_journey']],
  [/journey|travel|protection/i, ['protection_journey', 'faith']],
];

/** The first (most specific) rule decides: "Imeko Adult Harvest" is a harvest held at Imeko */
export function occasionSectionsFor(title: string): string[] {
  return OCCASION_SECTIONS.find(([re]) => re.test(title))?.[1] ?? [];
}

interface Occasion {
  /** Section → [weight, why] */
  sections: Map<string, { weight: number; why: string }>;
}

function buildOccasion(ctx: MatchContext): Occasion {
  const sections = new Map<string, { weight: number; why: string }>();
  const offer = (list: string[], top: number, next: number, why: string) => list.forEach((s, i) => {
    const weight = i === 0 ? top : i === 1 ? next : Math.round(next / 2);
    if ((sections.get(s)?.weight ?? 0) < weight) sections.set(s, { weight, why });
  });
  // The day's own occasion speaks loudest, then the season, then the kind of service
  for (const title of ctx.occasions ?? []) offer(occasionSectionsFor(title), 45, 30, `for ${title}`);
  const season = ctx.date ? getLiturgicalSeason(new Date(`${ctx.date}T12:00:00`)) : null;
  if (season?.sections.length) offer(season.sections, 30, 20, `for ${season.label}`);
  if (ctx.serviceId && SERVICE_SECTIONS[ctx.serviceId]) offer(SERVICE_SECTIONS[ctx.serviceId], 22, 15, 'for this service');
  return { sections };
}

// ── Text analysis ────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'but', 'for', 'with', 'was', 'are', 'were', 'been', 'being',
  'have', 'has', 'had', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
  'can', 'its', 'this', 'that', 'these', 'those', 'our', 'you', 'your', 'him', 'his', 'her', 'they',
  'them', 'their', 'who', 'whom', 'which', 'what', 'when', 'where', 'how', 'why', 'not', 'nor',
  'than', 'too', 'very', 'just', 'also', 'all', 'from', 'into', 'out', 'about', 'each', 'unto',
  'upon', 'thee', 'thy', 'thou', 'hath', 'doth', 'art', 'thine', 'shalt', 'wilt', 'saith', 'said',
  'came', 'come', 'went', 'let', 'say', 'one', 'now', 'then', 'there', 'here', 'every', 'any',
  'amen', 'amin', 'chorus', 'ye', 'unto', 'neither', 'even', 'because', 'therefore', 'shall',
  'through', 'lie', 'make', 'maketh', 'made', 'give', 'gave', 'take', 'took', 'know', 'see', 'saw', 'day', 'days',
  'man', 'men', 'yea', 'behold', 'down', 'up', 'thing', 'things', 'great', 'like', 'over', 'before', 'after', 'again', 'away',
  // Words in nearly every hymn carry no signal
  'lord', 'god', 'jesus', 'christ', 'father', 'heaven', 'holy',
  // Yorùbá function words
  'ati', 'fun', 'awa', 'emi', 'iwo', 'won', 'yio', 'nwon', 'gbogbo', 'oluwa', 'olorun', 'jesu',
  'awon', 'ninu', 'nitori', 'sugbon', 'nigbati', 'lati', 'naa', 'eyi', 'ohun', 'bayi', 'wipe', 'enia',
  'eniyan', 'nigba', 'sibe', 'pelu', 'tabi', 'kini', 'kiyesi', 'yin', 'tire', 'temi', 'won', 'ise',
  'yoo', 'oun', 'eni', 'nibi', 'nibe', 'kan', 'ki', 'nwa', 'enyin', 'yio', 'oba',
]);

/** Light English stemmer: enough to match "forgiveth"/"forgiven"/"forgive" */
function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.replace(/(eth|est|ing|ed|es|s|en)$/, '');
}

function tokenize(text: string, english = true): string[] {
  return normalizeForSearch(text)
    .split(/[^a-z]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    .map(w => (english ? stem(w) : w));
}

/** Theme keywords (stemmed, whole words). Multi-word phrases are matched on the joined tokens. */
const THEME_KEYWORDS: Record<HymnCategory, string[]> = {
  forgiveness_of_sins: ['forgiv', 'sin', 'sinner', 'pardon', 'repent', 'transgression', 'iniquit', 'blood', 'cleans',
    'idariji', 'ironupiwada', 'elese', 'ese'],
  mercy_or_blessing: ['merc', 'bless', 'grace', 'favour', 'favor', 'compassion', 'aanu', 'ibukun', 'oore'],
  holy_spirit_or_power: ['spirit', 'power', 'anoint', 'fire', 'comforter', 'pentecost', 'tongue', 'agbara', 'emi mimo'],
  healing: ['heal', 'sick', 'physician', 'disease', 'infirmit', 'leper', 'blind', 'iwosan', 'aisan'],
  praise_or_glory: ['prais', 'glory', 'glorif', 'hallelujah', 'worship', 'magnif', 'exalt', 'rejoic', 'sing', 'iyin', 'ogo'],
  christ_the_king: ['king', 'throne', 'reign', 'majest', 'crown', 'kingdom', 'sovereign', 'ijoba'],
  faith_and_trust: ['faith', 'trust', 'believ', 'hope', 'courage', 'strength', 'shepherd', 'refuge', 'rock', 'fortress',
    'fear', 'igbagbo', 'ireti'],
  thanksgiving: ['thank', 'grateful', 'harvest', 'ope', 'idupe'],
  lighting_of_candles: ['light', 'candle', 'lamp', 'shine', 'imole', 'fitila'],
  sanctification: ['sanctif', 'pure', 'clean', 'righteous', 'consecrat', 'mimo'],
  evangelism: ['preach', 'gospel', 'salvation', 'saviour', 'witness', 'proclaim', 'nation', 'redeem', 'cross',
    'ihinrere', 'igbala', 'olugbala'],
  second_coming_or_judgement: ['judg', 'coming', 'trumpet', 'clouds', 'wrath', 'day of the lord', 'idajo'],
  processional_or_opening: [],
  recessional_or_closing: [],
} as Record<HymnCategory, string[]>;

/** What a passage is about, in hymnal sections (Easter for the empty tomb, Harvest for sowing and reaping…) */
const PASSAGE_SECTIONS: [string[], string][] = [
  [['risen', 'resurrect', 'tomb', 'sepulchre', 'rose', 'jinde'], 'easter'],
  [['manger', 'bethlehem', 'shepherds', 'wise', 'born', 'child', 'virgin'], 'christmas'],
  [['harvest', 'reap', 'sow', 'sower', 'firstfruit', 'sheaves', 'barn', 'ikore'], 'harvest'],
  [['cross', 'crucif', 'suffer', 'scourg', 'thorn', 'gethsemane', 'agbelebu'], 'passion_week'],
  [['hosanna', 'colt', 'branch'], 'palm_sunday'],
  [['spirit', 'tongue', 'pentecost', 'anoint', 'comforter'], 'holy_spirit'],
  [['heal', 'sick', 'blind', 'leper', 'lame', 'infirmit', 'iwosan'], 'healing'],
  [['judg', 'trumpet', 'wrath', 'coming'], 'judgement'],
  [['death', 'die', 'grave', 'mansion', 'rest', 'iku'], 'heavenly_call'],
  [['journey', 'way', 'path', 'protect', 'keep', 'guard', 'wilderness'], 'protection_journey'],
  [['bread', 'cup', 'supper', 'body', 'wine'], 'holy_communion'],
  [['baptiz', 'jordan', 'water'], 'baptism'],
  [['vision', 'dream', 'prophes', 'reveal', 'iran'], 'revelation'],
  [['victory', 'overcom', 'conquer', 'battle', 'enemi', 'isegun'], 'victory'],
  [['thank', 'prais', 'grateful', 'ope'], 'thanksgiving'],
  [['love', 'ife'], 'divine_love'],
  [['ask', 'seek', 'knock', 'pray', 'adura'], 'prayer'],
];

/** Weight of each theme in a token list, scaled so the strongest theme is 1 */
function themeProfile(tokens: string[]): Map<HymnCategory, number> {
  const joined = ` ${tokens.join(' ')} `;
  const tokenSet = new Set(tokens);
  const counts = new Map<HymnCategory, number>();
  for (const [category, keywords] of Object.entries(THEME_KEYWORDS) as [HymnCategory, string[]][]) {
    let hits = 0;
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (joined.includes(` ${kw} `)) hits++;
      } else if (tokenSet.has(kw)) {
        hits++;
      }
    }
    if (hits) counts.set(category, hits);
  }
  const max = Math.max(0, ...counts.values());
  if (!max) return counts;
  for (const [k, v] of counts) counts.set(k, v / max);
  return counts;
}

/** Hymnal sections a passage points to, with how strongly (0–1) */
function passageSections(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    for (const [stems, section] of PASSAGE_SECTIONS) {
      if (stems.some(s => t === s || (s.length >= 5 && t.startsWith(s)))) counts.set(section, (counts.get(section) ?? 0) + 1);
    }
  }
  const max = Math.max(0, ...counts.values());
  const out = new Map<string, number>();
  // A word or two in passing isn't what the passage is about
  for (const [k, v] of counts) if (v >= 2 && v / max >= 0.5) out.set(k, v / max);
  return out;
}

interface Side { tokens: Map<string, number>; length: number }
interface HymnProfile { en: Side; yo: Side; themes: Map<HymnCategory, number> }
interface Corpus { profiles: Map<number, HymnProfile>; idf: { en: Map<string, number>; yo: Map<string, number> } }

const corpusCache = new WeakMap<Hymn[], Corpus>();

function side(tokens: string[]): Side {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return { tokens: tf, length: tokens.length };
}

function getCorpus(hymns: Hymn[]): Corpus {
  let corpus = corpusCache.get(hymns);
  if (corpus) return corpus;
  const profiles = new Map<number, HymnProfile>();
  const df = { en: new Map<string, number>(), yo: new Map<string, number>() };
  for (const h of hymns) {
    const en = tokenize(h.englishLyrics), yo = tokenize(h.yorubaLyrics, false);
    profiles.set(h.number, { en: side(en), yo: side(yo), themes: themeProfile([...en, ...yo]) });
    for (const t of new Set(en)) df.en.set(t, (df.en.get(t) ?? 0) + 1);
    for (const t of new Set(yo)) df.yo.set(t, (df.yo.get(t) ?? 0) + 1);
  }
  const n = hymns.length || 1;
  const idf = (m: Map<string, number>) => new Map([...m].map(([t, c]) => [t, Math.log(n / c)]));
  corpus = { profiles, idf: { en: idf(df.en), yo: idf(df.yo) } };
  corpusCache.set(hymns, corpus);
  return corpus;
}

interface Readings {
  en: Map<string, number>;
  yo: Map<string, number>;
  themes: Map<HymnCategory, number>;
  sections: Map<string, number>;
  /** How closely each hymn's words follow the readings, 0–1 relative to the closest hymn */
  closeness: Map<number, { value: number; words: string[] }>;
}

const readingsCache = new Map<string, Readings>();

/** BM25-style closeness of a hymn's words to the readings, in one language */
function bm25(hymn: Side, reading: Map<string, number>, idf: Map<string, number>, avgLen: number, words: string[]): number {
  let s = 0;
  for (const [term, qtf] of reading) {
    const f = hymn.tokens.get(term);
    const w = idf.get(term) ?? 0;
    // Words in most hymns say little; distinctive ones (shepherd, harvest, Jordan…) say a lot
    if (!f || w < 1.2) continue;
    s += w * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * hymn.length / avgLen))) * Math.min(1 + Math.log(qtf), 2.5);
    if (w > 2) words.push(term);
  }
  return s;
}

function getReadings(ctx: MatchContext, hymns: Hymn[], corpus: Corpus): Readings | null {
  const enText = ctx.lessonText ?? '', yoText = ctx.lessonTextYo ?? '';
  if (!enText.trim() && !yoText.trim()) return null;
  const key = `${hymns.length}|${enText.length}|${yoText.length}|${enText.slice(0, 200)}|${yoText.slice(0, 200)}`;
  const cached = readingsCache.get(key);
  if (cached) return cached;
  const enTokens = tokenize(enText), yoTokens = tokenize(yoText, false);
  const r: Readings = { en: side(enTokens).tokens, yo: side(yoTokens).tokens, themes: themeProfile([...enTokens, ...yoTokens]),
                        sections: passageSections([...enTokens, ...yoTokens]), closeness: new Map() };
  let avgEn = 0, avgYo = 0;
  for (const p of corpus.profiles.values()) { avgEn += p.en.length; avgYo += p.yo.length; }
  avgEn = avgEn / (corpus.profiles.size || 1) || 1;
  avgYo = avgYo / (corpus.profiles.size || 1) || 1;
  let max = 0;
  const raw = new Map<number, { value: number; words: string[] }>();
  for (const [n, p] of corpus.profiles) {
    const words: string[] = [];
    const value = bm25(p.en, r.en, corpus.idf.en, avgEn, words) + bm25(p.yo, r.yo, corpus.idf.yo, avgYo, []);
    raw.set(n, { value, words });
    max = Math.max(max, value);
  }
  for (const [n, v] of raw) r.closeness.set(n, { value: max ? v.value / max : 0, words: v.words });
  if (readingsCache.size > 20) readingsCache.clear();
  readingsCache.set(key, r);
  return r;
}

const CATEGORY_SHORT: Record<string, string> = {
  forgiveness_of_sins: 'forgiveness',
  mercy_or_blessing: 'mercy',
  holy_spirit_or_power: 'the Holy Spirit',
  healing: 'healing',
  praise_or_glory: 'praise',
  christ_the_king: 'Christ the King',
  faith_and_trust: 'faith',
  thanksgiving: 'thanksgiving',
  lighting_of_candles: 'light',
  sanctification: 'holiness',
  evangelism: 'salvation',
  second_coming_or_judgement: 'the Lord’s coming',
  processional_or_opening: 'opening',
  recessional_or_closing: 'closing',
};

/** Small stable number in [0, 1) from a string — gives week-to-week variety without randomness */
function stableJitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// ── Scoring ──────────────────────────────────────────────────

interface ScoreParts {
  score: number;
  reasons: string[];
  isRecentlyUsed: boolean;
}

/**
 * A hymn's score for one slot:
 *   occasion   0–40  its hymnal section suits the day (the lessons' occasion, a feast, the season, the service)
 *   readings   0–40  its words follow the day's set verses, in English and in Yorùbá
 *   themes     0–20  it shares what the readings are about (healing, harvest, the cross…)
 *   slot       +30   it is tagged for this point in the service (+5 if it is its main tag)
 *   recency    −60/−35/−12 used in the last 7 / 28 / 90 days
 *   variety    0–3   stable per date
 * A hymn that isn't tagged for the slot is offered only when the day or the readings call for it strongly.
 */
function scoreHymn(
  hymn: Hymn,
  slot: HymnSlot,
  ctx: MatchContext,
  corpus: Corpus,
  readings: Readings | null,
  occasion: Occasion,
  lastUsed: Map<number, number>,
): ScoreParts | null {
  const reasons: string[] = [];
  let relevance = 0;

  // The day
  const section = hymn.section?.id;
  const occ = section ? occasion.sections.get(section) : undefined;
  if (occ) {
    relevance += occ.weight;
    reasons.push(`${hymn.section!.english} hymn ${occ.why}`);
  }

  // The readings
  let closeness = 0;
  if (readings) {
    const c = readings.closeness.get(hymn.number);
    if (c && c.value >= 0.25) {
      closeness = c.value;
      relevance += Math.round(c.value * 40);
      reasons.push(c.words.length ? `Echoes the readings (${c.words.slice(0, 3).join(', ')})` : 'Its Yorùbá words echo the readings');
    }
    const profile = corpus.profiles.get(hymn.number);
    let themeScore = 0;
    const shared: string[] = [];
    if (profile) for (const [category, weight] of readings.themes) {
      const hw = profile.themes.get(category);
      if (hw) { themeScore += Math.min(weight, hw); if (weight >= 0.5) shared.push(CATEGORY_SHORT[category]); }
    }
    const sectionWeight = section ? readings.sections.get(section) ?? 0 : 0;
    if (sectionWeight) shared.unshift(hymn.section!.english.toLowerCase());
    const themes = Math.min(20, Math.round(themeScore * 6 + sectionWeight * 12));
    if (themes > 0) {
      relevance += themes;
      if (shared.length) reasons.push(`Shares the readings' theme of ${[...new Set(shared)].slice(0, 2).join(' and ')}`);
    }
  }

  const fitsSlot = !!slot.category && hymn.categories.includes(slot.category);
  // Off-slot hymns only when the day or the readings clearly call for them
  if (!fitsSlot && !((occ && occ.weight >= 30) || closeness >= 0.6)) return null;

  let score = relevance;
  if (fitsSlot) {
    score += 30 + (hymn.categories[0] === slot.category ? 5 : 0);
    reasons.push(`Fits ${categoryToSlotName(slot.category!)}`);
  } else if (occ && occ.weight >= 45) {
    // On a feast or a harvest its own hymns are sung throughout the service
    score += 20;
  }

  // Recency
  const ago = lastUsed.get(hymn.number);
  const isRecentlyUsed = ago !== undefined && ago <= 28;
  if (ago !== undefined) {
    if (ago <= 7) score -= 60;
    else if (ago <= 28) score -= 35;
    else if (ago <= 90) score -= 12;
    if (ago <= 90) reasons.push(ago === 0 ? 'Already planned for this day' : `Used ${ago} day${ago === 1 ? '' : 's'} ago`);
  }

  // Small, stable variety so the same hymns don't top every week
  score += stableJitter(`${ctx.date}|${ctx.serviceId}|${slot.category}|${hymn.number}`) * 3;

  return { score, reasons, isRecentlyUsed };
}

export function getCandidateHymns(
  slot: HymnSlot,
  allHymns: Hymn[],
  maxResults: number = 10,
  lessonRefsOrContext: { book: string; chapter: number }[] | MatchContext = [],
  lessonText: string = ''
): ScoredHymnSuggestion[] {
  // Accept the old (refs, text) signature as well as a MatchContext
  const ctx: MatchContext = Array.isArray(lessonRefsOrContext)
    ? { lessonRefs: lessonRefsOrContext, lessonText }
    : lessonRefsOrContext;
  const date = ctx.date ?? toISODate(new Date());
  const lastUsed = lastUsedDaysAgo(getHymnUsage(), date);

  if (slot.fixedHymnNumber) {
    const hymn = allHymns.find(h => h.number === slot.fixedHymnNumber);
    return hymn
      ? [{ hymnNumber: hymn.number, hymn, reason: 'Specified in the Order of Service', score: 100, matchType: 'exact',
           isRecentlyUsed: (lastUsed.get(hymn.number) ?? 999) <= 28 }]
      : [];
  }
  if (!slot.category) return [];

  const corpus = getCorpus(allHymns);
  const readings = getReadings(ctx, allHymns, corpus);
  const occasion = buildOccasion({ ...ctx, date });

  const scored: ScoredHymnSuggestion[] = [];
  for (const hymn of allHymns) {
    const parts = scoreHymn(hymn, slot, { ...ctx, date }, corpus, readings, occasion, lastUsed);
    if (!parts) continue;
    scored.push({
      hymnNumber: hymn.number,
      hymn,
      reason: parts.reasons.join(' · '),
      score: Math.round(parts.score),
      matchType: hymn.categories.includes(slot.category) ? 'category' : 'related',
      isRecentlyUsed: parts.isRecentlyUsed,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

export interface PlannedSlot {
  stepNumber: number;
  slotName: string;
  slot: HymnSlot;
  candidates: ScoredHymnSuggestion[];
  selected: ScoredHymnSuggestion | null;
}

/**
 * Suggest a hymn for every slot of a service without repeating a hymn.
 * Slots with the fewest good options choose first, so a scarce category
 * isn't left empty because a broader slot took its only hymn.
 */
export function planHymns(service: ServiceOrder, allHymns: Hymn[], ctx: MatchContext, perSlot = 15): PlannedSlot[] {
  const slots = extractHymnSlots(service).map(s => ({
    ...s,
    candidates: getCandidateHymns(s.slot, allHymns, perSlot + 10, { ...ctx, serviceId: service.id }),
  }));

  const order = slots
    .map((s, i) => ({ i, strong: s.candidates.filter(c => c.score >= 45).length }))
    .sort((a, b) => a.strong - b.strong);

  const used = new Set<number>();
  const chosen = new Map<number, ScoredHymnSuggestion | null>();
  for (const { i } of order) {
    const pick = slots[i].candidates.find(c => !used.has(c.hymnNumber)) ?? null;
    if (pick) used.add(pick.hymnNumber);
    chosen.set(i, pick);
  }

  return slots.map((s, i) => ({
    stepNumber: s.stepNumber,
    slotName: s.slotName,
    slot: s.slot,
    candidates: s.candidates.slice(0, perSlot),
    selected: chosen.get(i) ?? null,
  }));
}

export function categoryToSlotName(category: HymnCategory): string {
  const names: Record<HymnCategory, string> = {
    forgiveness_of_sins: 'Forgiveness of Sins',
    processional_or_opening: 'Processional / Opening',
    lighting_of_candles: 'Lighting of Candles',
    sanctification: 'Sanctification',
    thanksgiving: 'Thanksgiving',
    praise_or_glory: 'Praise & Glory',
    holy_spirit_or_power: 'Holy Spirit / Spiritual Power',
    mercy_or_blessing: 'Mercy & Blessing',
    recessional_or_closing: 'Recessional / Closing',
    evangelism: 'Evangelism',
    faith_and_trust: 'Faith & Trust',
    healing: 'Healing',
    christ_the_king: 'Christ the King',
  };
  return names[category] || category;
}
