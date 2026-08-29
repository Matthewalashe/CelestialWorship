import { useState, useEffect, useCallback } from 'react';

/**
 * Screen Wake Lock — prevents device screen from dimming during worship.
 * Uses the Screen Wake Lock API (supported in Chrome, Edge, Safari 16.4+).
 * Falls back gracefully on unsupported browsers.
 */
export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const request = useCallback(async () => {
    if (!isSupported) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => {
        setIsActive(false);
        setWakeLock(null);
      });
      setWakeLock(lock);
      setIsActive(true);
    } catch {
      // Permission denied or not available
    }
  }, [isSupported]);

  const release = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
      setIsActive(false);
    }
  }, [wakeLock]);

  const toggle = useCallback(async () => {
    if (isActive) {
      await release();
    } else {
      await request();
    }
  }, [isActive, release, request]);

  // Re-acquire on visibility change (browser re-releases on tab switch)
  useEffect(() => {
    if (!isActive || !isSupported) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        request();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isActive, isSupported, request]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { wakeLock?.release().catch(() => {}); };
  }, [wakeLock]);

  return { isActive, isSupported, toggle, request, release };
}
