// POST /functions/v1/manage-subscription  { parish_id, action: 'cancel' | 'resume' }
// Stops or restarts the Partner plan's renewal. A cancelled plan keeps working to the end of the
// period already paid for. (Flutterwave has no hosted page for this, so the app asks here.)
import { json, preflight, adminClient, userClient, flutterwave } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  try {
    const { parish_id, action } = await req.json();
    if (action !== 'cancel' && action !== 'resume') return json({ error: 'action must be cancel or resume' }, 400);
    const { data: isAdmin } = await userClient(req).rpc('is_parish_admin', { pid: parish_id });
    if (!isAdmin) return json({ error: 'Only the shepherd or an administrator can manage the plan' }, 403);

    const admin = adminClient();
    const { data: sub } = await admin.from('parish_subscriptions').select('flutterwave_subscription_id, current_period_end').eq('parish_id', parish_id).maybeSingle();
    if (!sub?.flutterwave_subscription_id) return json({ error: 'No subscription to manage yet' }, 404);

    await flutterwave(`/subscriptions/${sub.flutterwave_subscription_id}/${action === 'cancel' ? 'cancel' : 'activate'}`, { method: 'PUT' });
    const status = action === 'cancel' ? 'non_renewing' : 'active';
    await admin.from('parish_subscriptions').update({ status, updated_at: new Date().toISOString() }).eq('parish_id', parish_id);
    return json({ status });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
