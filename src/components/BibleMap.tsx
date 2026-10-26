import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { createJsonResource } from '../lib/jsonResource';
import { NT_REGIONS, OLD_MAP_LABELS, type LonLat } from '../data/bibleLands';
import { tr } from '../i18n';

/**
 * Maps of the Bible lands drawn as SVG from Natural Earth data (scripts/build_maps.py).
 * "then" is an old parchment map with the regions of Jesus' day; "now" shows today's countries;
 * "both" lays today's borders over the old map.
 */

export type MapRegion = 'holyland' | 'world';
export type MapLayer = 'then' | 'now' | 'both';

interface MapData {
  region: MapRegion;
  source: string;
  projection: { west: number; north: number; k: number; cos: number };
  width: number; height: number;
  countries: { id: string; name: string; d: string; label: [number, number] }[];
  lakes: { name: string; d: string }[];
  rivers: { name: string; d: string }[];
}

const resources = {
  holyland: createJsonResource<MapData, MapData>('/data/maps/holyland.json', 'the map', d => d),
  world: createJsonResource<MapData, MapData>('/data/maps/world.json', 'the map', d => d),
};

export function project(map: MapData['projection'], [lon, lat]: LonLat): [number, number] {
  return [(lon - map.west) * map.k * map.cos, (map.north - lat) * map.k];
}
export function unproject(map: MapData['projection'], [x, y]: [number, number]): LonLat {
  return [x / (map.k * map.cos) + map.west, map.north - y / map.k];
}

export interface MapPin { at: LonLat; kind: 'guess' | 'answer' | 'place' | 'hit' | 'miss'; label?: string; id?: string }

const PALETTE = {
  now: { sea: '#B9DCEE', land: '#F7F5EF', border: '#9AA3AE', coast: '#7FA7BF', text: '#334155', river: '#5B9BC4', regionText: '#64748B' },
  then: { sea: '#D9C79B', land: '#F2E4C1', border: '#8B6B3E', coast: '#6B4F2A', text: '#4A3620', river: '#7A8F9A', regionText: '#7C2D12' },
};
const REGION_TINTS = ['#C2410C', '#15803D', '#A16207', '#7E22CE', '#0E7490', '#B91C1C', '#4D7C0F', '#9D174D', '#57534E'];

type View = { x: number; y: number; w: number; h: number };

