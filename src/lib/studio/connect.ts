import type { RelaySession } from './relay';

/**
 * CelestialWorship Connect: the free helper on the church's computer (desktop/connect). The browser records the
 * studio's picture and hands it over here; Connect sends it to the platforms. No server of ours is involved.
 *
 * A live service must survive a bad moment, so once a stream is live a dropped connection is tried again by itself,
 * and only after several failures is the person told it has stopped.
 */

const ADDRESS = 'ws://127.0.0.1:47650';
export const CONNECT_DOWNLOAD = 'https://github.com/Matthewalashe/CelestialWorship/releases/download/connect-v0.1.0/CelestialWorshipConnect-windows.zip';
/** Turned on once the installer (connect-v0.2.0) is published: until then the zip above is all there is */
export const CONNECT_INSTALLER_PUBLISHED = false;
export const CONNECT_SETUP = 'https://github.com/Matthewalashe/CelestialWorship/releases/download/connect-v0.2.0/CelestialWorshipConnect-Setup.exe';
/** Wakes an installed Connect, if it is not already running */
export const CONNECT_OPEN = 'celestialworship-connect://start';

const START_TIMEOUT = 25_000;
/** No word from FFmpeg for this long means the stream is stuck */
const SILENCE_LIMIT = 20_000;
/** Connect has fallen this far behind the camera */
const TOO_MUCH_WAITING = 64 * 1024 * 1024;
const SLOW_SPEED = 0.9;
const SLOW_REPORTS = 10;
const STABLE_AFTER = 60_000;
const RETRY_WAITS = [2000, 5000, 10_000, 20_000];

/** How long to wait before trying again, or null when it is time to give up */
export function retryWait(failures: number): number | null {
  return failures < RETRY_WAITS.length ? RETRY_WAITS[failures] : null;
}

/** Whether this many speed reports in a row, the latest included, say the stream is not keeping up */
export function nextSlowCount(count: number, speed: number | null): number {
  if (speed === null) return count;
  return speed < SLOW_SPEED ? count + 1 : 0;
}
export const isTooSlow = (count: number) => count === SLOW_REPORTS;

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
  /** The connection dropped and is being tried again */
  onReconnecting?: () => void;
  /** It came back */
  onBack?: () => void;
  /** The stream stopped without anyone pressing End, and could not be brought back */
  onLost: (reason: string) => void;
}

export function startConnect(output: MediaStream, urls: string[], events: ConnectEvents): Promise<RelaySession> {
  return new Promise((resolve, reject) => {
    const mimeType = ['video/webm;codecs=h264,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType) { reject(new Error('This browser cannot stream. Please use Chrome or Edge.')); return; }

    let settled = false;
    let stopping = false;
    let failures = 0;
    let finished: (() => void) | null = null;
    let endCurrent: ((reason: string) => void) | null = null;
    let sendStop: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const giveUp = (reason: string) => { events.onLost(reason); };

    const open = () => {
      retryTimer = null;
      let socket: WebSocket;
      try { socket = new WebSocket(ADDRESS); } catch { retryAfter('CelestialWorship Connect is not running. Open it and try again.'); return; }
      socket.binaryType = 'arraybuffer';
      let recorder: MediaRecorder | null = null;
      let ended = false;
      let wentLive = false;
      let lastHeard = 0;
      let liveAt = 0;
      let slow = 0;
      let warnedWaiting = false;
      // Blobs read at their own pace: without this queue a later piece can overtake an earlier one and ruin the video
      let queue: Promise<void> = Promise.resolve();

      const end = (reason: string) => {
        if (ended) return;
        ended = true;
        clearTimeout(startTimer);
        clearInterval(watch);
        endCurrent = null;
        sendStop = null;
        try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch {}
        try { socket.close(); } catch {}
        if (stopping) { finished?.(); return; }
        if (!settled) { settled = true; reject(new Error(reason)); return; }
        if (wentLive && Date.now() - liveAt > STABLE_AFTER) failures = 0;
        retryAfter(reason);
      };
      endCurrent = end;
      sendStop = () => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop' })); };

      const startTimer = setTimeout(() => end('The stream did not start. Check your internet connection and your stream keys.'), START_TIMEOUT);
      const watch = setInterval(() => {
        if (wentLive && Date.now() - lastHeard > SILENCE_LIMIT) end('The stream stopped moving. Check your internet connection.');
        if (socket.bufferedAmount > TOO_MUCH_WAITING && !warnedWaiting) {
          warnedWaiting = true;
          events.onProblem?.('This computer is falling behind. Close other programs, or stream to fewer platforms.');
        }
      }, 5000);

      socket.onerror = () => end('CelestialWorship Connect is not running. Open it and try again.');
      socket.onclose = () => end('CelestialWorship Connect was closed, so the stream has stopped.');
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'start', urls }));
        try {
          recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 192_000 });
        } catch { end('This browser cannot stream. Please use Chrome or Edge.'); return; }
        recorder.ondataavailable = e => {
          if (!e.data.size) return;
          queue = queue.then(() => e.data.arrayBuffer()).then(bytes => {
            if (socket.readyState === WebSocket.OPEN) socket.send(bytes);
          }).catch(() => {});
        };
        recorder.onerror = () => end('The browser stopped recording the picture.');
        recorder.start(250);
      };

      socket.onmessage = e => {
        if (typeof e.data !== 'string') return;
        let m: { type?: string; message?: string; reason?: string | null } & Partial<ConnectStats>;
        try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === 'live') {
          wentLive = true;
          liveAt = lastHeard = Date.now();
          clearTimeout(startTimer);
          if (!settled) { settled = true; resolve(session); } else events.onBack?.();
        } else if (m.type === 'stats') {
          lastHeard = Date.now();
          const stats = { fps: m.fps ?? 0, kbps: m.kbps ?? null, speed: m.speed ?? null };
          events.onStats?.(stats);
          slow = nextSlowCount(slow, stats.speed);
          if (isTooSlow(slow)) events.onProblem?.('Your internet cannot keep up. Stream to fewer platforms, or move closer to the router.');
        } else if (m.type === 'problem' && m.message) {
          events.onProblem?.(m.message);
        } else if (m.type === 'ended') {
          end(m.reason || 'The stream stopped.');
        }
      };
    };

    const retryAfter = (reason: string) => {
      const wait = settled && !stopping ? retryWait(failures) : null;
      if (!settled) { settled = true; reject(new Error(reason)); return; }
      if (wait === null) { giveUp(reason); return; }
      failures += 1;
      events.onReconnecting?.();
      retryTimer = setTimeout(open, wait);
    };

    const session: RelaySession = {
      stop: () => new Promise<void>(done => {
        stopping = true;
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        if (!endCurrent) { done(); return; }
        finished = done;
        const endNow = endCurrent;
        try { sendStop?.(); } catch {}
        // Connect answers when it has finished; do not hold anyone up if it cannot
        setTimeout(() => endNow('stopped'), 6000);
      }),
    };

    open();
  });
}
