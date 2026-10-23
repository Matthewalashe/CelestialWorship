// POST /functions/v1/manage-subscription  { parish_id }
// Returns Paystack's page where the payer can update the card or cancel the Partner plan.
import { json, preflight, adminClient, userClient, paystack } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  try {
    const { parish_id } = await req.json();
    const { data: isAdmin } = await userClient(req).rpc('is_parish_admin', { pid: parish_id });
    if (!isAdmin) return json({ error: 'Only the shepherd or an administrator can manage the plan' }, 403);
    const { data: sub } = await adminClient().from('parish_subscriptions').select('paystack_subscription_code').eq('parish_id', parish_id).maybeSingle();
    if (!sub?.paystack_subscription_code) return json({ error: 'No subscription to manage yet' }, 404);
    const data = await paystack(`/subscription/${encodeURIComponent(sub.paystack_subscription_code)}/manage/link`);
    return json({ link: data.link });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
