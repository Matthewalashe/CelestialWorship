import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Hymn, HymnVerse, ServiceOrder } from '../types';
import { buildSlides, displayTitle, firstLine, stanzaLabel } from '../utils/hymnText';
import { getCandidateHymns, planHymns, recordHymnUsage } from '../utils/hymnMatcher';
import { normalizeForSearch, searchHymns } from '../utils/search';

// Minimal localStorage for the matcher's usage history
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
}
(globalThis as any).localStorage = new MemoryStorage();

function loadRealHymns(): Hymn[] {
  const raw = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/hymns.json'), 'utf-8'));
  return raw.map((h: any) => ({
    number: h.number,
    yorubaTitle: h.yoruba_title,
    englishTitle: h.english_title,
    section: h.section ?? null,
    yorubaLyrics: h.yoruba_lyrics,
    englishLyrics: h.english_lyrics,
    solfaNotation: h.solfa_notation,
    categories: h.categories,
    needsClergyReview: h.needs_clergy_review,
    needsVerseSplitReview: h.needs_verse_split_review,
    verses: h.verses.map((v: any) => ({
      kind: v.kind, number: v.number, englishLines: v.english_lines, yorubaLines: v.yoruba_lines, repeat: v.repeat,
    })),
  }));
}

const hymns = loadRealHymns();

function verse(kind: 'verse' | 'chorus', number: number | null, yo: string[], en: string[] = []): HymnVerse {
  return { kind, number, yorubaLines: yo, englishLines: en };
}

function hymn(partial: Partial<Hymn> & { number: number }): Hymn {
  return {
    yorubaTitle: null, englishTitle: null, section: null, yorubaLyrics: '', englishLyrics: '',
    solfaNotation: null, categories: [], needsClergyReview: true, needsVerseSplitReview: false, verses: [],
    ...partial,
  };
}

