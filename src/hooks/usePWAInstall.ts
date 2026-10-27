import { useState, useEffect } from 'react';
import { trackEvent } from './useAnalytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/*
 * Chrome and Edge offer the install once, early (beforeinstallprompt). It is caught here when the
 * app starts (main.tsx imports this file), so any screen can use it later, the install page,
 * Home's banner, settings.
 */
let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    if (!deferred) trackEvent('install_offered', {});
    deferred = e as BeforeInstallPromptEvent; notify();
  });
  window.addEventListener('appinstalled', () => { installedNow = true; deferred = null; trackEvent('app_installed', {}); notify(); });
}

export type Device = 'ios' | 'android' | 'desktop';

/** Where the page is open: the phone, the browser, and whether that browser can install apps */
export function detectDevice() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch gives it away
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  // WhatsApp, Facebook, Instagram, Telegram, TikTok… open links in their own viewer, which can't install
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|Snapchat|TikTok|musical_ly|Telegram|WhatsApp|; wv\)/i.test(ua);
  const iosSafari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|YaBrowser/.test(ua) && !inApp;
  const device: Device = ios ? 'ios' : android ? 'android' : 'desktop';
  return { device, ios, android, inApp, iosSafari };
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function usePWAInstall() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa-install-dismissed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    const update = () => force(n => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const { ios, android, iosSafari, inApp, device } = detectDevice();
  const isInstalled = installedNow || isStandalone();

  const install = async () => {
    if (!deferred) return false;
    const prompt = deferred;
    deferred = null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    trackEvent('install_prompt', { outcome });
    if (outcome === 'accepted') installedNow = true;
    notify();
    return outcome === 'accepted';
  };

  const dismiss = () => {
    trackEvent('install_banner_dismissed', {});
    setDismissed(true);
    try { localStorage.setItem('pwa-install-dismissed', 'true'); } catch {}
  };

  return {
    canPrompt: !!deferred && !isInstalled,   // one-tap install available (Chrome, Edge, Samsung Internet)
    isInstalled,
    isIOS: ios,
    isAndroid: android,
    isSafari: iosSafari,
    inApp,
    device,
    showBanner: !isInstalled && !dismissed,
    install,
    dismiss,
  };
}
