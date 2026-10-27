import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { adminOverview, type AdminOverview } from '../lib/adminOverview';
import { ErrorState } from '../components/CommunityStates';
import { tr } from '../i18n';

/**
 * The admin's view of everything going on in the backend: people, the moderation queue, content, giving and use.
 * One call (admin_overview), refreshed on demand. Built for the desktop, and still readable on a phone.
 */

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };
const ink = { color: 'var(--color-text-primary)' };
const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-GB');
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
const money = (minor: number | null, currency: string) => {
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format((minor ?? 0) / 100); } catch { return `${currency} ${num((minor ?? 0) / 100)}`; }
};
const words = (s: string) => s.replace(/_/g, ' ');

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border p-4" style={card}>
      <p className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>{tr(label)}</p>
      <p className="text-2xl font-bold font-[Outfit] mt-1 tabular-nums" style={ink}>{typeof value === 'number' ? num(value) : value}</p>
      {sub && <p className="text-xs mt-0.5" style={muted}>{sub}</p>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold" style={ink}>{tr(title)}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Counts({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return <p className="text-sm" style={muted}>{tr('Nothing yet')}</p>;
  return (
    <ul className="text-sm divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {rows.map(([k, v]) => (
        <li key={k} className="flex justify-between py-1.5" style={{ borderColor: 'var(--color-border)' }}>
          <span className="capitalize" style={{ color: 'var(--color-text-secondary)' }}>{tr(words(k))}</span>
          <span className="tabular-nums font-semibold" style={ink}>{num(v)}</span>
        </li>
      ))}
    </ul>
  );
}

/** New accounts per day over the last 30 days: one series, one colour, a tooltip on each bar */
function SignupBars({ days }: { days: { day: string; n: number }[] }) {
  const byDay = new Map(days.map(d => [d.day, d.n]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10);
    return { day: d, n: byDay.get(d) ?? 0 };
  });
  const max = Math.max(1, ...series.map(s => s.n));
  const [hover, setHover] = useState<number | null>(null);
  const H = 120, W = 300, bw = W / 30;
  return (
    <figure className="rounded-2xl border p-4 space-y-2" style={card}>
      <figcaption className="flex justify-between text-xs" style={muted}>
        <span>{tr('New accounts per day, last 30 days')}</span>
        <span className="tabular-nums" style={ink}>{hover !== null ? `${new Date(series[hover].day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: ${series[hover].n}` : `${tr('Most in a day')}: ${max}`}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full h-auto" role="img" aria-label={tr('New accounts per day, last 30 days')} onMouseLeave={() => setHover(null)}>
        <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-border)" strokeWidth="1" />
        {series.map((s, i) => {
          const h = (s.n / max) * (H - 6);
          return (
            <g key={s.day} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={H} fill="transparent" />
              {s.n > 0 && <rect x={i * bw + 1} y={H - h} width={bw - 2} height={h} rx="2" fill="var(--color-accent-brand)" opacity={hover === null || hover === i ? 1 : 0.45}><title>{`${s.day}: ${s.n}`}</title></rect>}
            </g>
          );
        })}
        <text x="0" y={H + 12} fontSize="8" fill="var(--color-text-muted)">{new Date(series[0].day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>
        <text x={W} y={H + 12} fontSize="8" textAnchor="end" fill="var(--color-text-muted)">{tr('Today')}</text>
      </svg>
    </figure>
  );
}

