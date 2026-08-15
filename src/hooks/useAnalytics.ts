import { useEffect } from 'react';
import { supabase } from '../supabase';

export function getDeviceId(): string {
  let deviceId = localStorage.getItem('cw-device-id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('cw-device-id', deviceId);
  }
  return deviceId;
}

export function getPlatform(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
  return 'web';
}

export function trackEvent(event: string, properties?: Record<string, any>): void {
  supabase.from('analytics_events').insert({
    device_id: getDeviceId(),
    event,
    properties,
    platform: getPlatform(),
    created_at: new Date().toISOString()
  }).then(() => {}).catch(() => {}); // silent
}

export function usePageView(pageName: string): void {
  useEffect(() => {
    trackEvent('page_view', { page: pageName });
  }, [pageName]);
}
