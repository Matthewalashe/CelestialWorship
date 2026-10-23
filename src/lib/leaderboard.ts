import { supabase } from '../supabase';
import { raise, isMissingTable } from './backend';
import { readGame, weekStart } from '../utils/gamify';

/** Weekly leaderboard (supabase/migrations/20261024000000_games.sql). Players opt in. */

const OPT_IN_KEY = 'cw-leaderboard-opt-in';

export function leaderboardOptedIn(): boolean {
  try { return localStorage.getItem(OPT_IN_KEY) === '1'; } catch { return false; }
}

export function setLeaderboardOptIn(on: boolean) {
  try { localStorage.setItem(OPT_IN_KEY, on ? '1' : '0'); } catch {}
}

export interface LeaderboardRow { user_id: string; name: string | null; xp: number; parish_id: string | null }

/** Post this week's XP if the player has opted in and is signed in. Never throws. */
export async function postWeekXp(): Promise<void> {
  if (!leaderboardOptedIn()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const xp = readGame().weeks[weekStart()] ?? 0;
  if (xp <= 0) return;
  try { await supabase.rpc('post_week_xp', { p_xp: xp }); } catch {}
}

export async function weekLeaderboard(parishId?: string | null, limit = 50): Promise<LeaderboardRow[] | null> {
  let q = supabase.from('game_leaderboard').select('user_id, name, xp, parish_id')
    .eq('week_start', weekStart()).order('xp', { ascending: false }).limit(limit);
  if (parishId) q = q.eq('parish_id', parishId);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return null;
    raise(error, 'The leaderboard');
  }
  return (data ?? []) as LeaderboardRow[];
}

export async function leaveLeaderboard() {
  setLeaderboardOptIn(false);
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.from('game_scores').delete().eq('user_id', data.user.id);
}
