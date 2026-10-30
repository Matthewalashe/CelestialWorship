import type { RelaySession } from './relay';

/**
 * CelestialWorship Connect: the free helper on the church's computer (desktop/connect). The browser records the
 * studio's picture and hands it over here; Connect sends it to the platforms. No server of ours is involved.
 */

const ADDRESS = 'ws://127.0.0.1:47650';
export const CONNECT_DOWNLOAD = 'https://github.com/Matthewalashe/CelestialWorship/releases/download/connect-v0.1.0/CelestialWorshipConnect-windows.zip';
const START_TIMEOUT = 25_000;

export function isWindowsComputer(): boolean {
  return /Windows/.test(navigator.userAgent);
}

/** Whether Connect is running on this computer */
export function connectRunning(): Promise<boolean> {
  return new Promise(resolve => {
    let socket: WebSocket;
    try { socket = new WebSocket(ADDRESS); } catch { resolve(false); return; }
    const finish = (found: boolean) => { clearTimeout(timer); socket.onopen = socket.onerror = null; try { socket.close(); } catch {} resolve(found); };
    const timer = setTimeout(() => finish(false), 1500);
    socket.onopen = () => finish(true);
    socket.onerror = () => finish(false);
  });
}

export interface ConnectStats { fps: number; kbps: number | null; speed: number | null }

export interface ConnectEvents {
  onStats?: (s: ConnectStats) => void;
  onProblem?: (message: string) => void;
  /** The stream stopped without anyone pressing End */
  onLost: (reason: string) => void;
}

export function startConnect(output: MediaStream, urls: string[], events: ConnectEvents): Promise<RelaySession> {
  return new Promise((resolve, reject) => {
    const mimeType = ['video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType) { reject(new Error('This browser cannot stream. Please use Chrome or Edge.')); return; }

    const socket = new WebSocket(ADDRESS);
    socket.binaryType = 'arraybuffer';
    let recorder: MediaRecorder | null = null;
    let settled = false;
    let stopping = false;
    let finished: (() => void) | null = null;

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (recorder?.state === 'recording') recorder.stop();
      socket.close();
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail('The stream did not start. Check your internet connection and your stream keys.'), START_TIMEOUT);

    socket.onerror = () => fail('CelestialWorship Connect is not running. Open it and try again.');
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'start', urls }));
      recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 192_000 });
      recorder.ondataavailable = async e => {
        if (!e.data.size) return;
        const bytes = await e.data.arrayBuffer();
        if (socket.readyState === WebSocket.OPEN) socket.send(bytes);
      };
      recorder.start(250);
    };

    socket.onmessage = e => {
      if (typeof e.data !== 'string') return;
      const m = JSON.parse(e.data);
      if (m.type === 'live' && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          stop: () => new Promise<void>(done => {
            stopping = true;
            finished = done;
            if (recorder?.state === 'recording') recorder.stop();
            socket.send(JSON.stringify({ type: 'stop' }));
            // Connect answers when it has finished; do not hold anyone up if it cannot
            setTimeout(() => { socket.close(); done(); }, 6000);
          }),
        });
      } else if (m.type === 'stats') {
        events.onStats?.(m);
      } else if (m.type === 'problem') {
        events.onProblem?.(m.message);
      } else if (m.type === 'ended') {
        if (!settled) { fail(m.reason || 'The stream did not start.'); return; }
        if (recorder?.state === 'recording') recorder.stop();
        socket.close();
        if (stopping) finished?.();
        else events.onLost(m.reason || 'The stream stopped.');
      }
    };

    socket.onclose = () => {
      if (!settled) { fail('CelestialWorship Connect closed. Open it and try again.'); return; }
      if (!stopping) {
        if (recorder?.state === 'recording') recorder.stop();
        events.onLost('CelestialWorship Connect was closed, so the stream has stopped.');
      }
    };
  });
}
