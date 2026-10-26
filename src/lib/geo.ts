import { getUILanguage } from '../i18n';

/**
 * Addresses ↔ points on the map, through OpenStreetMap's Nominatim (free; at most one request a second,
 * so lookups happen only when someone asks for one). Everything a parish says about where it is — the
 * typed address and the pin — is kept together, so the directory, its map and parish pages agree.
 */

export interface Place {
  lat: number;
  lng: number;
  /** One line, as Nominatim names it */
  label: string;
  address: string;
  city: string;
  state_region: string;
  country: string;
}

const API = 'https://nominatim.openstreetmap.org';
let last = 0;

async function call(path: string, params: Record<string, string>): Promise<any> {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
  const qs = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': getUILanguage(), ...params });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) throw new Error('The map service is busy — try again in a moment');
  return res.json();
}

function toPlace(r: any): Place {
  const a = r.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.quarter || '';
  return {
    lat: Number(r.lat),
    lng: Number(r.lon),
    label: r.display_name ?? '',
    address: [street, area].filter(Boolean).join(', '),
    city: a.city || a.town || a.village || a.municipality || a.county || '',
    state_region: a.state || a.region || '',
    country: a.country || '',
  };
}

/** Places matching a typed address, best first */
export async function geocode(query: string): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const rows = await call('search', { q, limit: '5' });
  return (rows as any[]).map(toPlace);
}

/** The address at a point (after a pin is dropped or moved) */
export async function reverseGeocode(lat: number, lng: number): Promise<Place | null> {
  const row = await call('reverse', { lat: String(lat), lon: String(lng), zoom: '18' });
  return row && !row.error ? toPlace(row) : null;
}

/** Where the reader is, if they allow it */
export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('This device can’t share its location')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Location was not shared')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

/** Straight-line distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export const hasPoint = (p: { latitude?: number | null; longitude?: number | null }) =>
  typeof p.latitude === 'number' && typeof p.longitude === 'number';