export function BibleMap({
  region, layer, pins = [], route, onTap, onCountry, highlight = [], focus, dotsClickable = false, onDot,
  showPlaceLabels = true, height = '60vh', children,
}: {
  region: MapRegion;
  layer: MapLayer;
  pins?: MapPin[];
  /** A dotted path through these points (the journey so far) */
  route?: LonLat[];
  onTap?: (at: LonLat) => void;
  onCountry?: (id: string) => void;
  /** Country ids to colour (right / wrong answers) */
  highlight?: { id: string; tone: 'right' | 'wrong' }[];
  /** Zoom to [lon, lat, span in degrees] */
  focus?: [number, number, number];
  dotsClickable?: boolean;
  onDot?: (id: string) => void;
  showPlaceLabels?: boolean;
  height?: string;
  children?: ReactNode;
}) {
  const { data, error } = resources[region].useResource(null as unknown as MapData);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [pxPerUnit, setPxPerUnit] = useState(1);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean; view: View }[]>([]);
  const pinch = useRef<{ dist: number; view: View; mid: [number, number] } | null>(null);

  const full: View | null = data ? { x: 0, y: 0, w: data.width, h: data.height } : null;

  // Reset or focus when the map or the focus changes
  const focusKey = focus?.join(',');
  useEffect(() => {
    if (!data) return;
    if (focus) {
      const [cx, cy] = project(data.projection, [focus[0], focus[1]]);
      const w = focus[2] * data.projection.k * data.projection.cos;
      const h = w * (data.height / data.width);
      setView({ x: cx - w / 2, y: cy - h / 2, w, h });
    } else {
      setView({ x: 0, y: 0, w: data.width, h: data.height });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focusKey stands for focus
  }, [data, focusKey]);

  // Keep labels and pins the same size on screen at any zoom
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !view) return;
    const update = () => setPxPerUnit(el.clientWidth / view.w || 1);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const u = 1 / pxPerUnit; // one screen pixel in map units

  const clampView = (v: View): View => {
    if (!full) return v;
    const w = Math.min(Math.max(v.w, full.w / 40), full.w * 1.2);
    const h = w * (v.h / v.w);
    const x = Math.min(Math.max(v.x, -w * 0.3), full.w - w * 0.7);
    const y = Math.min(Math.max(v.y, -h * 0.3), full.h - h * 0.7);
    return { x, y, w, h };
  };

  const toMap = (clientX: number, clientY: number): [number, number] => {
    const el = svgRef.current!;
    const pt = el.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return [p.x, p.y];
  };

  const zoomAt = (factor: number, center?: [number, number]) => {
    if (!view) return;
    const [cx, cy] = center ?? [view.x + view.w / 2, view.y + view.h / 2];
    setView(clampView({ x: cx - (cx - view.x) * factor, y: cy - (cy - view.y) * factor, w: view.w * factor, h: view.h * factor }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!view) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = [...drag.current.filter(d => d.id !== e.pointerId), { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, view }];
    if (drag.current.length === 2) {
      const [a, b] = drag.current;
      const am = toMap(a.x, a.y), bm = toMap(b.x, b.y);
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view, mid: [(am[0] + bm[0]) / 2, (am[1] + bm[1]) / 2] };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current.find(x => x.id === e.pointerId);
    if (!d || !view) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;
    if (pinch.current && drag.current.length === 2) {
      const other = drag.current.find(x => x.id !== e.pointerId)!;
      const dist = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      const f = pinch.current.dist / Math.max(dist, 1);
      const pv = pinch.current.view, [mx, my] = pinch.current.mid;
      setView(clampView({ x: mx - (mx - pv.x) * f, y: my - (my - pv.y) * f, w: pv.w * f, h: pv.h * f }));
      return;
    }
    if (d.moved) {
      const scale = d.view.w / (svgRef.current?.clientWidth || 1);
      setView(clampView({ ...d.view, x: d.view.x - (e.clientX - d.x) * scale, y: d.view.y - (e.clientY - d.y) * scale }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current.find(x => x.id === e.pointerId);
    const wasPinch = drag.current.length > 1 || pinch.current;
    drag.current = drag.current.filter(x => x.id !== e.pointerId);
    if (drag.current.length < 2) pinch.current = null;
    if (!d || d.moved || wasPinch || !data) return;
    // A tap
    const target = e.target as Element;
    const dot = target.closest('[data-dot]')?.getAttribute('data-dot');
    if (dot && dotsClickable && onDot) { onDot(dot); return; }
    const country = target.closest('[data-country]')?.getAttribute('data-country');
    if (country && onCountry) { onCountry(country); return; }
    if (onTap) onTap(unproject(data.projection, toMap(e.clientX, e.clientY)));
  };

  // Wheel zoom (non-passive so the page doesn't scroll)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
      setView(v => {
        if (!v || !full) return v;
        const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
        return clampView({ x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f, w: v.w * f, h: v.h * f });
      });
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clampView only depends on the data size
  }, [data]);

  const regions = useMemo(() => {
    if (!data || region !== 'holyland') return [];
    return NT_REGIONS.map((r, i) => ({
      ...r,
      d: 'M' + r.ring.map(pt => project(data.projection, pt).map(n => n.toFixed(1)).join(' ')).join('L') + 'Z',
      at: project(data.projection, r.label),
      tint: REGION_TINTS[i % REGION_TINTS.length],
    }));
  }, [data, region]);

  if (error) return <p className="p-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>{error}</p>;
  if (!data || !view) return <div className="rounded-2xl animate-pulse" style={{ height, backgroundColor: 'var(--color-bg-card)' }} />;

  const old = layer !== 'now';
  const c = old ? PALETTE.then : PALETTE.now;
  const proj = (pt: LonLat) => project(data.projection, pt);
  const label = (text: string, [x, y]: [number, number], size: number, opts: { italic?: boolean; color?: string; spacing?: number; weight?: number; key?: string } = {}) => (
    <text key={opts.key ?? text + x} x={x} y={y} fontSize={size * u} textAnchor="middle" dominantBaseline="middle"
          fill={opts.color ?? c.text} fontStyle={opts.italic ? 'italic' : undefined} fontWeight={opts.weight}
          letterSpacing={opts.spacing ? opts.spacing * u : undefined}
          fontFamily={old ? 'Georgia, "Times New Roman", serif' : 'Inter, system-ui, sans-serif'}
          stroke={old ? c.land : '#fff'} strokeWidth={2.5 * u} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
      {text}
    </text>
  );

  const highlightOf = (id: string) => highlight.find(h => h.id === id)?.tone;

  // Labels that would overlap on screen are left out (zoom in to see them): answers first, then
  // in order; each tries above its dot, then below. Value = vertical offset in screen pixels.
  const labelSpots = new Map<number, number>();
  const boxes: [number, number, number, number][] = [];
  const fits = (box: [number, number, number, number]) => !boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
  if (showPlaceLabels) {
    const order = pins.map((pin, i) => ({ pin, i })).filter(({ pin }) => pin.label)
      .sort((a, b) => Number(a.pin.kind === 'place') - Number(b.pin.kind === 'place'));
    for (const { pin, i } of order) {
      const [x, y] = proj(pin.at);
      const sx = (x - view.x) * pxPerUnit, sy = (y - view.y) * pxPerUnit;
      const w = pin.label!.length * 6.4 + 6, h = 15;
      for (const dy of [-13, 15]) {
        const box: [number, number, number, number] = [sx - w / 2, sy + dy - h / 2, sx + w / 2, sy + dy + h / 2];
        if (fits(box)) {
          boxes.push(box); labelSpots.set(i, dy); break;
        }
      }
    }
  }
  // Country names go where they don't cover a place name
  const countryLabels = layer === 'now' || layer === 'both'
    ? data.countries.filter(k => {
        const sx = (k.label[0] - view.x) * pxPerUnit, sy = (k.label[1] - view.y) * pxPerUnit;
        const w = k.name.length * (layer === 'both' ? 5.4 : 6.6), h = 14;
        const box: [number, number, number, number] = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2];
        if (!fits(box)) return false;
        boxes.push(box);
        return true;
      })
    : [];

  return (
    <div className="relative rounded-2xl overflow-hidden border select-none" style={{ borderColor: old ? '#8B6B3E' : 'var(--color-border)', height }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full touch-none"
        style={{ backgroundColor: c.sea, cursor: onTap ? 'crosshair' : 'grab' }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        role="img"
        aria-label={`${region === 'holyland' ? 'Map of the Holy Land and Egypt' : 'Map of the Bible world'}, ${layer === 'now' ? 'today' : 'in Bible times'}`}
      >
        <defs>
          <pattern id="waves" width="12" height="6" patternUnits="userSpaceOnUse" patternTransform={`scale(${u * 1.2})`}>
            <path d="M0 3 Q3 0 6 3 T12 3" fill="none" stroke="#A8916077" strokeWidth="0.8" />
          </pattern>
          <filter id="paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.33  0 0 0 0 0.15  0 0 0 0.10 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {old && <rect x={-data.width} y={-data.height} width={data.width * 3} height={data.height * 3} fill="url(#waves)" />}

        {/* Land: a thick coast stroke under a borderless fill, so only coastlines show on the old map */}
        <g>
          {data.countries.map(k => <path key={`c-${k.id}`} d={k.d} fill={c.land} stroke={c.coast} strokeWidth={(old ? 2.2 : 1.4) * u} strokeLinejoin="round" />)}
          {data.countries.map(k => {
            const tone = highlightOf(k.id);
            const fill = tone === 'right' ? '#86EFAC' : tone === 'wrong' ? '#FCA5A5' : c.land;
            return <path key={`f-${k.id}`} d={k.d} data-country={k.id} fill={fill} stroke="none" style={{ cursor: onCountry ? 'pointer' : undefined }} />;
          })}
        </g>
        {old && <rect x={0} y={0} width={data.width} height={data.height} filter="url(#paper)" fill="#000" opacity={0.5} style={{ pointerEvents: 'none' }} />}

        {/* Regions in the time of Jesus */}
        {old && regions.map(r => (
          <path key={r.id} d={r.d} fill={r.tint} fillOpacity={0.12} stroke={r.tint} strokeOpacity={0.6} strokeWidth={1.2 * u} strokeDasharray={`${4 * u} ${3 * u}`} style={{ pointerEvents: 'none' }} />
        ))}

        {/* Water */}
        {data.lakes.map((l, i) => <path key={`l-${i}`} d={l.d} fill={old ? '#C9B98E' : c.sea} stroke={c.coast} strokeWidth={0.8 * u} style={{ pointerEvents: 'none' }} />)}
        {data.rivers.map((r, i) => <path key={`r-${i}`} d={r.d} fill="none" stroke={c.river} strokeWidth={1.4 * u} strokeLinecap="round" style={{ pointerEvents: 'none' }} />)}

        {/* Today's borders */}
        {layer !== 'then' && data.countries.map(k => (
          <path key={`b-${k.id}`} d={k.d} fill="none" stroke={layer === 'both' ? '#B91C1C' : c.border} strokeWidth={(layer === 'both' ? 1.2 : 0.9) * u}
                strokeDasharray={layer === 'both' ? `${5 * u} ${3 * u}` : undefined} style={{ pointerEvents: 'none' }} />
        ))}

        {/* Labels */}
        {old && regions.map(r => label(r.name.toUpperCase(), r.at, 10, { color: c.regionText, spacing: 2, key: `rl-${r.id}` }))}
        {old && region === 'holyland' && OLD_MAP_LABELS.map(l => label(l.name, proj(l.at), l.kind === 'sea' ? 11 : 10, { italic: true, color: l.kind === 'sea' ? '#5B6B70' : c.text, spacing: 1, key: `ol-${tr(l.name)}` }))}
        {countryLabels.map(k => label(k.name, k.label as [number, number], layer === 'both' ? 9 : 11, { weight: 600, color: layer === 'both' ? '#B91C1C' : c.text, key: `cl-${k.id}` }))}

        {/* The journey so far */}
        {route && route.length > 1 && (
          <polyline points={route.map(pt => proj(pt).join(',')).join(' ')} fill="none" stroke="#B45309" strokeWidth={2 * u}
                    strokeDasharray={`${4 * u} ${4 * u}`} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
        )}

        {/* Pins */}
        {pins.map((pin, i) => {
          const placed = labelSpots.get(i);
          const [x, y] = proj(pin.at);
          const colour = { guess: '#2563EB', answer: '#16A34A', place: old ? '#7C2D12' : '#1E293B', hit: '#16A34A', miss: '#DC2626' }[pin.kind];
          const r = (pin.kind === 'place' ? 5 : 7) * u;
          return (
            <g key={`${pin.kind}-${pin.id ?? i}`} data-dot={pin.id} style={{ cursor: dotsClickable ? 'pointer' : undefined }}>
              {/* generous invisible target for fingers */}
              {dotsClickable && <circle cx={x} cy={y} r={16 * u} fill="transparent" />}
              <circle cx={x} cy={y} r={r} fill={colour} stroke="#fff" strokeWidth={2 * u} />
              {placed !== undefined && label(pin.label!, [x, y + placed * u], 11, { weight: 600, key: `pl-${i}` })}
            </g>
          );
        })}
      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {[{ icon: <Plus size={16} />, label: 'Zoom in', act: () => zoomAt(1 / 1.6) },
          { icon: <Minus size={16} />, label: 'Zoom out', act: () => zoomAt(1.6) },
          { icon: <Maximize2 size={14} />, label: 'Whole map', act: () => full && setView(full) }].map(b => (
          <button key={tr(b.label)} onClick={b.act} aria-label={tr(b.label)} className="w-9 h-9 rounded-lg shadow flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#1F2937' }}>{b.icon}</button>
        ))}
      </div>
      {old && <Compass />}
      <p className="absolute left-2 bottom-1 text-[9px] opacity-70" style={{ color: c.text }}>{tr('Natural Earth · regions approximate')}</p>
      {children}
    </div>
  );
}

function Compass() {
  return (
    <svg className="absolute left-2 top-2 w-12 h-12 opacity-80 pointer-events-none" viewBox="-20 -20 40 40" aria-hidden>
      <circle r="17" fill="none" stroke="#6B4F2A" strokeWidth="0.8" />
      <path d="M0 -16 L3 0 L0 16 L-3 0Z" fill="#6B4F2A" />
      <path d="M-16 0 L0 -3 L16 0 L0 3Z" fill="#A8916B" />
      <text y="-10" fontSize="6" textAnchor="middle" fill="#F2E4C1" fontFamily="Georgia, serif">N</text>
    </svg>
  );
}

export function LayerToggle({ layer, onChange }: { layer: MapLayer; onChange: (l: MapLayer) => void }) {
  return (
    <div className="inline-flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={tr('Map style')}>
      {([['then', 'Then'], ['now', 'Now'], ['both', 'Both']] as const).map(([v, text]) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={layer === v} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={layer === v ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
          {text}
        </button>
      ))}
    </div>
  );
}
