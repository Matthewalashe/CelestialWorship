import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const catalog = (l: string): Record<string, string> => JSON.parse(readFileSync(resolve(__dirname, '../../public/i18n', `${l}.json`), 'utf-8'));
const fr = catalog('fr'), yo = catalog('yo'), egun = catalog('egun');

describe('translation catalogs', () => {
  it('keep the shape of each string: leading punctuation, arrows and numbers', () => {
    for (const cat of [fr, yo, egun]) {
      for (const [en, t] of Object.entries(cat)) {
        expect(t.trim(), en).toBeTruthy();
        // Pieces that sit next to other text keep their joining mark
        for (const mark of ['·', '‹', '→', '←', '›', '↗', '✓', '●', '🙏']) {
          if (en.includes(mark)) expect(t, `${en} → ${t}`).toContain(mark);
        }
        // References and numbers stay the same
        for (const n of en.match(/\d+/g) ?? []) expect(t, `${en} → ${t}`).toContain(n);
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
    const store = new Map<string, string>([['cw-ui-language', 'egun'], ['cw-i18n-egun', JSON.stringify(egun)], ['cw-i18n-fr', JSON.stringify(fr)]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } });
    vi.stubGlobal('document', { documentElement: { lang: 'en' } });
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false }));
  });

  it('uses Gungbe, then French, then English', async () => {
    vi.resetModules();
    const { tr, getUILanguage, contentDefaults } = await import('../i18n');
    expect(getUILanguage()).toBe('egun');
    expect(tr('Bible')).toBe('Biblu');
    expect(tr('Hymn lyrics')).toBe(fr['Hymn lyrics']);
    expect(tr('A string nobody wrote')).toBe('A string nobody wrote');
    expect(tr(42)).toBe(42);
    expect(contentDefaults().bibleVersion).toBe('fr');
    expect(contentDefaults('yo')).toEqual({ bibleVersion: 'yo', hymnView: 'yo' });
  });
});
