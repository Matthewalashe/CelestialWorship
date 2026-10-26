import { supabase } from '../supabase';
import { raise, isMissingTable, BackendError } from './backend';
import { invoke } from './payments';
import { safeHref } from '../utils/safeUrl';

/**
 * Livestreaming (supabase/migrations/20261025000000_partner_plan_live.sql).
 *
 * Parishes stream with the tools they already use: YouTube Studio, Facebook Live Producer, OBS,
 * Restream for several platforms at once, and the app does the rest: one place to watch, one
 * schedule, alerts to members and followers, and sharing to every social network.
 */

export type LivePlatform = 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'x' | 'mixlr' | 'website' | 'other';

export const PLATFORMS: Record<LivePlatform, { label: string; hint: string }> = {
  youtube: { label: 'YouTube', hint: 'https://youtube.com/live/…' },
  facebook: { label: 'Facebook', hint: 'https://facebook.com/…/videos/…' },
  instagram: { label: 'Instagram', hint: 'https://instagram.com/yourpage/live' },
  tiktok: { label: 'TikTok', hint: 'https://tiktok.com/@yourpage/live' },
  x: { label: 'X', hint: 'https://x.com/yourpage' },
  mixlr: { label: 'Mixlr (audio)', hint: 'https://yourpage.mixlr.com' },
  website: { label: 'Website', hint: 'https://…' },
  other: { label: 'Other', hint: 'https://…' },
};

/** A parish's channels, saved once */
export interface LiveChannels {
  youtube_channel_id?: string;
  youtube?: string; facebook?: string; instagram?: string; tiktok?: string; x?: string; mixlr?: string;
}

export interface Destination { platform: LivePlatform; url: string }

export interface Livestream {
  id: string;
  parish_id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  destinations: Destination[];
  started_at: string | null;
  ended_at: string | null;
  notified_at: string | null;
  created_at: string;
}

// ── Watching ─────────────────────────────────────────────────

/** YouTube video / live ids from the URL shapes people paste */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (u.hostname.endsWith('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]{6,})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

/** A YouTube channel id ("UC…") from a channel URL, when the URL contains it */
export function youTubeChannelId(input: string): string | null {
  const t = input.trim();
  if (/^UC[\w-]{22}$/.test(t)) return t;
  const m = t.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  return m ? m[1] : null;
}

/** The player to show for a destination, if the platform allows embedding */
export function embedUrl(d: Destination): string | null {
  if (!safeHref(d.url)) return null;
  if (d.platform === 'youtube' || /youtu\.?be/.test(d.url)) {
    const id = youTubeId(d.url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1&mute=1` : null;
  }
  if (d.platform === 'facebook' && /facebook\.com|fb\.watch/.test(d.url)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(d.url)}&show_text=false&autoplay=true&mute=true`;
  }
  return null;
}

/** Whatever is live on a YouTube channel right now, without a link per service */
export function channelLiveEmbed(channelId: string): string {
  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1&mute=1`;
}

/** The best player for a broadcast: the first embeddable destination, else the parish's YouTube channel */
export function bestEmbed(stream: Pick<Livestream, 'destinations'>, channels?: LiveChannels | null): string | null {
  for (const d of stream.destinations) {
    const e = embedUrl(d);
    if (e) return e;
  }
  return channels?.youtube_channel_id ? channelLiveEmbed(channels.youtube_channel_id) : null;
}

/** A "live" flag older than this is treated as stale (someone forgot to end it) */
const LIVE_STALE_MS = 6 * 3_600_000;
export function isStreamLive(s: Pick<Livestream, 'status' | 'started_at'>): boolean {
  return s.status === 'live' && (!s.started_at || Date.now() - new Date(s.started_at).getTime() < LIVE_STALE_MS);
}

// ── Sharing ──────────────────────────────────────────────────

export function streamLink(id: string): string {
  return `${window.location.origin}/live/${id}`;
}

export function shareTargets(text: string, url: string): { label: string; href: string }[] {
  const t = encodeURIComponent(text), u = encodeURIComponent(url), both = encodeURIComponent(`${text} ${url}`);
  return [
    { label: 'WhatsApp', href: `https://wa.me/?text=${both}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
}

export function shareMessage(parishName: string, s: Pick<Livestream, 'title' | 'status' | 'scheduled_at'>): string {
  if (s.status === 'live') return `🔴 ${parishName} is live now: ${s.title}. Join us`;
  const when = s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'soon';
  return `${parishName} goes live ${when}: ${s.title}. Watch with us`;
}

// ── Data ─────────────────────────────────────────────────────

export async function listLivestreams(opts: { parishId?: string; upcoming?: boolean; live?: boolean; recent?: boolean; limit?: number } = {}): Promise<Livestream[] | null> {
  let q = supabase.from('livestreams').select('*').limit(opts.limit ?? 50);
  if (opts.parishId) q = q.eq('parish_id', opts.parishId);
  if (opts.live) q = q.eq('status', 'live').order('started_at', { ascending: false });
  else if (opts.upcoming) q = q.eq('status', 'scheduled').gte('scheduled_at', new Date(Date.now() - 2 * 3_600_000).toISOString()).order('scheduled_at');
  else if (opts.recent) q = q.eq('status', 'ended').order('ended_at', { ascending: false });
  else q = q.neq('status', 'cancelled').order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return null;
    raise(error, 'Loading broadcasts');
  }
  return (data ?? []) as Livestream[];
}

export async function getLivestream(id: string): Promise<Livestream | null> {
  const { data, error } = await supabase.from('livestreams').select('*').eq('id', id).maybeSingle();
  raise(error, 'Loading the broadcast');
  return data as Livestream | null;
}

export async function saveLivestream(input: Partial<Livestream> & { parish_id: string }): Promise<Livestream> {
  const row = { ...input, destinations: (input.destinations ?? []).filter(d => d.url.trim()) };
  const { data, error } = input.id
    ? await supabase.from('livestreams').update(row).eq('id', input.id).select().single()
    : await supabase.from('livestreams').insert(row).select().single();
  if (error && /Partner plan|row-level/i.test(error.message)) throw new BackendError('Livestreaming is part of the Partner plan.');
  raise(error, 'Saving the broadcast');
  return data as Livestream;
}

export async function setStreamStatus(id: string, status: Livestream['status']): Promise<void> {
  const { error } = await supabase.from('livestreams').update({ status }).eq('id', id);
  raise(error, status === 'live' ? 'Going live' : 'Updating the broadcast');
}

/** Alert members and followers (once per broadcast) */
export async function notifyLive(id: string): Promise<number> {
  const { sent } = await invoke<{ sent: number }>('live-notify', { livestream_id: id });
  return sent;
}

export async function saveChannels(parishId: string, channels: LiveChannels) {
  const { error } = await supabase.from('parishes').update({ live_channels: channels }).eq('id', parishId);
  raise(error, 'Saving the channels');
}

// ── Following ────────────────────────────────────────────────

export async function isFollowing(parishId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('parish_follows').select('parish_id').eq('user_id', user.id).eq('parish_id', parishId).maybeSingle();
  return !!data;
}

export async function setFollowing(parishId: string, follow: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new BackendError('Sign in to follow');
  const { error } = follow
    ? await supabase.from('parish_follows').upsert({ user_id: user.id, parish_id: parishId })
    : await supabase.from('parish_follows').delete().eq('user_id', user.id).eq('parish_id', parishId);
  raise(error, follow ? 'Following' : 'Unfollowing');
}

export async function myFollows(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('parish_follows').select('parish_id').eq('user_id', user.id);
  return (data ?? []).map(r => r.parish_id);
}
