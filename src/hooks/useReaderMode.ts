import { useState, useCallback } from 'react';

export type ReaderMode = 'off' | 'paper' | 'paper-dark';

const READER_KEY = 'cw-reader-mode';

function getStoredMode(): ReaderMode {
  try {
    const stored = localStorage.getItem(READER_KEY);
    if (stored === 'paper' || stored === 'paper-dark') return stored;
  } catch {}
  return 'off';
}

/**
 * Reader mode hook — provides e-paper/Kindle-style reading experience.
 * Only used in Devotion, Hymn, and Bible pages.
 * Persists selection to localStorage.
 */
export function useReaderMode() {
  const [readerMode, setReaderModeState] = useState<ReaderMode>(getStoredMode);

  const setReaderMode = useCallback((mode: ReaderMode) => {
    setReaderModeState(mode);
    if (mode === 'off') {
      localStorage.removeItem(READER_KEY);
    } else {
      localStorage.setItem(READER_KEY, mode);
    }
  }, []);

  const cycleReaderMode = useCallback(() => {
    setReaderModeState(prev => {
      const next = prev === 'off' ? 'paper' : prev === 'paper' ? 'paper-dark' : 'off';
      if (next === 'off') {
        localStorage.removeItem(READER_KEY);
      } else {
        localStorage.setItem(READER_KEY, next);
      }
      return next;
    });
  }, []);

  return {
    readerMode,
    setReaderMode,
    cycleReaderMode,
    isReaderActive: readerMode !== 'off',
  };
}
