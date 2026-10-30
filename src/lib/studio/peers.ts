import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { Compositor } from './compositor';

/**
 * Phones and guests reach the studio directly, device to device (WebRTC), through a link with a room code. The
 * database's realtime channel only introduces them. A person who joins waits backstage until the host brings them on.
 * Networks that refuse direct connections need a relay server, which this does not yet have; the person is told.
 */

const ICE: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
export type GuestRole = 'phone' | 'guest';
const channelName = (code: string) => `studio-${code.toUpperCase()}`;

interface Hello { id: string; name: string; role: GuestRole }
type Signal = { to: string; from: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

/** The host's side: every person who joins becomes a source, not yet on stage */
export function hostRoom(code: string, compositor: Compositor, onError: (name: string) => void): () => void {
  const peers = new Map<string, RTCPeerConnection>();
  const rt = supabase.channel(channelName(code), { config: { broadcast: { self: false } } });
  const send = (signal: Signal) => rt.send({ type: 'broadcast', event: 'signal', payload: signal });
  const drop = (id: string) => {
    peers.get(id)?.close();
    peers.delete(id);
    compositor.dropBus(id);
    compositor.removeSource(id, false);
  };

  rt.on('broadcast', { event: 'hello' }, async ({ payload }) => {
    const hello = payload as Hello;
    if (!hello?.id || peers.has(hello.id)) return;
    const pc = new RTCPeerConnection(ICE);
    peers.set(hello.id, pc);
    pc.onicecandidate = e => { if (e.candidate) send({ to: hello.id, from: 'host', candidate: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { onError(hello.name); drop(hello.id); }
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
    await pc.setLocalDescription(await pc.createOffer());
    send({ to: hello.id, from: 'host', description: pc.localDescription!.toJSON() });
  });

  rt.on('broadcast', { event: 'signal' }, async ({ payload }) => {
    const signal = payload as Signal;
    if (signal.to !== 'host') return;
    const pc = peers.get(signal.from);
    if (!pc) return;
    if (signal.description) await pc.setRemoteDescription(signal.description);
    if (signal.candidate) await pc.addIceCandidate(signal.candidate).catch(() => {});
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
    if (signal.description) {
      await pc.setRemoteDescription(signal.description);
      // The host offered a slot for the picture and one for the sound: fill them
      for (const t of pc.getTransceivers()) {
        const kind = t.receiver.track.kind;
        const track = stream.getTracks().find(x => x.kind === kind);
        if (track) { await t.sender.replaceTrack(track); t.direction = kind === 'audio' && hello.role === 'guest' ? 'sendrecv' : 'sendonly'; }
      }
      await pc.setLocalDescription(await pc.createAnswer());
      answered = true;
      send({ to: 'host', from: hello.id, description: pc.localDescription!.toJSON() });
    }
    if (signal.candidate) await pc.addIceCandidate(signal.candidate).catch(() => {});
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
