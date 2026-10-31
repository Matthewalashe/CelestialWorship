// POST /functions/v1/turn-credentials
// Short-lived relay details so a phone or guest can reach the studio on networks that refuse direct connections.
// Secrets: CLOUDFLARE_TURN_KEY_ID, CLOUDFLARE_TURN_API_TOKEN. Without them it says so and the app uses direct connections only.
import { json, preflight } from '../_shared/common.ts';

const LIFETIME_SECONDS = 6 * 3600;

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const id = Deno.env.get('CLOUDFLARE_TURN_KEY_ID'), token = Deno.env.get('CLOUDFLARE_TURN_API_TOKEN');
  if (!id || !token) return json({ iceServers: [] });
  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: LIFETIME_SECONDS }),
    });
    if (!res.ok) return json({ iceServers: [] });
    const data = await res.json();
    return json({ iceServers: Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers] });
  } catch {
    return json({ iceServers: [] });
  }
});
