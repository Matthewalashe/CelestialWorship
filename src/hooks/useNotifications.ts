import { useState, useEffect, useCallback } from 'react';
import { getServiceTypesForDate } from '../utils/dateUtils';

const PREFS_KEY = 'cw-notification-prefs';

interface NotificationPrefs {
  enabled: boolean;
  serviceReminders: boolean;
  devotionReminders: boolean;
  lastServiceNotifyDate: string;
  lastDevotionNotifyDate: string;
}

const defaultPrefs: NotificationPrefs = {
  enabled: false,
  serviceReminders: true,
  devotionReminders: true,
  lastServiceNotifyDate: '',
  lastDevotionNotifyDate: '',
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

// Service day info
function getTodayServiceInfo(): { hasService: boolean; serviceNames: string[]; serviceIcons: string[] } {
  const today = new Date();
  const types = getServiceTypesForDate(today);
  
  const serviceMap: Record<string, { name: string; icon: string }> = {
    sunday_full: { name: 'Sunday Divine Service', icon: '⛪' },
    sunday_evening: { name: 'Sunday Evening Service', icon: '🌙' },
    wednesday_midweek: { name: 'Midweek Service', icon: '📖' },
    thursday_mercy: { name: 'Mercy Day Service', icon: '🙏' },
    friday_power: { name: 'Power Day Service', icon: '⚡' },
    first_friday: { name: 'First Friday Service', icon: '🕯️' },
    mercy_day_service: { name: 'Mercy Day Service', icon: '🙏' },
    power_day_service: { name: 'Power Day Service', icon: '⚡' },
    prophets_prophetess_dreamers: { name: 'Prophets & Prophetesses', icon: '⭐' },
  };
  
  const serviceNames = types.map(t => serviceMap[t]?.name || 'Church Service');
  const serviceIcons = types.map(t => serviceMap[t]?.icon || '⛪');
  
  return { hasService: types.length > 0, serviceNames, serviceIcons };
}

// Get greeting-appropriate devotion message
function getDevotionMessage(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '🕊️ Good morning! Start your day with the Word of God.';
  if (hour < 17) return '🕊️ Take a moment for your afternoon devotion.';
  return '🕊️ End your day with evening devotion and prayer.';
}

async function showNotification(title: string, body: string, tag: string, icon?: string) {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag, // Prevents duplicate notifications
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        data: { url: '/' },
        requireInteraction: false,
        silent: false,
      });
      return true;
    }
  } catch (err) {
    console.warn('Notification failed:', err);
  }
  return false;
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getPrefs);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSupported] = useState(() => 'Notification' in window && 'serviceWorker' in navigator);

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
        'Notifications enabled! You\'ll receive service and devotion reminders.',
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

  // Check and fire notifications on app load
  useEffect(() => {
    if (permission !== 'granted' || !prefs.enabled) return;

    const today = new Date().toISOString().split('T')[0];

    // Service reminder
    if (prefs.serviceReminders && prefs.lastServiceNotifyDate !== today) {
      const { hasService, serviceNames, serviceIcons } = getTodayServiceInfo();
      if (hasService) {
        const icon = serviceIcons[0] || '⛪';
        const names = serviceNames.join(' & ');
        showNotification(
          `${icon} Service Today`,
          `${names} — Prepare your heart for worship.`,
          `service-${today}`
        );
        const newPrefs = { ...prefs, lastServiceNotifyDate: today };
        setPrefs(newPrefs);
        savePrefs(newPrefs);
      }
    }

    // Devotion reminder  
    if (prefs.devotionReminders && prefs.lastDevotionNotifyDate !== today) {
      const msg = getDevotionMessage();
      showNotification(
        'Daily Devotion',
        msg,
        `devotion-${today}`
      );
      const newPrefs = { ...prefs, lastDevotionNotifyDate: today };
      setPrefs(newPrefs);
      savePrefs(newPrefs);
    }
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
