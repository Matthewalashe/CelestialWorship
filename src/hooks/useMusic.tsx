import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TRACKS, type Track } from '../data/music';
import { TunePlayer } from '../utils/hymnTune';
import { loadHymns } from './useHymns';
import type { Hymn } from '../types';
import { seededShuffle } from '../utils/quiz';

/**
 * Background music for devotion and Bible reading. Off until someone turns it on (browsers only
 * allow sound after a tap); it stops when they leave those pages or a passage is read aloud.
 */

export type MusicSource = 'both' | 'tunes' | 'recordings';
interface NowPlaying { title: string; detail: string; page?: string }

interface MusicContextValue {
  on: boolean;
  source: MusicSource;
  volume: number;
  now: NowPlaying | null;
  toggle: () => void;
  setSource: (s: MusicSource) => void;
  setVolume: (v: number) => void;
  skip: () => void;
  stop: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);
const KEY = 'cw-music';
/** Where background music belongs */
const MUSIC_PAGES = [/^\/devotion/, /^\/bible\//];

function loadPrefs(): { source: MusicSource; volume: number } {
  try { return { source: 'both', volume: 0.35, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { source: 'both', volume: 0.35 }; }
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [on, setOn] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const tune = useRef<TunePlayer | null>(null);
  const queue = useRef<(Track | { hymn: number; title: string; solfa: string })[]>([]);
  // The hymnal is loaded only when music is first turned on
  const hymns = useRef<Hymn[]>([]);
  const location = useLocation();

  const savePrefs = (p: Partial<typeof prefs>) => setPrefs(old => {
    const next = { ...old, ...p };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    return next;
  });

  const halt = useCallback(() => {
    audio.current?.pause();
    tune.current?.stop();
  }, []);

  const buildQueue = useCallback(() => {
    const tunes = hymns.current.filter(h => h.solfaNotation && h.solfaNotation.split(':').length > 8)
      .map(h => ({ hymn: h.number, title: h.englishTitle || h.yorubaTitle || `Hymn ${h.number}`, solfa: h.solfaNotation! }));
    const seed = Date.now() % 100000;
    const recs = seededShuffle(TRACKS, seed);
    const tns = seededShuffle(tunes, seed + 1);
    if (prefs.source === 'tunes') return tns;
    if (prefs.source === 'recordings') return recs;
    // Alternate a recording and a hymn tune
    const out: typeof queue.current = [];
    for (let i = 0; i < Math.max(recs.length, tns.length); i++) { if (recs[i]) out.push(recs[i]); if (tns[i]) out.push(tns[i]); }
    return out;
  }, [prefs.source]);

  const playNext = useCallback(() => {
    halt();
    if (!queue.current.length) queue.current = buildQueue();
    const item = queue.current.shift();
    if (!item) { setOn(false); return; }
    if ('src' in item) {
      const el = audio.current ?? new Audio();
      audio.current = el;
      el.src = item.src;
      el.volume = prefs.volume;
      el.onended = () => playNext();
      el.onerror = () => playNext();      // offline or unavailable: move on
      el.play().catch(() => playNext());
      setNow({ title: item.title, detail: `${item.credit} · ${item.license}`, page: item.page });
    } else {
      tune.current = tune.current ?? new TunePlayer(prefs.volume);
      tune.current.setVolume(prefs.volume);
      tune.current.play(item.solfa, { times: 2, onEnd: () => playNext() });
      setNow({ title: `Hymn ${item.hymn}: ${item.title}`, detail: 'Celestial hymn tune, from the hymnal’s sol-fa' });
    }
  }, [buildQueue, halt, prefs.volume]);

  const stop = useCallback(() => { halt(); setOn(false); setNow(null); }, [halt]);

  const toggle = useCallback(() => {
    if (on) { stop(); return; }
    setOn(true);
    tune.current = tune.current ?? new TunePlayer(prefs.volume);
    tune.current.unlock();
    const start = () => { queue.current = buildQueue(); playNext(); };
    if (hymns.current.length) { start(); return; }
    // Tunes need the hymnal: recordings start at once, tunes join when it has loaded
    const loading = loadHymns().then(h => { hymns.current = h; }).catch(() => {});
    if (prefs.source === 'tunes') loading.then(start);
    else { start(); loading.then(() => { queue.current = buildQueue(); }); }
  }, [on, stop, buildQueue, playNext, prefs.volume, prefs.source]);

  // Leaving devotion and the Bible stops the music
  useEffect(() => {
    if (on && !MUSIC_PAGES.some(r => r.test(location.pathname))) stop();
  }, [location.pathname, on, stop]);

  // Read-aloud and music don't mix
  useEffect(() => {
    const pause = () => { if (on) stop(); };
    window.addEventListener('cw-speech-start', pause);
    return () => window.removeEventListener('cw-speech-start', pause);
  }, [on, stop]);

  useEffect(() => () => halt(), [halt]);

  const setVolume = (v: number) => {
    savePrefs({ volume: v });
    if (audio.current) audio.current.volume = v;
    tune.current?.setVolume(v);
  };
  const setSource = (s: MusicSource) => { savePrefs({ source: s }); queue.current = []; };

  return (
    <MusicContext.Provider value={{ on, source: prefs.source, volume: prefs.volume, now, toggle, setSource, setVolume, skip: playNext, stop }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used inside MusicProvider');
  return ctx;
}
