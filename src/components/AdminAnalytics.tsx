import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminAnalytics, type AdminAnalytics as Data, type Counts, type DayRow } from '../lib/adminOverview';
import { ErrorState } from './CommunityStates';
import { tr } from '../i18n';

/**
 * The analytics part of the admin dashboard: the app's anonymous events (hooks/useAnalytics) over 7, 30 or 90 days.
 * One colour throughout; every bar shows its value on hover or tap, and every chart has its numbers beside it.
 */

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };
const ink = { color: 'var(--color-text-primary)' };
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-GB');
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const shortDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** A single-series bar chart: bars rise from the baseline, the hovered bar's value reads out above */
export function Bars({ series, caption, endLabel }: { series: { label: string; n: number }[]; caption: string; endLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map(s => s.n));
  const total = series.reduce((a, s) => a + s.n, 0);
  const H = 110, W = 300, bw = W / Math.max(1, series.length);
  return (
    <figure className="rounded-2xl border p-4 space-y-2" style={card}>
      <figcaption className="flex justify-between gap-2 text-xs" style={muted}>
        <span>{tr(caption)}</span>
        <span className="tabular-nums shrink-0" style={ink}>{hover !== null ? `${series[hover].label}: ${num(series[hover].n)}` : `${tr('Total')}: ${num(total)}`}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full h-auto" role="img" aria-label={tr(caption)} onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-border)" strokeWidth="1" />
        {series.map((s, i) => {
          const h = (s.n / max) * (H - 6);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={H} fill="transparent" />
              {s.n > 0 && (
                <rect x={i * bw + Math.min(1, bw * 0.1)} y={H - h} width={Math.max(1, bw - Math.min(2, bw * 0.2))} height={h} rx="2"
                      fill="var(--color-accent-brand)" opacity={hover === null || hover === i ? 1 : 0.45}>
                  <title>{`${s.label}: ${s.n}`}</title>
                </rect>
              )}
            </g>
          );
        })}
        <text x="0" y={H + 12} fontSize="8" fill="var(--color-text-muted)">{series[0]?.label}</text>
        <text x={W} y={H + 12} fontSize="8" textAnchor="end" fill="var(--color-text-muted)">{endLabel ?? series[series.length - 1]?.label}</text>
      </svg>
    </figure>
  );
}

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={card}>
      <p className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>{tr(label)}</p>
      <p className="text-2xl font-bold font-[Outfit] mt-1 tabular-nums" style={ink}>{typeof value === 'number' ? num(value) : value}</p>
      {sub && <p className="text-xs mt-0.5" style={muted}>{sub}</p>}
    </div>
  );
}

