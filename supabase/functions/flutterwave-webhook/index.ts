// POST /functions/v1/flutterwave-webhook — set this URL as the webhook in the Flutterwave dashboard
// (Settings → Webhooks), with a secret hash that is also saved as FLUTTERWAVE_WEBHOOK_HASH.
// Flutterwave sends that hash in the verif-hash header; calls without it are rejected, and every
// payment is checked again with Flutterwave's API before anything is recorded.
// Handles gifts, the first Partner plan payment, renewals, failed renewals and cancellations.
import { json, adminClient, flutterwave, toMinor } from '../_shared/common.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function periodEnd(from: Date, interval: string): string {
  const d = new Date(from);
  if (interval === 'annually') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** First payment of a plan: tx_ref is sub_<parish id>_<plan id>_<time> (see the subscribe function) */
async function startSubscription(admin: SupabaseClient, tx: any, parishId: string, planId: string) {
  const { data: plan } = await admin.from('plans').select('id, interval, amount_minor, currency').eq('id', planId).maybeSingle();
  if (!plan || tx.status !== 'successful' || toMinor(tx.amount) < Number(plan.amount_minor) || tx.currency !== plan.currency) return;
  const email = tx.customer?.email ?? null;
  // Flutterwave creates the subscription with the payment; find it to be able to cancel it later
  let subscriptionId: number | null = null;
  if (email) {
    const subs = await flutterwave(`/subscriptions?email=${encodeURIComponent(email)}`).catch(() => []);
    const match = (subs as any[]).filter(s => s.status === 'active' && (!tx.payment_plan || Number(s.plan) === Number(tx.payment_plan)))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    subscriptionId = match?.id ?? null;
  }
  await admin.from('parish_subscriptions').upsert({
    parish_id: parishId, plan_id: plan.id, status: 'active', current_period_end: periodEnd(new Date(tx.created_at ?? Date.now()), plan.interval),
    flutterwave_subscription_id: subscriptionId, payer_email: email, started_by: tx.meta?.user_id ?? null, updated_at: new Date().toISOString(),
  });
}

/** Later charges on a plan come with Flutterwave's own reference: match them by plan and payer */
async function renewal(admin: SupabaseClient, tx: any) {
  const planRef = tx.payment_plan ?? tx.plan;
  const email = tx.customer?.email;
  if (!planRef || !email) return;
  const { data: plan } = await admin.from('plans').select('id, interval').eq('flutterwave_plan_id', Number(planRef)).maybeSingle();
  if (!plan) return;
  const update = tx.status === 'successful'
    ? { status: 'active', current_period_end: periodEnd(new Date(tx.created_at ?? Date.now()), plan.interval) }
    : { status: 'past_due' };
  await admin.from('parish_subscriptions').update({ ...update, updated_at: new Date().toISOString() })
    .eq('payer_email', email).eq('plan_id', plan.id).neq('status', 'cancelled');
}

Deno.serve(async req => {
  const expected = Deno.env.get('FLUTTERWAVE_WEBHOOK_HASH');
  const given = req.headers.get('verif-hash');
  if (!expected || !given || !sameSecret(given, expected)) return json({ error: 'bad signature' }, 401);

  const event = await req.json().catch(() => ({}));
  const data = event.data ?? {};
  const admin = adminClient();

  try {
    if (event.event === 'charge.completed' && data.id) {
      // Never trust the webhook's own figures: ask Flutterwave
      const tx = await flutterwave(`/transactions/${encodeURIComponent(data.id)}/verify`);
      const ref = String(tx.tx_ref ?? '');
      const sub = ref.match(/^sub_([0-9a-f-]{36})_(.+)_\d+$/);

      const { data: donation } = await admin.from('donations').select('id, amount_minor, currency, status').eq('provider_reference', ref).maybeSingle();
      if (donation) {
        if (donation.status !== 'paid') {
          const ok = tx.status === 'successful' && toMinor(tx.amount) === Number(donation.amount_minor) && tx.currency === donation.currency;
          if (ok || tx.status === 'failed') {
            await admin.from('donations').update({ status: ok ? 'paid' : 'failed', paid_at: ok ? (tx.created_at ?? new Date().toISOString()) : null, provider_transaction_id: String(tx.id) }).eq('id', donation.id);
          }
        }
      } else if (sub) {
        await startSubscription(admin, tx, sub[1], sub[2]);
      } else {
        await renewal(admin, tx);
      }
    } else if (event.event === 'subscription.cancelled') {
      // Cancelled at Flutterwave (by us, the payer or after failed renewals): it runs to the end of the paid period
      const id = data.id ?? data.subscription?.id;
      const email = data.customer?.email;
      const now = new Date().toISOString();
      const query = admin.from('parish_subscriptions').select('parish_id, current_period_end');
      const { data: rows } = id ? await query.eq('flutterwave_subscription_id', id) : email ? await query.eq('payer_email', email) : { data: [] };
      for (const row of rows ?? []) {
        const stillPaid = row.current_period_end && row.current_period_end > now;
        await admin.from('parish_subscriptions').update({ status: stillPaid ? 'non_renewing' : 'cancelled', updated_at: now }).eq('parish_id', row.parish_id);
      }
    }
  } catch (e) {
    // Flutterwave retries on a non-2xx answer
    return json({ error: (e as Error).message }, 500);
  }
  return json({ received: true });
});
