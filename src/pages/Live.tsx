import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, PlayCircle, Radio, Users } from 'lucide-react';
import { useParishes } from '../hooks/useParishes';
import { usePageTitle } from '../hooks/usePageTitle';
import { isLiveNow } from '../components/LiveEmbed';
import { listLivestreams, isStreamLive, myFollows, youTubeId, type Livestream } from '../lib/live';
import { safeHref } from '../utils/safeUrl';
import { tr, trf } from '../i18n';

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

/** The picture on a card: the stream's own YouTube frame, else the parish's cover or logo */
function thumbnail(urls: string[], cover?: string | null, logo?: string | null): string | null {
  for (const u of urls) {
    const id = youTubeId(u);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault_live.jpg`;
  }
  return cover || logo || null;
}

function LiveCard({ to, title, parish, picture, followed }: { to: string; title: string; parish: string; picture: string | null; followed: boolean }) {
  return (
    <li>
      <Link to={to} className="group block rounded-2xl overflow-hidden border transition-transform active:scale-[0.99]" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <span className="relative block aspect-video bg-black overflow-hidden">
          {picture
            ? <img src={picture} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            : <span className="w-full h-full grid place-items-center text-white/70"><Radio size={34} aria-hidden /></span>}
          <span className="absolute left-2 top-2 text-[11px] font-bold text-white px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ backgroundColor: 'var(--color-error)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden /> {tr('LIVE')}
          </span>
        </span>
        <span className="block p-3.5">
          <span className="block font-semibold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(title)}</span>
          <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{parish}{followed ? tr(' · following') : ''}</span>
          <span className="mt-2.5 block text-center py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}>{tr('Join')}</span>
        </span>
      </Link>
    </li>
  );
}

/** Online Church: every service going on right now, one tap to join */
export default function Live() {
  usePageTitle('live', 'Online Church');
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
  // Only parishes confirmed in the directory appear here (and only once the directory has loaded)
  const listedLive = live.filter(s => parish(s.parish_id));
  const byFollow = (a: Livestream, b: Livestream) => Number(follows.includes(b.parish_id)) - Number(follows.includes(a.parish_id));

  const count = listedLive.length + liveParishesOnly.length;

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto pb-24 space-y-8">
      <header>
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Online Church')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {count > 0 ? trf('{n} worshipping live right now. Come in and join them.', { n: count }) : tr('Worship with parishes and shepherds wherever you are.')}
        </p>
      </header>

      {loading ? <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p> : count === 0 ? (
        <div className="rounded-2xl border p-8 text-center space-y-2" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <Users size={28} className="mx-auto" style={{ color: 'var(--color-accent-brand)' }} aria-hidden />
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('No service is live just now')}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{backendReady ? tr('See what is coming up below, or follow a parish to be told when it goes live.') : tr('Livestreams appear here once the church’s online service is set up.')}</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {[...listedLive].sort(byFollow).map(s => {
            const p = parish(s.parish_id);
            return <LiveCard key={s.id} to={`/live/${s.id}`} title={s.title} parish={p?.name ?? ''} followed={follows.includes(s.parish_id)} picture={thumbnail(s.destinations.map(d => d.url), p?.cover_url, p?.logo_url)} />;
          })}
          {liveParishesOnly.map(p => (
            <LiveCard key={p.id} to={`/directory/${p.id}`} title={p.live_title || 'Live service'} parish={p.name} followed={follows.includes(p.id)} picture={thumbnail([p.live_url!], p.cover_url, p.logo_url)} />
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><CalendarClock size={18} aria-hidden />{' '}{tr('Coming up')}</h2>
          <ul className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {[...upcoming].sort(byFollow).map((s, i) => (
              <li key={s.id} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                <Link to={`/live/${s.id}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(s.title)}</span>
                    <span className="block text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {parish(s.parish_id)?.name ?? ''}{follows.includes(s.parish_id) ? tr(' · following') : ''}
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
          <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><PlayCircle size={18} aria-hidden />{' '}{tr('Watch again')}</h2>
          <ul className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {recent.map((s, i) => (
              <li key={s.id} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                <Link to={`/live/${s.id}`} className="block px-4 py-3">
                  <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(s.title)}</span>
                  <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{parish(s.parish_id)?.name ?? ''} · {when(s.started_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
        {tr('Does your parish stream?')}{' '}<Link to="/go-live" className="font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{tr('Open the Live Studio')}</Link>
      </p>
    </div>
  );
}
