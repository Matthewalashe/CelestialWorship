// POST /functions/v1/verify-payment  { reference }
// Asks Paystack whether a payment succeeded and records it. Safe to call repeatedly.
import { json, preflight, adminClient, paystack } from '../_shared/common.ts';

export async function settle(reference: string) {
  const admin = adminClient();
  const { data: donation } = await admin.from('donations').select('*').eq('provider_reference', reference).single();
  if (!donation) return { status: 'unknown' as const };
  if (donation.status === 'paid') return { status: 'paid' as const };

  const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  // Only accept the exact amount and currency that was recorded
  const ok = tx.status === 'success' && Number(tx.amount) === Number(donation.amount_minor) && tx.currency === donation.currency;
  const status = ok ? 'paid' : tx.status === 'failed' || tx.status === 'abandoned' ? 'failed' : 'initiated';
  if (status !== 'initiated') {
    await admin.from('donations').update({ status, paid_at: ok ? (tx.paid_at ?? new Date().toISOString()) : null }).eq('id', donation.id);
  }
  return { status };
}

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  try {
    const { reference } = await req.json();
    if (!reference) return json({ error: 'reference is required' }, 400);
    return json(await settle(reference));
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
