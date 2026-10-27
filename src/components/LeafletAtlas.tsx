import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AtlasProps } from './AtlasMap';
import { ANCIENT_NAMES } from '../data/christianity';
import { tr } from '../i18n';

/*
 * The Bible atlas (Leaflet). Two panes stacked over each other:
 *  "then": the 1884 map "Palestine in the time of Christ" (tiles, scripts/build_old_maps.py) over a parchment world,
 *          with the lands' names as they were;
 *  "now":  today's countries, flat and clear (Natural Earth), with their names.
 * "Both" shows today's map with the old one beside it, split by a handle you drag to compare.
 * Loaded only when an atlas is shown, and kept out of the offline cache.
 */

const WELLER_BOUNDS = L.latLngBounds([30, 34], [34, 37]);
const COLOURS = {
  sea: '#CFE0E8', land: '#F1ECE1', border: '#FFFFFF', label: '#3A3A3A',
  thenSea: '#D8CBA6', thenLand: '#EFE2C2', thenBorder: '#B49A6A', thenLabel: '#5A4320',
  right: '#9BCB9F', wrong: '#E8A39B', marked: '#1F3A8A',
};

type Geo = { type: 'FeatureCollection'; features: { properties: { name: string; iso2: string | null; iso3: string; label: [number, number]; rank: number }; geometry: GeoJSON.MultiPolygon }[] };
let geoPromise: Promise<Geo> | null = null;
const loadGeo = () => (geoPromise ??= fetch('/data/maps/countries.json').then(r => r.json()));

const PIN = { guess: '#1F3A8A', answer: '#2F6B3E', place: '#3A3A3A', hit: '#2F6B3E', miss: '#B42318' } as const;
// On the old map, places are small and the colour of its ink, so its own names stay readable
const OLD_INK = '#7A2E12';
const ANCIENT_BY_ISO2 = new Map(ANCIENT_NAMES.map(a => [a.iso2, a]));

function labelIcon(text: string, kind: 'now' | 'then' | 'place', small = false) {
  const style = kind === 'then'
    ? `font: italic 600 ${small ? 10 : 12}px Georgia, 'Times New Roman', serif; color: ${COLOURS.thenLabel}; letter-spacing: .06em; text-shadow: 0 0 3px #EFE2C2, 0 0 3px #EFE2C2;`
    : kind === 'now'
      ? `font: 700 ${small ? 9 : 11}px Inter, system-ui, sans-serif; color: ${COLOURS.label}; letter-spacing: .08em; text-transform: uppercase; text-shadow: 0 0 3px #fff, 0 0 3px #fff;`
      : `font: 600 11px Inter, system-ui, sans-serif; color: #1C1C1E; text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff;`;
  return L.divIcon({ className: '', iconSize: [0, 0], html: `<span style="position:absolute; transform: translate(-50%, ${kind === 'place' ? '6px' : '-50%'}); white-space: nowrap; pointer-events: none; ${style}">${text.replace(/[<>&]/g, '')}</span>` });
}

