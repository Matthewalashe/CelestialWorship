import { useState } from 'react';
import { Moon, Bell, Type, Download } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../hooks/useNotifications';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ReaderSettingsSheet } from './Reader';
import { HourlyPrayerSettings } from './HourlyPrayerSettings';
import { tr } from '../i18n';

/** One place for how the app looks and when it reminds you */
export function AppSettings() {
  const { theme, setTheme } = useTheme();
  const notif = useNotifications();
  const { canPrompt, isInstalled, isIOS, install } = usePWAInstall();
  const [reading, setReading] = useState(false);

  const row = 'flex items-center gap-3 py-2.5';
  const text = { color: 'var(--color-text-primary)' };
  const muted = { color: 'var(--color-text-muted)' };
  const on = notif.permission === 'granted' && notif.prefs.enabled;

  return (
    <section className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <h2 className="font-semibold mb-1" style={text}>{tr('App settings')}</h2>

      <label className={row}>
        <Moon size={18} style={muted} />
        <span className="flex-1 text-sm" style={text}>{tr('Dark mode')}</span>
        <input type="checkbox" className="w-5 h-5" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} />
      </label>

      <button onClick={() => setReading(true)} className={`${row} w-full text-left`}>
        <Type size={18} style={muted} />
        <span className="flex-1 text-sm" style={text}>{tr('Reading: text size, typeface, paper')}</span>
      </button>

      {notif.isSupported && (
        <div className="py-1">
          {!on ? (
            <button onClick={notif.requestPermission} disabled={notif.permission === 'denied'} className={`${row} w-full text-left disabled:opacity-60`}>
              <Bell size={18} style={muted} />
              <span className="flex-1 text-sm" style={text}>{tr('Service and devotion reminders')}<span className="block text-xs" style={muted}>{notif.permission === 'denied' ? tr('Blocked — allow notifications in your browser settings') : tr('Tap to turn on')}</span>
              </span>
            </button>
          ) : (
            <>
              <label className={row}>
                <Bell size={18} style={muted} />
                <span className="flex-1 text-sm" style={text}>{tr('Before each service')}</span>
                <input type="checkbox" className="w-5 h-5" checked={notif.prefs.serviceReminders} onChange={notif.toggleServiceReminders} />
              </label>
              <label className={row}>
                <span className="w-[18px]" />
                <span className="flex-1 text-sm" style={text}>{tr('Morning call to devotion')}</span>
                <input type="checkbox" className="w-5 h-5" checked={notif.prefs.devotionReminders} onChange={notif.toggleDevotionReminders} />
              </label>
            </>
          )}
          <HourlyPrayerSettings notif={notif} />
        </div>
      )}

      {!isInstalled && (
        <button onClick={canPrompt ? install : undefined} className={`${row} w-full text-left`}>
          <Download size={18} style={muted} />
          <span className="flex-1 text-sm" style={text}>{tr('Install the app')}<span className="block text-xs" style={muted}>{canPrompt ? tr('Works offline, opens like any app') : isIOS ? tr('Share → Add to Home Screen') : tr('Browser menu → Install')}</span>
          </span>
        </button>
      )}

      {reading && <ReaderSettingsSheet onClose={() => setReading(false)} />}
    </section>
  );
}
