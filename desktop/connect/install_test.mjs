// Runs the real installer on the build machine and checks what a church would get. Usage: node install_test.mjs <setup.exe>
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import WebSocket from 'ws';

const wait = ms => new Promise(r => setTimeout(r, ms));
const app = join(process.env.LOCALAPPDATA, 'Programs', 'CelestialWorship Connect');
const reg = key => spawnSync('reg', ['query', key], { encoding: 'utf8' });

const opens = origin => new Promise(resolve => {
  const socket = new WebSocket('ws://127.0.0.1:47650', { origin });
  socket.on('open', () => { socket.close(); resolve(true); });
  socket.on('error', () => resolve(false));
});
const answers = async () => {
  for (let i = 0; i < 30; i++) { if (await opens('https://celestialworship.online')) return true; await wait(1000); }
  return false;
};

const installed = spawnSync(process.argv[2], ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], { stdio: 'inherit' });
if (installed.status !== 0) throw new Error(`the installer failed: ${installed.status}`);
if (!existsSync(join(app, 'CelestialWorshipConnect.exe')) || !existsSync(join(app, 'ffmpeg.exe'))) throw new Error('files were not installed');
console.log('PASS installed without an administrator');

if (!/CelestialWorship Connect/.test(reg('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run').stdout)) throw new Error('does not start with the computer');
console.log('PASS starts with the computer');
if (reg('HKCU\\Software\\Classes\\celestialworship-connect\\shell\\open\\command').status !== 0) throw new Error('the Open it link is not registered');
console.log('PASS the Open it link is registered');

if (!(await answers())) throw new Error('it did not start after installing, with no window');
console.log('PASS runs with no window, and answers the studio');
if (await opens('https://evil.example')) throw new Error('another website was let in');
console.log('PASS another website is refused');

// Opening it again must not start a second copy that fights the first
spawnSync(join(app, 'CelestialWorshipConnect.exe'), [], { timeout: 5000 });
await wait(1000);
if (!(await answers())) throw new Error('opening it twice broke it');
console.log('PASS opening it twice is harmless');

const removed = spawnSync(join(app, 'unins000.exe'), ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], { stdio: 'inherit' });
if (removed.status !== 0) throw new Error('the uninstaller failed');
await wait(5000);
if (await opens('https://celestialworship.online')) throw new Error('still running after uninstalling');
if (/CelestialWorship Connect/.test(reg('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run').stdout)) throw new Error('still starts with the computer after uninstalling');
console.log('PASS uninstalls cleanly');
process.exit(0);
