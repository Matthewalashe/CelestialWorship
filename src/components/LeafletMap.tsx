import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapProps } from './MapView';

/*
 * The map itself (OpenStreetMap tiles through Leaflet). Loaded only when a map is shown, and kept out of
 * the offline cache: maps need the internet anyway.
 */

const pinIcon = (colour: string, size = 28, ring = false) => L.divIcon({
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,.35))">
    <path d="M12 23s-7-6.4-7-12a7 7 0 1 1 14 0c0 5.6-7 12-7 12z" fill="${colour}" stroke="white" stroke-width="${ring ? 2 : 1.5}"/>
    <circle cx="12" cy="11" r="2.6" fill="white"/></svg>`,
});

const meIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,.2)"></span>',
});

function brand() {
  try { return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-brand').trim() || '#1D4ED8'; } catch { return '#1D4ED8'; }
}

export default function LeafletMap({ markers = [], selected, onSelect, pin, onPin, me, center, zoom = 12, label, className = 'h-72' }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const group = useRef<L.LayerGroup | null>(null);
  const pinMarker = useRef<L.Marker | null>(null);
  const meMarker = useRef<L.Marker | null>(null);
  const handlers = useRef({ onSelect, onPin });
  handlers.current = { onSelect, onPin };
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, worldCopyJump: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(m);
    m.setView([6.5, 3.4], 3);
    m.on('click', e => handlers.current.onPin?.(e.latlng.lat, e.latlng.lng));
    group.current = L.layerGroup().addTo(m);
    map.current = m;
    // The map may be drawn inside a sheet that is still opening
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, []);

  // Parishes on the map
  useEffect(() => {
    const m = map.current, g = group.current;
    if (!m || !g) return;
    g.clearLayers();
    const colour = brand();
    for (const p of markers) {
      const on = p.id === selected;
      const mk = L.marker([p.lat, p.lng], { icon: pinIcon(on ? '#D97706' : colour, on ? 34 : 26, on), title: p.title, keyboard: true, zIndexOffset: on ? 1000 : 0 });
      mk.on('click', () => handlers.current.onSelect?.(p.id));
      mk.addTo(g);
    }
    if (!fitted.current && markers.length && !center) {
      fitted.current = true;
      if (markers.length === 1) m.setView([markers[0].lat, markers[0].lng], zoom);
      else m.fitBounds(L.latLngBounds(markers.map(p => [p.lat, p.lng] as [number, number])), { padding: [24, 24], maxZoom: 14 });
    }
  }, [markers, selected, center, zoom]);

  // The pin someone is placing
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pin) { pinMarker.current?.remove(); pinMarker.current = null; return; }
    if (!pinMarker.current) {
      pinMarker.current = L.marker([pin.lat, pin.lng], { icon: pinIcon(brand(), 36, true), draggable: !!onPin, autoPan: true }).addTo(m);
      pinMarker.current.on('dragend', () => {
        const at = pinMarker.current!.getLatLng();
        handlers.current.onPin?.(at.lat, at.lng);
      });
    } else {
      pinMarker.current.setLatLng([pin.lat, pin.lng]);
    }
  }, [pin, onPin]);

  // Where the reader is
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!me) { meMarker.current?.remove(); meMarker.current = null; return; }
    if (!meMarker.current) meMarker.current = L.marker([me.lat, me.lng], { icon: meIcon, interactive: false }).addTo(m);
    else meMarker.current.setLatLng([me.lat, me.lng]);
  }, [me]);

  // Asked to look somewhere
  useEffect(() => {
    if (map.current && center) map.current.setView([center.lat, center.lng], zoom);
  }, [center, zoom]);

  return <div ref={el} role="region" aria-label={label} className={`${className} w-full rounded-2xl overflow-hidden z-0`} style={{ backgroundColor: 'var(--color-bg-card)' }} />;
}
