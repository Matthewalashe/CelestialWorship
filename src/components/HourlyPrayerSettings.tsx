import { Clock, CalendarPlus } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { HOURLY_PRAYER_HOURS, hourLabel } from '../utils/dateUtils';
import { downloadHourlyPrayerCalendar } from '../lib/hourlyCalendar';
import { tr } from '../i18n';

/**
 * Reminders for the hourly prayers (Àdúrà Wákàtí) at 9am, 12 noon, 3pm and 6pm: which hours, every hour when
 * praying at home, and alarm-like reminders. The phone's calendar can hold them too, so they ring with the app closed.
 */
export function HourlyPrayerSettings({ notif }: { notif: ReturnType<typeof useNotifications> }) {
  const { prefs, setHourly } = notif;
  const text = { color: 'var(--color-text-primary)' };
  const muted = { color: 'var(--color-text-muted)' };
  const allowed = notif.permission === 'granted' && prefs.enabled;

  const turnOn = async () => {
    if (!allowed && !(await notif.requestPermission())) return;
    setHourly({ hourlyPrayers: true });
  };

  return (
    <div className="space-y-3 py-2">
      <label className="flex items-center gap-3">
        <Clock size={18} style={muted} aria-hidden />
        <span className="flex-1 text-sm" style={text}>{tr('Hourly prayer')} <span lang="yo">(Àdúrà Wákàtí)</span>
          <span className="block text-xs" style={muted}>{tr('9am, 12 noon, 3pm and 6pm, after the morning service')}</span>
        </span>
        <input type="checkbox" className="w-5 h-5" checked={allowed && prefs.hourlyPrayers}
               onChange={e => (e.target.checked ? turnOn() : setHourly({ hourlyPrayers: false }))} />
      </label>

      {allowed && prefs.hourlyPrayers && (
        <div className="pl-[30px] space-y-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Hours')}>
            {HOURLY_PRAYER_HOURS.map(h => {
              const on = prefs.hourlyHours.includes(h);
              return (
                <button key={h} type="button" aria-pressed={on}
                        onClick={() => setHourly({ hourlyHours: on ? prefs.hourlyHours.filter(x => x !== h) : [...prefs.hourlyHours, h].sort((a, b) => a - b) })}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                        style={on ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {tr(hourLabel(h))}
                </button>
              );
            })}
          </div>
          <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" className="mt-1" checked={prefs.hourlyAtHome} onChange={e => setHourly({ hourlyAtHome: e.target.checked })} />
            <span>{tr('I pray at home (personal or family devotion)')}
              <span className="block text-xs" style={muted}>{prefs.hourlyAtHome
                ? tr('Every hour is kept, even when a service is held then.')
                : tr('On service days, the service takes the place of the hourly prayer it covers.')}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" className="mt-1" checked={prefs.hourlyAlarm} onChange={e => setHourly({ hourlyAlarm: e.target.checked })} />
            <span>{tr('Like an alarm')}<span className="block text-xs" style={muted}>{tr('Stays on the screen and keeps buzzing until you open it.')}</span></span>
          </label>
          <button type="button" onClick={() => downloadHourlyPrayerCalendar(prefs.hourlyHours, prefs.hourlyAtHome)} disabled={!prefs.hourlyHours.length}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}>
            <CalendarPlus size={16} aria-hidden /> {tr('Add to my phone’s calendar')}
          </button>
          <p className="text-[11px]" style={muted}>{tr('The calendar rings at each hour even when the app is closed, the surest alarm on any phone.')}</p>
        </div>
      )}
    </div>
  );
}
