import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { tr } from '../i18n';

/**
 * The tiles every hub page uses, so destinations read at a glance: a picture tile where we have a real photograph or
 * illustration, an icon tile (the icon in a soft brand square) where we don't. Both carry a one-line description.
 * One blue and the paper surfaces only: no gradients, no colour-coding.
 */

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
/** The soft square behind an icon: the brand blue at low strength, so it reads in light and dark */
export const iconSquare = { backgroundColor: 'color-mix(in srgb, var(--color-accent-brand) 10%, transparent)', color: 'var(--color-accent-brand)' };

export interface TileItem {
  to: string;
  title: string;
  blurb?: string;
  icon?: React.ReactNode;
  image?: string;
  /** Where the picture is cropped, as CSS object-position */
  focus?: string;
  active?: boolean;
}

export function PictureTile({ item, compact = false }: { item: TileItem; compact?: boolean }) {
  return (
    <Link to={item.to} aria-current={item.active ? 'page' : undefined}
          className="group flex flex-col h-full rounded-2xl overflow-hidden border transition-transform active:scale-[0.98]"
          style={{ ...card, borderColor: item.active ? 'var(--color-accent-brand)' : card.borderColor }}>
      <span className={`block overflow-hidden ${compact ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <img src={item.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
             style={{ objectPosition: item.focus ?? 'center' }} />
      </span>
      <span className={`block flex-1 ${compact ? 'px-3 py-2.5' : 'p-3.5'}`}>
        <span className={`block font-semibold leading-tight ${compact ? 'text-sm' : ''}`} style={{ color: 'var(--color-text-primary)' }}>{tr(item.title)}</span>
        {item.blurb && <span className="block text-xs mt-0.5 leading-snug line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{tr(item.blurb)}</span>}
      </span>
    </Link>
  );
}

export function IconTile({ item, compact = false }: { item: TileItem; compact?: boolean }) {
  return (
    <Link to={item.to} aria-current={item.active ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-2xl border transition-transform active:scale-[0.98] ${compact ? 'p-2.5' : 'p-3.5'}`}
          style={{ ...card, borderColor: item.active ? 'var(--color-accent-brand)' : card.borderColor }}>
      <span className={`shrink-0 grid place-items-center rounded-xl ${compact ? 'w-9 h-9' : 'w-11 h-11'}`} style={iconSquare} aria-hidden>{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{tr(item.title)}</span>
        {item.blurb && <span className="block text-[11px] mt-0.5 leading-snug line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{tr(item.blurb)}</span>}
      </span>
    </Link>
  );
}

/** A full-width row: icon square, title and description, a chevron */
export function IconRow({ item }: { item: TileItem }) {
  return (
    <Link to={item.to} className="flex items-center gap-3.5 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]" style={card}>
      <span className="shrink-0 grid place-items-center w-11 h-11 rounded-xl" style={iconSquare} aria-hidden>{item.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{tr(item.title)}</span>
        {item.blurb && <span className="block text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{tr(item.blurb)}</span>}
      </span>
      <ChevronRight size={18} aria-hidden style={{ color: 'var(--color-text-muted)' }} />
    </Link>
  );
}

/** A heading for a group of tiles, with an optional line under it */
export function TileGroup({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="px-0.5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{tr(title)}</h2>
        {note && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{tr(note)}</p>}
      </div>
      {children}
    </section>
  );
}
