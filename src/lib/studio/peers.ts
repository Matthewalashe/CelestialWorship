import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { Compositor } from './compositor';

/**
 * Phones and guests reach the studio directly, device to device (WebRTC), through a link with a room code. The
 * database's realtime channel only introduces them. A person who joins waits backstage until the host brings them on.
 * Networks that refuse direct connections go through a relay server when one is set up (turn-credentials).
 */

const STUN: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
const ICE: RTCConfiguration = { iceServers: STUN };

/** Adds the relay, where it is set up. Never holds anyone up for long, and direct connections still work without it. */
let relayServers: Promise<RTCIceServer[]> | null = null;
function withRelay(): Promise<RTCConfiguration> {
  relayServers ??= Promise.race([
    supabase.functions.invoke('turn-credentials', { body: {} }).then(({ data }) => (Array.isArray(data?.iceServers) ? data.iceServers as RTCIceServer[] : [])).catch(() => []),
    new Promise<RTCIceServer[]>(done => setTimeout(() => done([]), 4000)),
  ]);
  return relayServers.then(extra => ({ iceServers: [...STUN, ...extra] }));
}

/**
 * Connection details can arrive before the description they belong to, and a browser refuses them until then.
 * They wait here instead of being lost.
 */
export function candidateQueue(pc: Pick<RTCPeerConnection, 'remoteDescription' | 'addIceCandidate'>) {
  const waiting: RTCIceCandidateInit[] = [];
  return {
    add(c: RTCIceCandidateInit) {
      if (pc.remoteDescription) void pc.addIceCandidate(c).catch(() => {});
      else waiting.push(c);
    },
    flush() {
      for (const c of waiting.splice(0)) void pc.addIceCandidate(c).catch(() => {});
    },
  };
}
export type GuestRole = 'phone' | 'guest';
const channelName = (code: string) => `studio-${code.toUpperCase()}`;

