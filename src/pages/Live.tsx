import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Radio, CalendarClock, PlayCircle } from 'lucide-react';
import { useParishes } from '../hooks/useParishes';
import { usePageTitle } from '../hooks/usePageTitle';
import { LivePlayer, isLiveNow } from '../components/LiveEmbed';
import { listLivestreams, bestEmbed, isStreamLive, myFollows, type Livestream } from '../lib/live';
import { safeHref } from '../utils/safeUrl';

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function Live() {
  usePageTitle('live', 'Live');
  const { parishes, loading, backendReady } = useParishes();
  const [live, setLive] = useState<Livestream[]>([]);
  const [upcoming, setUpcoming] = useState<Livestream[]>([]);
  const [recent, setRecent] = useState<Livestream[]>([]);
  const [follows, setFollows] = useState<string[]>([]);

  const load = useCallback(() => {
    listLivestreams({ live: true }).then(r => setLive((r ?? []).filter(isStreamLive))).catch(() => {});
    listLivestreams({ upcoming: true, limit: 20 }).then(r => setUpcoming(r ?? [])).catch(() => {});
    listLivestreams({ recent: true, limit: 10 }).then(r => setRecent(r ?? [])).catch(() => {});
    myFollows().then(setFollows).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // a page left open notices when a parish goes live
    return () => clearInterval(t);
  }, [load]);

  const parish = useCallback((id: string) => parishes.find(p => p.id === id), [parishes]);
  // Parishes switched "live" without a scheduled broadcast
  const liveParishesOnly = useMemo(() => parishes.filter(p =>
    safeHref(p.live_url) && isLiveNow(p.live_now, p.live_updated_at) && !live.some(s => s.parish_id === p.id)), [parishes, live]);
  // Followed parishes first
  const byFollow = (a: Livestream, b: Livestream) => Number(follows.includes(b.parish_id)) - Number(follows.includes(a.parish_id));

  const nothingLive = live.length === 0 && liveParishesOnly.length === 0;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-8">
      <header>
        <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Radio size={22} style={{ color: '#EF4444' }} /> Live
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Services and ministrations from parishes and shepherds.</p>
      </header>

      {loading ? <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p> : (
        <section className="space-y-5">
          {nothingLive && (
            <p className="text-sm text-center py-8 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
              {backendReady ? 'Nobody is live right now.' : 'Livestreams appear here once the church’s online service is set up.'}
            </p>
          )}
          {[...live].sort(byFollow).map(s => {
            const p = parish(s.parish_id);
            return (
              <div key={s.id}>
                <Link to={`/live/${s.id}`} className="text-sm font-semibold mb-2 inline-block" style={{ color: 'var(--color-text-primary)' }}>{p?.name ?? 'Live'} ›</Link>
                <LivePlayer embed={bestEmbed(s, p?.live_channels)} destinations={s.destinations} title={s.title} live />
              </div>
            );
          })}
          {liveParishesOnly.map(p => (
            <div key={p.id}>
              <Link to={`/directory/${p.id}`} className="text-sm font-semibold mb-2 inline-block" style={{ color: 'var(--color-text-primary)' }}>{p.name} ›</Link>
              <LivePlayer embed={bestEmbed({ destinations: [{ platform: 'other', url: p.live_url! }] }, p.live_channels)}
                          destinations={[{ platform: /youtu/.test(p.live_url!) ? 'youtube' : /facebook/.test(p.live_url!) ? 'facebook' : 'other', url: p.live_url! }]}
                          title={p.live_title || 'Live'} live />
            </div>
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><CalendarClock size={18} /> Coming up</h2>
          <ul className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {[...upcoming].sort(byFollow).map((s, i) => (
              <li key={s.id} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                <Link to={`/live/${s.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.title}</span>
                    <span className="block text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {parish(s.parish_id)?.name ?? ''}{follows.includes(s.parish_id) ? ' · following' : ''}
                    </span>
                  </span>
                  <span className="text-xs text-right shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{when(s.scheduled_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><PlayCircle size={18} /> Watch again</h2>
          <ul className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {recent.map((s, i) => (
              <li key={s.id} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                <Link to={`/live/${s.id}`} className="block px-4 py-3">
                  <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.title}</span>
                  <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{parish(s.parish_id)?.name ?? ''} · {when(s.started_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
