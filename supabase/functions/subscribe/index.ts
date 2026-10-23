// POST /functions/v1/subscribe  { parish_id, plan_id }
// Starts the Partner plan for a parish or ministry: a Flutterwave payment on a payment plan, which
// then renews by itself. Only the page's shepherds and admins may subscribe it. The webhook records it.
import { json, preflight, adminClient, userClient, flutterwave, toMajor, appOrigin } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const { parish_id, plan_id } = await req.json();
    const caller = userClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user?.email) return json({ error: 'Sign in first' }, 401);
    const { data: isAdmin } = await caller.rpc('is_parish_admin', { pid: parish_id });
    if (!isAdmin) return json({ error: 'Only the shepherd or an administrator can subscribe this page' }, 403);

    const admin = adminClient();
    const { data: plan } = await admin.from('plans').select('*').eq('id', plan_id).eq('active', true).maybeSingle();
    if (!plan) return json({ error: 'That plan is not available' }, 404);

    // The Flutterwave payment plan is made from our price the first time it is needed.
    // Changing a price later: set flutterwave_plan_id to null and the next subscriber creates a new one.
    let planId = plan.flutterwave_plan_id as number | null;
    if (!planId) {
      const created = await flutterwave('/payment-plans', {
        method: 'POST',
        body: JSON.stringify({ name: `CelestialWorship ${plan.name}`, amount: toMajor(plan.amount_minor), currency: plan.currency, interval: plan.interval === 'annually' ? 'yearly' : 'monthly' }),
      });
      planId = created.id;
      await admin.from('plans').update({ flutterwave_plan_id: planId }).eq('id', plan.id);
    }

    // A page renewing after a failed payment starts afresh: the old subscription is stopped first
    const { data: current } = await admin.from('parish_subscriptions').select('flutterwave_subscription_id, status').eq('parish_id', parish_id).maybeSingle();
    if (current?.flutterwave_subscription_id && current.status !== 'active') {
      await flutterwave(`/subscriptions/${current.flutterwave_subscription_id}/cancel`, { method: 'PUT' }).catch(() => {});
    }

    const origin = appOrigin();
    // The reference carries the page and plan, so the webhook can record the subscription from it
    const txRef = `sub_${parish_id}_${plan.id}_${Date.now()}`;
    const checkout = await flutterwave('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: txRef,
        amount: toMajor(plan.amount_minor),
        currency: plan.currency,
        payment_plan: planId,
        redirect_url: `${origin}/parish-admin?parish=${parish_id}&tab=plan&subscribed=1`,
        customer: { email: user.email },
        customizations: { title: 'CelestialWorship Partner plan', logo: `${origin}/pwa-192x192.png` },
        meta: { kind: 'subscription', parish_id, plan_id: plan.id, user_id: user.id },
      }),
    });
    return json({ authorization_url: checkout.link });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
