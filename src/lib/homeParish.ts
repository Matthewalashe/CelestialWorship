import { supabase } from '../supabase';
import { joinListed, mySpaces, requestToJoin } from './parishSpace';

/**
 * Choosing "my parish" anywhere (onboarding, the profile, a parish's page) also joins its space, once, as soon as the
 * person is signed in. A parish still waiting to be added is tried again the next time the app opens.
 */

const isUuid = (s: string | null | undefined) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export interface HomeParishResult { parishId: string; state: 'member' | 'pending' }

async function findByName(name: string): Promise<{ id: string; listed: boolean } | null> {
  const { data } = await supabase.from('parish_directory').select('id').ilike('name', name.replace(/[%_\\]/g, '\\$&')).limit(1).maybeSingle();
  if (data?.id) return { id: data.id, listed: false };
  for (const file of ['parishes_seed', 'parishes_listed']) {
    try {
      const rows: { id: string; name: string }[] = await (await fetch(`/data/${file}.json`)).json();
      const hit = rows.find(r => r.name.toLowerCase() === name.toLowerCase());
      if (hit) return { id: hit.id, listed: true };
    } catch {}
  }
  return null;
}

/** Joins the parish on the profile if that has not been done; null when there was nothing to do */
export async function linkHomeParish(userId: string, parishId: string | null, parishName: string): Promise<HomeParishResult | null> {
  const wanted = parishId || parishName.trim();
  if (!wanted) return null;
  const key = `cw-home-parish:${userId}:${wanted}`;
  try { if (localStorage.getItem(key)) return null; } catch {}

  let target: { id: string; listed: boolean } | null = null;
  if (isUuid(parishId)) target = { id: parishId!, listed: false };
  else if (parishId && /^(seed|listed)-/.test(parishId)) target = { id: parishId, listed: true };
  else if (parishName.trim()) target = await findByName(parishName.trim());
  if (!target) return null;

  let result: HomeParishResult;
  if (target.listed) {
    result = await joinListed(target.id);
  } else {
    const spaces = await mySpaces();
    if (spaces.some(s => s.parish_id === target!.id)) {
      try { localStorage.setItem(key, '1'); } catch {}
      return null;
    }
    result = { parishId: target.id, state: await requestToJoin(target.id) };
  }
  try { localStorage.setItem(key, '1'); } catch {}
  return result;
}
