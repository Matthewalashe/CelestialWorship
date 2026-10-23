import { supabase } from '../supabase';
import { raise, BackendError } from './backend';

/**
 * Data access for the shared (community) features. Tables and their Row Level Security
 * are defined in supabase/migrations. Every write is checked again on the server:
 * members can only submit, moderators publish.
 */

async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new BackendError('Please sign in first');
  return data.user;
}

async function myName(fallback = 'A Celestian'): Promise<string> {
  const user = await requireUser();
  const { data } = await supabase.from('profiles').select('display_name, church_title').eq('id', user.id).maybeSingle();
  const name = [data?.church_title, data?.display_name].filter(Boolean).join(' ');
  return name || (user.user_metadata?.display_name as string) || fallback;
}

// ── Prayer requests ──────────────────────────────────────────

export type PrayerVisibility = 'church' | 'parish' | 'shepherd';
export type PrayerRequestStatus = 'pending' | 'published' | 'answered' | 'hidden';

export interface SharedPrayerRequest {
  id: string;
  user_id: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  title: string;
  body: string | null;
  category: string | null;
  parish_id: string | null;
  visibility: PrayerVisibility;
  status: PrayerRequestStatus;
  testimony: string | null;
  prayer_count: number;
  created_at: string;
}

export async function listPrayerRequests(opts: { mine?: boolean; status?: PrayerRequestStatus[] } = {}): Promise<SharedPrayerRequest[]> {
  let q = supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }).limit(100);
  if (opts.mine) {
    const user = await requireUser();
    q = q.eq('user_id', user.id);
  } else {
    q = q.in('status', opts.status ?? ['published', 'answered']);
  }
  const { data, error } = await q;
  raise(error, 'Loading prayer requests');
  return (data ?? []) as SharedPrayerRequest[];
}

export async function submitPrayerRequest(input: {
  title: string; body: string; category?: string; isAnonymous: boolean; visibility: PrayerVisibility; parishId?: string | null;
}) {
  const user = await requireUser();
  const { error } = await supabase.from('prayer_requests').insert({
    user_id: user.id,
    display_name: input.isAnonymous ? null : await myName(),
    is_anonymous: input.isAnonymous,
    title: input.title.trim(),
    body: input.body.trim() || null,
    category: input.category || null,
    visibility: input.visibility,
    parish_id: input.parishId ?? null,
    status: 'pending',
  });
  raise(error, 'Sending your prayer request');
}

export async function prayForRequest(requestId: string) {
  const user = await requireUser();
  const { error } = await supabase.from('prayer_support').insert({ request_id: requestId, user_id: user.id });
  // Praying twice is fine; the server keeps one record per person
  if (error && error.code !== '23505') raise(error, 'Recording your prayer');
}

export async function markRequestAnswered(id: string, testimony: string) {
  const { error } = await supabase.from('prayer_requests').update({ status: 'answered', testimony: testimony.trim() || null }).eq('id', id);
  raise(error, 'Updating the request');
}

export async function deletePrayerRequest(id: string) {
  const { error } = await supabase.from('prayer_requests').delete().eq('id', id);
  raise(error, 'Deleting the request');
}

// ── Articles & commentaries ──────────────────────────────────

export type ArticleKind = 'article' | 'bible_commentary' | 'lesson_commentary' | 'hymn_commentary' | 'devotional' | 'testimony' | 'sermon_notes';
export type ArticleStatus = 'draft' | 'submitted' | 'published' | 'rejected' | 'archived';

export const ARTICLE_KINDS: Record<ArticleKind, string> = {
  article: 'Article',
  bible_commentary: 'Bible commentary',
  lesson_commentary: 'Lesson commentary',
  hymn_commentary: 'Hymn commentary',
  devotional: 'Devotional',
  testimony: 'Testimony',
  sermon_notes: 'Sermon notes',
};

export type ArticleReference =
  | { kind: 'bible'; book: string; chapter: number; verseStart: number; verseEnd: number }
  | { kind: 'hymn'; number: number }
  | { kind: 'lesson'; date: string };

export interface Article {
  id: string;
  author_id: string;
  author_name: string;
  kind: ArticleKind;
  title: string;
  summary: string | null;
  body: string;
  language: string;
  reference: ArticleReference | null;
  tags: string[];
  status: ArticleStatus;
  moderation_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** The author's parish or ministry that receives support for this article */
  support_parish_id?: string | null;
}

export interface ArticleInput {
  kind: ArticleKind;
  title: string;
  summary: string;
  body: string;
  language: string;
  reference: ArticleReference | null;
  tags: string[];
  support_parish_id?: string | null;
}

