import { supabase } from '../supabase';
import { raise } from './backend';

/**
 * The parish space: channels and posts for a parish's shepherds, workers and members, and the
 * rosters of who ministers at each service. Rules live in the database
 * (supabase/migrations/20261030000000_parish_space.sql); this file only reads and writes.
 */

export interface MySpace { parish_id: string; role: string; name: string; city: string | null; logo_url: string | null }
export interface SpacePerson { user_id: string; role: string; display_name: string | null; church_title: string | null; avatar_url: string | null; phone: string | null; email: string | null }
export interface Channel { id: string; parish_id: string; name: string; about: string | null }
export type Audience = 'space' | 'people' | 'link';
export interface Post {
  id: string; parish_id: string; channel_id: string | null; author_id: string; body: string; audience: Audience;
  share_token: string | null; created_at: string; edited_at: string | null;
  author_name: string | null; author_title: string | null; author_avatar: string | null;
}
export interface Duty { id?: string; roster_id?: string; position: number; duty: string; user_id: string | null; person_name: string | null; status?: 'assigned' | 'accepted' | 'declined'; response_note?: string | null }
export interface Roster {
  id: string; parish_id: string; service_date: string; service_id: string | null; title: string; notes: string | null;
  status: 'draft' | 'published'; share_token: string; parish_roster_duties?: Duty[];
}
export interface MyDuty { id: string; duty: string; status: Duty['status']; roster_id: string; service_date: string; service_id: string | null; title: string; parish_id: string; parish_name: string }

export const personName = (p: Pick<SpacePerson, 'church_title' | 'display_name'> | null | undefined) =>
  [p?.church_title, p?.display_name].filter(Boolean).join(' ') || 'Member';

// ── Spaces and people ────────────────────────────────────────

export async function mySpaces(): Promise<MySpace[]> {
  const { data, error } = await supabase.from('my_parish_spaces').select('*').order('name');
  raise(error, 'Loading your parish spaces');
  return (data ?? []) as MySpace[];
}

export async function spacePeople(parishId: string): Promise<SpacePerson[]> {
  const { data, error } = await supabase.rpc('parish_space_people', { pid: parishId });
  raise(error, 'Loading the people in this space');
  return (data ?? []) as SpacePerson[];
}

// ── Channels and posts ───────────────────────────────────────

export async function channels(parishId: string): Promise<Channel[]> {
  await supabase.rpc('ensure_general_channel', { pid: parishId });
  const { data, error } = await supabase.from('parish_channels').select('id, parish_id, name, about').eq('parish_id', parishId).order('created_at');
  raise(error, 'Loading the channels');
  return (data ?? []) as Channel[];
}

export async function addChannel(parishId: string, name: string, about: string) {
  const { error } = await supabase.from('parish_channels').insert({ parish_id: parishId, name: name.trim(), about: about.trim() || null });
  raise(error, 'Adding the channel');
}

export async function feed(parishId: string, channelId: string | null, limit = 50): Promise<Post[]> {
  let q = supabase.from('parish_feed').select('*').eq('parish_id', parishId).order('created_at', { ascending: false }).limit(limit);
  q = channelId ? q.eq('channel_id', channelId) : q.is('channel_id', null);
  const { data, error } = await q;
  raise(error, 'Loading the posts');
  return (data ?? []) as Post[];
}

export async function post(input: { parishId: string; channelId: string | null; body: string; audience: Audience; people: string[] }): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('parish_posts')
    .insert({ parish_id: input.parishId, channel_id: input.channelId, author_id: user?.id, body: input.body.trim(), audience: input.audience })
    .select('id, share_token').single();
  raise(error, 'Posting');
  if (input.audience === 'people' && input.people.length) {
    const { error: e2 } = await supabase.from('parish_post_people').insert(input.people.map(user_id => ({ post_id: data!.id, user_id })));
    raise(e2, 'Sending it to those people');
  }
  return data as unknown as Post;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('parish_posts').delete().eq('id', id);
  raise(error, 'Deleting the post');
}

