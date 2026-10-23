import { useEffect } from 'react';
import { supabase } from '../supabase';

/**
 * Anonymous usage counts and error reports. Events are batched and sent every few
 * seconds (and when the app is hidden) instead of one request per page view.
 * No names, emails or note contents are ever included.
 */

export function getDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('cw-device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('cw-device-id', deviceId);
    }
    return deviceId;
  } catch {
    return 'unknown';
  }
}

export function getPlatform(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();
  if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  return 'web';
}

interface QueuedEvent { device_id: string; event: string; properties?: Record<string, unknown>; platform: string; created_at: string }

const queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 8000;
const MAX_BATCH = 25;

function flush() {
  timer = null;
  if (!queue.length || !navigator.onLine) return;
  const batch = queue.splice(0, MAX_BATCH);
  supabase.from('analytics_events').insert(batch).then(() => {}, () => {});
  if (queue.length) timer = setTimeout(flush, FLUSH_MS);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  queue.push({ device_id: getDeviceId(), event: event.slice(0, 40), properties, platform: getPlatform(), created_at: new Date().toISOString() });
  if (queue.length > 200) queue.splice(0, queue.length - 200); // offline for a long time: keep the latest
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

/** Report an app error (message and where it happened only) */
export function reportError(error: unknown, where: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  trackEvent('error', {
    where: where.slice(0, 60),
    message: err.message.slice(0, 300),
    stack: (err.stack ?? '').split('\n').slice(0, 4).join('\n').slice(0, 600),
    path: window.location.pathname,
    version: import.meta.env.VITE_APP_VERSION ?? 'dev',
  });
}

export function usePageView(pageName: string): void {
  useEffect(() => {
    trackEvent('page_view', { page: pageName });
  }, [pageName]);
}
