import { useState, useCallback, useEffect } from 'react';

const FAVORITES_KEY = 'cw-favorite-hymns';
const RECENT_KEY = 'cw-recent-viewed-hymns';
const RECENT_LIMIT = 12;
const CHANGE_EVENT = 'cw-favorites-changed';

function readNumbers(key: string): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function writeNumbers(key: string, values: number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {}
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Favourite hymns, shared across every component that uses the hook */
export function useFavoriteHymns() {
  const [favorites, setFavorites] = useState<number[]>(() => readNumbers(FAVORITES_KEY));

  useEffect(() => {
    const sync = () => setFavorites(readNumbers(FAVORITES_KEY));
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const toggleFavorite = useCallback((number: number) => {
    const current = readNumbers(FAVORITES_KEY);
    writeNumbers(
      FAVORITES_KEY,
      current.includes(number) ? current.filter(n => n !== number) : [number, ...current]
    );
  }, []);

  const isFavorite = useCallback((number: number) => favorites.includes(number), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

export function recordHymnView(number: number) {
  const current = readNumbers(RECENT_KEY).filter(n => n !== number);
  writeNumbers(RECENT_KEY, [number, ...current].slice(0, RECENT_LIMIT));
}

export function useRecentHymns() {
  const [recent, setRecent] = useState<number[]>(() => readNumbers(RECENT_KEY));
  useEffect(() => {
    const sync = () => setRecent(readNumbers(RECENT_KEY));
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  return recent;
}
