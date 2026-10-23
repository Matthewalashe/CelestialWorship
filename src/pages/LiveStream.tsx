import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, HandCoins } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useParishes } from '../hooks/useParishes';
import { LivePlayer } from '../components/LiveEmbed';
import { FollowButton } from '../components/FollowButton';
import { ShareRow } from '../components/ShareRow';
import { ErrorState, type Loadable } from '../components/CommunityStates';
import { getLivestream, bestEmbed, isStreamLive, shareMessage, streamLink, type Livestream } from '../lib/live';
import { parishCanReceive } from '../lib/payments';
import { downloadIcs } from '../utils/churchCalendar';

export default function LiveStream() {
  const { id } = useParams<{ id: string }>();
  const { parishes } = useParishes();
  const [state, setState] = useState<Loadable<Livestream | null>>({ status: 'loading' });
  const [canGive, setCanGive] = useState(false);
  const stream = state.status === 'ready' ? state.data : null;
  usePageTitle('live', stream?.title ?? 'Live');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const s = await getLivestream(id);
      setState({ status: 'ready', data: s });
      if (s) parishCanReceive(s.parish_id).then(setCanGive);
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [id]);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // notice when a scheduled broadcast goes live
    return () => clearInterval(t);
  }, [load]);

  if (state.status === 'loading') return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;
  if (!stream) {
    return (
      <div className="text-center py-16 px-4">
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>This broadcast isn’t available.</p>
        <Link to="/live" className="btn-primary px-5 py-2 rounded-xl text-sm">Live</Link>
      </div>
    );
  }

  const parish = parishes.find(p => p.id === stream.parish_id);
  const name = parish?.name ?? 'The parish';
  const live = isStreamLive(stream);
  const ended = stream.status === 'ended' || (stream.status === 'live' && !live);
  const start = stream.scheduled_at ?? stream.started_at;

  const addToCalendar = () => start && downloadIcs({
    id: stream.id, title: `${stream.title} — ${name}`, description: `${stream.description ?? ''}\n${streamLink(stream.id)}`.trim(),
    category: 'service', location: streamLink(stream.id), starts_at: start, ends_at: null, all_day: false,
    parish_id: stream.parish_id, scope: 'parish', contact: null, status: 'published', submitted_by: null,
  });

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-5">
      <Link to="/live" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ Live</Link>

      {stream.status === 'scheduled' ? (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>Starts</p>
          <p className="text-xl font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {start ? new Date(start).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : 'Soon'}
          </p>
          {start && (
            <button onClick={addToCalendar} className="mt-3 text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: 'var(--color-accent-brand)' }}>
              <CalendarPlus size={15} /> Add to my calendar
            </button>
          )}
        </div>
      ) : (
        <LivePlayer embed={bestEmbed(stream, ended ? null : parish?.live_channels)} destinations={stream.destinations} title={stream.title} live={live} />
      )}

      <div>
        <h1 className="text-xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{stream.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <Link to={`/directory/${stream.parish_id}`} className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--color-text-secondary)' }}>{name}</Link>
          <FollowButton parishId={stream.parish_id} name={name} />
        </div>
        {stream.description && <p className="text-sm mt-3 whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{stream.description}</p>}
      </div>

      {canGive && (
        <Link to={`/give?parish=${stream.parish_id}&purpose=offering&source=livestream&id=${stream.id}`}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2">
          <HandCoins size={18} /> Give an offering
        </Link>
      )}

      <ShareRow text={shareMessage(name, stream)} url={streamLink(stream.id)} />
    </div>
  );
}
