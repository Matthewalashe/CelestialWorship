import { exportLibrary, importLibrary, type LibraryExport } from '../hooks/useNotes';

/**
 * The move to celestialworship.online, done quietly.
 *
 * Notes, highlights, prayers, settings and the sign-in live per web address, so on the old address the
 * app packs them into the link (after #, which never reaches a server) and opens the same page on the
 * new one, which unpacks them and reloads. Nothing is overwritten there, and only a hand-over that comes
 * from the old address is accepted, so a crafted link can't plant someone else's sign-in.
 */

export const NEW_ORIGIN = 'https://celestialworship.online';
const OLD_HOSTS = ['celestialworship.vercel.app'];
const MARK = '#cw-carry=';
// Caches the new address fills by itself
const SKIP = [/^cw-i18n-/, /^cw-hymn-translations-/];
// Links stay well inside what browsers accept; a larger library keeps the notice on the old address instead
const MAX_LINK = 1_500_000;

interface Carry { v: 1; storage: Record<string, string>; library: LibraryExport }

const toBase64Url = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromBase64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
}

async function pack(text: string) {
  const bytes = new TextEncoder().encode(text);
  return typeof CompressionStream === 'function' ? `g.${toBase64Url(await pipe(bytes, new CompressionStream('gzip')))}` : `p.${toBase64Url(bytes)}`;
}

async function unpack(packed: string) {
  const bytes = fromBase64Url(packed.slice(2));
  return new TextDecoder().decode(packed.startsWith('g.') ? await pipe(bytes, new DecompressionStream('gzip')) : bytes);
}

/** On the old address: carry everything over and open the new one. True when the page is leaving. */
async function leaveOldHome(): Promise<boolean> {
  const storage: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || SKIP.some(r => r.test(key))) continue;
    const value = localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }
  const carry: Carry = { v: 1, storage, library: await exportLibrary() };
  const packed = await pack(JSON.stringify(carry));
  if (packed.length > MAX_LINK) return false;
  window.location.replace(`${NEW_ORIGIN}${window.location.pathname}${window.location.search}${MARK}${packed}`);
  return true;
}

/** On the new address: take in what the old one sent, then reload so everything starts with it. */
async function arriveHome(): Promise<boolean> {
  const clean = `${window.location.pathname}${window.location.search}`;
  const packed = window.location.hash.slice(MARK.length);
  let fromOld = false;
  try { fromOld = OLD_HOSTS.includes(new URL(document.referrer).hostname); } catch {}
  if (!fromOld) {
    history.replaceState(history.state, '', clean);
    return false;
  }
  const carry = JSON.parse(await unpack(packed)) as Carry;
  for (const [key, value] of Object.entries(carry.storage ?? {})) {
    if (typeof value === 'string' && localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }
  if (carry.library) await importLibrary(carry.library);
  window.location.replace(clean);
  return true;
}

/** Run before the app draws. True when the page is about to be replaced. */
export async function settleHome(): Promise<boolean> {
  try {
    if (OLD_HOSTS.includes(window.location.hostname)) return await leaveOldHome();
    if (window.location.hash.startsWith(MARK)) return await arriveHome();
  } catch {
    if (window.location.hash.startsWith(MARK)) history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}`);
  }
  return false;
}
