import { supabase } from '../supabase';
import { raise, isMissingTable, BackendError } from './backend';
import { resizeImage } from '../utils/imageResize';
import type { Parish } from '../hooks/useParishes';

/**
 * Claiming a parish (supabase/migrations/20261027000000_church_structure.sql): a shepherd or administrator
 * of a listed parish applies with evidence; a moderator approves, which publishes the parish with their
 * contact details and gives them the role so they can administer it.
 */

export type ClaimRole = 'shepherd' | 'admin' | 'parochial_committee' | 'media' | 'choir';

export const CLAIM_ROLES: Record<ClaimRole, string> = {
  shepherd: 'Shepherd of the parish', admin: 'Church administrator', parochial_committee: 'Parochial committee',
  media: 'Media team', choir: 'Choir',
};

export const EVIDENCE_HINT = 'A letter of appointment or posting, a certificate of investiture, the parish’s registration with your name, or a photo of you at the parish with its signboard.';

export interface ParishClaim {
  id: string; user_id: string; listed_id: string | null; parish_id: string | null; role: ClaimRole; office: string | null;
  details: Record<string, string>; evidence_paths: string[]; note: string | null; status: 'pending' | 'approved' | 'rejected';
  review_note: string | null; created_at: string;
}

export async function submitClaim(input: {
  parish: Parish; role: ClaimRole; office: string; note: string; files: File[];
  details: { name: string; country: string; state_region: string; city: string; address: string; phone: string; email: string; shepherd_name: string };
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new BackendError('Sign in first');
  if (!input.files.length) throw new BackendError('Add at least one piece of evidence');
  const paths: string[] = [];
  for (const [i, f] of input.files.slice(0, 5).entries()) {
    if (f.size > 10 * 1024 * 1024) throw new BackendError(`${f.name} is larger than 10 MB`);
    const body = f.type.startsWith('image/') ? await resizeImage(f, { maxWidth: 2000, maxHeight: 2000, quality: 0.85 }) : f;
    const ext = body.type === 'application/pdf' ? 'pdf' : body.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${Date.now().toString(36)}-${i}.${ext}`;
    const { error } = await supabase.storage.from('evidence').upload(path, body, { contentType: body.type });
    if (error) throw new BackendError(/bucket|not found/i.test(error.message) ? 'Claims open when the church’s online service is set up.' : `Upload failed: ${error.message}`, true);
    paths.push(path);
  }
  const listed = input.parish.seed;
  const { error } = await supabase.from('parish_claims').insert({
    user_id: user.id,
    listed_id: listed ? input.parish.id : null,
    parish_id: listed ? null : input.parish.id,
    role: input.role, office: input.office.trim() || null, note: input.note.trim() || null,
    details: { ...input.details, continent: input.parish.continent ?? undefined },
    evidence_paths: paths,
  });
  raise(error, 'Sending your claim');
}

export async function myClaims(): Promise<ParishClaim[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('parish_claims').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { if (isMissingTable(error)) return []; raise(error, 'Loading your claims'); }
  return (data ?? []) as ParishClaim[];
}

// ── Moderators ───────────────────────────────────────────────

export async function pendingClaims(): Promise<ParishClaim[]> {
  const { data, error } = await supabase.from('parish_claims').select('*').eq('status', 'pending').order('created_at');
  if (error) { if (isMissingTable(error)) return []; raise(error, 'Loading claims'); }
  return (data ?? []) as ParishClaim[];
}

/** Short-lived links to view the private evidence */
export async function evidenceLinks(paths: string[]): Promise<string[]> {
  const { data, error } = await supabase.storage.from('evidence').createSignedUrls(paths, 600);
  if (error) return [];
  return (data ?? []).map(d => d.signedUrl).filter(Boolean) as string[];
}

export async function approveClaim(id: string, note?: string) {
  const { error } = await supabase.rpc('approve_parish_claim', { claim_id: id, p_note: note ?? null });
  raise(error, 'Approving the claim');
}

export async function rejectClaim(id: string, note: string) {
  const { error } = await supabase.from('parish_claims').update({ status: 'rejected', review_note: note }).eq('id', id);
  raise(error, 'Rejecting the claim');
}
