/**
 * Recording the service. A long recording kept in memory can bring the computer down, so where the browser allows it
 * the file is written straight to the disk as it is made. Pieces are written strictly in order.
 */

const WARN_BYTES = 2 * 1024 * 1024 * 1024;

export interface RecordingResult { blob: Blob | null; savedToDisk: boolean; name: string; bytes: number; ms: number }

interface Writable { write: (data: Blob) => Promise<void>; close: () => Promise<void> }
interface FileHandle { createWritable: () => Promise<Writable>; name: string }
type SavePicker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileHandle>;

const recordingType = () => ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) ?? null;
const extension = (type: string) => (type.startsWith('video/mp4') ? 'mp4' : 'webm');

export const canRecord = () => typeof MediaRecorder !== 'undefined' && recordingType() !== null;
export const canSaveAsYouGo = () => 'showSaveFilePicker' in window;

export function suggestedName(now = new Date()): string {
  const type = recordingType() ?? 'video/webm';
  return `service-${now.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${extension(type)}`;
}

/** Asks where to keep the file. Null if the person changed their mind. */
export async function chooseFile(): Promise<FileHandle | null> {
  const type = recordingType() ?? 'video/webm';
  const ext = extension(type);
  try {
    return await (window as unknown as { showSaveFilePicker: SavePicker }).showSaveFilePicker({
      suggestedName: suggestedName(),
      types: [{ description: 'Video', accept: { [`video/${ext}`]: [`.${ext}`] } }],
    });
  } catch { return null; }
}

export class StudioRecorder {
  private rec: MediaRecorder;
  private parts: Blob[] = [];
  private writer: Writable | null = null;
  private queue: Promise<void> = Promise.resolve();
  private bytes = 0;
  private startedAt = Date.now();
  private pausedAt = 0;
  private pausedMs = 0;
  private warned = false;
  private name: string;
  private type: string;

  /** `onProblem` hears anything the person should know while it runs */
  private constructor(stream: MediaStream, type: string, writer: Writable | null, name: string, private onProblem: (m: string) => void) {
    this.type = type;
    this.writer = writer;
    this.name = name;
    this.rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
    this.rec.ondataavailable = e => {
      if (!e.data.size) return;
      this.bytes += e.data.size;
      if (this.writer) {
        const w = this.writer;
        this.queue = this.queue.then(() => w.write(e.data)).catch(() => {
          // The disk is full or the file was taken away: keep what comes next in memory rather than lose it
          this.writer = null;
          this.onProblem('The recording could not be written to that file. Keep this window open and save it when you stop.');
        });
      } else {
        this.parts.push(e.data);
        if (this.bytes > WARN_BYTES && !this.warned) {
          this.warned = true;
          this.onProblem('This recording is getting very large for the computer’s memory. Stop and save it soon.');
        }
      }
    };
    this.rec.onerror = () => this.onProblem('The recording stopped because of a problem in the browser.');
    this.rec.start(5000);
  }

  static async start(stream: MediaStream, file: FileHandle | null, onProblem: (m: string) => void): Promise<StudioRecorder> {
    const type = recordingType();
    if (!type) throw new Error('This browser cannot record. Try Chrome or Edge.');
    const writer = file ? await file.createWritable() : null;
    return new StudioRecorder(stream, type, writer, file?.name ?? suggestedName(), onProblem);
  }

  get paused() { return this.rec.state === 'paused'; }

  pause() {
    if (this.rec.state !== 'recording') return;
    this.rec.pause();
    this.pausedAt = Date.now();
  }

  resume() {
    if (this.rec.state !== 'paused') return;
    this.rec.resume();
    this.pausedMs += Date.now() - this.pausedAt;
    this.pausedAt = 0;
  }

  stop(): Promise<RecordingResult> {
    return new Promise(resolve => {
      const finish = async () => {
        await this.queue;
        const toDisk = !!this.writer;
        if (this.writer) await this.writer.close().catch(() => {});
        const held = this.pausedAt ? Date.now() - this.pausedAt : 0;
        resolve({
          blob: this.parts.length ? new Blob(this.parts, { type: this.type }) : null,
          savedToDisk: toDisk,
          name: this.name,
          bytes: this.bytes,
          ms: Date.now() - this.startedAt - this.pausedMs - held,
        });
      };
      if (this.rec.state === 'inactive') { void finish(); return; }
      this.rec.onstop = () => void finish();
      this.rec.stop();
    });
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function fileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── A record of past broadcasts, on this computer ───────────

export interface StudioSession { at: number; title: string; ms: number; platforms: string[]; peakViewers: number; reactions: number; drops: number }
const SESSIONS = 'cw-studio-sessions';

export function loadSessions(): StudioSession[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(SESSIONS) || '[]');
    return Array.isArray(list) ? list.filter((s): s is StudioSession => !!s && typeof s.at === 'number' && typeof s.ms === 'number' && Array.isArray(s.platforms)) : [];
  } catch { return []; }
}

export function saveSession(session: StudioSession) {
  try { localStorage.setItem(SESSIONS, JSON.stringify([session, ...loadSessions()].slice(0, 50))); } catch {}
}
