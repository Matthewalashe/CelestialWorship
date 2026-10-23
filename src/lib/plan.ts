import { supabase } from '../supabase';
import { raise, isMissingTable } from './backend';
import { invoke } from './payments';

/**
 * The Partner plan: parishes and shepherds' ministries subscribe to take gifts, receive support on
 * their articles and livestream. Everything else in the app is free (supabase/migrations/20261025000000_partner_plan_live.sql).
 */

export const PARTNER_FEATURES = [
  'Tithes, offerings and gifts paid to your bank account',
  'Readers can support your articles and commentaries',
  'Livestream to YouTube, Facebook and more from one place',
  'Live alerts to your members and followers',
  'Scheduled broadcasts on the church-wide Live page',
];

export interface Plan { id: string; name: string; amount_minor: number; currency: string; interval: 'monthly' | 'annually' }

export interface Subscription {
  parish_id: string;
  plan_id: string;
  status: 'active' | 'non_renewing' | 'past_due' | 'cancelled';
  current_period_end: string | null;
}

export function planPrice(p: Plan): string {
  let amount: string;
  try { amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.amount_minor / 100); }
  catch { amount = `${p.currency} ${p.amount_minor / 100}`; }
  return `${amount} / ${p.interval === 'monthly' ? 'month' : 'year'}`;
}

export async function listPlans(): Promise<Plan[] | null> {
  const { data, error } = await supabase.from('plans').select('id, name, amount_minor, currency, interval').order('amount_minor');
  if (error) {
    if (isMissingTable(error)) return null;
    raise(error, 'Loading plans');
  }
  return (data ?? []) as Plan[];
}

export async function getSubscription(parishId: string): Promise<Subscription | null> {
  const { data, error } = await supabase.from('parish_subscriptions').select('parish_id, plan_id, status, current_period_end').eq('parish_id', parishId).maybeSingle();
  if (error && !isMissingTable(error)) raise(error, 'Loading the plan');
  return (data ?? null) as Subscription | null;
}

export async function hasPlan(parishId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('parish_has_plan', { pid: parishId });
  return !error && !!data;
}

/** Sends the shepherd or admin to Flutterwave to start the subscription */
export async function subscribe(parishId: string, planId: string) {
  const { authorization_url } = await invoke<{ authorization_url: string }>('subscribe', { parish_id: parishId, plan_id: planId });
  window.location.assign(authorization_url);
}

/** Stop the plan renewing (it runs to the end of the paid period), or start renewing again */
export async function manageSubscription(parishId: string, action: 'cancel' | 'resume'): Promise<Subscription['status']> {
  const { status } = await invoke<{ status: Subscription['status'] }>('manage-subscription', { parish_id: parishId, action });
  return status;
}
