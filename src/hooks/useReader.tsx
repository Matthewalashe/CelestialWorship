import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/**
 * Reading settings shared by the Bible, the hymnal and devotion, like an e-reader's "Aa" menu.
 * `page: 'paper' | 'night'` is reading mode: a full-screen, monochrome page without the app around it.
 */

export type ReaderPage = 'normal' | 'paper' | 'night';

export interface ReaderSettings {
  page: ReaderPage;
  font: 'serif' | 'sans';
  /** Body text size in px */
  size: number;
  leading: 1.5 | 1.75 | 2;
  margin: 'narrow' | 'normal' | 'wide';
  justify: boolean;
}

export const TEXT_SIZES = [15, 17, 19, 21, 24, 27, 30];

const KEY = 'cw-reader';
const DEFAULTS: ReaderSettings = { page: 'normal', font: 'serif', size: 19, leading: 1.75, margin: 'normal', justify: false };

function load(): ReaderSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (stored) return { ...DEFAULTS, ...stored };
    // Settings from the earlier per-page controls
    const old = localStorage.getItem('cw-reader-mode');
    const size = Number(localStorage.getItem('cw-bible-font') || localStorage.getItem('cw-hymn-font'));
    return {
      ...DEFAULTS,
      page: old === 'paper' ? 'paper' : old === 'paper-dark' ? 'night' : 'normal',
      size: TEXT_SIZES.reduce((best, s) => (size && Math.abs(s - size) < Math.abs(best - size) ? s : best), DEFAULTS.size),
    };
  } catch {
    return DEFAULTS;
  }
}

interface ReaderContextValue {
  settings: ReaderSettings;
  update: (patch: Partial<ReaderSettings>) => void;
  /** Reading mode is on */
  reading: boolean;
  setReading: (on: boolean) => void;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(load);
  // The last reading page chosen, so "Read" reopens paper or night as the person left it
  const [lastPage, setLastPage] = useState<'paper' | 'night'>(settings.page === 'night' ? 'night' : 'paper');

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings(s => {
      const next = { ...s, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    if (patch.page === 'paper' || patch.page === 'night') setLastPage(patch.page);
  }, []);

  const setReading = useCallback((on: boolean) => update({ page: on ? lastPage : 'normal' }), [update, lastPage]);

  return (
    <ReaderContext.Provider value={{ settings, update, reading: settings.page !== 'normal', setReading }}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader(): ReaderContextValue {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error('useReader must be used inside ReaderProvider');
  return ctx;
}
