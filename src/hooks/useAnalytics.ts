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

/** A screen, with ids taken out so one hymn or parish counts with the others: /hymns/12 → /hymns/:id */
export function screenPath(pathname: string): string {
  return pathname
    .split('/')
    .map(part => (/^\d+$|^[0-9a-f]{8}-[0-9a-f-]{27,}$|^[a-z]{2,4}-\d+$/i.test(part) ? ':id' : part))
    .join('/')
    .slice(0, 80) || '/';
}

/** Every screen the reader opens (Layout calls this on each change of route) */
export function useScreenViews(pathname: string): void {
  useEffect(() => {
    trackEvent('page_view', { path: screenPath(pathname) });
  }, [pathname]);
}

/**
 * Once per opening of the app: how it is being used. Nothing that identifies the person: the language, the theme,
 * whether it runs installed, where the visit came from (the referring site and campaign tags), the screen size,
 * the time zone (a rough region) and the version.
 */
export function startSession(): void {
  const params = new URLSearchParams(window.location.search);
  let referrer = '';
  try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; } catch {}
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const width = window.innerWidth;
  let language = 'en', theme = 'light', isNew = false;
  try {
    language = localStorage.getItem('cw-ui-language') || 'en';
    theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    isNew = !localStorage.getItem('cw-device-id');
  } catch {}
  getDeviceId();
  if (isNew) trackEvent('first_open', {});
  trackEvent('session_start', {
    language,
    theme,
    display: standalone ? 'installed' : 'browser',
    referrer: referrer && referrer !== window.location.hostname ? referrer.replace(/^www\./, '').slice(0, 60) : '',
    utm_source: (params.get('utm_source') ?? params.get('ref') ?? '').slice(0, 40),
    utm_campaign: (params.get('utm_campaign') ?? '').slice(0, 40),
    screen: width < 640 ? 'phone' : width < 1024 ? 'tablet' : 'desktop',
    timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })(),
    version: import.meta.env.VITE_APP_VERSION ?? 'dev',
  });
  // The first time the installed app is opened on this device; on iPhones this is the only sign of an install
  try {
    if (standalone && !localStorage.getItem('cw-installed-seen')) {
      localStorage.setItem('cw-installed-seen', '1');
      trackEvent('pwa_first_launch', {});
    }
  } catch {}
  // Every share sheet in the app goes through navigator.share: count them in one place
  if (typeof navigator.share === 'function') {
    const share = navigator.share.bind(navigator);
    navigator.share = (data?: ShareData) => {
      trackEvent('share', { path: screenPath(window.location.pathname), files: !!data?.files?.length });
      return share(data);
    };
  }
}
