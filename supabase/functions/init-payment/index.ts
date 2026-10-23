// POST /functions/v1/init-payment  { donation_id }
// Opens Flutterwave checkout for a recorded gift. The amount, currency and the parish's
// subaccount are read from the database here, never trusted from the browser.
import { json, preflight, adminClient, flutterwave, toMajor, appOrigin } from '../_shared/common.ts';

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

    let subaccounts: { id: string }[] | undefined;
    let parishName = 'CelestialWorship';
    if (donation.parish_id) {
      // Taking gifts is part of the Partner plan
      const { data: canReceive } = await admin.rpc('parish_can_receive', { pid: donation.parish_id });
      if (!canReceive) return json({ error: 'This parish is not taking online gifts at the moment' }, 409);
      const { data: payout } = await admin.from('payout_accounts').select('subaccount_code, status').eq('parish_id', donation.parish_id).maybeSingle();
      if (!payout || payout.status !== 'verified' || !payout.subaccount_code) {
        return json({ error: 'This parish has not set up online giving yet' }, 409);
      }
      // The gift settles to the parish; the subaccount's split gives the platform its share, if any
      subaccounts = [{ id: payout.subaccount_code }];
      const { data: parish } = await admin.from('parishes').select('name').eq('id', donation.parish_id).maybeSingle();
      if (parish?.name) parishName = parish.name;
    }

    const origin = appOrigin();
    const checkout = await flutterwave('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: donation.provider_reference,
        amount: toMajor(donation.amount_minor),
        currency: donation.currency,
        redirect_url: `${origin}/give?reference=${encodeURIComponent(donation.provider_reference)}`,
        customer: { email: donation.donor_email, name: donation.is_anonymous ? undefined : donation.donor_name ?? undefined },
        customizations: { title: parishName, description: 'Gift through CelestialWorship', logo: `${origin}/pwa-192x192.png` },
        subaccounts,
        meta: { donation_id: donation.id, parish_id: donation.parish_id, purpose: donation.purpose, source_kind: donation.source_kind, source_id: donation.source_id },
      }),
    });

    return json({ authorization_url: checkout.link, reference: donation.provider_reference });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
