import { supabase } from '../supabase';
import { raise } from './backend';

/** Everything going on in the backend, for admins (the admin_overview function, migration 20261103) */
export interface AdminOverview {
  generated_at: string;
  people: {
    accounts: number; confirmed: number; new_7d: number; new_30d: number; active_7d: number;
    by_role: Record<string, number>; by_member_type: Record<string, number>;
    signups_by_day: { day: string; n: number }[];
    recent: { name: string | null; email: string; created_at: string; confirmed: boolean; last_sign_in_at: string | null; role: string | null; member_type: string | null }[];
  };
  queue: Record<'verifications' | 'parishes' | 'parish_leads' | 'parish_claims' | 'prayers' | 'articles' | 'events' | 'reports' | 'translations', number>;
  content: Record<'parishes' | 'parishes_with_map_pin' | 'parish_leads' | 'articles' | 'prayer_requests' | 'prayers_said' | 'events_upcoming' | 'livestreams' | 'live_now' | 'appointments' | 'church_records', number>;
  giving: {
    by_currency: Record<string, { paid_minor: number | null; count: number }>;
    pledges_open: number; failed_30d: number;
    recent: { purpose: string; amount_minor: number; currency: string; status: string; donor: string | null; created_at: string }[];
    subscriptions: Record<string, number>;
  };
  engagement: {
    push_devices: number; push_sent_7d: number; game_players_this_week: number; library_items: number;
    events_7d: number; devices_7d: number;
    top_events_7d: { event: string; n: number }[];
    platforms_7d: Record<string, number>;
  };
}

export async function adminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_overview');
  raise(error, 'The admin overview');
  return data as AdminOverview;
}
