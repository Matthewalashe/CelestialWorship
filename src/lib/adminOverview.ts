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

export interface DayRow { day: string; active: number; new_devices: number; views: number; sessions: number; installs: number }
export type Counts = Record<string, number>;

/** The app's anonymous analytics over the last `days` days (the admin_analytics function, migration 20261103000001) */
export interface AdminAnalytics {
  days: number;
  totals: { devices: number; new_devices: number; returning_devices: number; sessions: number; views: number; events: number; devices_all_time: number; installed_devices: number };
  daily: DayRow[];
  installs: { install_page_views: number; offered: number; prompt_accepted: number; prompt_dismissed: number; banner_dismissed: number; installed: number; first_launches: number; by_platform: Counts };
  retention: { cohort: number; returned: number };
  screens: { path: string; views: number; devices: number }[];
  actions: { event: string; n: number; devices: number }[];
  activities: Counts; games: Counts; shares: Counts; languages_changed: Counts; platforms: Counts;
  breakdown: Partial<Record<'language' | 'theme' | 'display' | 'referrer' | 'utm_source' | 'utm_campaign' | 'screen' | 'timezone' | 'version', Counts>>;
  hours_lagos: { hour: number; n: number }[];
  weekdays_lagos: { dow: number; n: number }[];
  errors: { count: number; devices: number; top: { message: string; n: number; path: string | null; last: string }[] };
}

export async function adminAnalytics(days: number): Promise<AdminAnalytics> {
  const { data, error } = await supabase.rpc('admin_analytics', { p_days: days });
  raise(error, 'The analytics');
  return data as AdminAnalytics;
}
