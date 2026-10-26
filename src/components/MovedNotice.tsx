import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { tr } from '../i18n';

export const NEW_ORIGIN = 'https://celestialworship.online';
const OLD_HOSTS = ['celestialworship.vercel.app'];

/**
 * Shown only on the old address. Notes, highlights and prayers are kept per web address, so
 * people are asked to carry them over (account backup or backup file) before opening the new one.
 */
export function MovedNotice() {
  if (!OLD_HOSTS.includes(window.location.hostname)) return null;
  const here = `${NEW_ORIGIN}${window.location.pathname}${window.location.search}`;
  return (
    <div role="status" className="px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-2"
         style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-brand) 12%, var(--color-bg-card))', color: 'var(--color-text-primary)' }}>
      <span className="flex-1 min-w-[14rem]">
        <b>{tr('CelestialWorship has moved to celestialworship.online.')}</b>{' '}
        {tr('Your notes, highlights and prayers are kept on this address — back them up first, then restore them there.')}
      </span>
      <Link to="/notes?tab=backup" className="px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: 'var(--color-border)' }}>{tr('Back up')}</Link>
      <a href={here} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1">{tr('Open the new address')} <ArrowRight size={13} /></a>
    </div>
  );
}
