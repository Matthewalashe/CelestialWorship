import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BibleLesson, Hymn, ScriptureReference } from '../types';
import { getCandidateHymns, planHymns, type MatchContext } from '../utils/hymnMatcher';
import { dayOccasions } from '../hooks/useHymnContext';
import { resolveBookName } from '../data/bibleBooks';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
beforeEach(() => store.clear());

const pub = (p: string) => JSON.parse(readFileSync(resolve(__dirname, '../../public', p), 'utf-8'));
const hymns: Hymn[] = pub('data/hymns.json').map((h: any) => ({
  number: h.number, yorubaTitle: h.yoruba_title, englishTitle: h.english_title, section: h.section ?? null,
  yorubaLyrics: h.yoruba_lyrics, englishLyrics: h.english_lyrics, solfaNotation: h.solfa_notation, categories: h.categories,
  needsClergyReview: false, needsVerseSplitReview: false, verses: [],
}));
const lessons: BibleLesson[] = pub('data/lessons.json');
const services: any[] = pub('data/services.json');

/** The day's context as useHymnContext builds it, read from the files instead of fetched */
function contextFor(date: string, serviceId = 'lords_day_service'): MatchContext {
  const refs = lessons.filter(l => l.date === date).flatMap(l => [l.firstLesson, l.secondLesson]).filter((r): r is ScriptureReference => !!r);
  const text = (v: string) => refs.map(r => {
    const book = pub(`data/bible/${v}/${(resolveBookName(r.book) ?? r.book).replace(/ /g, '')}.json`);
    const ch = book.chapters.find((c: any) => Number(c.chapter) === r.chapter);
    return (ch?.verses ?? []).filter((x: any) => Number(x.verse) >= (r.verseStart || 1) && Number(x.verse) <= (r.verseEnd || 999)).map((x: any) => x.text).join(' ');
  }).join(' ');
  return { date, serviceId, lessonText: text('en'), lessonTextYo: text('yo'), occasions: dayOccasions(date, lessons) };
}

const praise = { category: 'praise_or_glory' as const };
const sectionsOf = (list: { hymn: Hymn }[]) => list.map(r => r.hymn.section?.id);

describe('the day’s occasion', () => {
  it('reads the occasion from the lessons and the calendar', () => {
    expect(dayOccasions('2026-09-13', lessons)).toContain('Imeko Adult Harvest');
    expect(dayOccasions('2026-03-29', lessons).join(' ')).toMatch(/Palm Sunday/);
  });

  it('suggests Harvest hymns on a harvest Sunday', () => {
    const top = getCandidateHymns(praise, hymns, 5, contextFor('2026-09-13'));
    expect(sectionsOf(top).filter(s => s === 'harvest' || s === 'thanksgiving').length).toBeGreaterThanOrEqual(3);
    expect(top[0].reason).toMatch(/Harvest/);
  });

  it('suggests Palm Sunday hymns on Palm Sunday', () => {
    const top = getCandidateHymns(praise, hymns, 5, contextFor('2026-03-29'));
    expect(sectionsOf(top)).toContain('palm_sunday');
  });

  it('suggests Christmas hymns on Christmas Day', () => {
    const top = getCandidateHymns(praise, hymns, 5, contextFor('2026-12-25'));
    expect(sectionsOf(top)).toContain('christmas');
  });

  it('fills a harvest service mostly with harvest and thanksgiving hymns', () => {
    const service = services.find(s => s.id === 'lords_day_service');
    const plan = planHymns(service, hymns, contextFor('2026-09-13'));
    const fitting = plan.filter(p => ['harvest', 'thanksgiving', 'praise_worship'].includes(p.selected?.hymn.section?.id ?? ''));
    expect(fitting.length).toBeGreaterThanOrEqual(2);
  });
});

describe('the day’s readings', () => {
  // An ordinary Sunday with no occasion: only the readings can move the choice
  const plain = { date: '2026-07-12', serviceId: 'lords_day_service' };

  it('changes the suggestions to follow the passage', () => {
    // The hymnal's "shepherd" hymns are tagged for forgiveness and mercy
    const none = getCandidateHymns({ category: 'forgiveness_of_sins' }, hymns, 5, plain).map(r => r.hymnNumber);
    const psalm23 = 'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.';
    const withPsalm = getCandidateHymns({ category: 'forgiveness_of_sins' }, hymns, 5, { ...plain, lessonText: psalm23 });
    expect(withPsalm.map(r => r.hymnNumber)).not.toEqual(none);
    expect(withPsalm[0].reason).toMatch(/readings/i);
    expect(withPsalm.some(r => /shepherd/i.test(r.hymn.englishLyrics))).toBe(true);
  });

  it('brings in Easter hymns for a resurrection reading outside Eastertide', () => {
    const luke24 = contextFor('2026-04-05');
    const top = getCandidateHymns(praise, hymns, 8, { ...plain, lessonText: luke24.lessonText, lessonTextYo: luke24.lessonTextYo });
    expect(sectionsOf(top)).toContain('easter');
  });

  it('matches the Yorùbá words of the hymns against the Yorùbá Bible', () => {
    const ctx = contextFor('2026-05-24');
    expect(ctx.lessonTextYo!.length).toBeGreaterThan(200);
    const yoOnly = getCandidateHymns({ category: 'holy_spirit_or_power' }, hymns, 5, { ...plain, lessonTextYo: ctx.lessonTextYo });
    expect(yoOnly.some(r => /readings/i.test(r.reason))).toBe(true);
  });
});
