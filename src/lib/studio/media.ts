import { supabase } from '../../supabase';
import { BackendError } from '../backend';

/**
 * A church's logos, pictures and videos for the studio and the projector. Signed in, they are kept online and can be
 * shown on any screen. Without an account, or for a file too large to keep, they last until the page closes.
 */

export interface MediaItem { id: string; name: string; url: string; kind: 'image' | 'video'; local?: boolean }

const BUCKET = 'studio-media';
const MAX_ONLINE = 50 * 1024 * 1024;
const LOGO_KEY = 'cw-studio-logo';
const local: MediaItem[] = [];

const kindOf = (name: string, type = ''): MediaItem['kind'] => (type.startsWith('video') || /\.(mp4|webm|mov)$/i.test(name) ? 'video' : 'image');

export async function listMedia(): Promise<MediaItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [...local];
  const { data, error } = await supabase.storage.from(BUCKET).list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return [...local];
  // Folders have no id: the logos folder is not a picture
  const online = (data ?? []).filter(f => f.id && f.name !== '.emptyFolderPlaceholder').map(f => ({
    id: `${user.id}/${f.name}`,
    name: f.name.replace(/^\d+-/, ''),
    url: supabase.storage.from(BUCKET).getPublicUrl(`${user.id}/${f.name}`).data.publicUrl,
    kind: kindOf(f.name),
  }));
  return [...local, ...online];
}

export async function addMedia(file: File): Promise<MediaItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || file.size > MAX_ONLINE) {
    const item: MediaItem = { id: `local-${Date.now()}`, name: file.name, url: URL.createObjectURL(file), kind: kindOf(file.name, file.type), local: true };
    local.unshift(item);
    return item;
  }
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
  const path = `${user.id}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new BackendError(`Adding the file failed: ${error.message}`);
  return { id: path, name: file.name, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, kind: kindOf(file.name, file.type) };
}

export async function removeMedia(item: MediaItem) {
  if (item.local) {
    const i = local.findIndex(x => x.id === item.id);
    if (i >= 0) local.splice(i, 1);
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([item.id]);
  if (error) throw new BackendError(`Removing the file failed: ${error.message}`);
}

// ── Logos, kept apart from pictures and videos ──────────────

const localLogos: MediaItem[] = [];

export async function listLogos(): Promise<MediaItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [...localLogos];
  const folder = `${user.id}/logos`;
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 40, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return [...localLogos];
  const online = (data ?? []).filter(f => f.id && f.name !== '.emptyFolderPlaceholder').map(f => ({
    id: `${folder}/${f.name}`,
    name: f.name.replace(/^\d+-/, ''),
    url: supabase.storage.from(BUCKET).getPublicUrl(`${folder}/${f.name}`).data.publicUrl,
    kind: kindOf(f.name),
  }));
  return [...localLogos, ...online];
}

export async function addLogo(file: File): Promise<MediaItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || file.size > MAX_ONLINE) {
    const item: MediaItem = { id: `local-${Date.now()}`, name: file.name, url: URL.createObjectURL(file), kind: kindOf(file.name, file.type), local: true };
    localLogos.unshift(item);
    return item;
  }
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
  const path = `${user.id}/logos/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new BackendError(`Adding the logo failed: ${error.message}`);
  return { id: path, name: file.name, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, kind: kindOf(file.name, file.type) };
}

export async function removeLogo(item: MediaItem) {
  if (item.local) {
    const i = localLogos.findIndex(x => x.id === item.id);
    if (i >= 0) localLogos.splice(i, 1);
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([item.id]);
  if (error) throw new BackendError(`Removing the logo failed: ${error.message}`);
}

export function savedLogo(): string | null {
  try { return localStorage.getItem(LOGO_KEY); } catch { return null; }
}

export function saveLogo(url: string | null) {
  try { if (url) localStorage.setItem(LOGO_KEY, url); else localStorage.removeItem(LOGO_KEY); } catch {}
}
