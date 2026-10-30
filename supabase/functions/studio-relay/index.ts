// POST /functions/v1/studio-relay  { action: 'status' | 'token' | 'start' | 'stop', ... }
// The studio's link to the relay (LiveKit) that sends its picture to YouTube, Facebook and the rest.
// Secrets: LIVEKIT_URL (wss://…), LIVEKIT_API_KEY, LIVEKIT_API_SECRET. Stream addresses are never stored or logged.
import { json, preflight, userClient } from '../_shared/common.ts';

const encoder = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function accessToken(key: string, secret: string, identity: string, video: Record<string, unknown>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  // Long enough for the longest service; it only needs to be valid when the relay is joined
  const body = b64(encoder.encode(JSON.stringify({ iss: key, sub: identity, nbf: now - 10, exp: now + 6 * 3600, video })));
  const signing = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', signing, encoder.encode(`${head}.${body}`)));
  return `${head}.${body}.${b64(signature)}`;
}

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const url = Deno.env.get('LIVEKIT_URL'), key = Deno.env.get('LIVEKIT_API_KEY'), secret = Deno.env.get('LIVEKIT_API_SECRET');
    const body = await req.json();
    if (body.action === 'status') return json({ configured: !!(url && key && secret) });
    if (!url || !key || !secret) return json({ error: 'Direct streaming is not switched on yet' }, 503);

    const { data: { user } } = await userClient(req).auth.getUser();
    if (!user) return json({ error: 'Sign in to go live' }, 401);

    const api = async (method: string, payload: unknown) => {
      const auth = await accessToken(key, secret, 'studio-server', { roomRecord: true });
      return await fetch(`${url.replace(/^ws/, 'http')}/twirp/livekit.Egress/${method}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    };

    if (body.action === 'token') {
      const room = `studio-${user.id}-${Date.now()}`;
      const identity = `studio-${user.id}`;
      const token = await accessToken(key, secret, identity, { room, roomJoin: true, canPublish: true, canSubscribe: false });
      return json({ url, token, room, identity });
    }

    if (body.action === 'start') {
      const { room, identity, urls } = body;
      // People may only send out their own studio
      if (typeof room !== 'string' || !room.startsWith(`studio-${user.id}-`) || identity !== `studio-${user.id}`) return json({ error: 'That is not your studio' }, 403);
      if (!Array.isArray(urls) || !urls.length || urls.length > 8 || !urls.every(u => typeof u === 'string' && /^rtmps?:\/\/\S+$/.test(u))) {
        return json({ error: 'One of the stream addresses is not valid' }, 400);
      }
      let res = await api('StartEgress', {
        room_name: room,
        media: { participant_video: { identity }, audio: { capture_all: true } },
        preset: 'H264_720P_30',
        outputs: [{ stream: { protocol: 'RTMP', urls } }],
      });
      // The older request does the same on a relay that has not moved to the new one
      if (res.status === 404 || res.status === 400) {
        res = await api('StartParticipantEgress', { room_name: room, identity, preset: 'H264_720P_30', stream_outputs: [{ protocol: 'RTMP', urls }] });
      }
      if (!res.ok) {
        // The reply can repeat the addresses, which contain stream keys: only its status is reported
        console.error('egress start failed', res.status);
        return json({ error: 'The stream could not be started. Check your stream keys and try again.' }, 502);
      }
      const info = await res.json();
      return json({ egress_id: info.egress_id ?? info.egressId });
    }

    if (body.action === 'stop') {
      const res = await api('StopEgress', { egress_id: String(body.egress_id ?? '') });
      return json({ stopped: res.ok });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('studio-relay', (e as Error).name);
    return json({ error: 'The stream could not be started' }, 500);
  }
});
