import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { raise, BackendError } from '../lib/backend';
import type { LiveChannels } from '../lib/live';

export interface ServiceTime { service: string; day?: string; time: string }

export interface GivingDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  /** A Paystack/Flutterwave payment page the parish manages */
  paymentLink?: string;
  note?: string;
}

export interface Parish {
  id: string;
  name: string;
  diocese: string | null;
  province: string | null;
  country: string;
  state_region: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** For parishes placed by the app: how close the point is ('town' = only the town is known) */
  geo_precision?: 'address' | 'place' | 'town';
  shepherd_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_times: ServiceTime[] | null;
  giving_details: GivingDetails | null;
  map_url?: string | null;
  social_links?: Record<string, string> | null;
  accepts_prayer_requests?: boolean;
  accepts_appointments?: boolean;
  /** 'ministry' = an independent shepherd's ministry, not a congregation */
  kind?: 'parish' | 'ministry';
  live_url?: string | null;
  live_title?: string | null;
  live_now?: boolean;
  live_updated_at?: string | null;
  /** Where the parish streams (see lib/live.ts) */
  live_channels?: LiveChannels | null;
  /** On the Partner plan: gifts, support and livestreaming */
  partner?: boolean;
  logo_url?: string | null;
  cover_url?: string | null;
  /** parish, cathedral, circuit/district/state/province/regional/diocesan/national headquarters */
  level?: ParishLevel;
  parent_id?: string | null;
  ownership?: 'community' | 'private';
  affiliated?: boolean;
  affiliation?: string | null;
  continent?: string | null;
  /** Written by the parish: who they are, when they began, the languages they worship in */
  about?: string | null;
  founded_year?: number | null;
  worship_languages?: string[] | null;
  /** Holds the hourly prayers (Àdúrà Wákàtí) at 9am, 12 noon, 3pm and 6pm */
  hourly_prayers?: boolean;
  /** From the Church's archived public list, not yet claimed by the parish */
  listing?: { source: string; url: string };
  /** Seed entries (headquarters) shipped with the app */
  seed?: boolean;
}

export type ParishLevel = 'parish' | 'cathedral' | 'circuit_hq' | 'district_hq' | 'state_hq' | 'province_hq' | 'regional_hq' | 'diocesan_hq' | 'national_hq' | 'supreme_hq' | 'international_hq';

export const PARISH_LEVELS: Record<ParishLevel, string> = {
  parish: 'Parish', cathedral: 'Cathedral', circuit_hq: 'Circuit headquarters', district_hq: 'District headquarters',
  state_hq: 'State headquarters', province_hq: 'Provincial headquarters', regional_hq: 'Regional headquarters',
  diocesan_hq: 'Diocesan headquarters', national_hq: 'National headquarters', supreme_hq: 'Supreme Headquarters', international_hq: 'International Headquarters',
};

const CONTINENT: Record<string, string> = {
  Nigeria: 'Africa', Benin: 'Africa', Togo: 'Africa', Ghana: 'Africa', "Côte d'Ivoire": 'Africa', 'South Africa': 'Africa', Cameroon: 'Africa',
  Gabon: 'Africa', Congo: 'Africa', Liberia: 'Africa', 'Sierra Leone': 'Africa', Gambia: 'Africa', Senegal: 'Africa', Kenya: 'Africa', Libya: 'Africa',
  'United States': 'North America', Canada: 'North America', 'United Kingdom': 'Europe', Ireland: 'Europe', France: 'Europe', Germany: 'Europe',
  Italy: 'Europe', Spain: 'Europe', Belgium: 'Europe', Netherlands: 'Europe', Austria: 'Europe', Switzerland: 'Europe', Sweden: 'Europe',
  Norway: 'Europe', Denmark: 'Europe', 'United Arab Emirates': 'Asia', China: 'Asia', India: 'Asia', Australia: 'Oceania', Brazil: 'South America',
};
export const continentOf = (p: Pick<Parish, 'continent' | 'country'>) => p.continent || CONTINENT[p.country] || 'Other';

let listedPromise: Promise<Parish[]> | null = null;
function loadListed(): Promise<Parish[]> {
  if (!listedPromise) {
    listedPromise = fetch('/data/parishes_listed.json')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: Parish[]) => rows.map(p => ({ ...p, seed: true, latitude: p.latitude ?? null, longitude: p.longitude ?? null, diocese: null, province: null, website: null, service_times: null, giving_details: null })))
      .catch(() => []);
  }
  return listedPromise;
}

export type ParishSubmission = Omit<Parish, 'id' | 'seed'> & { contact_public: boolean };

let seedPromise: Promise<Parish[]> | null = null;
function loadSeed(): Promise<Parish[]> {
  if (!seedPromise) {
    seedPromise = fetch('/data/parishes_seed.json')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: Parish[]) => rows.map(p => ({ ...p, seed: true })))
      .catch(() => []);
  }
  return seedPromise;
}

export function useParishes() {
  const [parishes, setParishes] = useState<Parish[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const seed = [...await loadSeed(), ...await loadListed()];
    const { data, error } = await supabase.from('parish_directory').select('*').order('country').order('name').limit(5000);
    if (error) {
      setBackendReady(false);
      setParishes(seed);
    } else {
      setBackendReady(true);
      // Seed and listed entries are dropped once the parish itself is in the directory
      const key = (p: Parish) => `${p.name.toLowerCase()}|${(p.city ?? '').toLowerCase()}`;
      const names = new Set((data ?? []).map(p => key(p as Parish)));
      setParishes([...(data as Parish[]), ...seed.filter(s => !names.has(key(s)))]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { parishes, loading, backendReady, refresh };
}

export function useParishSubmission() {
  const { user } = useAuth();
  const submit = useCallback(async (p: ParishSubmission) => {
    if (!user) throw new BackendError('Sign in to add a parish');
    const { data, error } = await supabase
      .from('parishes')
      .insert({ ...p, submitted_by: user.id, status: 'pending' })
      .select('id')
      .single();
    raise(error, 'Adding the parish');
    return data!.id as string;
  }, [user]);
  return { submit, signedIn: !!user };
}

export function parishLabel(p: Pick<Parish, 'name' | 'city' | 'state_region' | 'country'>): string {
  return [p.name, p.city || p.state_region, p.country].filter(Boolean).join(', ');
}
