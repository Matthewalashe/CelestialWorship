import { useState } from 'react';
import { tr } from '../i18n';

/**
 * "Symbols & practice": real photographs of Celestians at worship (Wikimedia Commons, credited with their
 * licences), and a drawing of the altar until a photograph of a parish altar is added. The emblem is the
 * Church's own artwork: place the official file at public/emblem.png (or .svg) and it appears.
 */

const frame = 'w-full h-auto rounded-2xl';
const ink = 'var(--color-text-primary)';
const paper = 'var(--color-bg-primary)';
const gold = '#B08D2E';

interface PhotoInfo { src: string; alt: string; caption: string; credit: string; license: string; source: string }

function Photo({ p }: { p: PhotoInfo }) {
  return (
    <figure className="space-y-1.5">
      <img src={p.src} alt={tr(p.alt)} loading="lazy" decoding="async" className="w-full h-auto rounded-2xl" style={{ backgroundColor: paper }} />
      <figcaption className="text-[11px] leading-snug" style={{ color: 'var(--color-text-muted)' }}>
        {tr(p.caption)} · {tr('Photo')}: <a href={p.source} target="_blank" rel="noopener noreferrer" className="underline">{p.credit}</a>, {p.license}
      </figcaption>
    </figure>
  );
}

const PHOTOS: Record<string, PhotoInfo> = {
  sutanaMen: { src: '/symbols/sutana-men.jpg', alt: 'Men in plain white sutanas praying with their hands together',
    caption: 'The white sutana, plain, without decoration. Pilgrimage at Seme, 2013', credit: 'Live.philips', license: 'CC BY-SA 3.0',
    source: 'https://commons.wikimedia.org/wiki/File:Praying_member.jpg' },
  sutanaWomen: { src: '/symbols/sutana-women.jpg', alt: 'Women and children in white sutanas and white caps',
    caption: 'Women and children in the white sutana and cap, at a baptism in Cotonou', credit: 'Ferdinand Reus', license: 'CC BY-SA 2.0',
    source: 'https://commons.wikimedia.org/wiki/File:Benin_baptism1.jpg' },
  candles: { src: '/symbols/candles.jpg', alt: 'Worshippers in white praising with raised hands, holding white candles',
    caption: 'White candles only, held in worship', credit: 'Aimtoba', license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Celestialnism_03.jpg' },
  holyWater: { src: '/symbols/holy-water.jpg', alt: 'A white basin of water with lit white candles standing in it, beside bowls of sugar and salt',
    caption: 'A basin of water with lit white candles, sanctified and used in the service, here for a naming ceremony', credit: 'Ovigbedigitals', license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:Materials_used_for_naming_naming_ceremony_in_the_Celestial_Church_of_Christ.jpg' },
};

/** A drawing for now: the altar faces east behind its rail, with seven candle stands */
export function AltarArt() {
  const stands = Array.from({ length: 7 }, (_, i) => 70 + i * 30);
  return (
    <figure className="space-y-1.5">
      <svg viewBox="0 0 320 190" className={frame} role="img" aria-label={tr('The altar faces east, behind a rail, with seven candle stands')} style={{ backgroundColor: paper }}>
        <text x="160" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-text-muted)" letterSpacing="3">{tr('EAST')}</text>
        {/* Seven candle stands with white candles */}
        {stands.map(x => (
          <g key={x}>
            <path d={`M${x} 26c3.5 4.5 4.5 7 4.5 9a4.5 4.5 0 0 1-9 0c0-2 1-4.5 4.5-9Z`} fill={gold} />
            <rect x={x - 3.5} y="40" width="7" height="22" rx="1.2" fill="#FFFFFF" stroke={ink} strokeWidth="1.6" />
            <path d={`M${x - 8} 63h16M${x} 63v34M${x - 9} 97h18`} stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ))}
        {/* Altar table with its white cloth */}
        <rect x="52" y="98" width="216" height="34" rx="3" fill="#FFFFFF" stroke={ink} strokeWidth="2.5" />
        <path d="M52 108h216" stroke={ink} strokeWidth="1.2" opacity="0.35" />
        {/* The rail that separates the altar area */}
        <path d="M20 160h280" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        {Array.from({ length: 13 }, (_, i) => 30 + i * 21.7).map(x => <path key={x} d={`M${x} 160v20`} stroke={ink} strokeWidth="2" strokeLinecap="round" />)}
        <path d="M20 180h280" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      </svg>
      <figcaption className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('A drawing. A photograph of a parish altar will take its place.')}</figcaption>
    </figure>
  );
}

export function SutanaArt() {
  return <div className="grid sm:grid-cols-2 gap-3"><Photo p={PHOTOS.sutanaMen} /><Photo p={PHOTOS.sutanaWomen} /></div>;
}

export function CandlesArt() {
  return <Photo p={PHOTOS.candles} />;
}

export function HolyWaterArt() {
  return <Photo p={PHOTOS.holyWater} />;
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
