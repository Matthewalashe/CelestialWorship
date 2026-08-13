import { useState, useCallback, useEffect } from 'react';
import { DisplayState } from '../types';

const CHANNEL_NAME = 'ccc-live-display';

/**
 * Hook for the OPERATOR side — sends display commands.
 */
export function useDisplayController() {
  const [channel] = useState(() => new BroadcastChannel(CHANNEL_NAME));

  const sendToDisplay = useCallback(
    (state: DisplayState) => {
      channel.postMessage(state);
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
  const [displayState, setDisplayState] = useState<DisplayState>({
    type: 'logo',
    content: '',
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
