import { Hymn, HymnCategory, ServiceOrder, HymnSlot } from '../types';
import { normalizeForSearch } from './search';
import { getLiturgicalSeason } from './liturgical';
import { toISODate } from './dateUtils';

/**
 * Hymn Selector scoring.
 *
 * Each candidate gets an explainable score made of:
 *   slot fit      +50  hymn is tagged with the slot's category (+5 if it is its main tag)
 *   occasion      +25  hymn is in a hymnal section that suits this service or the season
 *   themes        0–25 themes shared with the day's readings (forgiveness, healing, …)
 *   echoes        0–20 distinctive words shared with the readings (TF-IDF, length-normalised)
 *   recency       −60/−35/−12 used in the last 7 / 28 / 90 days
 *   variety       0–4  stable per date, so the same date gives the same plan but weeks differ
 *
 * planHymns() fills every slot together so no hymn is used twice in one service.
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
  /** Full text of the day's readings (English) */
  lessonText?: string;
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

/** @deprecated kept for callers that only need numbers */
export function getRecentlyUsedHymns(): number[] {
  return getHymnUsage().map(u => u.number);
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

function occasionSections(ctx: MatchContext): { sections: string[]; label: string } {
  const service = ctx.serviceId ? SERVICE_SECTIONS[ctx.serviceId] ?? [] : [];
  const season = ctx.date ? getLiturgicalSeason(new Date(`${ctx.date}T12:00:00`)) : null;
  return {
    sections: [...(season?.sections ?? []), ...service],
    label: season?.label ?? '',
  };
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
  'amen', 'amin', 'chorus',
  // Words in nearly every hymn carry no signal
  'lord', 'god', 'jesus', 'christ', 'father', 'heaven', 'holy',
  // Yoruba function words
  'ati', 'fun', 'awa', 'emi', 'iwo', 'won', 'yio', 'nwon', 'gbogbo', 'oluwa', 'olorun', 'jesu',
]);

/** Light English stemmer: enough to match "forgiveth"/"forgiven"/"forgive" */
function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.replace(/(eth|est|ing|ed|es|s|en)$/, '');
}

