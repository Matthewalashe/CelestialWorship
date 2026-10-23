// POST /functions/v1/verify-payment  { reference }
// Asks Flutterwave whether a gift was paid and records it. Safe to call repeatedly.
import { json, preflight, adminClient, flutterwave, toMinor } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  try {
    const { reference } = await req.json();
    if (!reference) return json({ error: 'reference is required' }, 400);

    const admin = adminClient();
    const { data: donation } = await admin.from('donations').select('*').eq('provider_reference', reference).single();
    if (!donation) return json({ status: 'unknown' });
    if (donation.status === 'paid') return json({ status: 'paid' });

    let tx: any;
    try {
      tx = await flutterwave(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);
    } catch {
      // No transaction yet: the giver closed the checkout, or it is still processing
      return json({ status: 'initiated' });
    }
    // Only accept the exact amount and currency that was recorded
    const ok = tx.status === 'successful' && toMinor(tx.amount) === Number(donation.amount_minor) && tx.currency === donation.currency;
    const status = ok ? 'paid' : tx.status === 'failed' ? 'failed' : 'initiated';
    if (status !== 'initiated') {
      await admin.from('donations').update({
        status, paid_at: ok ? (tx.created_at ?? new Date().toISOString()) : null, provider_transaction_id: String(tx.id),
      }).eq('id', donation.id);
    }
    return json({ status });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
