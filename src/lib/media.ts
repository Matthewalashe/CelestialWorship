import { supabase } from '../supabase';
import { raise, isMissingTable, BackendError } from './backend';
import { resizeImage } from '../utils/imageResize';
import { normalizeHttpsUrl } from '../utils/safeUrl';

/** Profile photos and banners, parish logos, covers and galleries (supabase/migrations/20261026000000_media.sql) */

const SHAPES = {
  avatar: { maxWidth: 400, maxHeight: 400, aspect: 1 },
  banner: { maxWidth: 1500, maxHeight: 500, aspect: 3 },
  logo: { maxWidth: 400, maxHeight: 400, aspect: 1 },
  cover: { maxWidth: 1600, maxHeight: 600, aspect: 8 / 3 },
  gallery: { maxWidth: 1600, maxHeight: 1600 },
} as const;

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

async function upload(bucket: 'avatars' | 'parish-media', folder: string, name: string, body: Blob): Promise<{ url: string; path: string }> {
  const ext = body.type === 'image/webp' ? 'webp' : body.type === 'image/jpeg' ? 'jpg' : body.type === 'video/webm' ? 'webm' : body.type === 'video/mp4' ? 'mp4' : 'bin';
  const path = `${folder}/${name}-${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: body.type, cacheControl: '31536000', upsert: false });
  if (error) {
    if (/not found|bucket/i.test(error.message)) throw new BackendError('Uploads aren’t available yet, the church’s online service is still being set up.', true);
    throw new BackendError(`Upload failed: ${error.message}`);
  }
  return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, path };
}

async function removeOld(bucket: 'avatars' | 'parish-media', url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (!url?.includes(marker)) return;
  await supabase.storage.from(bucket).remove([url.split(marker)[1]]).catch(() => {});
}

// ── People ───────────────────────────────────────────────────

export async function setProfileImage(kind: 'avatar' | 'banner', file: File, previous?: string | null): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new BackendError('Sign in first');
  const blob = await resizeImage(file, SHAPES[kind]);
  const { url } = await upload('avatars', user.id, kind, blob);
  const { error } = await supabase.from('profiles').update({ [`${kind}_url`]: url }).eq('id', user.id);
  raise(error, 'Saving the picture');
  await removeOld('avatars', previous);
  return url;
}

export async function clearProfileImage(kind: 'avatar' | 'banner', previous?: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from('profiles').update({ [`${kind}_url`]: null }).eq('id', user.id);
  raise(error, 'Removing the picture');
  await removeOld('avatars', previous);
}

// ── Parishes ─────────────────────────────────────────────────

export async function setParishImage(parishId: string, kind: 'logo' | 'cover', file: File, previous?: string | null): Promise<string> {
  const blob = await resizeImage(file, SHAPES[kind]);
  const { url } = await upload('parish-media', parishId, kind, blob);
  const { error } = await supabase.from('parishes').update({ [`${kind}_url`]: url }).eq('id', parishId);
  raise(error, 'Saving the picture');
  await removeOld('parish-media', previous);
  return url;
}

export interface ParishMedia { id: string; parish_id: string; kind: 'image' | 'video'; url: string; storage_path: string | null; caption: string | null; created_at: string }

export async function listParishMedia(parishId: string): Promise<ParishMedia[] | null> {
  const { data, error } = await supabase.from('parish_media').select('*').eq('parish_id', parishId).order('created_at', { ascending: false }).limit(60);
  if (error) {
    if (isMissingTable(error)) return null;
    raise(error, 'Loading pictures');
  }
  return (data ?? []) as ParishMedia[];
}

/** A photo (resized here) or a short video file */
export async function addParishMediaFile(parishId: string, file: File, caption: string): Promise<void> {
  const isVideo = file.type.startsWith('video/');
  if (isVideo && !['video/mp4', 'video/webm'].includes(file.type)) throw new BackendError('Videos must be MP4 or WebM');
  if (isVideo && file.size > MAX_VIDEO_BYTES) throw new BackendError('Videos up to 50 MB, for longer ones, add a YouTube link');
  const body = isVideo ? file : await resizeImage(file, SHAPES.gallery);
  const { url, path } = await upload('parish-media', parishId, isVideo ? 'video' : 'photo', body);
  const { error } = await supabase.from('parish_media').insert({ parish_id: parishId, kind: isVideo ? 'video' : 'image', url, storage_path: path, caption: caption.trim() || null });
  raise(error, 'Saving the picture');
}

/** A video that lives elsewhere (YouTube, Facebook…) */
export async function addParishVideoLink(parishId: string, link: string, caption: string): Promise<void> {
  const url = normalizeHttpsUrl(link);
  if (!url) throw new BackendError('That isn’t a valid https:// link');
  const { error } = await supabase.from('parish_media').insert({ parish_id: parishId, kind: 'video', url, caption: caption.trim() || null });
  raise(error, 'Saving the video');
}

export async function deleteParishMedia(item: ParishMedia) {
  const { error } = await supabase.from('parish_media').delete().eq('id', item.id);
  raise(error, 'Deleting');
  if (item.storage_path) await supabase.storage.from('parish-media').remove([item.storage_path]).catch(() => {});
}