interface Hello { id: string; name: string; role: GuestRole }
type Signal = { to: string; from: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

/** The host's side: every person who joins becomes a source, not yet on stage */
export function hostRoom(code: string, compositor: Compositor, onError: (name: string) => void): () => void {
  const peers = new Map<string, RTCPeerConnection>();
  const queues = new Map<string, ReturnType<typeof candidateQueue>>();
  const rt = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
  const send = (signal: Signal) => rt.send({ type: 'broadcast', event: 'signal', payload: signal });
  const drop = (id: string) => {
    peers.get(id)?.close();
    peers.delete(id);
    queues.delete(id);
    compositor.dropBus(id);
    compositor.removeSource(id, false);
  };

  rt.on('broadcast', { event: 'hello' }, async ({ payload }) => {
    const hello = payload as Hello;
    if (!hello?.id || peers.has(hello.id)) return;
    const pc = new RTCPeerConnection(ICE);
    peers.set(hello.id, pc);
    queues.set(hello.id, candidateQueue(pc));
    let retried = false;
    pc.onicecandidate = e => { if (e.candidate) send({ to: hello.id, from: 'host', candidate: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        // Networks change their minds: try once more before giving up
        if (!retried) {
          retried = true;
          void pc.createOffer({ iceRestart: true }).then(o => pc.setLocalDescription(o)).then(() => send({ to: hello.id, from: 'host', description: pc.localDescription!.toJSON() })).catch(() => { onError(hello.name); drop(hello.id); });
        } else { onError(hello.name); drop(hello.id); }
      }
      if (pc.connectionState === 'closed' || pc.connectionState === 'disconnected') setTimeout(() => { if (pc.connectionState !== 'connected') drop(hello.id); }, 8000);
    };
    const incoming = new MediaStream();
    let added = false;
    pc.ontrack = e => {
      incoming.addTrack(e.track);
      // Both tracks arrive together: wait a moment so the sound is mixed from the start
      if (added) return;
      added = true;
      setTimeout(() => compositor.addSource({ id: hello.id, label: hello.name, kind: hello.role, stream: incoming, muted: hello.role === 'phone', onStage: false }), 300);
    };
    pc.addTransceiver('video', { direction: 'recvonly' });
    if (hello.role === 'guest') {
      const back = compositor.returnBus(hello.id).getAudioTracks()[0];
      pc.addTransceiver(back, { direction: 'sendrecv' });
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    pc.setConfiguration(await withRelay());
    if (pc.signalingState === 'closed') return;
    await pc.setLocalDescription(await pc.createOffer());
    send({ to: hello.id, from: 'host', description: pc.localDescription!.toJSON() });
  });

  rt.on('broadcast', { event: 'signal' }, async ({ payload }) => {
    const signal = payload as Signal;
    if (signal.to !== 'host') return;
    const pc = peers.get(signal.from);
    if (!pc) return;
    const queue = queues.get(signal.from);
    if (signal.candidate) queue?.add(signal.candidate);
    if (signal.description) { await pc.setRemoteDescription(signal.description).catch(() => {}); queue?.flush(); }
  });

  rt.on('broadcast', { event: 'bye' }, ({ payload }) => { if (payload?.id) drop(payload.id); });
  rt.subscribe();

  return () => {
    peers.forEach(pc => pc.close());
    peers.clear();
    void supabase.removeChannel(rt);
  };
}

export type GuestStatus = 'connecting' | 'backstage' | 'failed';

/** The phone's or guest's side */
export function joinRoom(code: string, hello: Hello, stream: MediaStream, onStatus: (s: GuestStatus) => void, onReturn: (s: MediaStream) => void) {
  const pc = new RTCPeerConnection(ICE);
  let channel: RealtimeChannel | null = null;
  let answered = false;
  const queue = candidateQueue(pc);
  const rt = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
  channel = rt;
  const send = (signal: Signal) => rt.send({ type: 'broadcast', event: 'signal', payload: signal });

  pc.onicecandidate = e => { if (e.candidate) send({ to: 'host', from: hello.id, candidate: e.candidate.toJSON() }); };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') onStatus('backstage');
    if (pc.connectionState === 'failed') onStatus('failed');
  };
  pc.ontrack = e => { if (e.track.kind === 'audio') onReturn(new MediaStream([e.track])); };

  rt.on('broadcast', { event: 'signal' }, async ({ payload }) => {
    const signal = payload as Signal;
    if (signal.to !== hello.id) return;
    if (signal.candidate) queue.add(signal.candidate);
    if (signal.description) {
      await pc.setRemoteDescription(signal.description);
      queue.flush();
      // The host offered a slot for the picture and one for the sound: fill them
      for (const t of pc.getTransceivers()) {
        const kind = t.receiver.track.kind;
        const track = stream.getTracks().find(x => x.kind === kind);
        if (track) { await t.sender.replaceTrack(track); t.direction = kind === 'audio' && hello.role === 'guest' ? 'sendrecv' : 'sendonly'; }
      }
      pc.setConfiguration(await withRelay());
      await pc.setLocalDescription(await pc.createAnswer());
      answered = true;
      send({ to: 'host', from: hello.id, description: pc.localDescription!.toJSON() });
    }
  });

  // Keep knocking until the host's studio is open and answers
  let timer: ReturnType<typeof setInterval> | null = null;
  rt.subscribe(status => {
    if (status !== 'SUBSCRIBED' || timer) return;
    const knock = () => { if (!answered) rt.send({ type: 'broadcast', event: 'hello', payload: hello }); };
    knock();
    timer = setInterval(knock, 3000);
  });

  return {
    replaceVideo: (track: MediaStreamTrack) => pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(track),
    leave: () => {
      if (timer) clearInterval(timer);
      rt.send({ type: 'broadcast', event: 'bye', payload: { id: hello.id } });
      pc.close();
      if (channel) void supabase.removeChannel(channel);
    },
  };
}
