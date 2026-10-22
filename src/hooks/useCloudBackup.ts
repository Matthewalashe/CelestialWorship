import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { exportLibrary, importLibrary } from './useNotes';
import { raise } from '../lib/backend';

/**
 * Optional backup of the personal library to the signed-in user's own row
 * (table user_library, readable and writable only by that user — see migrations).
 */
export function useCloudBackup() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const backUp = useCallback(async () => {
    if (!user) throw new Error('Sign in to back up to your account');
    setBusy(true);
    try {
      const data = await exportLibrary();
      const { error } = await supabase
        .from('user_library')
        .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
      raise(error, 'Backup');
      setLastBackup(data.exportedAt);
      return data.exportedAt;
    } finally {
      setBusy(false);
    }
  }, [user]);

  const restore = useCallback(async () => {
    if (!user) throw new Error('Sign in to restore your backup');
    setBusy(true);
    try {
      const { data, error } = await supabase.from('user_library').select('data, updated_at').eq('user_id', user.id).maybeSingle();
      raise(error, 'Restore');
      if (!data) throw new Error('There is no backup on this account yet');
      return importLibrary(data.data);
    } finally {
      setBusy(false);
    }
  }, [user]);

  const fetchLastBackup = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase.from('user_library').select('updated_at').eq('user_id', user.id).maybeSingle();
    setLastBackup(data?.updated_at ?? null);
    return data?.updated_at ?? null;
  }, [user]);

  return { signedIn: !!user, busy, lastBackup, backUp, restore, fetchLastBackup };
}