/** A ranked list with a thin bar behind each count, so the share of each row reads at a glance */
function Ranked({ title, data, limit = 10 }: { title: string; data: Counts | { label: string; n: number; sub?: string }[]; limit?: number }) {
  const rows = (Array.isArray(data) ? data : Object.entries(data).map(([label, n]) => ({ label, n, sub: undefined as string | undefined })))
    .sort((a, b) => b.n - a.n).slice(0, limit);
  const max = Math.max(1, ...rows.map(r => r.n));
  return (
    <div className="rounded-2xl border p-4" style={card}>
      <p className="text-xs font-semibold mb-2" style={muted}>{tr(title)}</p>
      {rows.length === 0 ? <p className="text-sm" style={muted}>{tr('Nothing yet')}</p> : (
        <ul className="space-y-1.5 text-sm">
          {rows.map(r => (
            <li key={r.label} className="relative">
              <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.n / max) * 100}%`, backgroundColor: 'var(--color-accent-brand)', opacity: 0.1 }} />
              <span className="relative flex justify-between gap-3 px-1.5 py-0.5">
                <span className="truncate" style={{ color: 'var(--color-text-secondary)' }} title={r.label}>{r.label}{r.sub && <span style={muted}> · {r.sub}</span>}</span>
                <span className="tabular-nums font-semibold shrink-0" style={ink}>{num(r.n)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const METRICS: { id: keyof Omit<DayRow, 'day'>; label: string }[] = [
  { id: 'active', label: 'Active devices' },
  { id: 'new_devices', label: 'New devices' },
  { id: 'sessions', label: 'Visits' },
  { id: 'views', label: 'Screens viewed' },
  { id: 'installs', label: 'Installs' },
];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EVENT_NAMES: Record<string, string> = {
  first_open: 'First opened', activity: 'Daily activity', game_finished: 'Game rounds finished', postcard: 'Postcards collected',
  share: 'Shares', language_changed: 'Language changed', reminders_permission: 'Reminders asked', sign_in: 'Sign-ins', sign_up: 'Sign-ups',
  prayer_request: 'Prayer requests sent', giving_started: 'Giving started', install_offered: 'Install offered', install_prompt: 'Install prompt answered',
  install_banner_dismissed: 'Install banner closed', app_installed: 'Installed', pwa_first_launch: 'First launch as an app',
};

export function AnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<(typeof METRICS)[number]['id']>('active');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true); setError(null);
    adminAnalytics(days).then(setData).catch(setError).finally(() => setBusy(false));
  }, [days]);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="space-y-4" aria-labelledby="analytics">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="analytics" className="font-semibold" style={ink}>{tr('Analytics')}</h2>
        <div className="flex items-center gap-1" role="group" aria-label={tr('Period')}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={days === d} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={days === d ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { ...card, color: 'var(--color-text-secondary)' }}>
              {d} {tr('days')}
            </button>
          ))}
          <button onClick={load} disabled={busy} aria-label={tr('Refresh')} className="p-2 rounded-xl disabled:opacity-50" style={{ color: 'var(--color-accent-brand)' }}>
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? <ErrorState error={error} onRetry={load} /> : !data ? <p className="py-10 text-center animate-pulse text-sm" style={muted}>{tr('Loading…')}</p> : (() => {
        const t = data.totals, ins = data.installs, b = data.breakdown;
        const series = data.daily.map(d => ({ label: shortDay(d.day), n: d[metric] }));
        const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, n: data.hours_lagos.find(x => x.hour === h)?.n ?? 0 }));
        const week = WEEKDAYS.map((w, i) => ({ label: tr(w), n: data.weekdays_lagos.find(x => x.dow === i + 1)?.n ?? 0 }));
        const installedTotal = Math.max(ins.installed, ins.first_launches);
        return (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile label="Devices" value={t.devices} sub={`${num(t.new_devices)} ${tr('new')} · ${num(t.returning_devices)} ${tr('returning')}`} />
              <Tile label="Visits" value={t.sessions} sub={`${t.sessions ? (t.views / t.sessions).toFixed(1) : '0'} ${tr('screens per visit')}`} />
              <Tile label="Screens viewed" value={t.views} />
              <Tile label="Use the installed app" value={t.installed_devices} sub={`${pct(t.installed_devices, t.devices)} ${tr('of devices')}`} />
              <Tile label="Installs (downloads)" value={installedTotal} sub={tr('installed, or first opened as an app')} />
              <Tile label="Came back the next week" value={pct(data.retention.returned, data.retention.cohort)} sub={`${num(data.retention.returned)} ${tr('of')} ${num(data.retention.cohort)} ${tr('new devices')}`} />
              <Tile label="Devices ever" value={t.devices_all_time} />
              <Tile label="Errors" value={data.errors.count} sub={`${num(data.errors.devices)} ${tr('devices')}`} />
            </div>

            <div className="space-y-2">
              <div className="flex gap-1 overflow-x-auto hide-scrollbar" role="tablist">
                {METRICS.map(m => (
                  <button key={m.id} role="tab" aria-selected={metric === m.id} onClick={() => setMetric(m.id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                          style={metric === m.id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { ...card, color: 'var(--color-text-secondary)' }}>
                    {tr(m.label)}
                  </button>
                ))}
              </div>
              <Bars series={series} caption={`${METRICS.find(m => m.id === metric)!.label} per day`} endLabel={tr('Today')} />
            </div>

            <div className="rounded-2xl border p-4 space-y-2" style={card}>
              <p className="text-xs font-semibold" style={muted}>{tr('Installing the app')}</p>
              <ol className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[['Opened the install page', ins.install_page_views], ['Browser offered to install', ins.offered],
                  ['Accepted the offer', ins.prompt_accepted], ['Declined the offer', ins.prompt_dismissed],
                  ['Closed the install banner', ins.banner_dismissed], ['Installed (Android, computers)', ins.installed],
                  ['First opened as an app (all, iPhone too)', ins.first_launches]].map(([label, n]) => (
                  <li key={label as string}><p className="text-xs" style={muted}>{tr(label as string)}</p><p className="text-lg font-bold tabular-nums" style={ink}>{num(n as number)}</p></li>
                ))}
              </ol>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Ranked title="Most viewed screens" data={data.screens.map(s => ({ label: s.path, n: s.views, sub: `${num(s.devices)} ${tr('devices')}` }))} limit={15} />
              <Ranked title="What people do" data={data.actions.map(a => ({ label: tr(EVENT_NAMES[a.event] ?? a.event), n: a.n, sub: `${num(a.devices)} ${tr('devices')}` }))} limit={15} />
              <Ranked title="Daily activity" data={data.activities} />
              <Ranked title="Games finished" data={data.games} />
              <Ranked title="Where visits come from" data={b.referrer ?? {}} />
              <Ranked title="Campaigns" data={{ ...(b.utm_source ?? {}) }} />
              <Ranked title="Language of the app" data={b.language ?? {}} />
              <Ranked title="Region (time zone)" data={b.timezone ?? {}} limit={12} />
              <Ranked title="Devices by platform" data={data.platforms} />
              <Ranked title="Installed app or browser" data={b.display ?? {}} />
              <Ranked title="Screen size" data={b.screen ?? {}} />
              <Ranked title="Light or dark" data={b.theme ?? {}} />
              <Ranked title="Shared from" data={data.shares} />
              <Ranked title="Language switched to" data={data.languages_changed} />
              <Ranked title="App version" data={b.version ?? {}} />
              <Ranked title="Installs by platform" data={ins.by_platform} />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Bars series={hours} caption="Busiest hours (Lagos time)" />
              <Bars series={week} caption="Busiest days" />
            </div>

            <div className="rounded-2xl border p-4" style={card}>
              <p className="text-xs font-semibold mb-2" style={muted}>{tr('Most frequent errors')}</p>
              {data.errors.top.length === 0 ? <p className="text-sm" style={muted}>{tr('No errors in this period')}</p> : (
                <ul className="text-sm divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {data.errors.top.map(e => (
                    <li key={e.message} className="py-2" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="font-mono text-xs break-words" style={ink}>{e.message}</p>
                      <p className="text-xs" style={muted}>{num(e.n)}× · {e.path ?? ''} · {tr('last')} {new Date(e.last).toLocaleString('en-GB')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[11px]" style={muted}>{tr('Counts are anonymous: each device has a random id, and no names, emails or notes are sent. Visits from before this update only counted a few screens.')}</p>
          </>
        );
      })()}
    </section>
  );
}
