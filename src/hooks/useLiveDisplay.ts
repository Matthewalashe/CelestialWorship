import { useState, useCallback, useEffect } from 'react';
import { DisplayState } from '../types';

const CHANNEL_NAME = 'ccc-live-display';
const LAST_STATE_KEY = 'cw-display-last-state';

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

/**
 * Hook for the OPERATOR side — sends display commands.
 */
export function useDisplayController() {
  const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));

  const sendToDisplay = useCallback(
    (state: DisplayState) => {
      channel.postMessage(state);
      // Remembered so a display window opened (or refreshed) later shows what is live
      try { localStorage.setItem(LAST_STATE_KEY, JSON.stringify(state)); } catch {}
    },
    [channel]
  );

  const showHymnVerse = useCallback(
    (title: string, content: string, hymnNumber: number, verseIndex: number, totalVerses: number) => {
      sendToDisplay({
        type: 'hymn',
        title,
        content,
        hymnNumber,
        verseIndex,
        totalVerses,
      });
    },
    [sendToDisplay]
  );

  const showBibleVerse = useCallback(
    (title: string, content: string) => {
      sendToDisplay({
        type: 'verse',
        title,
        content,
      });
    },
    [sendToDisplay]
  );

  const showAnnouncement = useCallback(
    (title: string, content: string) => {
      sendToDisplay({
        type: 'announcement',
        title,
        content,
      });
    },
    [sendToDisplay]
  );

  const blankScreen = useCallback(() => {
    sendToDisplay({ type: 'blank', content: '' });
  }, [sendToDisplay]);

  const showLogo = useCallback(() => {
    sendToDisplay({ type: 'logo', content: '' });
  }, [sendToDisplay]);

  useEffect(() => {
    return () => channel.close();
  }, [channel]);

  return {
    sendToDisplay,
    showHymnVerse,
    showBibleVerse,
    showAnnouncement,
    blankScreen,
    showLogo,
  };
}

/**
 * Hook for the DISPLAY side — receives and renders display commands.
 */
export function useDisplayReceiver() {
  const [displayState, setDisplayState] = useState<DisplayState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_STATE_KEY) || 'null');
      if (saved && typeof saved.type === 'string') return saved;
    } catch {}
    return { type: 'logo', content: '' };
  });

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<DisplayState>) => {
      setDisplayState(event.data);
    };

    return () => channel.close();
  }, []);

  return { displayState };
}