export async function sharedPost(token: string) {
  const { data, error } = await supabase.rpc('shared_parish_post', { token });
  raise(error, 'Loading the post');
  return ((data ?? []) as { body: string; created_at: string; author_name: string | null; author_title: string | null; parish_name: string; parish_id: string }[])[0] ?? null;
}

// ── Rosters ──────────────────────────────────────────────────

/** Duties usually given out for each service; the planner can add, remove and rename them */
export const DUTY_TEMPLATES: Record<string, string[]> = {
  lords_day_service: ['Service conductor', 'Incense bearer', 'First lesson reader', 'Second lesson reader', 'Announcements (parish secretary)', 'Preacher (sermon)', 'Prayer after sermon', 'Closing prayer (female member)', 'Offerings'],
  evening_service_lords_day: ['Service conductor', 'Incense bearer', 'Bible lesson reader', 'Preacher (sermon)', 'Closing prayer (female member)'],
  mercy_day_service: ['Service conductor', 'Incense bearer', 'Bible lesson reader', 'Preacher (sermon)', 'Closing prayer (female member)'],
  power_day_service: ['Service conductor', 'Incense bearer', 'Bible lesson reader', 'Preacher (sermon)', 'Closing prayer (female member)'],
  seekers_service: ['Service conductor', 'Bible lesson reader', 'Prayer of blessing', 'Closing prayer (female member)'],
  morning_service: ['Service conductor', 'Closing prayer (female member)'],
};
export const DEFAULT_DUTIES = ['Service conductor', 'Incense bearer', 'First lesson reader', 'Second lesson reader', 'Preacher (sermon)', 'Closing prayer (female member)'];

export async function rosters(parishId: string): Promise<Roster[]> {
  const from = new Date(); from.setDate(from.getDate() - 7);
  const { data, error } = await supabase.from('parish_rosters')
    .select('*, parish_roster_duties(*)').eq('parish_id', parishId).gte('service_date', from.toISOString().slice(0, 10))
    .order('service_date');
  raise(error, 'Loading the rosters');
  return ((data ?? []) as Roster[]).map(r => ({ ...r, parish_roster_duties: [...(r.parish_roster_duties ?? [])].sort((a, b) => a.position - b.position) }));
}

export async function saveRoster(input: { id?: string; parishId: string; serviceDate: string; serviceId: string | null; title: string; notes: string; status: Roster['status']; duties: Duty[] }): Promise<string> {
  const row = { parish_id: input.parishId, service_date: input.serviceDate, service_id: input.serviceId, title: input.title.trim(), notes: input.notes.trim() || null, status: input.status, updated_at: new Date().toISOString() };
  let id = input.id;
  if (id) {
    const { error } = await supabase.from('parish_rosters').update(row).eq('id', id);
    raise(error, 'Saving the roster');
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('parish_rosters').insert({ ...row, created_by: user?.id }).select('id').single();
    raise(error, 'Saving the roster');
    id = data!.id as string;
  }
  // Duties are replaced as a whole; answers already given are kept for the same person on the same duty
  const { data: old } = await supabase.from('parish_roster_duties').select('duty, user_id, status, response_note').eq('roster_id', id);
  const { error: delError } = await supabase.from('parish_roster_duties').delete().eq('roster_id', id);
  raise(delError, 'Saving the duties');
  const rows = input.duties.filter(d => d.duty.trim()).map((d, i) => {
    const prev = (old ?? []).find(o => o.duty === d.duty && o.user_id && o.user_id === d.user_id);
    return { roster_id: id, position: i, duty: d.duty.trim(), user_id: d.user_id, person_name: d.user_id ? null : (d.person_name?.trim() || null), status: prev?.status ?? 'assigned', response_note: prev?.response_note ?? null };
  });
  if (rows.length) {
    const { error } = await supabase.from('parish_roster_duties').insert(rows);
    raise(error, 'Saving the duties');
  }
  return id!;
}

