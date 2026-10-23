// POST /functions/v1/subscribe  { parish_id, plan_id }
// Starts the Partner plan for a parish or ministry: a Paystack payment that creates a subscription.
// Only the page's shepherds and admins may subscribe it. The webhook records the result.
import { json, preflight, adminClient, userClient, paystack } from '../_shared/common.ts';

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
    if (!plan.paystack_plan_code) return json({ error: 'The plan is not set up with the payment provider yet' }, 503);

    const appUrl = Deno.env.get('APP_ORIGIN') ?? 'https://celestialworship.vercel.app';
    const tx = await paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        amount: plan.amount_minor,          // Paystack uses the plan's amount
        currency: plan.currency,
        plan: plan.paystack_plan_code,
        callback_url: `${appUrl}/parish-admin?parish=${parish_id}&tab=plan&subscribed=1`,
        metadata: { kind: 'subscription', parish_id, plan_id, user_id: user.id },
      }),
    });
    return json({ authorization_url: tx.authorization_url });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
