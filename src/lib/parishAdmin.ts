import { supabase } from '../supabase';
import { raise, BackendError } from './backend';
import type { Parish } from '../hooks/useParishes';
import type { SharedPrayerRequest, Donation, ChurchEvent } from './community';

/**
 * Parish self-service: details, administrators, appointments, and the parish's own
 * prayer requests, giving records and events. Every call is checked by RLS
 * (is_parish_admin) on the server.
 */

async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new BackendError('Please sign in first');
  return data.user;
}

export type TeamRole = 'shepherd' | 'admin' | 'parochial_committee' | 'media' | 'choir' | 'editor' | 'minister' | 'member';

export const TEAM_ROLES: Record<TeamRole, { label: string; can: string }> = {
  shepherd: { label: 'Shepherd', can: 'Everything, plus prayer requests addressed to the shepherd' },
  admin: { label: 'Administrator', can: 'Everything: details, team, giving, events, prayer requests, appointments' },
  parochial_committee: { label: 'Parochial committee', can: 'Giving records, events and prayer requests' },
  media: { label: 'Media', can: 'Livestream and events' },
  choir: { label: 'Choir', can: 'Events (rehearsals, programmes)' },
  editor: { label: 'Editor', can: 'Events' },
  minister: { label: 'Minister', can: 'The parish space and rosters: ministers at services (conductor, readers, incense bearer…)' },
  member: { label: 'Member', can: 'The parish space: reads and posts, sees rosters' },
};

export const FULL_ADMIN_ROLES: TeamRole[] = ['shepherd', 'admin'];

export interface ParishAdmin { parish_id: string; user_id: string; role: TeamRole; verified: boolean }

/** Parishes the signed-in user administers (verified) */
export async function myAdminParishes(): Promise<{ parish: Parish; role: ParishAdmin['role'] }[]> {
  const user = await requireUser();
  const { data, error } = await supabase.from('parish_admins').select('role, parishes(*)').eq('user_id', user.id).eq('verified', true);
  raise(error, 'Loading your parishes');
  return (data ?? []).map((row: any) => ({ parish: row.parishes as Parish, role: row.role }));
}

