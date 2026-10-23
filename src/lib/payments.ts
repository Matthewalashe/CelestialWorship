import { supabase } from '../supabase';
import { raise, BackendError } from './backend';
import type { Donation } from './community';

/**
 * Online giving goes through the platform's Paystack account. Each parish's gifts settle
 * to its own bank account through a Paystack subaccount (see supabase/functions).
 */

export interface Bank { name: string; code: string }

export interface PayoutAccount {
  parish_id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string | null;
  status: 'pending' | 'verified' | 'failed';
  status_message: string | null;
  updated_at: string;
}

export async function invoke<T>(name: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown>, method });
  if (error) {
    // The function's own error message, when it returned one
    const context = (error as any).context;
    let message = error.message;
    try { message = (await context?.json())?.error ?? message; } catch {}
    if (/Failed to send|fetch/i.test(message)) throw new BackendError('Online giving isn’t available yet.', true);
    throw new BackendError(message);
  }
  return data as T;
}

export async function listBanks(country = 'nigeria'): Promise<Bank[]> {
  const { data, error } = await supabase.functions.invoke(`banks?country=${country}`, { method: 'GET' });
  if (error) throw new BackendError('Couldn’t load the list of banks', true);
  return (data?.banks ?? []) as Bank[];
}

export async function getPayoutAccount(parishId: string): Promise<PayoutAccount | null> {
  const { data, error } = await supabase.from('payout_accounts').select('*').eq('parish_id', parishId).maybeSingle();
  raise(error, 'Loading the payout account');
  return data as PayoutAccount | null;
}

export async function savePayoutAccount(input: { parishId: string; bank: Bank; accountNumber: string }) {
  return invoke<{ status: string; account_name: string }>('payout-account', {
    parish_id: input.parishId, bank_code: input.bank.code, bank_name: input.bank.name, account_number: input.accountNumber,
  });
}

export async function parishCanReceive(parishId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('parish_can_receive', { pid: parishId });
  if (error) return false;
  return !!data;
}

/** Start payment for a recorded gift: sends the giver to Paystack's secure checkout */
export async function payDonation(donation: Donation) {
  const { authorization_url } = await invoke<{ authorization_url: string }>('init-payment', { donation_id: donation.id });
  window.location.assign(authorization_url);
}
