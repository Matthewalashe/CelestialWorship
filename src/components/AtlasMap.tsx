import { lazy, Suspense, Component, type ReactNode } from 'react';
import { MapPin as MapPinIcon } from 'lucide-react';
import type { LonLat } from '../data/bibleLands';
import { tr } from '../i18n';

export type MapRegion = 'holyland' | 'world';
export type MapLayer = 'then' | 'now' | 'both';
export interface MapPin { at: LonLat; kind: 'guess' | 'answer' | 'place' | 'hit' | 'miss'; label?: string; id?: string }

export interface AtlasProps {
  region: MapRegion;
  layer: MapLayer;
  pins?: MapPin[];
  /** A dotted path through these points (the journey so far) */
  route?: LonLat[];
  onTap?: (at: LonLat) => void;
  /** A country tapped (ISO 3166 alpha-3), with its name and two-letter code */
  onCountry?: (id: string, info: { name: string; iso2: string | null }) => void;
  /** Countries to colour (right / wrong answers) */
  highlight?: { id: string; tone: 'right' | 'wrong' }[];
  /** Countries shown in the Church's blue (e.g. where there are Celestial parishes), by ISO alpha-3 or English name */
  marked?: string[];
  /** Look at [lon, lat, span in degrees] */
  focus?: [number, number, number];
  /** Fly to a point of interest */
  fly?: { lat: number; lon: number; zoom: number } | null;
  dotsClickable?: boolean;
  onDot?: (id: string) => void;
  showPlaceLabels?: boolean;
  height?: string;
  children?: ReactNode;
}

const LeafletAtlas = lazy(() => import('./LeafletAtlas'));

class Boundary extends Component<{ children: ReactNode; height?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 text-sm text-center px-6"
           style={{ height: this.props.height ?? '60vh', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
        <MapPinIcon size={22} aria-hidden />{tr('The map needs an internet connection.')}
      </div>
    );
  }
}

/** The Bible atlas: the 1884 map of Palestine in the time of Christ, today's world, or both to compare */
export function AtlasMap(props: AtlasProps) {
  return (
    <Boundary height={props.height}>
      <Suspense fallback={<div className="w-full rounded-2xl animate-pulse" style={{ height: props.height ?? '60vh', backgroundColor: 'var(--color-bg-card)' }} />}>
        <LeafletAtlas {...props} />
      </Suspense>
    </Boundary>
  );
}

export function LayerToggle({ layer, onChange }: { layer: MapLayer; onChange: (l: MapLayer) => void }) {
  return (
    <div className="inline-flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={tr('Map style')}>
      {([['then', 'Then'], ['now', 'Now'], ['both', 'Compare']] as const).map(([v, text]) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={layer === v} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={layer === v ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
          {tr(text)}
        </button>
      ))}
    </div>
  );
}
