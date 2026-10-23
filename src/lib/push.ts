import { supabase } from '../supabase';
import { getDeviceId } from '../hooks/useAnalytics';
import { readLocalProfile } from '../hooks/useProfile';

/**
 * Web Push: reminders that arrive even when the app is closed. Needs VITE_VAPID_PUBLIC_KEY
 * and the push-subscribe / send-reminders Edge Functions. Without them the app falls back
 * to reminders that fire only while it is open.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushConfigured = !!VAPID_PUBLIC_KEY && typeof window !== 'undefined' && 'PushManager' in window;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export interface PushPreferences { serviceReminders: boolean; devotionReminder: boolean; devotionHour: number }

/** Subscribe this device (or refresh its preferences). Returns false when push isn't available. */
export async function syncPushSubscription(prefs: PushPreferences): Promise<boolean> {
  if (!pushConfigured || Notification.permission !== 'granted') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource });
    const { error } = await supabase.functions.invoke('push-subscribe', {
      body: {
        subscription: subscription.toJSON(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferences: prefs,
        parish_id: readLocalProfile().parishId,
        device_id: getDeviceId(),
      },
    });
    return !error;
  } catch {
    return false;
  }
}

export async function removePushSubscription(): Promise<void> {
  if (!pushConfigured) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await supabase.functions.invoke('push-subscribe', { body: { endpoint: subscription.endpoint, remove: true } });
    await subscription.unsubscribe();
  } catch {}
}
