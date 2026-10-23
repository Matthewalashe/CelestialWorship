import { useState, useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { DisplayState } from '../types';

/**
 * Operator → projector messaging.
 * - Same browser (a second window on the projector): BroadcastChannel, works offline.
 * - Another device (phone as remote, a TV browser…): Supabase Realtime broadcast on a
 *   room code. Open /display?room=CODE on the screen and use the same code on the Operator page.
 */

const CHANNEL_NAME = 'ccc-live-display';
const LAST_STATE_KEY = 'cw-display-last-state';
const ROOM_KEY = 'cw-display-room';

/** Hymn list handed from the Hymn Selector to the Operator page */
export const OPERATOR_QUEUE_KEY = 'cw-queue';

export interface OperatorQueueItem {
  hymnNumber: number;
  slotName: string;
}

export interface OperatorQueue {
  serviceName: string;
  items: OperatorQueueItem[];
}

export function loadOperatorQueue(): OperatorQueue | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(OPERATOR_QUEUE_KEY) || 'null');
    if (parsed && Array.isArray(parsed.items)) return parsed;
  } catch {}
  return null;
}

export function clearOperatorQueue(): void {
  try { localStorage.removeItem(OPERATOR_QUEUE_KEY); } catch {}
}

function readLastState(): DisplayState | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_STATE_KEY) || 'null');
    if (saved && typeof saved.type === 'string') return saved;
  } catch {}
  return null;
}

/** Six characters without look-alikes (no 0/O, 1/I) */
export function newRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(b => alphabet[b % alphabet.length]).join('');
}

const roomChannelName = (room: string) => `display-${room.toUpperCase()}`;

/**
 * Hook for the OPERATOR side — sends display commands.
 */
export function useDisplayController() {
  const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));
  const [room, setRoomState] = useState<string | null>(() => {
    try { return localStorage.getItem(ROOM_KEY); } catch { return null; }
  });
  const [remoteConnected, setRemoteConnected] = useState(false);
  const realtimeRef = useRef<RealtimeChannel | null>(null);

  // Join the room so screens elsewhere receive what is sent, and can ask for the current state
  useEffect(() => {
    if (!room) return;
    const rt = supabase.channel(roomChannelName(room), { config: { broadcast: { self: false } } });
    rt.on('broadcast', { event: 'hello' }, () => {
      const last = readLastState();
      if (last) rt.send({ type: 'broadcast', event: 'state', payload: last });
      setRemoteConnected(true);
    }).subscribe(status => { if (status !== 'SUBSCRIBED') setRemoteConnected(false); });
    realtimeRef.current = rt;
    return () => { supabase.removeChannel(rt); realtimeRef.current = null; };
  }, [room]);

  const setRoom = useCallback((code: string | null) => {
    try {
      if (code) localStorage.setItem(ROOM_KEY, code);
      else localStorage.removeItem(ROOM_KEY);
    } catch {}
    setRemoteConnected(false);
    setRoomState(code);
  }, []);

  const sendToDisplay = useCallback(
    (state: DisplayState) => {
      channel.postMessage(state);
      realtimeRef.current?.send({ type: 'broadcast', event: 'state', payload: state });
      // Remembered so a display window opened (or refreshed) later shows what is live
      try { localStorage.setItem(LAST_STATE_KEY, JSON.stringify(state)); } catch {}
    },
    [channel]
  );

  const showHymnVerse = useCallback(
    (title: string, content: string, hymnNumber: number, verseIndex: number, totalVerses: number) => {
      sendToDisplay({ type: 'hymn', title, content, hymnNumber, verseIndex, totalVerses });
    },
    [sendToDisplay]
  );

  const showBibleVerse = useCallback(
    (title: string, content: string) => sendToDisplay({ type: 'verse', title, content }),
    [sendToDisplay]
  );

  const showAnnouncement = useCallback(
    (title: string, content: string) => sendToDisplay({ type: 'announcement', title, content }),
    [sendToDisplay]
  );

  const blankScreen = useCallback(() => sendToDisplay({ type: 'blank', content: '' }), [sendToDisplay]);
  const showLogo = useCallback(() => sendToDisplay({ type: 'logo', content: '' }), [sendToDisplay]);

  useEffect(() => () => channel.close(), [channel]);

  return { sendToDisplay, showHymnVerse, showBibleVerse, showAnnouncement, blankScreen, showLogo, room, setRoom, remoteConnected };
}

/**
 * Hook for the DISPLAY side — receives and renders display commands.
 */
export function useDisplayReceiver(room?: string | null) {
  const [displayState, setDisplayState] = useState<DisplayState>(() => readLastState() ?? { type: 'logo', content: '' });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<DisplayState>) => setDisplayState(event.data);
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!room) return;
    const rt = supabase.channel(roomChannelName(room), { config: { broadcast: { self: false } } });
    rt.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (payload && typeof payload.type === 'string') setDisplayState(payload as DisplayState);
    }).subscribe(status => {
      setConnected(status === 'SUBSCRIBED');
      // Ask the operator for what is live right now
      if (status === 'SUBSCRIBED') rt.send({ type: 'broadcast', event: 'hello', payload: {} });
    });
    return () => { supabase.removeChannel(rt); };
  }, [room]);

  return { displayState, connected };
}
