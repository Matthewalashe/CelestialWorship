import { useState, useEffect, useCallback, useRef } from 'react';
import { trackEvent } from './useAnalytics';
import { getServiceScheduleForDate, toISODate, hourlyPrayersForDate, hourLabel, HOURLY_PRAYER_HOURS } from '../utils/dateUtils';
import { tr } from '../i18n';
import { pushConfigured, syncPushSubscription, removePushSubscription } from '../lib/push';

const PREFS_KEY = 'cw-notification-prefs';
const SCHEDULED_KEY = 'cw-scheduled-notifications';

export interface NotificationPrefs {
  enabled: boolean;
  serviceReminders: boolean;
  devotionReminders: boolean;
  /** The hourly prayers (Àdúrà Wákàtí) */
  hourlyPrayers: boolean;
  /** Which of 9, 12, 15 and 18 */
  hourlyHours: number[];
  /** Personal or family devotion: every hour, even when a service is held then */
  hourlyAtHome: boolean;
  /** Like an alarm: stays on screen and keeps buzzing until it is opened */
  hourlyAlarm: boolean;
}

interface ScheduledNotification {
  id: string;
  fireAt: number; // timestamp ms
  title: string;
  body: string;
  tag: string;
  icon: string;
  url?: string;
  alarm?: boolean;
}

/** Local time of the daily devotion reminder */
const DEVOTION_REMINDER_HOUR = 7;

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

const defaultPrefs: NotificationPrefs = {
  enabled: false,
  serviceReminders: true,
  devotionReminders: true,
  hourlyPrayers: false,
  hourlyHours: HOURLY_PRAYER_HOURS,
  hourlyAtHome: false,
  hourlyAlarm: false,
};

function getPrefs(): NotificationPrefs {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

function savePrefs(prefs: NotificationPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function getScheduledNotifications(): ScheduledNotification[] {
  try {
    const stored = localStorage.getItem(SCHEDULED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveScheduledNotifications(items: ScheduledNotification[]) {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(items));
}

async function showNotification(title: string, body: string, tag: string, icon?: string, url = '/', alarm = false) {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag,
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: alarm ? [600, 300, 600, 300, 600, 300, 600] : [200, 100, 200],
        data: { url },
        requireInteraction: alarm,
        silent: false,
      } as NotificationOptions & { vibrate?: number[] });
      return true;
    }
  } catch (err) {
    console.warn('Notification failed:', err);
  }
  return false;
}

