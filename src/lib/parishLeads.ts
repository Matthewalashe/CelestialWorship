import { supabase } from '../supabase';
import { raise } from './backend';

/**
 * Parishes people say are missing from the directory (table parish_leads). Anyone can send one, signed in or
 * not; moderators add it to the directory from Moderation. If it can't be sent now (offline), it waits on the
 * device and goes the next time the app opens.
 */

export interface ParishLead {
  name: string;
  country: string;
  state_region: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  shepherd_name: string | null;
  phone: string | null;
  email: string | null;
  sunday_time: string | null;
  contact_name: string | null;
  notes: string | null;
}

const WAITING = 'cw-parish-leads-waiting';

function waiting(): ParishLead[] {
  try { return JSON.parse(localStorage.getItem(WAITING) || '[]'); } catch { return []; }
}

async function send(lead: ParishLead) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('parish_leads').insert({ ...lead, submitted_by: user?.id ?? null });
  raise(error, 'Sending the parish');
}

/** True when it was sent now, false when it is waiting to be sent */
export async function suggestParish(lead: ParishLead): Promise<boolean> {
  try {
    await send(lead);
    return true;
  } catch {
    try { localStorage.setItem(WAITING, JSON.stringify([...waiting(), lead])); } catch {}
    return false;
  }
}

/** Send anything still waiting from an earlier visit */
export async function sendWaitingParishLeads() {
  const list = waiting();
  if (!list.length || !navigator.onLine) return;
  const left: ParishLead[] = [];
  for (const lead of list) {
    try { await send(lead); } catch { left.push(lead); }
  }
  try {
    if (left.length) localStorage.setItem(WAITING, JSON.stringify(left));
    else localStorage.removeItem(WAITING);
  } catch {}
}

export async function parishLeads() {
  const { data, error } = await supabase.from('parish_leads').select('*').eq('status', 'new').order('created_at');
  raise(error, 'Loading suggested parishes');
  return data ?? [];
}

export async function publishParishLead(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('publish_parish_lead', { lead: id });
  raise(error, 'Adding the parish');
  return data as string;
}

export async function dismissParishLead(id: string) {
  const { error } = await supabase.from('parish_leads').update({ status: 'dismissed' }).eq('id', id);
  raise(error, 'Saving the decision');
}
