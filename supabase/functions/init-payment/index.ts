// POST /functions/v1/init-payment  { donation_id }
// Starts a Paystack transaction for a recorded gift. The amount, currency and the parish's
// subaccount are read from the database here, never trusted from the browser.
import { json, preflight, adminClient, paystack } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const { donation_id } = await req.json();
    const admin = adminClient();
    const { data: donation } = await admin.from('donations').select('*').eq('id', donation_id).single();
    if (!donation) return json({ error: 'Gift not found' }, 404);
    if (donation.status !== 'initiated') return json({ error: 'This gift has already been processed' }, 409);
    if (!donation.donor_email) return json({ error: 'An email address is needed for the receipt' }, 400);

    let subaccount: string | undefined;
    if (donation.parish_id) {
      // Taking gifts is part of the Partner plan
      const { data: canReceive } = await admin.rpc('parish_can_receive', { pid: donation.parish_id });
      if (!canReceive) return json({ error: 'This parish is not taking online gifts at the moment' }, 409);
      const { data: payout } = await admin.from('payout_accounts').select('subaccount_code, status').eq('parish_id', donation.parish_id).maybeSingle();
      if (!payout || payout.status !== 'verified' || !payout.subaccount_code) {
        return json({ error: 'This parish has not set up online giving yet' }, 409);
      }
      subaccount = payout.subaccount_code;
    }

    const appUrl = Deno.env.get('APP_ORIGIN') ?? 'https://celestialworship.vercel.app';
    const tx = await paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: donation.donor_email,
        amount: donation.amount_minor,
        currency: donation.currency,
        reference: donation.provider_reference,
        subaccount,
        // The parish bears the gateway fee only if the platform chooses so
        bearer: Deno.env.get('PAYSTACK_FEE_BEARER') ?? 'account',
        callback_url: `${appUrl}/give?reference=${encodeURIComponent(donation.provider_reference)}`,
        metadata: { donation_id: donation.id, parish_id: donation.parish_id, purpose: donation.purpose, source_kind: donation.source_kind, source_id: donation.source_id },
      }),
    });

    return json({ authorization_url: tx.authorization_url, access_code: tx.access_code, reference: tx.reference });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
