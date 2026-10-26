import { useState } from 'react';
import { MapPin, LocateFixed, Search } from 'lucide-react';
import { MapView } from './MapView';
import { geocode, reverseGeocode, currentPosition, type Place } from '../lib/geo';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

/**
 * Where a parish is: the address typed in full and a pin on the map, kept in step.
 * "Find on map" looks the address up; tapping the map or dragging the pin fills in any address lines still empty.
 */

export interface Location {
  address: string;
  city: string;
  state_region: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

export function LocationPicker({ value, onChange, inputClass, inputStyle, requireCity = false }: {
  value: Location;
  onChange: (u: Partial<Location>) => void;
  inputClass: string;
  inputStyle: React.CSSProperties;
  requireCity?: boolean;
}) {
  const pin = value.latitude != null && value.longitude != null ? { lat: value.latitude, lng: value.longitude } : null;
  const [open, setOpen] = useState(!!pin);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(pin);
  const [zoom, setZoom] = useState(pin ? 16 : 3);
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState<'find' | 'locate' | null>(null);

  const applyPlace = (p: Place, fillAll: boolean) => {
    const pick = (field: keyof Omit<Location, 'latitude' | 'longitude'>) => (fillAll || !value[field].trim()) && p[field] ? { [field]: p[field] } : {};
    onChange({ latitude: round(p.lat), longitude: round(p.lng), ...pick('address'), ...pick('city'), ...pick('state_region'), ...pick('country') });
  };

  const find = async () => {
    const q = [value.address, value.city, value.state_region, value.country].map(s => s.trim()).filter(Boolean).join(', ');
    if (q.length < 3) { showToast(tr('Type the address first')); return; }
    setBusy('find');
    try {
      const found = await geocode(q);
      setOpen(true);
      if (!found.length) { showToast(tr('That address wasn’t found, place the pin on the map instead')); return; }
      setResults(found.length > 1 ? found : []);
      const best = found[0];
      onChange({ latitude: round(best.lat), longitude: round(best.lng) });
      setZoom(17);
      setCenter({ lat: best.lat, lng: best.lng });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const locate = async () => {
    setBusy('locate');
    try {
      const at = await currentPosition();
      setOpen(true);
      setZoom(17);
      setCenter(at);
      await placePin(at.lat, at.lng);
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  // Open the map over the town already typed, so the pin goes on the right street
  const showMap = async () => {
    setOpen(true);
    const town = [value.city, value.state_region, value.country].map(s => s.trim()).filter(Boolean).join(', ');
    if (town.length < 3) return;
    try {
      const [found] = await geocode(town);
      if (found) { setZoom(value.city.trim() ? 14 : 6); setCenter({ lat: found.lat, lng: found.lng }); }
    } catch {}
  };

  const placePin = async (lat: number, lng: number) => {
    setResults([]);
    onChange({ latitude: round(lat), longitude: round(lng) });
    try {
      const place = await reverseGeocode(lat, lng);
      if (place) applyPlace({ ...place, lat, lng }, false);
    } catch {}
  };

  return (
    <div className="space-y-2">
      <input value={value.address} onChange={e => onChange({ address: e.target.value })} placeholder={tr('Street address')}
             className={inputClass} style={inputStyle} autoComplete="street-address" />
      <div className="grid grid-cols-2 gap-2">
        <input value={value.city} onChange={e => onChange({ city: e.target.value })} placeholder={requireCity ? tr('Town / city') : tr('Town / city (optional)')}
               className={inputClass} style={inputStyle} autoComplete="address-level2" />
        <input value={value.state_region} onChange={e => onChange({ state_region: e.target.value })} placeholder={tr('State / region')}
               className={inputClass} style={inputStyle} autoComplete="address-level1" />
      </div>
      <input value={value.country} onChange={e => onChange({ country: e.target.value })} placeholder={tr('Country')}
             className={inputClass} style={inputStyle} autoComplete="country-name" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={find} disabled={busy !== null} className="px-3 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}>
          <Search size={14} aria-hidden /> {busy === 'find' ? tr('Looking…') : tr('Find on map')}
        </button>
        <button type="button" onClick={locate} disabled={busy !== null} className="px-3 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          <LocateFixed size={14} aria-hidden /> {busy === 'locate' ? tr('Finding you…') : tr('I’m there now')}
        </button>
        {!open && (
          <button type="button" onClick={showMap} className="px-3 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <MapPin size={14} aria-hidden /> {tr('Place it on the map')}
          </button>
        )}
      </div>
      {results.length > 0 && (
        <ul className="rounded-xl border divide-y text-xs" style={{ borderColor: 'var(--color-border)' }} aria-label={tr('Places found')}>
          {results.map((p, i) => (
            <li key={i}>
              <button type="button" onClick={() => { applyPlace(p, true); setZoom(17); setCenter({ lat: p.lat, lng: p.lng }); setResults([]); }}
                      className="w-full text-left px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{p.label}</button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <>
          <MapView label={tr('Map: tap to place the parish')} pin={pin} onPin={placePin} center={center} zoom={zoom} className="h-64" />
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {pin ? `${tr('Pin placed')} · ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}: ${tr('drag it or tap the map to move it.')}` : tr('Tap the map where the parish is.')}
          </p>
        </>
      )}
    </div>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
