import { useCallback, useState } from 'react';
import type { DisplayLook, DisplayState, DisplayTransition } from '../../types';

/**
 * How the words look on the screen: a background for hymns, one for the Bible, and how one slide gives way to the next.
 * Sent along with every slide, so a screen on another device looks the same. Kept on this computer.
 */

export interface LookBackground { color: string; url?: string; kind?: 'image' | 'video'; dim: number }
export interface LookSettings { hymn: LookBackground; verse: LookBackground; transition: DisplayTransition; seconds: number }

export const BACKGROUND_COLOURS: { name: string; color: string }[] = [
  { name: 'Black', color: '#000000' }, { name: 'Night blue', color: '#0B1B44' }, { name: 'Royal blue', color: '#1F3A8A' },
  { name: 'Purple', color: '#3B1763' }, { name: 'Deep green', color: '#0F3D2E' }, { name: 'Wine', color: '#4A1020' },
];
export const TRANSITIONS: { id: DisplayTransition; name: string }[] = [
  { id: 'fade', name: 'Fade' }, { id: 'slide', name: 'Slide' }, { id: 'zoom', name: 'Zoom' }, { id: 'cut', name: 'Cut' },
];

/** Pictures ready for everyone to use; a church can add its own as well */
export const DEFAULT_BACKGROUNDS: { name: string; url: string }[] = [
  { name: 'Blue sky', url: '/backgrounds/clouds-blue.jpg' }, { name: 'Dawn', url: '/backgrounds/clouds-dawn.jpg' },
  { name: 'Night clouds', url: '/backgrounds/clouds-night.jpg' }, { name: 'Light on blue', url: '/backgrounds/light-royal.jpg' },
  { name: 'Light on purple', url: '/backgrounds/light-purple.jpg' }, { name: 'Stars', url: '/backgrounds/stars.jpg' },
  { name: 'Candlelight', url: '/backgrounds/candlelight.jpg' }, { name: 'Stained glass', url: '/backgrounds/stained-glass.jpg' },
  { name: 'White cloth', url: '/backgrounds/white-cloth.jpg' },
];

const KEY = 'cw-display-look';
const DEFAULTS: LookSettings = { hymn: { color: '#000000', dim: 0.45 }, verse: { color: '#000000', dim: 0.45 }, transition: 'fade', seconds: 0.5 };

export function loadLook(): LookSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      hymn: { ...DEFAULTS.hymn, ...saved?.hymn }, verse: { ...DEFAULTS.verse, ...saved?.verse },
      transition: TRANSITIONS.some(t => t.id === saved?.transition) ? saved.transition : DEFAULTS.transition,
      seconds: Number.isFinite(saved?.seconds) ? saved.seconds : DEFAULTS.seconds,
    };
  } catch { return DEFAULTS; }
}

export function useLook() {
  const [look, setLook] = useState<LookSettings>(loadLook);
  const update = useCallback((changes: Partial<LookSettings>) => {
    setLook(old => {
      const next = { ...old, ...changes };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return { look, update };
}

/** The slide with its look attached */
export function withLook(state: DisplayState, look: LookSettings): DisplayState {
  const bg = state.type === 'hymn' ? look.hymn : state.type === 'verse' ? look.verse : null;
  const applied: DisplayLook = { transition: look.transition, seconds: look.seconds, ...(bg ? { color: bg.color, url: bg.url, kind: bg.kind, dim: bg.dim } : {}) };
  return { ...state, look: applied };
}

/** The CSS animation for a slide coming in */
export function transitionAnimation(look?: DisplayLook): string | undefined {
  if (!look || look.transition === 'cut') return 'none';
  return `cw-t-${look.transition} ${look.seconds ?? 0.5}s ease both`;
}