/** Build notification schedule for today and tomorrow */
function buildSchedule(prefs: NotificationPrefs): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = [];
  const now = new Date();

  // Schedule for today and tomorrow
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const services = prefs.serviceReminders ? getServiceScheduleForDate(date) : [];
    const dateStr = toISODate(date);

    if (prefs.devotionReminders) {
      const devotionTime = new Date(date);
      devotionTime.setHours(DEVOTION_REMINDER_HOUR, 0, 0, 0);
      if (devotionTime.getTime() > now.getTime()) {
        notifications.push({
          id: `devotion-${dateStr}`,
          fireAt: devotionTime.getTime(),
          title: 'Daily Devotion',
          body: 'Good morning! Start your day with the Word of God.',
          tag: `devotion-${dateStr}`,
          icon: '/pwa-192x192.png',
        });
      }
    }

    if (prefs.hourlyPrayers) {
      for (const hour of hourlyPrayersForDate(date, prefs.hourlyAtHome).filter(h => prefs.hourlyHours.includes(h))) {
        const at = new Date(date);
        at.setHours(hour, 0, 0, 0);
        if (at.getTime() <= now.getTime()) continue;
        notifications.push({
          id: `hourly-${hour}-${dateStr}`,
          fireAt: at.getTime(),
          title: `${tr('Hourly prayer')} · ${tr(hourLabel(hour))}`,
          body: tr('Àdúrà Wákàtí: a hymn, prayer, the Bible, silent prayer, a closing hymn and prayer.'),
          tag: `hourly-${hour}-${dateStr}`,
          icon: '/pwa-192x192.png',
          url: '/devotion?service=hourly_prayer',
          alarm: prefs.hourlyAlarm,
        });
      }
    }

    for (const service of services) {
      const serviceTime = new Date(date);
      serviceTime.setHours(service.hour, service.minute, 0, 0);

      // 30 minutes before
      const thirtyMinBefore = new Date(serviceTime.getTime() - 30 * 60 * 1000);
      if (thirtyMinBefore.getTime() > now.getTime()) {
        notifications.push({
          id: `${service.id}-30-${dateStr}`,
          fireAt: thirtyMinBefore.getTime(),
          title: `${service.icon} ${service.name} in 30 minutes`,
          body: `Prepare your heart for worship. Service begins at ${formatTime(service.hour, service.minute)}.`,
          tag: `service-30-${service.id}-${dateStr}`,
          icon: '/pwa-192x192.png',
        });
      }

      // 10 minutes before
      const tenMinBefore = new Date(serviceTime.getTime() - 10 * 60 * 1000);
      if (tenMinBefore.getTime() > now.getTime()) {
        notifications.push({
          id: `${service.id}-10-${dateStr}`,
          fireAt: tenMinBefore.getTime(),
          title: `${service.icon} ${service.name} starts in 10 minutes!`,
          body: `Service is about to begin. ${service.hour < 12 ? 'Good morning' : 'God bless you'}!`,
          tag: `service-10-${service.id}-${dateStr}`,
          icon: '/pwa-192x192.png',
        });
      }
    }
  }

  return notifications;
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getPrefs);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSupported] = useState(() => 'Notification' in window && 'serviceWorker' in navigator);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // True once this device receives reminders by Web Push (then the in-app timers are not needed)
  const [pushActive, setPushActive] = useState(false);

  useEffect(() => {
    if (permission !== 'granted' || !prefs.enabled) {
      if (pushConfigured && !prefs.enabled) removePushSubscription();
      setPushActive(false);
      return;
    }
    syncPushSubscription({
      serviceReminders: prefs.serviceReminders,
      devotionReminder: prefs.devotionReminders,
      devotionHour: DEVOTION_REMINDER_HOUR,
      hourlyPrayers: prefs.hourlyPrayers,
      hourlyHours: prefs.hourlyHours,
      hourlyAtHome: prefs.hourlyAtHome,
      hourlyAlarm: prefs.hourlyAlarm,
    }).then(setPushActive);
  }, [permission, prefs.enabled, prefs.serviceReminders, prefs.devotionReminders, prefs.hourlyPrayers, prefs.hourlyHours, prefs.hourlyAtHome, prefs.hourlyAlarm]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);

    trackEvent('reminders_permission', { result });
    if (result === 'granted') {
      const newPrefs = { ...prefs, enabled: true };
      setPrefs(newPrefs);
      savePrefs(newPrefs);

      // Show welcome notification
      await showNotification(
        'CelestialWorship',
        'Notifications enabled! You\'ll receive reminders 30 and 10 minutes before every service.',
        'welcome'
      );
      return true;
    }
    return false;
  }, [isSupported, prefs]);

  // Toggle service reminders
  const toggleServiceReminders = useCallback(() => {
    const newPrefs = { ...prefs, serviceReminders: !prefs.serviceReminders };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
  }, [prefs]);

  // Toggle devotion reminders
  const toggleDevotionReminders = useCallback(() => {
    const newPrefs = { ...prefs, devotionReminders: !prefs.devotionReminders };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
  }, [prefs]);

  // The hourly prayer settings, changed together or one at a time
  const setHourly = useCallback((u: Partial<Pick<NotificationPrefs, 'hourlyPrayers' | 'hourlyHours' | 'hourlyAtHome' | 'hourlyAlarm'>>) => {
    setPrefs(prev => {
      const next = { ...prev, ...u };
      savePrefs(next);
      return next;
    });
  }, []);

  // Schedule notifications using setTimeout
  useEffect(() => {
    // Clear any existing timers
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    if (permission !== 'granted' || !prefs.enabled || pushActive) return;

    const schedule = buildSchedule(prefs);
    const alreadyFired = getScheduledNotifications();
    const alreadyFiredIds = new Set(alreadyFired.map(n => n.id));
    const now = Date.now();

    const newFired: ScheduledNotification[] = [...alreadyFired];

    for (const notification of schedule) {
      if (alreadyFiredIds.has(notification.id)) continue;
      
      const delay = notification.fireAt - now;
      if (delay <= 0) {
        // Already past, fire immediately if within last 5 minutes
        if (delay > -5 * 60 * 1000) {
          showNotification(notification.title, notification.body, notification.tag, notification.icon, notification.url, notification.alarm);
          newFired.push(notification);
        }
        continue;
      }

      // Schedule future notification
      const timer = setTimeout(() => {
        showNotification(notification.title, notification.body, notification.tag, notification.icon, notification.url, notification.alarm);
        // Mark as fired
        const current = getScheduledNotifications();
        current.push(notification);
        saveScheduledNotifications(current);
      }, delay);

      timersRef.current.push(timer);
    }

    // Save updated fired list and clean old entries (older than 2 days)
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    const cleaned = newFired.filter(n => n.fireAt > twoDaysAgo);
    saveScheduledNotifications(cleaned);

    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, [permission, prefs, pushActive]);

  // Re-schedule when app becomes visible (user returns to app)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && permission === 'granted' && prefs.enabled) {
        // Force re-render to re-run scheduling effect
        setPrefs(prev => ({ ...prev }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [permission, prefs.enabled]);

  return {
    isSupported,
    permission,
    pushActive,
    prefs,
    requestPermission,
    toggleServiceReminders,
    toggleDevotionReminders,
    setHourly,
  };
}
