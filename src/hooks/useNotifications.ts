import { useState, useEffect, useCallback, useRef } from 'react';
import { getServiceScheduleForDate, type ServiceScheduleItem } from '../utils/dateUtils';

const PREFS_KEY = 'cw-notification-prefs';
const SCHEDULED_KEY = 'cw-scheduled-notifications';

interface NotificationPrefs {
  enabled: boolean;
  serviceReminders: boolean;
  devotionReminders: boolean;
}

interface ScheduledNotification {
  id: string;
  fireAt: number; // timestamp ms
  title: string;
  body: string;
  tag: string;
  icon: string;
}

const defaultPrefs: NotificationPrefs = {
  enabled: false,
  serviceReminders: true,
  devotionReminders: true,
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

async function showNotification(title: string, body: string, tag: string, icon?: string) {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag,
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        data: { url: '/' },
        requireInteraction: false,
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
function buildSchedule(): ScheduledNotification[] {
  const notifications: ScheduledNotification[] = [];
  const now = new Date();

  // Schedule for today and tomorrow
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    const services = getServiceScheduleForDate(date);
    const dateStr = date.toISOString().split('T')[0];

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
          body: `Prepare your heart for worship. Service begins at ${service.hour}:${String(service.minute).padStart(2, '0')} ${service.hour < 12 ? 'AM' : 'PM'}.`,
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

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);

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

  // Schedule notifications using setTimeout
  useEffect(() => {
    // Clear any existing timers
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    if (permission !== 'granted' || !prefs.enabled || !prefs.serviceReminders) return;

    const schedule = buildSchedule();
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
          showNotification(notification.title, notification.body, notification.tag, notification.icon);
          newFired.push(notification);
        }
        continue;
      }

      // Schedule future notification
      const timer = setTimeout(() => {
        showNotification(notification.title, notification.body, notification.tag, notification.icon);
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

    // Devotion reminder — fire once per session if enabled
    if (prefs.devotionReminders) {
      const devotionKey = `cw-devotion-reminder-${new Date().toISOString().split('T')[0]}`;
      if (!sessionStorage.getItem(devotionKey)) {
        const hour = new Date().getHours();
        let msg: string;
        if (hour < 12) msg = 'Good morning! Start your day with the Word of God.';
        else if (hour < 17) msg = 'Take a moment for your afternoon devotion.';
        else msg = 'End your day with evening devotion and prayer.';
        
        showNotification('Daily Devotion', msg, `devotion-${new Date().toISOString().split('T')[0]}`);
        sessionStorage.setItem(devotionKey, 'true');
      }
    }

    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, [permission, prefs.enabled, prefs.serviceReminders, prefs.devotionReminders]);

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
    prefs,
    requestPermission,
    toggleServiceReminders,
    toggleDevotionReminders,
  };
}