export async function listArticles(opts: { kind?: ArticleKind; reference?: ArticleReference; mine?: boolean; search?: string; author?: string; limit?: number } = {}): Promise<Article[]> {
  let q = supabase.from('articles').select('*').limit(opts.limit ?? 100);
  if (opts.mine) {
    const user = await requireUser();
    q = q.eq('author_id', user.id).order('updated_at', { ascending: false });
  } else {
    q = q.eq('status', 'published').order('published_at', { ascending: false });
  }
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.author) q = q.eq('author_id', opts.author);
  if (opts.reference) {
    // Match commentaries on the same passage / hymn / lesson
    const r = opts.reference;
    q = r.kind === 'bible'
      ? q.contains('reference', { kind: 'bible', book: r.book, chapter: r.chapter })
      : q.contains('reference', r);
  }
  if (opts.search?.trim()) q = q.ilike('title', `%${opts.search.trim()}%`);
  const { data, error } = await q;
  raise(error, 'Loading articles');
  return (data ?? []) as Article[];
}

/** An article's author as the public sees them */
export interface ArticleAuthor { id: string; name: string; memberType: string; verified: boolean; parishName: string | null; avatarUrl: string | null }

export async function getAuthor(id: string): Promise<ArticleAuthor | null> {
  const { data, error } = await supabase.from('public_profiles')
    .select('id, display_name, church_title, member_type, verification_status, parish_id, avatar_url').eq('id', id).maybeSingle();
  if (error || !data) return null;
  let parishName: string | null = null;
  if (data.parish_id) {
    const { data: parish } = await supabase.from('parish_directory').select('name').eq('id', data.parish_id).maybeSingle();
    parishName = parish?.name ?? null;
  }
  return {
    id: data.id,
    name: [data.church_title, data.display_name].filter(Boolean).join(' ') || 'A shepherd',
    memberType: data.member_type,
    verified: data.verification_status === 'verified',
    parishName,
    avatarUrl: data.avatar_url ?? null,
  };
}

export async function getArticle(id: string): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
  raise(error, 'Loading the article');
  return data as Article | null;
}

/** Save an article; `submit` sends it to moderators for publishing */
export async function saveArticle(input: ArticleInput, opts: { id?: string; submit: boolean }): Promise<string> {
  const user = await requireUser();
  const row = {
    ...input,
    title: input.title.trim(),
    summary: input.summary.trim() || null,
    author_id: user.id,
    author_name: await myName(),
    status: opts.submit ? 'submitted' : 'draft',
  };
  if (opts.id) {
    const { error } = await supabase.from('articles').update(row).eq('id', opts.id);
    raise(error, 'Saving the article');
    return opts.id;
  }
  const { data, error } = await supabase.from('articles').insert(row).select('id').single();
  raise(error, 'Saving the article');
  return data!.id;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  raise(error, 'Deleting the article');
}

export interface ArticleComment { id: string; article_id: string; user_id: string; author_name: string; body: string; created_at: string }

export async function listComments(articleId: string): Promise<ArticleComment[]> {
  const { data, error } = await supabase.from('article_comments').select('*').eq('article_id', articleId).order('created_at');
  raise(error, 'Loading comments');
  return (data ?? []) as ArticleComment[];
}

export async function addComment(articleId: string, body: string) {
  const user = await requireUser();
  const { error } = await supabase.from('article_comments').insert({ article_id: articleId, user_id: user.id, author_name: await myName(), body: body.trim() });
  raise(error, 'Posting your comment');
}

export async function reactionCounts(articleId: string): Promise<{ amen: number; mine: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('article_reactions').select('user_id').eq('article_id', articleId).eq('kind', 'amen');
  if (error) return { amen: 0, mine: false };
  return { amen: data.length, mine: !!user && data.some(r => r.user_id === user.id) };
}

export async function toggleAmen(articleId: string, on: boolean) {
  const user = await requireUser();
  const { error } = on
    ? await supabase.from('article_reactions').insert({ article_id: articleId, user_id: user.id, kind: 'amen' })
    : await supabase.from('article_reactions').delete().match({ article_id: articleId, user_id: user.id, kind: 'amen' });
  if (error && error.code !== '23505') raise(error, 'Saving your response');
}

// ── Events ───────────────────────────────────────────────────

export type EventCategory = 'service' | 'social' | 'youth' | 'harvest' | 'anniversary' | 'convention' | 'crusade' | 'wedding' | 'memorial' | 'meeting' | 'other';

export const EVENT_CATEGORIES: Record<EventCategory, string> = {
  service: 'Special service', social: 'Social', youth: 'Youth', harvest: 'Harvest', anniversary: 'Anniversary',
  convention: 'Convention / pilgrimage', crusade: 'Crusade / outreach', wedding: 'Wedding', memorial: 'Remembrance',
  meeting: 'Meeting', other: 'Other',
};

export interface ChurchEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  parish_id: string | null;
  scope: 'church' | 'parish';
  contact: string | null;
  status: 'pending' | 'published' | 'cancelled' | 'rejected';
  submitted_by: string | null;
  /** Calendar entries generated by the app (liturgical calendar), not stored in the database */
  builtIn?: boolean;
}