export async function updateParish(id: string, updates: Partial<Parish> & { contact_public?: boolean }) {
  const { error } = await supabase.from('parishes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  raise(error, 'Saving parish details');
}

export async function getParishPrivate(id: string): Promise<(Parish & { contact_public: boolean; status: string }) | null> {
  const { data, error } = await supabase.from('parishes').select('*').eq('id', id).maybeSingle();
  raise(error, 'Loading the parish');
  return data;
}

export async function listParishAdmins(parishId: string): Promise<(ParishAdmin & { display_name: string | null; church_title: string | null })[]> {
  const { data, error } = await supabase.from('parish_admins').select('*').eq('parish_id', parishId);
  raise(error, 'Loading administrators');
  const ids = (data ?? []).map(a => a.user_id);
  const { data: people } = ids.length
    ? await supabase.from('public_profiles').select('id, display_name, church_title').in('id', ids)
    : { data: [] as any[] };
  return (data ?? []).map(a => ({ ...a, ...(people?.find(p => p.id === a.user_id) ?? { display_name: null, church_title: null }) }));
}

/** Add a fellow administrator by the email they signed up with */
export async function addParishAdmin(parishId: string, email: string, role: ParishAdmin['role']) {
  const { data, error } = await supabase.rpc('find_user_by_email', { p_email: email.trim().toLowerCase() });
  raise(error, 'Finding that member');
  if (!data) throw new BackendError('No member has signed up with that email yet');
  const { error: insertError } = await supabase.from('parish_admins').upsert({ parish_id: parishId, user_id: data, role, verified: true });
  raise(insertError, 'Adding the administrator');
}

export async function removeParishAdmin(parishId: string, userId: string) {
  const { error } = await supabase.from('parish_admins').delete().match({ parish_id: parishId, user_id: userId });
  raise(error, 'Removing the administrator');
}

export async function parishPrayerRequests(parishId: string): Promise<SharedPrayerRequest[]> {
  const { data, error } = await supabase.from('prayer_requests').select('*').eq('parish_id', parishId).order('created_at', { ascending: false }).limit(200);
  raise(error, 'Loading prayer requests');
  return (data ?? []) as SharedPrayerRequest[];
}

export async function parishDonations(parishId: string): Promise<(Donation & { donor_name: string | null; is_anonymous: boolean })[]> {
  const { data, error } = await supabase.from('donations').select('*').eq('parish_id', parishId).order('created_at', { ascending: false }).limit(500);
  raise(error, 'Loading giving records');
  return (data ?? []) as any;
}

export async function parishEvents(parishId: string): Promise<ChurchEvent[]> {
  const { data, error } = await supabase.from('events').select('*').eq('parish_id', parishId).order('starts_at', { ascending: false }).limit(200);
  raise(error, 'Loading events');
  return (data ?? []) as ChurchEvent[];
}

export async function setEventStatus(id: string, status: ChurchEvent['status']) {
  const { error } = await supabase.from('events').update({ status }).eq('id', id);
  raise(error, 'Updating the event');
}

// ── Appointments ─────────────────────────────────────────────

export interface AppointmentSlot {
  id: string;
  parish_id: string;
  host_id: string;
  host_name: string;
  host_role: 'shepherd' | 'admin' | 'editor';
  weekday: number;
  start_time: string; // "16:00:00"
  end_time: string;
  minutes_per_meeting: number;
  location: string | null;
  active: boolean;
}

export interface Appointment {
  id: string;
  parish_id: string;
  host_id: string;
  member_id: string;
  member_name: string;
  member_phone: string | null;
  starts_at: string;
  ends_at: string;
  topic: string;
  details: string | null;
  status: 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'done';
  host_note: string | null;
  created_at: string;
}

export const APPOINTMENT_TOPICS = [
  'Spiritual counselling', 'Prayer and deliverance', 'Marriage and family', 'Child naming / dedication', 'Baptism',
  'Wedding arrangements', 'Burial / remembrance service', 'House dedication', 'Becoming a member', 'Other',
];

export async function listSlots(parishId: string, opts: { all?: boolean } = {}): Promise<AppointmentSlot[]> {
  let q = supabase.from('appointment_slots').select('*').eq('parish_id', parishId).order('weekday').order('start_time');
  if (!opts.all) q = q.eq('active', true);
  const { data, error } = await q;
  raise(error, 'Loading appointment times');
  return (data ?? []) as AppointmentSlot[];
}

export async function saveSlot(slot: Omit<AppointmentSlot, 'id' | 'host_id' | 'host_name'> & { id?: string; host_name?: string }) {
  const user = await requireUser();
  const row = { ...slot, host_id: user.id, host_name: slot.host_name || (user.user_metadata?.display_name as string) || 'Shepherd' };
  const { error } = slot.id
    ? await supabase.from('appointment_slots').update(row).eq('id', slot.id)
    : await supabase.from('appointment_slots').insert(row);
  raise(error, 'Saving the appointment time');
}

export async function deleteSlot(id: string) {
  const { error } = await supabase.from('appointment_slots').delete().eq('id', id);
  raise(error, 'Removing the appointment time');
}

/** Bookable times in the next `days` days, minus times already taken */
export async function availableTimes(slots: AppointmentSlot[], days = 21): Promise<{ slot: AppointmentSlot; start: Date; end: Date }[]> {
  if (!slots.length) return [];
  const from = new Date();
  const to = new Date(Date.now() + days * 86_400_000);
  const busy = new Map<string, { start: number; end: number }[]>();
  for (const hostId of new Set(slots.map(s => s.host_id))) {
    const { data } = await supabase.rpc('host_busy_times', { p_host: hostId, p_from: from.toISOString(), p_to: to.toISOString() });
    busy.set(hostId, (data ?? []).map((b: any) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() })));
  }
  const result: { slot: AppointmentSlot; start: Date; end: Date }[] = [];
  const minLead = Date.now() + 2 * 3_600_000; // at least two hours' notice
  for (let d = 0; d < days; d++) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + d);
    for (const slot of slots.filter(s => s.weekday === day.getDay())) {
      const [sh, sm] = slot.start_time.split(':').map(Number);
      const [eh, em] = slot.end_time.split(':').map(Number);
      for (let t = sh * 60 + sm; t + slot.minutes_per_meeting <= eh * 60 + em; t += slot.minutes_per_meeting) {
        const start = new Date(day); start.setHours(Math.floor(t / 60), t % 60, 0, 0);
        const end = new Date(start.getTime() + slot.minutes_per_meeting * 60_000);
        if (start.getTime() < minLead) continue;
        const taken = busy.get(slot.host_id)?.some(b => b.start < end.getTime() && b.end > start.getTime());
        if (!taken) result.push({ slot, start, end });
      }
    }
  }
  return result;
}

export async function bookAppointment(input: { slot: AppointmentSlot; start: Date; end: Date; topic: string; details: string; name: string; phone: string }) {
  const user = await requireUser();
  const { error } = await supabase.from('appointments').insert({
    parish_id: input.slot.parish_id, host_id: input.slot.host_id, member_id: user.id,
    member_name: input.name.trim() || 'A member', member_phone: input.phone.trim() || null,
    starts_at: input.start.toISOString(), ends_at: input.end.toISOString(),
    topic: input.topic, details: input.details.trim() || null, status: 'requested',
  });
  if (error?.code === '23505') throw new BackendError('Someone has just booked that time, please choose another');
  raise(error, 'Booking the appointment');
}

export async function myAppointments(): Promise<Appointment[]> {
  const user = await requireUser();
  const { data, error } = await supabase.from('appointments').select('*').eq('member_id', user.id).order('starts_at', { ascending: false });
  raise(error, 'Loading your appointments');
  return (data ?? []) as Appointment[];
}

export async function parishAppointments(parishId: string): Promise<Appointment[]> {
  const { data, error } = await supabase.from('appointments').select('*').eq('parish_id', parishId).order('starts_at').limit(300);
  raise(error, 'Loading appointments');
  return (data ?? []) as Appointment[];
}

export async function updateAppointment(id: string, updates: Partial<Pick<Appointment, 'status' | 'host_note'>>) {
  const { error } = await supabase.from('appointments').update(updates).eq('id', id);
  raise(error, 'Updating the appointment');
}
