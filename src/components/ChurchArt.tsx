import { useState } from 'react';
import { tr } from '../i18n';

/**
 * Illustrations for "Symbols & practice": the altar, the white garment, candles, holy water and the
 * colours of the robes. Drawn simply, in the theme's colours. The emblem is the Church's own artwork:
 * place the official file at public/emblem.png (or .svg) and it appears; nothing is drawn in its place.
 */

const frame = 'w-full h-auto rounded-2xl';
const ink = 'var(--color-text-primary)';
const paper = 'var(--color-bg-primary)';
const gold = '#C9A227';

export function AltarArt() {
  return (
    <svg viewBox="0 0 320 180" className={frame} role="img" aria-label={tr('The altar faces east, behind a rail, with the cross and white candles')} style={{ backgroundColor: paper }}>
      {/* East: the light the altar faces */}
      <defs>
        <radialGradient id="east" cx="50%" cy="10%" r="70%"><stop offset="0" stopColor={gold} stopOpacity="0.35" /><stop offset="1" stopColor={gold} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#east)" />
      <text x="160" y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill={gold} letterSpacing="3">{tr('EAST')}</text>
      {/* Cross */}
      <path d="M160 34v52M144 48h32" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      {/* Altar table, white cloth */}
      <rect x="70" y="90" width="180" height="34" rx="4" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
      <path d="M70 100h180" stroke={ink} strokeWidth="1.2" opacity="0.4" />
      {/* Candles: white only */}
      {[92, 120, 200, 228].map(x => (
        <g key={x}>
          <rect x={x - 4} y="62" width="8" height="28" rx="1.5" fill="#FFFFFF" stroke={ink} strokeWidth="2" />
          <path d={`M${x} 48c4 5 5 8 5 10a5 5 0 0 1-10 0c0-2 1-5 5-10Z`} fill={gold} />
        </g>
      ))}
      {/* The rail that separates the altar area */}
      <path d="M24 150h272" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {Array.from({ length: 12 }, (_, i) => 36 + i * 22.5).map(x => <path key={x} d={`M${x} 150v20`} stroke={ink} strokeWidth="2" strokeLinecap="round" />)}
      <path d="M24 170h272" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SutanaArt() {
  return (
    <svg viewBox="0 0 320 180" className={frame} role="img" aria-label={tr('The white garment (sutana)')} style={{ backgroundColor: paper }}>
      <path d="M140 22h40l34 16 22 62-20 8-18-40 6 104H116l6-104-18 40-20-8 22-62Z" fill="#FFFFFF" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M148 22a12 12 0 0 0 24 0" fill="none" stroke={ink} strokeWidth="3" />
      <path d="M160 48v26M150 58h20" stroke={gold} strokeWidth="5" strokeLinecap="round" />
      <text x="160" y="176" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">{tr('Worn barefoot within the church')}</text>
    </svg>
  );
}

export function CandlesArt() {
  return (
    <svg viewBox="0 0 320 180" className={frame} role="img" aria-label={tr('White candles only')} style={{ backgroundColor: paper }}>
      {[70, 125, 180, 235].map((x, i) => (
        <g key={x}>
          <ellipse cx={x + 7} cy="58" rx="16" ry="20" fill={gold} opacity="0.18" />
          <path d={`M${x + 7} 36c6 7 8 11 8 14a8 8 0 0 1-16 0c0-3 2-7 8-14Z`} fill={gold} />
          <rect x={x} y="64" width="14" height={80 - i * 8} rx="2" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
        </g>
      ))}
      <path d="M50 150h220" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function HolyWaterArt() {
  return (
    <svg viewBox="0 0 320 180" className={frame} role="img" aria-label={tr('Holy water by the door')} style={{ backgroundColor: paper }}>
      <path d="M160 26s-46 50-46 84a46 46 0 0 0 92 0c0-34-46-84-46-84Z" fill="#DBEAFE" stroke={ink} strokeWidth="3" />
      <path d="M160 86v46M142 104h36" stroke="#1D4ED8" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

const COLOURS: { name: string; hex: string; meaning: string }[] = [
  { name: 'White', hex: '#FFFFFF', meaning: 'The garment of worship' },
  { name: 'Blue', hex: '#1D4ED8', meaning: 'Prophet line loins; many robes' },
  { name: 'Purple', hex: '#7E22CE', meaning: 'Senior robes; cross-bar strands' },
  { name: 'Pink', hex: '#F472B6', meaning: 'Robes of some senior ranks' },
  { name: 'Green', hex: '#15803D', meaning: 'Robes of some senior ranks' },
  { name: 'Grey', hex: '#6B7280', meaning: 'Robes of some senior ranks' },
  { name: 'Yellow', hex: '#EAB308', meaning: 'Robes; cross-bar strands' },
];

export function ColoursArt() {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {COLOURS.map(c => (
        <li key={c.name} className="flex items-center gap-3 rounded-xl p-2.5" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <span className="w-9 h-9 rounded-lg shrink-0 border" style={{ backgroundColor: c.hex, borderColor: 'var(--color-border)' }} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(c.name)}</span>
            <span className="block text-[11px] leading-tight" style={{ color: 'var(--color-text-muted)' }}>{tr(c.meaning)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The official emblem, when the Church's artwork has been added to the app */
export function EmblemArt() {
  const [src, setSrc] = useState<string | null>('/emblem.png');
  if (!src) {
    return (
      <div className="rounded-2xl p-5 text-center text-sm border border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
        {tr('The official emblem appears here once the Church’s artwork is added.')}
      </div>
    );
  }
  return (
    <img src={src} alt={tr('The emblem of the Celestial Church of Christ')} className="mx-auto max-h-48 w-auto rounded-2xl"
         onError={() => setSrc(s => (s === '/emblem.png' ? '/emblem.svg' : null))} />
  );
}

/** Which illustration belongs to which entry of ASSETS (src/data/ranks.ts) */
export const ART_FOR: Record<string, () => React.ReactElement> = {
  'The emblem': EmblemArt,
  'White garment (sutana)': SutanaArt,
  'The altar': AltarArt,
  Candles: CandlesArt,
  'Holy water and sanctification': HolyWaterArt,
  Colours: ColoursArt,
};
