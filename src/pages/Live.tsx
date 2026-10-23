import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useParishes } from '../hooks/useParishes';
import { usePageTitle } from '../hooks/usePageTitle';
import { LiveEmbed, isLiveNow } from '../components/LiveEmbed';
import { safeHref } from '../utils/safeUrl';

export default function Live() {
  usePageTitle('live', 'Live services');
  const { parishes, loading, backendReady, refresh } = useParishes();

  const { live, channels } = useMemo(() => {
    const withStreams = parishes.filter(p => safeHref(p.live_url));
    return {
      live: withStreams.filter(p => isLiveNow(p.live_now, p.live_updated_at)),
      channels: withStreams.filter(p => !isLiveNow(p.live_now, p.live_updated_at)),
    };
  }, [parishes]);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <Radio size={22} style={{ color: '#EF4444' }} /> Live
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Services and ministrations streaming from parishes and shepherds.</p>
        </div>
        <button onClick={refresh} className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>Refresh</button>
      </header>

      {loading ? <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p> : (
        <>
          {live.length === 0 ? (
            <p className="text-sm text-center py-8 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
              {backendReady ? 'Nobody is live right now.' : 'Livestreams appear here once the church’s online service is set up.'}
            </p>
          ) : (
            <section className="space-y-4">
              {live.map(p => (
                <div key={p.id}>
                  <Link to={`/directory/${p.id}`} className="text-sm font-semibold mb-2 inline-block" style={{ color: 'var(--color-text-primary)' }}>{p.name}</Link>
                  <LiveEmbed url={p.live_url!} title={p.live_title} live />
                </div>
              ))}
            </section>
          )}

          {channels.length > 0 && (
            <section>
              <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Channels</h2>
              <ul className="space-y-2">
                {channels.map(p => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border p-3"
                      style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                    <Link to={`/directory/${p.id}`} className="flex-1 min-w-0">
                      <span className="block font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{p.name}</span>
                      <span className="block text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{p.kind === 'ministry' ? 'Ministry' : p.city ?? p.country}</span>
                    </Link>
                    <a href={p.live_url!} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Open</a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