describe('hymns.json (built by scripts/build_hymns.py)', () => {
  it('has unique hymn numbers in ascending order', () => {
    const numbers = hymns.map(h => h.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  it('gives every hymn at least one stanza with lyrics', () => {
    const empty = hymns.filter(h => !h.verses.some(v => v.yorubaLines.length || v.englishLines.length));
    expect(empty.map(h => h.number)).toEqual([]);
  });

  it('splits most hymns into several stanzas', () => {
    const multi = hymns.filter(h => h.verses.length > 1).length;
    expect(multi / hymns.length).toBeGreaterThan(0.5);
  });

  it('does not leak header, page or "reserved" text into lyrics', () => {
    const bad: string[] = [];
    for (const h of hymns) {
      for (const v of h.verses) {
        for (const line of [...v.yorubaLines, ...v.englishLines]) {
          // "Hymns 20 – 50 are reserved" notices (not lyrics like "Crown of glory is reserved for you")
          if (/^(orin|h?ymn)\s*\d+\s*:?$/i.test(line) || /hymn\s*s?\s+\d+.*reserved/i.test(line)) bad.push(`${h.number}: ${line}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('keeps stanza numbers on verses only, without leftover "1:" prefixes', () => {
    for (const h of hymns) {
      for (const v of h.verses) {
        if (v.kind === 'chorus') expect(v.number).toBeNull();
        const first = v.yorubaLines[0] ?? v.englishLines[0] ?? '';
        expect(first).not.toMatch(/^\d{1,2}\s*[:.)]\s/);
      }
    }
  });

  it('assigns almost every hymn a category', () => {
    const uncategorised = hymns.filter(h => h.categories.length === 0).length;
    expect(uncategorised).toBeLessThan(20);
  });
});

describe('hymnText', () => {
  const untitled = hymn({
    number: 5,
    verses: [verse('verse', 1, ['K’awa elese yiwa pada,'], ['Let us sinners repent from sins,'])],
  });

  it('uses the first line as the title when the hymnal prints none', () => {
    expect(displayTitle(untitled, 'yo')).toBe('K’awa elese yiwa pada');
    expect(displayTitle(untitled, 'en')).toBe('Let us sinners repent from sins');
    expect(firstLine(untitled, 'en')).toBe('Let us sinners repent from sins');
  });

  it('prefers a printed title', () => {
    expect(displayTitle({ ...untitled, yorubaTitle: 'IDARIJI' }, 'yo')).toBe('IDARIJI');
  });

  it('labels stanzas', () => {
    expect(stanzaLabel(verse('verse', 2, ['a']))).toBe('Verse 2');
    expect(stanzaLabel(verse('chorus', null, ['a']))).toBe('Chorus');
    expect(stanzaLabel(verse('chorus', null, ['a']), 'yo')).toBe('Ègbè');
  });

  it('repeats a single printed chorus after every verse when projecting', () => {
    const h = hymn({
      number: 1,
      verses: [verse('verse', 1, ['v1']), verse('chorus', null, ['c']), verse('verse', 2, ['v2']), verse('verse', 3, ['v3'])],
    });
    expect(buildSlides(h).map(s => s.label)).toEqual(['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Verse 3', 'Chorus']);
    expect(buildSlides(h, false).map(s => s.label)).toEqual(['Verse 1', 'Chorus', 'Verse 2', 'Verse 3']);
  });
});

describe('search', () => {
  it('ignores Yoruba tone marks and apostrophes', () => {
    expect(normalizeForSearch('K’awa Ẹ̀ṣẹ̀')).toBe('kawa ese');
  });

  it('finds a hymn by number exactly', () => {
    expect(searchHymns(hymns, '5').map(h => h.number)).toEqual([5]);
  });

  it('finds hymns by words without diacritics', () => {
    expect(searchHymns(hymns, 'kawa elese').map(h => h.number)).toContain(5);
  });
});

describe('hymn matcher', () => {
  beforeEach(() => localStorage.clear());

  const praiseSlot = { category: 'praise_or_glory' as const };

  it('only offers hymns that fit the slot', () => {
    const results = getCandidateHymns(praiseSlot, hymns, 20, { date: '2026-06-14' });
    expect(results.length).toBeGreaterThan(5);
    for (const r of results) expect(r.hymn.categories).toContain('praise_or_glory');
  });

  it('prefers Easter hymns in the Easter season', () => {
    // Easter 2026 is 5 April
    const easter = getCandidateHymns(praiseSlot, hymns, 5, { date: '2026-04-12', serviceId: 'lords_day_service' });
    const easterSections = easter.filter(r => r.hymn.section?.id === 'easter' || r.hymn.section?.id === 'victory');
    expect(easterSections.length).toBeGreaterThan(0);
  });

  it('pushes recently sung hymns down the list', () => {
    const before = getCandidateHymns(praiseSlot, hymns, 1, { date: '2026-06-14' });
    const top = before[0].hymnNumber;
    recordHymnUsage([top], '2026-06-10');
    const after = getCandidateHymns(praiseSlot, hymns, 1000, { date: '2026-06-14' });
    expect(after[0].hymnNumber).not.toBe(top);
    expect(after.find(r => r.hymnNumber === top)?.isRecentlyUsed).toBe(true);
  });

  it('rewards hymns that share the readings’ themes', () => {
    const healingSlot = { category: 'healing' as const };
    const reading = 'And Jesus went about healing all manner of sickness and all manner of disease among the people. The blind receive their sight';
    const withReading = getCandidateHymns(healingSlot, hymns, 5, { date: '2026-06-14', lessonText: reading });
    expect(withReading[0].reason).toMatch(/readings/i);
  });

  it('never uses the same hymn twice in one plan', () => {
    const service: ServiceOrder = {
      id: 'lords_day_service', displayName: 'Test', day: 'Sunday', time: '10:00', description: '',
      steps: (['processional_or_opening', 'praise_or_glory', 'thanksgiving', 'mercy_or_blessing', 'faith_and_trust', 'recessional_or_closing'] as const)
        .map((category, i) => ({
          stepNumber: i + 1, text: '', textLines: [], type: 'hymn', scriptureRef: null, scriptureReferences: [],
          hymnSlot: { category, fixedHymnNumber: null },
        })) as any,
    };
    const plan = planHymns(service, hymns, { date: '2026-06-14' });
    const chosen = plan.map(p => p.selected?.hymnNumber).filter(Boolean);
    expect(new Set(chosen).size).toBe(chosen.length);
    expect(chosen.length).toBe(plan.length);
  });

  it('gives the same plan for the same date, and varies between weeks', () => {
    const a = getCandidateHymns(praiseSlot, hymns, 10, { date: '2026-06-14' }).map(r => r.hymnNumber);
    const b = getCandidateHymns(praiseSlot, hymns, 10, { date: '2026-06-14' }).map(r => r.hymnNumber);
    const c = getCandidateHymns(praiseSlot, hymns, 10, { date: '2026-06-21' }).map(r => r.hymnNumber);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
