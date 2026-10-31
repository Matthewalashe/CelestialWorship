// CelestialWorship Connect: a small program on the church's computer that passes the Live Studio's picture to YouTube,
// Facebook and the rest. Browsers cannot speak to those platforms; this can. Nothing goes through our servers.
//
// It only listens on this computer, and only answers the CelestialWorship website.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { explain, ffmpegArgs, parseProgress, redact, validTargets } from './args.mjs';

const VERSION = '0.3.0';
const PORT = 47650;
const ORIGINS = new Set(['https://celestialworship.online', 'https://www.celestialworship.online', ...(process.env.CW_ALLOW_ORIGIN ? [process.env.CW_ALLOW_ORIGIN] : [])]);
const FFMPEG = process.env.CW_FFMPEG || join(dirname(process.execPath), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

// Installed, it has no window, so what it says also goes to a small log that a helper can ask for. Keys never reach this.
const LOG_DIR = join(process.env.LOCALAPPDATA || dirname(process.execPath), 'CelestialWorshipConnect');
const LOG = join(LOG_DIR, 'connect.log');
try {
  mkdirSync(LOG_DIR, { recursive: true });
  if (existsSync(LOG) && statSync(LOG).size > 1024 * 1024) writeFileSync(LOG, '');
} catch {}
process.stdout.on('error', () => {});
process.stderr.on('error', () => {});
const toLog = text => { try { appendFileSync(LOG, `${new Date().toISOString()} ${text}\n`); } catch {} };
const say = text => { toLog(text); try { console.log(`  ${text}`); } catch {} };
const MAX_LINE = 16 * 1024;

console.log('\n  CelestialWorship Connect\n  ------------------------');
if (!process.env.CW_FFMPEG && !existsSync(FFMPEG)) {
  say('ffmpeg.exe is missing. Keep it in the same folder as this program.');
  setTimeout(() => process.exit(1), 30_000);
}

const server = new WebSocketServer({
  host: '127.0.0.1',
  port: PORT,
  // Any website could otherwise try this address: only ours may use it
  verifyClient: ({ origin }) => ORIGINS.has(origin),
  maxPayload: 32 * 1024 * 1024,
});

server.on('listening', () => {
  say('Ready. Leave this window open and go to the Live Studio in your browser.');
  say('You can minimise it, but do not close it while you are live.\n');
});

server.on('error', e => {
  say(e.code === 'EADDRINUSE' ? 'Connect is already running. You can close this window.' : 'Connect could not start. Please restart your computer and try again.');
  // Opened a second time with no one looking, it simply steps aside
  setTimeout(() => process.exit(e.code === 'EADDRINUSE' ? 0 : 1), process.stdout.isTTY ? 15_000 : 500);
});

let active = null;

server.on('connection', socket => {
  const send = message => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message)); };
  send({ type: 'hello', version: VERSION });
  let mine = null;
  let lastProblem = '';
  let waiting = false;

  const stop = () => {
    if (!mine) return;
    const ending = mine;
    mine = null;
    ending.stdin.end();
    // FFmpeg finishes cleanly when its input ends; this is only for one that does not
    setTimeout(() => { if (ending.exitCode === null) ending.kill(); }, 5000);
  };

  socket.on('message', (data, isBinary) => {
    if (isBinary) {
      if (mine && !mine.stdin.write(data) && !waiting) {
        waiting = true;
        socket._socket.pause();
        mine.stdin.once('drain', () => { waiting = false; socket._socket.resume(); });
      }
      return;
    }
    let message;
    try { message = JSON.parse(data.toString()); } catch { return; }
    if (message.type === 'stop') { stop(); return; }
    if (message.type !== 'start') return;
    if (active) { send({ type: 'ended', ok: false, reason: 'Another stream is already running on this computer.' }); return; }
    if (!validTargets(message.urls)) { send({ type: 'ended', ok: false, reason: 'One of the stream addresses is not valid.' }); return; }

    const args = ffmpegArgs(message.urls, message.quality, message.copy === true);
    const child = FFMPEG.endsWith('.mjs') ? spawn(process.execPath, [FFMPEG, ...args], { windowsHide: true }) : spawn(FFMPEG, args, { windowsHide: true });
    mine = active = child;
    let started = false;
    let tail = '';
    child.stdin.on('error', () => {});
    child.on('error', () => { active = null; mine = null; send({ type: 'ended', ok: false, reason: 'ffmpeg.exe could not start. Download Connect again.' }); });

    child.stderr.on('data', chunk => {
      tail += chunk.toString();
      // Progress lines end with a carriage return, messages with a new line
      const lines = tail.split(/[\r\n]+/);
      tail = (lines.pop() ?? '').slice(-MAX_LINE);
      for (const line of lines) {
        const progress = parseProgress(line);
        if (progress) {
          if (!started && progress.frames > 0) { started = true; say('You are live.'); send({ type: 'live' }); }
          send({ type: 'stats', ...progress });
          continue;
        }
        const problem = explain(line);
        if (problem && problem !== lastProblem) { lastProblem = problem; say(problem); send({ type: 'problem', message: problem }); }
        else if (line.trim()) { toLog(redact(line).slice(0, 200)); try { console.error(`  ${redact(line).slice(0, 200)}`); } catch {} }
      }
    });

    child.on('close', code => {
      if (active === child) active = null;
      if (mine === child) mine = null;
      say('Stream ended.\n');
      send({ type: 'ended', ok: code === 0, reason: code === 0 ? null : lastProblem || 'The stream stopped. Check your internet connection and stream keys.' });
    });
    say('Starting your stream…');
  });

  socket.on('close', stop);
  socket.on('error', () => {});
});

process.on('uncaughtException', e => toLog(redact(String(e?.message ?? e)).slice(0, 200)));
