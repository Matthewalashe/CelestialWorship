// A real end-to-end run for the build machine: a test recording goes through Connect and real FFmpeg to a local RTMP server,
// and what arrives is checked. Usage: node e2e.mjs <folder with CelestialWorshipConnect.exe, ffmpeg.exe and ffprobe.exe>
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import WebSocket from 'ws';

const dir = resolve(process.argv[2]);
const ffmpeg = join(dir, 'ffmpeg.exe'), ffprobe = join(dir, 'ffprobe.exe');
const wait = ms => new Promise(r => setTimeout(r, ms));

// The kind of recording a browser makes: WebM with Opus sound
const made = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=1280x720:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440',
  '-t', '20', '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '2M', '-c:a', 'libopus', '-f', 'webm', 'input.webm'], { stdio: 'inherit' });
if (made.status !== 0) throw new Error('could not make the test recording');

const receiver = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-listen', '1', '-f', 'flv', '-i', 'rtmp://127.0.0.1:19350/live/testkey', '-c', 'copy', 'received.flv'], { stdio: 'inherit' });
const connect = spawn(join(dir, 'CelestialWorshipConnect.exe'), { env: { ...process.env, CW_ALLOW_ORIGIN: 'https://e2e.test' }, stdio: 'pipe' });
const log = [];
connect.stdout.on('data', d => log.push(String(d)));
connect.stderr.on('data', d => log.push(String(d)));
await wait(4000);

// A stranger's website must be turned away
const refused = await new Promise(resolve => {
  const bad = new WebSocket('ws://127.0.0.1:47650', { origin: 'https://evil.example' });
  bad.on('open', () => { bad.close(); resolve(false); });
  bad.on('error', () => resolve(true));
});
if (!refused) throw new Error('another website was allowed to connect');
console.log('PASS another website is refused');

const socket = new WebSocket('ws://127.0.0.1:47650', { origin: 'https://e2e.test' });
const events = [];
const ended = new Promise(resolve => {
  socket.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.type !== 'stats') console.log('event', JSON.stringify(m));
    events.push(m);
    if (m.type === 'ended') resolve(m);
  });
});
await new Promise(r => socket.on('open', r));
socket.send(JSON.stringify({ type: 'start', urls: ['rtmp://127.0.0.1:19350/live/testkey'] }));
const data = readFileSync('input.webm');
for (let i = 0; i < data.length; i += 64 * 1024) { socket.send(data.subarray(i, i + 64 * 1024)); await wait(30); }
socket.send(JSON.stringify({ type: 'stop' }));
const end = await Promise.race([ended, wait(60_000).then(() => ({ timeout: true }))]);
if (end.timeout) throw new Error('Connect never finished');
await wait(3000);
receiver.kill();
connect.kill();

if (!events.some(e => e.type === 'live')) throw new Error('Connect never reported being live');
console.log('PASS Connect reported live');
if (log.join('').includes('testkey')) throw new Error('the stream key appeared in the log');
console.log('PASS the stream key stays out of the log');

const probe = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-show_entries', 'format=duration', '-of', 'json', 'received.flv'], { encoding: 'utf8' });
const info = JSON.parse(probe.stdout || '{}');
console.log(JSON.stringify(info));
const codecs = (info.streams ?? []).map(s => s.codec_name);
if (!codecs.includes('h264') || !codecs.includes('aac')) throw new Error(`wrong formats arrived: ${codecs}`);
if (Number(info.format?.duration) < 10) throw new Error('too little video arrived');
console.log('PASS H.264 and AAC arrived at the RTMP server');

// Key frames every two seconds, as YouTube asks
const frames = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 'v', '-skip_frame', 'nokey', '-show_entries', 'frame=pts_time', '-of', 'csv=p=0', 'received.flv'], { encoding: 'utf8' });
const keys = frames.stdout.trim().split(/\s+/).map(Number).filter(Number.isFinite);
const gaps = keys.slice(1).map((k, i) => k - keys[i]);
if (!gaps.length || Math.max(...gaps) > 2.5) throw new Error(`key frames too far apart: ${gaps.join(', ')}`);
console.log('PASS key frames every two seconds');
process.exit(0);
