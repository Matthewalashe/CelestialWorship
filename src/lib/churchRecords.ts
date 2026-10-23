import { supabase } from '../supabase';
import { raise, isMissingTable, BackendError } from './backend';

/**
 * A member's church record and a shepherd's ministry history
 * (supabase/migrations/20261027000000_church_structure.sql). Private unless the person makes an entry public.
 */

export type RecordKind = 'birth' | 'baptism' | 'rank' | 'investiture' | 'anointing' | 'ordination' | 'education'
  | 'certificate' | 'studentship' | 'stewardship' | 'travel' | 'other';

export const RECORD_KINDS: Record<RecordKind, { label: string; title: string; place: string; officiant?: string; dates: 'one' | 'range'; publicByDefault: boolean; hint?: string }> = {
  birth: { label: 'Birth', title: 'Where you were born', place: 'Parish or hospital', officiant: 'Shepherd of the parish at the time', dates: 'one', publicByDefault: false, hint: 'If you were born into the Church, name the parish and its shepherd.' },
  baptism: { label: 'Baptism', title: 'Baptism', place: 'Parish', officiant: 'Shepherd who baptised you', dates: 'one', publicByDefault: false },
  rank: { label: 'Rank', title: 'Rank received', place: 'Parish or headquarters', officiant: 'Promoted by', dates: 'one', publicByDefault: true },
  investiture: { label: 'Investiture', title: 'Investiture (robing)', place: 'Parish or headquarters', officiant: 'Officiated by', dates: 'one', publicByDefault: true },
  anointing: { label: 'Anointment', title: 'Anointment', place: 'Where', officiant: 'Anointed by (the Pastor)', dates: 'one', publicByDefault: true, hint: 'Anointment is performed by the Pastor, usually at Christmas / New Year (Constitution cl. 198).' },
  ordination: { label: 'Ordination', title: 'Ordained or appointed as', place: 'Parish or headquarters', officiant: 'By', dates: 'one', publicByDefault: true },
  education: { label: 'Education', title: 'Course or qualification', place: 'School or institution', dates: 'range', publicByDefault: true },
  certificate: { label: 'Certificate', title: 'Certificate', place: 'Awarded by', dates: 'one', publicByDefault: true },
  studentship: { label: 'Studentship', title: 'Studied under / trained as', place: 'Parish, seminary or school', officiant: 'Teacher or mentor', dates: 'range', publicByDefault: true },
  stewardship: { label: 'Stewardship', title: 'Office held', place: 'Parish, circuit, province…', dates: 'range', publicByDefault: true, hint: 'e.g. Shepherd-in-charge, Head of Circuit, Choir master' },
  travel: { label: 'Travel & mission', title: 'Mission or travel', place: 'Where', dates: 'range', publicByDefault: true },
  other: { label: 'Other', title: 'Title', place: 'Where', dates: 'range', publicByDefault: false },
};

export interface ChurchRecord {
  id: string;
  user_id: string;
  kind: RecordKind;
  title: string | null;
  parish_id: string | null;
  place: string | null;
  officiant: string | null;
  start_date: string | null;
  end_date: string | null;
  details: string | null;
  is_public: boolean;
  born_in_ccc: boolean | null;
}

export async function listRecords(userId?: string): Promise<ChurchRecord[] | null> {
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    uid = user.id;
  }
  const { data, error } = await supabase.from('church_records').select('*').eq('user_id', uid).order('start_date', { ascending: true, nullsFirst: true });
  if (error) {
    if (isMissingTable(error)) return null;
    raise(error, 'Loading the church record');
  }
  return (data ?? []) as ChurchRecord[];
}

export async function saveRecord(r: Partial<ChurchRecord> & { kind: RecordKind }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new BackendError('Sign in first');
  const row = { ...r, user_id: user.id, title: r.title?.trim() || null, place: r.place?.trim() || null, officiant: r.officiant?.trim() || null,
                details: r.details?.trim() || null, start_date: r.start_date || null, end_date: r.end_date || null };
  const { error } = r.id
    ? await supabase.from('church_records').update(row).eq('id', r.id)
    : await supabase.from('church_records').insert(row);
  raise(error, 'Saving the record');
}

export async function deleteRecord(id: string) {
  const { error } = await supabase.from('church_records').delete().eq('id', id);
  raise(error, 'Deleting the record');
}

export interface PublicPerson {
  id: string; name: string; member_type: string; verified: boolean; parish_id: string | null;
  avatar_url: string | null; banner_url: string | null; rank: string | null; office: string | null; office_scope: string | null; bio: string | null;
  authenticated_by: string | null;
}

export async function getPerson(id: string): Promise<PublicPerson | null> {
  const { data, error } = await supabase.from('public_profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return {
    ...data,
    name: [data.church_title, data.display_name].filter(Boolean).join(' ') || 'A Celestian',
    verified: data.verification_status === 'verified',
  } as PublicPerson;
}

// ── Parish: shepherds waiting to be confirmed ────────────────

export async function shepherdClaims(parishId: string) {
  const { data, error } = await supabase.rpc('parish_shepherd_claims', { pid: parishId });
  if (error) { if (isMissingTable(error)) return []; raise(error, 'Loading shepherds'); }
  return (data ?? []) as { id: string; display_name: string | null; church_title: string | null; rank: string | null }[];
}

export async function authenticateShepherd(parishId: string, userId: string, office = 'Shepherd') {
  const { error } = await supabase.rpc('authenticate_shepherd', { pid: parishId, uid: userId, p_office: office });
  raise(error, 'Authenticating the shepherd');
}

// ── Parish: sister parishes ──────────────────────────────────

export async function listRelations(parishId: string) {
  const { data, error } = await supabase.from('parish_relations').select('related_id, relation').eq('parish_id', parishId);
  if (error) { if (isMissingTable(error)) return []; raise(error, 'Loading sister parishes'); }
  return (data ?? []) as { related_id: string; relation: 'sister' | 'branch' }[];
}

export async function addRelation(parishId: string, relatedId: string, relation: 'sister' | 'branch') {
  const { error } = await supabase.from('parish_relations').upsert({ parish_id: parishId, related_id: relatedId, relation });
  raise(error, 'Adding the parish');
}

export async function removeRelation(parishId: string, relatedId: string) {
  const { error } = await supabase.from('parish_relations').delete().eq('parish_id', parishId).eq('related_id', relatedId);
  raise(error, 'Removing the parish');
}