export default function LeafletAtlas({ region, layer, pins = [], route, onTap, onCountry, highlight = [], marked = [], focus, fly, dotsClickable, onDot,
  showPlaceLabels = true, height = '60vh', children }: AtlasProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [split, setSplit] = useState(0.5);
  const layers = useRef<{ now?: L.GeoJSON; then?: L.GeoJSON; weller?: L.TileLayer; nowLabels?: L.LayerGroup; thenLabels?: L.LayerGroup; pins?: L.LayerGroup }>({});
  const handlers = useRef({ onTap, onCountry, onDot });
  handlers.current = { onTap, onCountry, onDot };

  useEffect(() => { loadGeo().then(setGeo).catch(() => {}); }, []);

  // The map and its panes
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 2, maxZoom: region === 'holyland' ? 12 : 9, zoomSnap: 0.25 });
    L.control.zoom({ zoomInTitle: tr('Zoom in'), zoomOutTitle: tr('Zoom out') }).addTo(m);
    m.createPane('now').style.zIndex = '200';
    m.createPane('thenBase').style.zIndex = '240';
    m.createPane('then').style.zIndex = '250';
    m.createPane('nowLabels').style.zIndex = '420';
    m.createPane('thenLabels').style.zIndex = '430';
    for (const p of ['nowLabels', 'thenLabels']) m.getPane(p)!.style.pointerEvents = 'none';
    m.attributionControl.setPrefix(false);
    m.attributionControl.addAttribution(region === 'holyland'
      ? 'Natural Earth · <i>Palestine in the time of Christ</i>, E. Weller, c. 1884 (public domain)'
      : 'Natural Earth');
    m.setView(region === 'holyland' ? [31.9, 35.3] : [35, 25], region === 'holyland' ? 7 : 4);
    m.on('click', e => handlers.current.onTap?.([e.latlng.lng, e.latlng.lat]));
    layers.current.pins = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; layers.current = {}; };
  }, [region]);

  // Countries: today's and the parchment world, with their names
  useEffect(() => {
    const m = map.current;
    if (!m || !geo) return;
    const hl = new Map(highlight.map(h => [h.id, h.tone]));
    const markedSet = new Set(marked);
    const L_ = layers.current;
    [L_.now, L_.then, L_.nowLabels, L_.thenLabels].forEach(l => l?.remove());
    const click = (p: Geo['features'][number]['properties']) => (e: L.LeafletMouseEvent) => {
      if (handlers.current.onCountry) { L.DomEvent.stopPropagation(e); handlers.current.onCountry(p.iso3, { name: p.name, iso2: p.iso2 }); }
    };
    L_.now = L.geoJSON(geo as unknown as GeoJSON.GeoJsonObject, {
      pane: 'now',
      style: f => {
        const iso3 = f?.properties.iso3;
        const tone = hl.get(iso3);
        const isMarked = markedSet.has(iso3) || markedSet.has(f?.properties.name);
        return { color: COLOURS.border, weight: 1, fillOpacity: 1, fillColor: tone === 'right' ? COLOURS.right : tone === 'wrong' ? COLOURS.wrong : isMarked ? '#D5DDF2' : COLOURS.land };
      },
      onEachFeature: (f, l) => { l.on('click', click(f.properties)); },
    }).addTo(m);
    L_.then = L.geoJSON(geo as unknown as GeoJSON.GeoJsonObject, {
      pane: 'thenBase',
      style: f => {
        const tone = hl.get(f?.properties.iso3);
        return { color: COLOURS.thenBorder, weight: 0.6, opacity: 0.5, fillOpacity: 1, fillColor: tone === 'right' ? COLOURS.right : tone === 'wrong' ? COLOURS.wrong : COLOURS.thenLand };
      },
      onEachFeature: (f, l) => { l.on('click', click(f.properties)); },
    });
    if (region === 'holyland') L_.weller = L.tileLayer('/maps/weller/{z}/{x}/{y}.jpg', { pane: 'then', bounds: WELLER_BOUNDS, minNativeZoom: 6, maxNativeZoom: 11, minZoom: 5, maxZoom: 12 });
    // Names: today's, and the lands as they were
    L_.nowLabels = L.layerGroup();
    L_.thenLabels = L.layerGroup();
    for (const f of geo.features) {
      const p = f.properties;
      const at: [number, number] = [p.label[1], p.label[0]];
      L.marker(at, { icon: labelIcon(tr(p.name), 'now', p.rank > 3), pane: 'nowLabels', interactive: false, keyboard: false })
        .addTo(L_.nowLabels).options.title = String(p.rank);
      const old = p.iso2 ? ANCIENT_BY_ISO2.get(p.iso2) : undefined;
      if (old && region === 'world') L.marker(at, { icon: labelIcon(tr(old.then.split(',')[0].split(':')[0]), 'then'), pane: 'thenLabels', interactive: false, keyboard: false }).addTo(L_.thenLabels);
    }
    // Fewer of today's names when zoomed out
    const thin = () => {
      const z = m.getZoom();
      L_.nowLabels?.eachLayer(l => {
        const rank = Number((l as L.Marker).options.title);
        const show = rank <= z - (region === 'holyland' ? 2 : 0) + 1;
        (l as L.Marker).setOpacity(show ? 1 : 0);
      });
    };
    m.on('zoomend', thin);
    thin();
    return () => { m.off('zoomend', thin); };
  }, [geo, highlight, marked, region]);

  // Which panes show: today, then, or both with the divider
  useEffect(() => {
    const m = map.current;
    const L_ = layers.current;
    if (!m || !L_.now) return;
    const sea = layer === 'now' ? COLOURS.sea : COLOURS.thenSea;
    el.current!.style.backgroundColor = layer === 'both' ? COLOURS.sea : sea;
    L_.now.addTo(m);
    L_.nowLabels?.[layer === 'then' ? 'remove' : 'addTo'](m);
    if (layer === 'now') { L_.then?.remove(); L_.weller?.remove(); L_.thenLabels?.remove(); }
    else { L_.then?.addTo(m); L_.weller?.addTo(m); L_.thenLabels?.addTo(m); }
    // In "both", the old map on the left of the divider only
    const clip = () => {
      for (const p of ['thenBase', 'then', 'thenLabels']) {
        const pane = m.getPane(p)!;
        if (layer !== 'both') { pane.style.clip = ''; continue; }
        const size = m.getSize();
        const nw = m.containerPointToLayerPoint([0, 0]);
        const se = m.containerPointToLayerPoint(size);
        const x = m.containerPointToLayerPoint([size.x * split, 0]).x;
        pane.style.clip = `rect(${nw.y}px, ${x}px, ${se.y}px, ${nw.x}px)`;
      }
    };
    clip();
    m.on('move zoom resize', clip);
    return () => { m.off('move zoom resize', clip); };
  }, [layer, split, geo, highlight, marked]);

  // Look at a place: [lon, lat, span in degrees]
  const focusKey = focus?.join(',');
  useEffect(() => {
    const m = map.current;
    if (!m || !focus) return;
    const [lon, lat, span] = focus;
    m.fitBounds([[lat - span / 2, lon - span / 2], [lat + span / 2, lon + span / 2]], { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focusKey stands for focus
  }, [focusKey]);

  // Fly to a point of interest
  const flyKey = fly ? `${fly.lat},${fly.lon},${fly.zoom}` : '';
  useEffect(() => {
    if (map.current && fly) map.current.flyTo([fly.lat, fly.lon], fly.zoom, { duration: 1.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flyKey stands for fly
  }, [flyKey]);

  // Pins and the route travelled
  useEffect(() => {
    const g = layers.current.pins;
    if (!g) return;
    g.clearLayers();
    if (route && route.length > 1) {
      L.polyline(route.map(([lon, lat]) => [lat, lon] as [number, number]), { color: '#7A6224', weight: 2.5, dashArray: '5 6', interactive: false }).addTo(g);
    }
    for (const p of pins) {
      const at: [number, number] = [p.at[1], p.at[0]];
      const big = p.kind !== 'place';
      const old = layer !== 'now';
      const dot = L.circleMarker(at, big
        ? { radius: 8, color: '#FFFFFF', weight: 2, fillColor: PIN[p.kind], fillOpacity: 1, interactive: !!dotsClickable }
        : { radius: old ? 4 : 5, color: '#FFFFFF', weight: 1.5, fillColor: old ? OLD_INK : PIN.place, fillOpacity: old ? 0.85 : 1, interactive: !!dotsClickable });
      if (dotsClickable && p.id) dot.on('click', e => { L.DomEvent.stopPropagation(e); handlers.current.onDot?.(p.id!); });
      dot.addTo(g);
      if (dotsClickable && p.id) {
        // A larger target for fingers
        L.circleMarker(at, { radius: 18, opacity: 0, fillOpacity: 0 }).on('click', e => { L.DomEvent.stopPropagation(e); handlers.current.onDot?.(p.id!); }).addTo(g);
      }
      if (showPlaceLabels && p.label) L.marker(at, { icon: labelIcon(tr(p.label), 'place'), interactive: false, keyboard: false }).addTo(g);
    }
  }, [pins, route, dotsClickable, showPlaceLabels, layer]);

  return (
    <div className="relative rounded-2xl overflow-hidden border select-none" style={{ borderColor: 'var(--color-border)', height }}>
      <div ref={el} className="absolute inset-0 z-0" role="region"
           aria-label={`${region === 'holyland' ? tr('Map of the Holy Land') : tr('Map of the Bible world')}, ${layer === 'now' ? tr('today') : layer === 'then' ? tr('in Bible times') : tr('then and now')}`}
           style={{ cursor: onTap ? 'crosshair' : 'grab' }} />
      {layer === 'both' && (
        <>
          <div className="absolute top-0 bottom-0 z-[500] pointer-events-none" style={{ left: `${split * 100}%`, width: 2, marginLeft: -1, backgroundColor: '#FFFFFF', boxShadow: '0 0 4px rgba(0,0,0,.4)' }} />
          <span className="absolute top-2 z-[500] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded pointer-events-none" style={{ left: 52, top: 10, backgroundColor: 'rgba(239,226,194,.92)', color: COLOURS.thenLabel }}>{tr('Then')}</span>
          <span className="absolute z-[500] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded pointer-events-none" style={{ right: 8, top: 10, backgroundColor: 'rgba(255,255,255,.92)', color: COLOURS.label }}>{tr('Now')}</span>
          <input type="range" min={0.05} max={0.95} step={0.01} value={split} onChange={e => setSplit(Number(e.target.value))}
                 aria-label={tr('Compare then and now: drag')} className="absolute bottom-9 left-1/2 -translate-x-1/2 z-[500] w-2/3" />
        </>
      )}
      {children}
    </div>
  );
}
