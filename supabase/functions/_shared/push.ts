// Web Push to the people who care about a parish: its members and its followers.
import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@celestialworship.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  configured = true;
}

export interface PushMessage { key: string; title: string; body: string; url: string }

/** Sends once per device per key (push_log); removes devices that have unsubscribed */
export async function pushToParishAudience(admin: SupabaseClient, parishId: string, message: PushMessage) {
  configure();
  const { data: followers } = await admin.from('parish_follows').select('user_id').eq('parish_id', parishId);
  const followerIds = (followers ?? []).map(f => f.user_id);
  let query = admin.from('push_subscriptions').select('endpoint, keys, user_id, parish_id');
  query = followerIds.length
    ? query.or(`parish_id.eq.${parishId},user_id.in.(${followerIds.join(',')})`)
    : query.eq('parish_id', parishId);
  const { data: subs } = await query.limit(20000);

  let sent = 0;
  for (const sub of subs ?? []) {
    const { error: claimed } = await admin.from('push_log').insert({ endpoint: sub.endpoint, key: message.key });
    if (claimed) continue;
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ ...message, tag: message.key }), { TTL: 3600 });
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
  }
  return sent;
}
