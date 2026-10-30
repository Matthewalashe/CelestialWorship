// CelestialWorship Connect: a small program on the church's computer that passes the Live Studio's picture to YouTube,
// Facebook and the rest. Browsers cannot speak to those platforms; this can. Nothing goes through our servers.
//
// It only listens on this computer, and only answers the CelestialWorship website.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { explain, ffmpegArgs, parseProgress, redact, validTargets } from './args.mjs';

const VERSION = '0.1.0';
const PORT = 47650;
const ORIGINS = new Set(['https://celestialworship.online', 'https://www.celestialworship.online', ...(process.env.CW_ALLOW_ORIGIN ? [process.env.CW_ALLOW_ORIGIN] : [])]);
const FFMPEG = process.env.CW_FFMPEG || join(dirname(process.execPath), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

const say = text => console.log(`  ${text}`);

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
  setTimeout(() => process.exit(1), 15_000);
});

let active = null;

server.on('connection', socket => {
  const send = message => { if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message)); };
  send({ type: 'hello', version: VERSION });
  let mine = null;
  let lastProblem = '';

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
      if (mine && !mine.stdin.write(data)) {
        socket._socket.pause();
        mine.stdin.once('drain', () => socket._socket.resume());
      }
      return;
    }
    let message;
    try { message = JSON.parse(data.toString()); } catch { return; }
    if (message.type === 'stop') { stop(); return; }
    if (message.type !== 'start') return;
    if (active) { send({ type: 'ended', ok: false, reason: 'Another stream is already running on this computer.' }); return; }
    if (!validTargets(message.urls)) { send({ type: 'ended', ok: false, reason: 'One of the stream addresses is not valid.' }); return; }

    const args = ffmpegArgs(message.urls);
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
      tail = lines.pop() ?? '';
      for (const line of lines) {
        const progress = parseProgress(line);
        if (progress) {
          if (!started && progress.frames > 0) { started = true; say('You are live.'); send({ type: 'live' }); }
          send({ type: 'stats', ...progress });
          continue;
        }
        const problem = explain(line);
        if (problem && problem !== lastProblem) { lastProblem = problem; say(problem); send({ type: 'problem', message: problem }); }
        else if (line.trim()) console.error(`  ${redact(line).slice(0, 200)}`);
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

process.on('uncaughtException', e => console.error(`  ${redact(String(e?.message ?? e)).slice(0, 200)}`));
