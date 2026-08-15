import { supabase } from '../supabase';
import { getDeviceId } from './useAnalytics';

export function backupNoteToSupabase(note: any): void {
  const device_id = getDeviceId();
  supabase.from('user_notes').upsert({
    id: note.id,
    device_id,
    title: note.title,
    content: note.content,
    tags: note.tags,
    created_at: note.createdAt || new Date().toISOString(),
    updated_at: note.updatedAt || new Date().toISOString()
  }).then(() => {}).catch(() => {});
}

export function deleteNoteFromSupabase(id: string): void {
  const device_id = getDeviceId();
  supabase.from('user_notes').delete().match({ id, device_id })
    .then(() => {}).catch(() => {});
}

export function syncNotesToSupabase(notes: any[]): void {
  if (!notes || notes.length === 0) return;
  const device_id = getDeviceId();
  const notesToSync = notes.map(note => ({
    id: note.id,
    device_id,
    title: note.title,
    content: note.content,
    tags: note.tags,
    created_at: note.createdAt || new Date().toISOString(),
    updated_at: note.updatedAt || new Date().toISOString()
  }));

  supabase.from('user_notes').upsert(notesToSync)
    .then(() => {}).catch(() => {});
}