export async function listEvents(from: Date, to: Date, opts: { mine?: boolean } = {}): Promise<ChurchEvent[]> {
  let q = supabase.from('events').select('*')
    .gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString())
    .order('starts_at').limit(500);
  if (opts.mine) {
    const user = await requireUser();
    q = q.eq('submitted_by', user.id);
  } else {
    q = q.in('status', ['published', 'cancelled']);
  }
  const { data, error } = await q;
  raise(error, 'Loading events');
  return (data ?? []) as ChurchEvent[];
}

export async function submitEvent(input: Omit<ChurchEvent, 'id' | 'status' | 'submitted_by' | 'builtIn'>) {
  const user = await requireUser();
  const { error } = await supabase.from('events').insert({ ...input, submitted_by: user.id, status: 'published' });
  // The server keeps it pending unless the submitter is a verified admin of that parish
  raise(error, 'Adding the event');
}

// ── Donations ────────────────────────────────────────────────

export type DonationPurpose = 'tithe' | 'offering' | 'thanksgiving' | 'building' | 'harvest' | 'welfare' | 'mission' | 'pledge' | 'support' | 'other';

export const DONATION_PURPOSES: Record<DonationPurpose, string> = {
  tithe: 'Tithe', offering: 'Offering', thanksgiving: 'Thanksgiving', building: 'Building fund', harvest: 'Harvest',
  welfare: 'Welfare', mission: 'Mission & evangelism', pledge: 'Pledge', support: 'Support a shepherd’s ministry', other: 'Other',
};

export interface Donation {
  id: string;
  parish_id: string | null;
  purpose: DonationPurpose;
  amount_minor: number;
  currency: string;
  note: string | null;
  status: 'initiated' | 'paid' | 'failed' | 'pledged' | 'fulfilled' | 'cancelled';
  provider_reference: string | null;
  pledge_due: string | null;
  paid_at: string | null;
  created_at: string;
}

export async function createDonation(input: {
  parishId: string | null; purpose: DonationPurpose; amountMinor: number; currency: string; note: string;
  donorEmail: string; donorName: string; isAnonymous: boolean; pledgeDue?: string;
  /** What the gift responds to: an article or a broadcast */
  source?: { kind: 'article' | 'livestream'; id: string };
}): Promise<Donation> {
  const { data: { user } } = await supabase.auth.getUser();
  const reference = `CW-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
  const { data, error } = await supabase.from('donations').insert({
    user_id: user?.id ?? null,
    parish_id: input.parishId,
    purpose: input.purpose,
    amount_minor: input.amountMinor,
    currency: input.currency,
    note: input.note.trim() || null,
    donor_email: input.donorEmail || null,
    donor_name: input.isAnonymous ? null : input.donorName || null,
    is_anonymous: input.isAnonymous,
    provider_reference: reference,
    status: input.pledgeDue ? 'pledged' : 'initiated',
    pledge_due: input.pledgeDue ?? null,
    source_kind: input.source?.kind ?? null,
    source_id: input.source?.id ?? null,
  }).select('*').single();
  raise(error, 'Recording your gift');
  return data as Donation;
}

export async function listMyDonations(): Promise<Donation[]> {
  const user = await requireUser();
  const { data, error } = await supabase.from('donations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  raise(error, 'Loading your giving history');
  return (data ?? []) as Donation[];
}

/** Ask the server to confirm a payment with the provider (verify-payment Edge Function) */
export async function verifyDonation(reference: string): Promise<Donation['status']> {
  const { data, error } = await supabase.functions.invoke('verify-payment', { body: { reference } });
  if (error) throw new BackendError('We could not confirm the payment yet. If you were charged, it will show once confirmed.');
  return data?.status ?? 'initiated';
}

// ── Moderation ───────────────────────────────────────────────

export async function moderationQueue() {
  const [prayers, articles, events, parishes, verifications, reports, translations] = await Promise.all([
    supabase.from('prayer_requests').select('*').eq('status', 'pending').order('created_at'),
    supabase.from('articles').select('*').eq('status', 'submitted').order('updated_at'),
    supabase.from('events').select('*').eq('status', 'pending').order('starts_at'),
    supabase.from('parishes').select('*').eq('status', 'pending').order('created_at'),
    supabase.from('verification_requests').select('*').eq('status', 'pending').order('created_at'),
    supabase.from('content_reports').select('*').eq('status', 'open').order('created_at'),
    supabase.from('hymn_translations').select('*').eq('status', 'submitted').order('created_at'),
  ]);
  for (const r of [prayers, articles, events, parishes, verifications, reports, translations]) raise(r.error, 'Loading the moderation queue');
  return {
    prayers: prayers.data ?? [], articles: articles.data ?? [], events: events.data ?? [], parishes: parishes.data ?? [],
    verifications: verifications.data ?? [], reports: reports.data ?? [], translations: translations.data ?? [],
  };
}

export async function moderate(table: string, id: string, update: Record<string, unknown>) {
  const { error } = await supabase.from(table).update(update).eq('id', id);
  raise(error, 'Saving the decision');
}

export async function reportContent(targetKind: string, targetId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('content_reports').insert({ reporter_id: user?.id ?? null, target_kind: targetKind, target_id: targetId, reason });
  raise(error, 'Sending your report');
}
