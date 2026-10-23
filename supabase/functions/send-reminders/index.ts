// POST /functions/v1/send-reminders — run every 5 minutes by pg_cron (see the migration).
// Sends "service in 30 / 10 minutes" and the morning devotion reminder, in each
// subscriber's own time zone. Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET.
import webpush from 'npm:web-push@3.6.7';
import { json, adminClient } from '../_shared/common.ts';
import { SERVICE_SCHEDULE, localParts, occursOn } from '../_shared/schedule.ts';
import { pushToParishAudience } from '../_shared/push.ts';

const WINDOW = 5; // minutes between runs

Deno.serve(async req => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) return json({ error: 'unauthorised' }, 401);

  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@celestialworship.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  const admin = adminClient();
  const { data: subs, error } = await admin.from('push_subscriptions').select('*').limit(50000);
  if (error) return json({ error: error.message }, 500);

  const now = new Date();
  let sent = 0;
  let removed = 0;

  for (const sub of subs ?? []) {
    const p = localParts(now, sub.timezone || 'Africa/Lagos');
    const due: { key: string; title: string; body: string; url: string }[] = [];

    if (sub.preferences?.serviceReminders !== false) {
      for (const s of SERVICE_SCHEDULE) {
        if (!occursOn(s, p)) continue;
        for (const lead of [30, 10]) {
          const fireAt = s.hour * 60 + s.minute - lead;
          if (p.minutes >= fireAt && p.minutes < fireAt + WINDOW) {
            due.push({
              key: `${s.id}-${lead}-${p.iso}`,
              title: lead === 30 ? `${s.name} in 30 minutes` : `${s.name} starts in 10 minutes`,
              body: lead === 30 ? 'Prepare your heart for worship.' : 'Service is about to begin. God bless you!',
              url: `/services/${s.id}`,
            });
          }
        }
      }
    }

    if (sub.preferences?.devotionReminder !== false) {
      const at = (sub.preferences?.devotionHour ?? 7) * 60;
      if (p.minutes >= at && p.minutes < at + WINDOW) {
        due.push({ key: `devotion-${p.iso}`, title: 'Daily Devotion', body: 'Start your day with the Word of God.', url: '/devotion' });
      }
    }

    for (const n of due) {
      // Claim the reminder first so a retried run never sends it twice
      const { error: claimError } = await admin.from('push_log').insert({ endpoint: sub.endpoint, key: n.key });
      if (claimError) continue;
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ ...n, tag: n.key }), { TTL: 1800 });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); // unsubscribed device
          removed++;
          break;
        }
      }
    }
  }

  // Broadcasts starting in about 15 minutes: tell the parish's members and followers
  const soon = new Date(now.getTime() + 15 * 60_000);
  const { data: upcoming } = await admin.from('livestreams').select('id, parish_id, title, scheduled_at')
    .eq('status', 'scheduled').gte('scheduled_at', new Date(soon.getTime() - WINDOW * 60_000).toISOString()).lt('scheduled_at', soon.toISOString());
  for (const stream of upcoming ?? []) {
    const { data: hasPlan } = await admin.rpc('parish_has_plan', { pid: stream.parish_id });
    if (!hasPlan) continue;
    const { data: parish } = await admin.from('parishes').select('name').eq('id', stream.parish_id).single();
    sent += await pushToParishAudience(admin, stream.parish_id, {
      key: `live-soon-${stream.id}`, title: `${parish?.name ?? 'Live'} in 15 minutes`, body: stream.title, url: `/live/${stream.id}`,
    });
  }

  // Keep the log small
  await admin.from('push_log').delete().lt('sent_at', new Date(Date.now() - 3 * 86_400_000).toISOString());
  return json({ sent, removed, subscriptions: subs?.length ?? 0 });
});
