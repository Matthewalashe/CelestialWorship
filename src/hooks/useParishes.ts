import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { raise, BackendError } from '../lib/backend';

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
  /** Seed entries (headquarters) shipped with the app */
  seed?: boolean;
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
    const seed = await loadSeed();
    const { data, error } = await supabase.from('parish_directory').select('*').order('country').order('name').limit(5000);
    if (error) {
      setBackendReady(false);
      setParishes(seed);
    } else {
      setBackendReady(true);
      // Seed entries are dropped once the same parish is listed in the directory
      const names = new Set((data ?? []).map(p => p.name.toLowerCase()));
      setParishes([...(data as Parish[]), ...seed.filter(s => !names.has(s.name.toLowerCase()))]);
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