function tokenize(text: string): string[] {
  return normalizeForSearch(text)
    .split(/[^a-z]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    .map(stem);
}

/** Theme keywords (stemmed, whole words). Multi-word phrases are matched on the joined tokens. */
const THEME_KEYWORDS: Record<HymnCategory, string[]> = {
  forgiveness_of_sins: ['forgiv', 'sin', 'sinner', 'pardon', 'repent', 'transgression', 'iniquit', 'blood', 'cleans',
    'idariji', 'ironupiwada', 'elese'],
  mercy_or_blessing: ['merc', 'bless', 'grace', 'favour', 'favor', 'compassion', 'aanu', 'ibukun', 'oore'],
  holy_spirit_or_power: ['spirit', 'power', 'anoint', 'fire', 'comforter', 'pentecost', 'tongue', 'agbara', 'emi mimo'],
  healing: ['heal', 'sick', 'physician', 'disease', 'infirmit', 'leper', 'blind', 'iwosan', 'aisan'],
  praise_or_glory: ['prais', 'glory', 'glorif', 'hallelujah', 'worship', 'magnif', 'exalt', 'rejoic', 'sing', 'iyin', 'ogo'],
  christ_the_king: ['king', 'throne', 'reign', 'majest', 'crown', 'kingdom', 'sovereign', 'oba', 'ijoba'],
  faith_and_trust: ['faith', 'trust', 'believ', 'hope', 'courage', 'strength', 'shepherd', 'refuge', 'rock', 'fortress',
    'fear', 'igbagbo', 'ireti'],
  thanksgiving: ['thank', 'grateful', 'harvest', 'ope', 'idupe'],
  lighting_of_candles: ['light', 'candle', 'lamp', 'shine', 'imole', 'fitila'],
  sanctification: ['sanctif', 'pure', 'clean', 'righteous', 'consecrat', 'mimo'],
  evangelism: ['preach', 'gospel', 'salvation', 'saviour', 'witness', 'proclaim', 'nation', 'redeem', 'cross',
    'ihinrere', 'igbala', 'olugbala'],
  processional_or_opening: [],
  recessional_or_closing: [],
};

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

interface HymnProfile {
  tokens: Set<string>;
  length: number;
  themes: Map<HymnCategory, number>;
}

interface Corpus {
  profiles: Map<number, HymnProfile>;
  idf: Map<string, number>;
}

const corpusCache = new WeakMap<Hymn[], Corpus>();

function getCorpus(hymns: Hymn[]): Corpus {
  let corpus = corpusCache.get(hymns);
  if (corpus) return corpus;

  const profiles = new Map<number, HymnProfile>();
  const df = new Map<string, number>();
  for (const h of hymns) {
    const tokens = tokenize(`${h.englishLyrics} ${h.yorubaLyrics}`);
    const set = new Set(tokens);
    profiles.set(h.number, { tokens: set, length: tokens.length, themes: themeProfile(tokens) });
    for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const n = hymns.length || 1;
  const idf = new Map<string, number>();
  for (const [t, count] of df) idf.set(t, Math.log(n / count));
  corpus = { profiles, idf };
  corpusCache.set(hymns, corpus);
  return corpus;
}

interface LessonProfile {
  tf: Map<string, number>;
  themes: Map<HymnCategory, number>;
}

const lessonCache = new Map<string, LessonProfile>();

function getLessonProfile(text: string): LessonProfile | null {
  if (!text.trim()) return null;
  const cached = lessonCache.get(text);
  if (cached) return cached;
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const profile = { tf, themes: themeProfile(tokens) };
  if (lessonCache.size > 20) lessonCache.clear();
  lessonCache.set(text, profile);
  return profile;
}

const CATEGORY_SHORT: Record<HymnCategory, string> = {
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

function scoreHymn(
  hymn: Hymn,
  slot: HymnSlot,
  ctx: MatchContext,
  corpus: Corpus,
  lesson: LessonProfile | null,
  occasion: { sections: string[]; label: string },
  lastUsed: Map<number, number>,
): ScoreParts | null {
  const reasons: string[] = [];
  let score = 0;

  // Slot fit
  const fitsSlot = !!slot.category && hymn.categories.includes(slot.category);
  if (fitsSlot) {
    score += 50;
    if (hymn.categories[0] === slot.category) score += 5;
    reasons.push(`Fits ${categoryToSlotName(slot.category!)}`);
  }

  // Occasion / season
  const sectionRank = hymn.section ? occasion.sections.indexOf(hymn.section.id) : -1;
  if (sectionRank >= 0) {
    score += sectionRank === 0 ? 25 : 18;
    reasons.push(occasion.label && sectionRank < 2 ? `${hymn.section!.english} hymn for ${occasion.label}` : `${hymn.section!.english} hymn`);
  }

  // A hymn must fit the slot, or be a strong occasion hymn, to be offered at all
  if (!fitsSlot && sectionRank !== 0) return null;

  const profile = corpus.profiles.get(hymn.number);
  if (lesson && profile) {
    // Shared themes
    let themeScore = 0;
    const shared: HymnCategory[] = [];
    for (const [category, weight] of lesson.themes) {
      const hymnWeight = profile.themes.get(category);
      if (hymnWeight) {
        themeScore += Math.min(weight, hymnWeight);
        if (weight >= 0.5) shared.push(category);
      }
    }
    if (themeScore > 0) {
      score += Math.min(25, Math.round(themeScore * 12));
      if (shared.length) reasons.push(`Shares the readings' theme of ${shared.slice(0, 2).map(c => CATEGORY_SHORT[c]).join(' and ')}`);
    }

    // Distinctive shared words, weighted by rarity across the hymnal
    let echo = 0;
    const echoWords: string[] = [];
    for (const word of profile.tokens) {
      const tf = lesson.tf.get(word);
      const idf = corpus.idf.get(word) ?? 0;
      if (tf && idf > 1.6) {
        echo += idf * Math.min(tf, 3);
        echoWords.push(word);
      }
    }
    if (echo > 0) {
      const normalised = echo / Math.sqrt(Math.max(profile.length, 20));
      const echoScore = Math.min(20, Math.round(normalised * 6));
      if (echoScore >= 3) {
        score += echoScore;
        reasons.push(`Echoes the readings (${echoWords.slice(0, 3).join(', ')})`);
      }
    }
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
  score += stableJitter(`${ctx.date}|${ctx.serviceId}|${slot.category}|${hymn.number}`) * 4;

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
  const lesson = getLessonProfile(ctx.lessonText ?? '');
  const occasion = occasionSections({ ...ctx, date });

  const scored: ScoredHymnSuggestion[] = [];
  for (const hymn of allHymns) {
    const parts = scoreHymn(hymn, slot, { ...ctx, date }, corpus, lesson, occasion, lastUsed);
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

export function generateHymnPlan(
  service: ServiceOrder,
  allHymns: Hymn[],
  date?: string,
  lessonRefs: { book: string; chapter: number }[] = [],
  lessonText: string = ''
) {
  const plan = planHymns(service, allHymns, { date, lessonRefs, lessonText }, 10);
  return {
    serviceType: service.id,
    date: date || toISODate(new Date()),
    slots: plan.map(({ stepNumber, slotName, slot, candidates }) => ({
      stepNumber,
      slotName,
      category: slot.category || null,
      suggestions: candidates,
    })),
  };
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
