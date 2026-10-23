// POST /functions/v1/push-subscribe  { subscription, timezone, preferences, parish_id, device_id }
// DELETE-style: { endpoint, remove: true } removes a subscription.
import { json, preflight, adminClient, userClient } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const body = await req.json();
    const admin = adminClient();

    if (body.remove && body.endpoint) {
      await admin.from('push_subscriptions').delete().eq('endpoint', body.endpoint);
      return json({ removed: true });
    }

    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: 'Invalid subscription' }, 400);
    if (!/^https:\/\//.test(sub.endpoint)) return json({ error: 'Invalid endpoint' }, 400);

    // Link to the account when signed in (optional)
    const { data: { user } } = await userClient(req).auth.getUser();
    const timezone = typeof body.timezone === 'string' && body.timezone.length < 64 ? body.timezone : 'Africa/Lagos';
    const prefs = body.preferences ?? {};

    const { error } = await admin.from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      keys: sub.keys,
      user_id: user?.id ?? null,
      device_id: typeof body.device_id === 'string' ? body.device_id.slice(0, 64) : null,
      timezone,
      parish_id: body.parish_id ?? null,
      preferences: {
        serviceReminders: prefs.serviceReminders !== false,
        devotionReminder: prefs.devotionReminder !== false,
        devotionHour: Number.isInteger(prefs.devotionHour) && prefs.devotionHour >= 0 && prefs.devotionHour < 24 ? prefs.devotionHour : 7,
      },
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ subscribed: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
