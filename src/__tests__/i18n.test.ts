import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const catalog = (l: string): Record<string, string> => JSON.parse(readFileSync(resolve(__dirname, '../../public/i18n', `${l}.json`), 'utf-8'));
const fr = catalog('fr'), yo = catalog('yo');

describe('translation catalogs', () => {
  it('keep the shape of each string: leading punctuation, arrows and numbers', () => {
    for (const cat of [fr, yo]) {
      for (const [en, t] of Object.entries(cat)) {
        expect(t.trim(), en).toBeTruthy();
        // Pieces that sit next to other text keep their joining mark
        for (const mark of ['·', '‹', '→', '←', '›', '↗', '✓', '●', '🙏']) {
          if (en.includes(mark)) expect(t, `${en} → ${t}`).toContain(mark);
        }
        // References and numbers stay the same; clock times, ordinals and "3ce" (three times) may be written in words
        const words = /\d+(?:[.:]\d+)?\s*(?:am|pm)\b|\b12 midnight|\d+\s*(?:st|nd|rd|th|ce)\b/gi;
        for (const n of en.replace(words, '').match(/\d+/g) ?? []) expect(t, `${en} → ${t}`).toContain(n);
      }
    }
  });

  it('cover nearly all of the app in French and Yorùbá', () => {
    expect(Object.keys(fr).length).toBeGreaterThan(1300);
    expect(Object.keys(yo).length).toBeGreaterThan(1300);
  });
});

describe('tr()', () => {
  beforeAll(() => {
    const store = new Map<string, string>([['cw-ui-language', 'fr'], ['cw-i18n-fr', JSON.stringify(fr)]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
    vi.stubGlobal('document', { documentElement: { lang: 'en' } });
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false }));
  });

  it('translates from the catalog and passes everything else through', async () => {
    vi.resetModules();
    const { tr, getUILanguage, contentDefaults } = await import('../i18n');
    expect(getUILanguage()).toBe('fr');
    expect(tr('Hymn lyrics')).toBe(fr['Hymn lyrics']);
    expect(tr('A string nobody wrote')).toBe('A string nobody wrote');
    expect(tr(42)).toBe(42);
    expect(contentDefaults().bibleVersion).toBe('fr');
    expect(contentDefaults('yo')).toEqual({ bibleVersion: 'yo', hymnView: 'yo' });
  });

  it('gives French to anyone who had chosen Egun, until its translation is ready', async () => {
    localStorage.setItem('cw-ui-language', 'egun');
    vi.resetModules();
    const { getUILanguage } = await import('../i18n');
    expect(getUILanguage()).toBe('fr');
  });
});
