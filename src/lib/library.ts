import { supabase } from '../supabase';
import { raise, isMissingTable, BackendError } from './backend';
import { normalizeHttpsUrl } from '../utils/safeUrl';
import { resizeImage } from '../utils/imageResize';

/** The public Library: books and resources besides articles (supabase/migrations/20261027000000_church_structure.sql) */

export type LibraryKind = 'book' | 'booklet' | 'sermon' | 'study' | 'audio' | 'video' | 'link';

export const LIBRARY_KINDS: Record<LibraryKind, string> = {
  book: 'Book', booklet: 'Booklet', sermon: 'Sermon', study: 'Bible study', audio: 'Audio', video: 'Video', link: 'Website or resource',
};

export interface LibraryItem {
  id: string; added_by: string; author_name: string; kind: LibraryKind; title: string; description: string | null;
  language: 'en' | 'yo' | 'egun' | 'fr' | 'other'; url: string; storage_path: string | null; cover_url: string | null;
  status: 'pending' | 'published' | 'hidden'; created_at: string;
}

const MAX_FILE = 30 * 1024 * 1024;

export async function listLibrary(opts: { kind?: LibraryKind | 'books' | 'resources'; search?: string; mine?: boolean } = {}): Promise<LibraryItem[] | null> {
  let q = supabase.from('library_items').select('*').order('created_at', { ascending: false }).limit(200);
  if (opts.mine) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    q = q.eq('added_by', user.id);
  } else {
    q = q.eq('status', 'published');
  }
  if (opts.kind === 'books') q = q.in('kind', ['book', 'booklet', 'study']);
  else if (opts.kind === 'resources') q = q.in('kind', ['sermon', 'audio', 'video', 'link']);
  else if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.search?.trim()) q = q.ilike('title', `%${opts.search.trim()}%`);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return null;
    raise(error, 'Loading the library');
  }
  return (data ?? []) as LibraryItem[];
}

/** Add a book (an uploaded PDF/EPUB or a link) or a link to a resource */
export async function addLibraryItem(input: {
  kind: LibraryKind; title: string; author: string; description: string; language: LibraryItem['language'];
  link?: string; file?: File; cover?: File;
}): Promise<'published' | 'pending'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new BackendError('Sign in first');
  let url: string | null = null;
  let storage_path: string | null = null;
  if (input.file) {
    if (!['application/pdf', 'application/epub+zip'].includes(input.file.type)) throw new BackendError('Books must be PDF or EPUB');
    if (input.file.size > MAX_FILE) throw new BackendError('Books up to 30 MB — for larger ones add a link instead');
    storage_path = `${user.id}/${Date.now().toString(36)}.${input.file.type === 'application/pdf' ? 'pdf' : 'epub'}`;
    const { error } = await supabase.storage.from('library').upload(storage_path, input.file, { contentType: input.file.type });
    if (error) throw new BackendError(`Upload failed: ${error.message}`);
    url = supabase.storage.from('library').getPublicUrl(storage_path).data.publicUrl;
  } else {
    url = normalizeHttpsUrl(input.link) ?? null;
    if (!url) throw new BackendError('Add the file or an https:// link');
  }
  let cover_url: string | null = null;
  if (input.cover) {
    const blob = await resizeImage(input.cover, { maxWidth: 600, maxHeight: 900, aspect: 2 / 3 });
    const path = `${user.id}/cover-${Date.now().toString(36)}.webp`;
    const { error } = await supabase.storage.from('library').upload(path, blob, { contentType: blob.type });
    if (!error) cover_url = supabase.storage.from('library').getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await supabase.from('library_items').insert({
    added_by: user.id, kind: input.kind, title: input.title.trim(), author_name: input.author.trim(),
    description: input.description.trim() || null, language: input.language, url, storage_path, cover_url,
  }).select('status').single();
  raise(error, 'Adding to the library');
  return data!.status;
}

export async function deleteLibraryItem(item: LibraryItem) {
  const { error } = await supabase.from('library_items').delete().eq('id', item.id);
  raise(error, 'Removing');
  if (item.storage_path) await supabase.storage.from('library').remove([item.storage_path]).catch(() => {});
}

export async function pendingLibrary(): Promise<LibraryItem[]> {
  const { data, error } = await supabase.from('library_items').select('*').eq('status', 'pending').order('created_at');
  if (error) return [];
  return (data ?? []) as LibraryItem[];
}

export async function setLibraryStatus(id: string, status: LibraryItem['status']) {
  const { error } = await supabase.from('library_items').update({ status }).eq('id', id);
  raise(error, 'Updating');
}