export async function deleteRoster(id: string) {
  const { error } = await supabase.from('parish_rosters').delete().eq('id', id);
  raise(error, 'Deleting the roster');
}

export async function myDuties(): Promise<MyDuty[]> {
  const { data, error } = await supabase.from('my_duties').select('*').order('service_date');
  if (error) return [];
  return (data ?? []) as MyDuty[];
}

export async function respond(dutyId: string, answer: 'accepted' | 'declined', note?: string) {
  const { error } = await supabase.rpc('respond_to_duty', { duty_id: dutyId, answer, note: note ?? null });
  raise(error, 'Sending your answer');
}

export async function sharedRoster(token: string) {
  const { data, error } = await supabase.rpc('shared_roster', { token });
  raise(error, 'Loading the roster');
  return (data ?? []) as { title: string; service_date: string; service_id: string | null; notes: string | null; parish_name: string; duty: string | null; person: string | null; status: string | null; seq: number | null }[];
}

/** The roster as a message for WhatsApp, SMS or email */
export function rosterMessage(r: { title: string; service_date: string; notes?: string | null }, duties: { duty: string; person: string | null }[], link: string, parishName: string) {
  const date = new Date(`${r.service_date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const lines = duties.map(d => `• ${d.duty}: ${d.person || '—'}`);
  return [`*${parishName} — ${r.title}*`, date, '', ...lines, ...(r.notes ? ['', r.notes] : []), '', link].join('\n');
}

// ── Joining ──────────────────────────────────────────────────

export interface JoinRequest { id: string; user_id: string; display_name: string | null; church_title: string | null; note: string | null; created_at: string }
export interface InviteDetails { parish_id: string; parish_name: string; city: string | null; logo_url: string | null; role: string; invited_by: string | null; for_email: boolean; valid: boolean }

export async function requestToJoin(parishId: string, note?: string): Promise<'pending' | 'member'> {
  const { data, error } = await supabase.rpc('request_to_join_space', { pid: parishId, p_note: note ?? null });
  raise(error, 'Asking to join');
  return data as 'pending' | 'member';
}

/** This member's answer-in-waiting for a parish, if any */
export async function myRequest(parishId: string): Promise<'pending' | 'declined' | null> {
  const { data } = await supabase.from('parish_space_requests').select('status').eq('parish_id', parishId).maybeSingle();
  return data?.status === 'pending' || data?.status === 'declined' ? data.status : null;
}

export async function spaceRequests(parishId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase.rpc('space_requests', { pid: parishId });
  raise(error, 'Loading the requests to join');
  return (data ?? []) as JoinRequest[];
}

export async function decideRequest(id: string, approve: boolean, role: 'member' | 'minister' = 'member') {
  const { error } = await supabase.rpc('decide_space_request', { req_id: id, approve, p_role: role });
  raise(error, 'Answering the request');
}

export async function createInvite(parishId: string, role: string, email?: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_space_invite', { pid: parishId, p_role: role, p_email: email?.trim() || null });
  raise(error, 'Making the invitation');
  return `${window.location.origin}/join/${data as string}`;
}

export async function inviteDetails(token: string): Promise<InviteDetails | null> {
  const { data, error } = await supabase.rpc('space_invite_details', { p_token: token });
  raise(error, 'Loading the invitation');
  return ((data ?? []) as InviteDetails[])[0] ?? null;
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_space_invite', { p_token: token });
  raise(error, 'Joining the parish space');
  return data as string;
}

export async function myInvites(): Promise<{ token: string; parish_id: string; parish_name: string; role: string }[]> {
  const { data, error } = await supabase.rpc('my_space_invites');
  if (error) return [];
  return (data ?? []) as { token: string; parish_id: string; parish_name: string; role: string }[];
}

export async function leaveSpace(parishId: string) {
  const { error } = await supabase.rpc('leave_space', { pid: parishId });
  raise(error, 'Leaving the space');
}
