import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Screen Wake Lock — prevents device screen from dimming during worship.
 * Uses the Screen Wake Lock API (supported in Chrome, Edge, Safari 16.4+).
 * Falls back gracefully on unsupported browsers.
 *
 * `isActive` reflects what the user asked for. The browser drops the lock whenever
 * the page is hidden, so it is re-acquired when the page becomes visible again.
 */
export function useWakeLock() {
  const [isActive, setIsActive] = useState(false);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  const acquire = useCallback(async () => {
    if (!isSupported || lockRef.current) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => {
        if (lockRef.current === lock) lockRef.current = null;
      });
      lockRef.current = lock;
    } catch {
      // Permission denied or not available
    }
  }, [isSupported]);

  const request = useCallback(async () => {
    if (!isSupported) return;
    setIsActive(true);
    await acquire();
  }, [isSupported, acquire]);

  const release = useCallback(async () => {
    setIsActive(false);
    const lock = lockRef.current;
    lockRef.current = null;
    await lock?.release().catch(() => {});
  }, []);

  const toggle = useCallback(async () => {
    if (isActive) {
      await release();
    } else {
      await request();
    }
  }, [isActive, release, request]);

  // Re-acquire on visibility change (browser releases the lock when the tab is hidden)
  useEffect(() => {
    if (!isActive || !isSupported) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isActive, isSupported, acquire]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { lockRef.current?.release().catch(() => {}); };
  }, []);

  return { isActive, isSupported, toggle, request, release };
}
