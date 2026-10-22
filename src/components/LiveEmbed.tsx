import { ExternalLink, Radio } from 'lucide-react';

/** YouTube video/live IDs from the URL shapes people paste */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]{6,})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

/** A "live" flag older than this is treated as stale (someone forgot to switch it off) */
const LIVE_STALE_MS = 6 * 3_600_000;

export function isLiveNow(liveNow?: boolean, updatedAt?: string | null): boolean {
  if (!liveNow) return false;
  return !updatedAt || Date.now() - new Date(updatedAt).getTime() < LIVE_STALE_MS;
}

export function LiveEmbed({ url, title, live }: { url: string; title?: string | null; live: boolean }) {
  const id = youTubeId(url);
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: live ? '#EF4444' : 'var(--color-border)' }}>
      {id ? (
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            title={title || 'Livestream'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : null}
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-3 text-sm font-semibold"
         style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
        {live ? <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#EF4444' }}><Radio size={14} /> LIVE</span>
              : <Radio size={14} style={{ color: 'var(--color-text-muted)' }} />}
        <span className="flex-1 truncate">{title || (live ? 'Watch now' : 'Livestream channel')}</span>
        <ExternalLink size={14} style={{ color: 'var(--color-text-muted)' }} />
      </a>
    </div>
  );
}
