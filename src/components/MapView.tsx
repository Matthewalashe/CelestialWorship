import { lazy, Suspense, Component, type ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { tr } from '../i18n';

export interface MapMarker { id: string; lat: number; lng: number; title: string }

export interface MapProps {
  markers?: MapMarker[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** A single pin someone places: tap the map or drag it */
  pin?: { lat: number; lng: number } | null;
  onPin?: (lat: number, lng: number) => void;
  /** The reader's own position */
  me?: { lat: number; lng: number } | null;
  center?: { lat: number; lng: number } | null;
  zoom?: number;
  label: string;
  className?: string;
}

const LeafletMap = lazy(() => import('./LeafletMap'));

/** Without the internet the map can't load; the rest of the page carries on */
class MapBoundary extends Component<{ children: ReactNode; className?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className={`${this.props.className ?? 'h-72'} w-full rounded-2xl flex flex-col items-center justify-center gap-2 text-sm text-center px-6`}
           style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
        <MapPin size={22} aria-hidden />{tr('The map needs an internet connection.')}
      </div>
    );
  }
}

export function MapView(props: MapProps) {
  const placeholder = <div className={`${props.className ?? 'h-72'} w-full rounded-2xl animate-pulse`} style={{ backgroundColor: 'var(--color-bg-card)' }} />;
  return (
    <MapBoundary className={props.className}>
      <Suspense fallback={placeholder}><LeafletMap {...props} /></Suspense>
    </MapBoundary>
  );
}
