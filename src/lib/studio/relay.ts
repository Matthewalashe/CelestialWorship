import { supabase } from '../../supabase';

/**
 * Sending the studio's picture to YouTube, Facebook and the rest. A browser cannot speak to those platforms itself,
 * so the picture goes to a relay in the cloud (LiveKit), which passes it to every platform at once.
 * Stream keys stay on this computer; they pass through our server only at the moment of going live.
 */

export type StreamPlatform = 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'x' | 'custom';

export interface StreamTarget {
  id: string;
  platform: StreamPlatform;
  name: string;
  server: string;
  key: string;
  /** The public link of the channel or page, so Online Church can show it */
  watchUrl: string;
}

export const PLATFORM_HELP: Record<StreamPlatform, { label: string; server: string; steps: string; link?: string; tall?: boolean }> = {
  youtube: { label: 'YouTube', server: 'rtmp://a.rtmp.youtube.com/live2', steps: 'YouTube Studio, then Go Live, then Stream. Copy the “Stream key”.', link: 'https://studio.youtube.com/channel/UC/livestreaming' },
  facebook: { label: 'Facebook', server: 'rtmps://live-api-s.facebook.com:443/rtmp', steps: 'Facebook Live Producer, then “Streaming software”. Copy the “Stream key”.', link: 'https://www.facebook.com/live/producer' },
  instagram: { label: 'Instagram', server: '', tall: true, steps: 'Needs a professional account. On instagram.com on a computer, press Create, then Live, and copy the server address and stream key. They change every time. When your picture appears there, press Go Live on Instagram too.', link: 'https://www.instagram.com/' },
  tiktok: { label: 'TikTok', server: '', tall: true, steps: 'TikTok only gives some accounts a stream key. In the TikTok app, or LIVE Producer if you see it, copy the server address and stream key. If you see no key, your account does not have this yet.', link: 'https://www.tiktok.com/live/producer' },
  x: { label: 'X', server: '', steps: 'In X Media Studio, open Producer, then Sources, and create an RTMP source. Copy its address and key, then start the broadcast there. Your account must be allowed to go live on X.', link: 'https://studio.x.com/producer' },
  custom: { label: 'Other', server: '', steps: 'Paste the server address and stream key the platform gives you.' },
};

const KEY = 'cw-studio-targets';

export function loadTargets(): StreamTarget[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(list)) return [];
    return list.filter((t): t is StreamTarget => !!t && typeof t.id === 'string' && typeof t.server === 'string' && typeof t.key === 'string' && t.platform in PLATFORM_HELP)
      .map(t => ({ ...t, name: t.name || PLATFORM_HELP[t.platform].label, watchUrl: t.watchUrl || '' }));
  } catch { return []; }
}

export function saveTargets(targets: StreamTarget[]) {
  try { localStorage.setItem(KEY, JSON.stringify(targets)); } catch {}
}

/**
 * Makes sense of what was pasted. People often paste the whole address into the key box, or add stray spaces.
 * Null if it cannot be a stream address: spaces and the marks | [ ] would break the sending command.
 */
export function parseTarget(serverText: string, keyText: string): { server: string; key: string } | null {
  let server = serverText.trim().replace(/\/+$/, '');
  let key = keyText.trim().replace(/^\/+/, '');
  if (/^rtmps?:\/\//i.test(key)) {
    const cut = key.replace(/\/+$/, '').lastIndexOf('/');
    const whole = key.replace(/\/+$/, '');
    if (cut <= 'rtmps://'.length) return null;
    server = whole.slice(0, cut);
    key = whole.slice(cut + 1);
  }
  if (!key || !/^rtmps?:\/\/[^\s|[\]]+$/i.test(server) || /[\s|[\]]/.test(key)) return null;
  return { server, key };
}

/** The address the relay sends to. The key is the last part. */
export function targetUrl(t: Pick<StreamTarget, 'server' | 'key'>): string {
  return `${t.server.trim().replace(/\/+$/, '')}/${t.key.trim()}`;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('studio-relay', { body });
  if (error) {
    let message = error.message;
    try { message = (await (error as { context?: Response }).context?.json())?.error ?? message; } catch {}
    throw new Error(message);
  }
  return data as T;
}

/** Whether the relay has been set up. False until its account keys are added. */
export async function relayReady(): Promise<boolean> {
  try { return (await call<{ configured: boolean }>({ action: 'status' })).configured; } catch { return false; }
}

export interface RelaySession { stop: () => Promise<void> }

export async function startRelay(output: MediaStream, urls: string[], onDisconnect: () => void): Promise<RelaySession> {
  const { url, token, room, identity } = await call<{ url: string; token: string; room: string; identity: string }>({ action: 'token' });
  const { Room, RoomEvent, Track, AudioPresets } = await import('livekit-client');
  const lk = new Room();
  lk.on(RoomEvent.Disconnected, onDisconnect);
  await lk.connect(url, token);
  await lk.localParticipant.publishTrack(output.getVideoTracks()[0], {
    source: Track.Source.Camera, simulcast: false, videoCodec: 'h264', videoEncoding: { maxBitrate: 3_000_000, maxFramerate: 30 },
  });
  await lk.localParticipant.publishTrack(output.getAudioTracks()[0], {
    source: Track.Source.Microphone, dtx: false, red: false, audioPreset: AudioPresets.musicHighQuality,
  });
  let egressId: string;
  try {
    ({ egress_id: egressId } = await call<{ egress_id: string }>({ action: 'start', room, identity, urls }));
  } catch (e) {
    lk.off(RoomEvent.Disconnected, onDisconnect);
    await lk.disconnect();
    throw e;
  }
  return {
    stop: async () => {
      lk.off(RoomEvent.Disconnected, onDisconnect);
      await call({ action: 'stop', egress_id: egressId }).catch(() => {});
      await lk.disconnect();
    },
  };
}