export default function Admin() {
  usePageTitle('admin', 'Admin dashboard');
  const { profile, loading } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const load = useCallback(() => {
    setBusy(true); setError(null);
    adminOverview().then(setData).catch(setError).finally(() => setBusy(false));
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  if (loading) return null;
  if (!isAdmin) return <p className="text-center py-16 text-sm" style={muted}>{tr('This page is for the app’s administrators.')}</p>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return <p className="text-center py-16 animate-pulse" style={muted}>{tr('Loading…')}</p>;

  const { people, queue, content, giving, engagement } = data;
  const waiting = Object.values(queue).reduce((a, b) => a + b, 0);

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto pb-24 space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-[Outfit]" style={ink}>{tr('Admin dashboard')}</h1>
          <p className="text-xs mt-0.5" style={muted}>{tr('Updated')} {when(data.generated_at)}</p>
        </div>
        <button onClick={load} disabled={busy} className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl border disabled:opacity-50" style={{ ...card, color: 'var(--color-accent-brand)' }}>
          <RefreshCw size={14} className={busy ? 'animate-spin' : ''} aria-hidden /> {tr('Refresh')}
        </button>
      </header>

      <Section title="People">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Tile label="Accounts" value={people.accounts} sub={`${num(people.confirmed)} ${tr('confirmed')}`} />
          <Tile label="New this week" value={people.new_7d} />
          <Tile label="New this month" value={people.new_30d} />
          <Tile label="Signed in this week" value={people.active_7d} />
          <Tile label="Devices this week" value={engagement.devices_7d} sub={tr('including people without an account')} />
        </div>
        <SignupBars days={people.signups_by_day} />
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4" style={card}><p className="text-xs font-semibold mb-1" style={muted}>{tr('Roles in the app')}</p><Counts data={people.by_role} /></div>
          <div className="rounded-2xl border p-4" style={card}><p className="text-xs font-semibold mb-1" style={muted}>{tr('Who they are in the Church')}</p><Counts data={people.by_member_type} /></div>
        </div>
        <div className="rounded-2xl border overflow-x-auto" style={card}>
          <table className="w-full text-sm min-w-[560px]">
            <caption className="text-left text-xs font-semibold px-4 pt-3" style={muted}>{tr('Newest accounts')}</caption>
            <thead><tr className="text-left text-[11px] uppercase tracking-wider" style={muted}>
              <th className="px-4 py-2 font-semibold">{tr('Name')}</th><th className="px-2 py-2 font-semibold">{tr('Email')}</th>
              <th className="px-2 py-2 font-semibold">{tr('Joined')}</th><th className="px-2 py-2 font-semibold">{tr('Last sign-in')}</th><th className="px-4 py-2 font-semibold">{tr('Role')}</th>
            </tr></thead>
            <tbody>
              {people.recent.map(p => (
                <tr key={p.email + p.created_at} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-2" style={ink}>{p.name ?? '–'}</td>
                  <td className="px-2 py-2" style={{ color: 'var(--color-text-secondary)' }}>{p.email}{!p.confirmed && <span className="ml-1 text-[11px]" style={muted}>({tr('not confirmed')})</span>}</td>
                  <td className="px-2 py-2 tabular-nums" style={muted}>{when(p.created_at)}</td>
                  <td className="px-2 py-2 tabular-nums" style={muted}>{when(p.last_sign_in_at)}</td>
                  <td className="px-4 py-2 capitalize" style={muted}>{tr(words(p.role ?? 'member'))}{p.member_type && p.member_type !== 'laity' ? ` · ${tr(words(p.member_type))}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Waiting for a decision" action={<Link to="/moderate" className="text-sm font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Open the moderation queue')} ›</Link>}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Tile label="In all" value={waiting} />
          <Tile label="Role verifications" value={queue.verifications} />
          <Tile label="Parishes & ministries" value={queue.parishes} />
          <Tile label="Suggested parishes" value={queue.parish_leads} />
          <Tile label="Parish claims" value={queue.parish_claims} />
          <Tile label="Prayer requests" value={queue.prayers} />
          <Tile label="Articles" value={queue.articles} />
          <Tile label="Events" value={queue.events} />
          <Tile label="Reports" value={queue.reports} />
          <Tile label="Hymn translations" value={queue.translations} />
        </div>
      </Section>

      <Section title="In the app">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Parishes" value={content.parishes} sub={`${num(content.parishes_with_map_pin)} ${tr('on the map')}`} />
          <Tile label="Suggested parishes" value={content.parish_leads} />
          <Tile label="Articles" value={content.articles} />
          <Tile label="Prayer requests" value={content.prayer_requests} sub={`${num(content.prayers_said)} ${tr('prayers said')}`} />
          <Tile label="Upcoming events" value={content.events_upcoming} />
          <Tile label="Livestreams" value={content.livestreams} sub={`${num(content.live_now)} ${tr('live now')}`} />
          <Tile label="Appointments" value={content.appointments} />
          <Tile label="Church records" value={content.church_records} />
        </div>
      </Section>

      <Section title="Giving">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(giving.by_currency).filter(([, v]) => v.count > 0).map(([cur, v]) => (
            <Tile key={cur} label={`${tr('Received')} (${cur})`} value={money(v.paid_minor, cur)} sub={`${num(v.count)} ${tr('gifts')}`} />
          ))}
          {!Object.values(giving.by_currency).some(v => v.count > 0) && <Tile label="Received" value={0} sub={tr('Waiting for the payment gateway')} />}
          <Tile label="Open pledges" value={giving.pledges_open} />
          <Tile label="Failed this month" value={giving.failed_30d} />
        </div>
        {giving.recent.length > 0 && (
          <ul className="rounded-2xl border divide-y text-sm" style={card}>
            {giving.recent.map((g, i) => (
              <li key={i} className="flex justify-between gap-3 px-4 py-2" style={{ borderColor: 'var(--color-border)' }}>
                <span style={ink}>{tr(words(g.purpose))} <span className="text-xs" style={muted}>· {g.donor ?? tr('Anonymous')} · {when(g.created_at)}</span></span>
                <span className="tabular-nums" style={ink}>{money(g.amount_minor, g.currency)} <span className="text-xs" style={muted}>{tr(g.status)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Use this week">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Tile label="Devices with reminders" value={engagement.push_devices} />
          <Tile label="Reminders sent" value={engagement.push_sent_7d} />
          <Tile label="Players in the games" value={engagement.game_players_this_week} />
          <Tile label="Saved to libraries" value={engagement.library_items} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4" style={card}><p className="text-xs font-semibold mb-1" style={muted}>{tr('Most used, last 7 days')}</p>
            <Counts data={Object.fromEntries(engagement.top_events_7d.map(e => [e.event, e.n]))} /></div>
          <div className="rounded-2xl border p-4" style={card}><p className="text-xs font-semibold mb-1" style={muted}>{tr('Devices by platform')}</p><Counts data={engagement.platforms_7d} /></div>
        </div>
      </Section>

      <Section title="Elsewhere">
        <ul className="grid md:grid-cols-3 gap-3 text-sm">
          {[['Database and sign-ins', 'https://supabase.com/dashboard/project/cwguzsvmghowmnfkovyx'],
            ['Site, visits and deploys', 'https://vercel.com/dashboard'],
            ['Emails sent', 'https://resend.com/emails']].map(([label, href]) => (
            <li key={href}><a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-2xl border p-4 font-semibold" style={{ ...card, color: 'var(--color-text-primary)' }}>
              {tr(label)} <ExternalLink size={14} style={muted} /></a></li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
