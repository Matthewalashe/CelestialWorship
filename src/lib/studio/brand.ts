import type { LogoCorner } from './compositor';

/** A saved look for the stream, one tap to bring back: logo, colour and the usual words. Kept on this computer. */

export interface BrandKit {
  id: string;
  name: string;
  accent: string;
  logo: string | null;
  logoKind: 'image' | 'video';
  corner: LogoCorner;
  ticker: string;
  banner: string;
  boxText: string;
  personName: string;
  personTitle: string;
}

export const ACCENTS: { name: string; color: string }[] = [
  { name: 'Gold', color: '#E8C36A' }, { name: 'White', color: '#FFFFFF' }, { name: 'Sky blue', color: '#7CB7F2' },
  { name: 'Green', color: '#6FCF97' }, { name: 'Rose', color: '#F2A0B0' }, { name: 'Lilac', color: '#C9B1F2' },
];

const KEY = 'cw-studio-brand-kits';
const CORNERS: LogoCorner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export function loadKits(): BrandKit[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(list)) return [];
    return list.filter(k => k && typeof k.id === 'string' && typeof k.name === 'string').map(k => ({
      id: k.id,
      name: text(k.name, 60),
      accent: ACCENTS.some(a => a.color === k.accent) ? k.accent : ACCENTS[0].color,
      // A picture picked without an account lasted only until the page closed
      logo: typeof k.logo === 'string' && /^https:/.test(k.logo) ? k.logo : null,
      logoKind: k.logoKind === 'video' ? 'video' : 'image',
      corner: CORNERS.includes(k.corner) ? k.corner : 'top-right',
      ticker: text(k.ticker, 240), banner: text(k.banner, 120), boxText: text(k.boxText, 200),
      personName: text(k.personName, 60), personTitle: text(k.personTitle, 80),
    }));
  } catch { return []; }
}

export function saveKits(kits: BrandKit[]) {
  try { localStorage.setItem(KEY, JSON.stringify(kits)); } catch {}
}
