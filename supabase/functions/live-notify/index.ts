// POST /functions/v1/live-notify  { livestream_id }
// Called by the media team right after going live: alerts the parish's members and followers once.
import { json, preflight, adminClient, userClient } from '../_shared/common.ts';
import { pushToParishAudience } from '../_shared/push.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const { livestream_id } = await req.json();
    const admin = adminClient();
    const { data: stream } = await admin.from('livestreams').select('id, parish_id, title, status, notified_at').eq('id', livestream_id).maybeSingle();
    if (!stream) return json({ error: 'Broadcast not found' }, 404);
    if (stream.status !== 'live') return json({ error: 'The broadcast is not live' }, 409);
    if (stream.notified_at) return json({ sent: 0, already: true });

    // The caller must be on the parish's media team (checked as the caller, with RLS)
    const { data: allowed } = await userClient(req).rpc('has_parish_role', { pid: stream.parish_id, roles: ['media'] });
    if (!allowed) return json({ error: 'Only the parish media team can send live alerts' }, 403);
    const { data: hasPlan } = await admin.rpc('parish_has_plan', { pid: stream.parish_id });
    if (!hasPlan) return json({ error: 'Livestreaming is part of the Partner plan' }, 402);

    const { data: parish } = await admin.from('parishes').select('name').eq('id', stream.parish_id).single();
    await admin.from('livestreams').update({ notified_at: new Date().toISOString() }).eq('id', stream.id);
    const sent = await pushToParishAudience(admin, stream.parish_id, {
      key: `live-${stream.id}`,
      title: `${parish?.name ?? 'Your parish'} is live`,
      body: stream.title,
      url: `/live/${stream.id}`,
    });
    return json({ sent });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
