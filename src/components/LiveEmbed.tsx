import { ExternalLink, Radio } from 'lucide-react';
import { PLATFORMS, type Destination } from '../lib/live';
import { safeHref } from '../utils/safeUrl';
import { tr } from '../i18n';

/** A "live" flag older than this is treated as stale (someone forgot to switch it off) */
const LIVE_STALE_MS = 6 * 3_600_000;

export function isLiveNow(liveNow?: boolean, updatedAt?: string | null): boolean {
  if (!liveNow) return false;
  return !updatedAt || Date.now() - new Date(updatedAt).getTime() < LIVE_STALE_MS;
}

/**
 * The player for a broadcast: plays inside the app where the platform allows it (YouTube, Facebook),
 * and lists every platform it is on so people can watch where they like.
 */
export function LivePlayer({ embed, destinations, title, live }: { embed: string | null; destinations: Destination[]; title: string; live: boolean }) {
  const links = destinations.filter(d => safeHref(d.url));
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: live ? 'var(--color-error)' : 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
      {embed && (
        <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe className="absolute inset-0 w-full h-full" src={embed} title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      )}
      <div className="px-4 py-3 flex items-center gap-2">
        {live ? <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-error)' }}><Radio size={14} />{' '}{tr('LIVE')}</span>
              : <Radio size={14} style={{ color: 'var(--color-text-muted)' }} />}
        <span className="flex-1 truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
      </div>
      {links.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {links.map(d => (
            <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-full border inline-flex items-center gap-1"
               style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              {PLATFORMS[d.platform]?.label ?? tr('Watch')} <ExternalLink size={11} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
