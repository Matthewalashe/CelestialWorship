import type { DisplayState } from '../../types';
import { coverCrop, fitWords, layoutRects, type StudioLayout } from './scene';

/**
 * The studio's vision and sound mixer. Everything on stage is drawn onto one canvas, the words and logo on top, and
 * every microphone is mixed into one track. That one picture and sound is what is recorded and sent out.
 */

export type SourceKind = 'camera' | 'screen' | 'phone' | 'guest';

export interface StudioSource {
  id: string;
  label: string;
  kind: SourceKind;
  stream: MediaStream;
  video: HTMLVideoElement;
  onStage: boolean;
  muted: boolean;
  gain: GainNode | null;
}

export type LogoCorner = 'top-left' | 'top-right';

const W = 1280, H = 720;
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';
/** Draws even when the window is behind another: browsers slow a page's own timers, not a worker's */
const TICK_WORKER = 'let t;onmessage=e=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),e.data)}';

export class Compositor {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  sources: StudioSource[] = [];
  layout: StudioLayout = 'solo';
  words: DisplayState | null = null;
  wordsOn = true;
  banner = '';
  caption = '';
  logoCorner: LogoCorner = 'top-right';
  private logo: HTMLImageElement | null = null;
  private background: HTMLImageElement | null = null;
  private full: HTMLImageElement | HTMLVideoElement | null = null;
  private fullUrl = '';
  private fullSource: MediaElementAudioSourceNode | null = null;
  private audio: AudioContext;
  private mix: MediaStreamAudioDestinationNode;
  private analyser: AnalyserNode;
  private buses = new Map<string, MediaStreamAudioDestinationNode>();
  private worker: Worker | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private output: MediaStream | null = null;
  onChange: () => void = () => {};

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.audio = new AudioContext();
    this.mix = this.audio.createMediaStreamDestination();
    this.analyser = this.audio.createAnalyser();
    this.analyser.fftSize = 512;
    // A silent note keeps the sound track running when no microphone is on
    const silence = this.audio.createConstantSource();
    const nothing = this.audio.createGain();
    nothing.gain.value = 0;
    silence.connect(nothing).connect(this.mix);
    silence.start();
    this.draw();
    const tick = () => this.draw();
    try {
      this.worker = new Worker(URL.createObjectURL(new Blob([TICK_WORKER], { type: 'text/javascript' })));
      this.worker.onmessage = tick;
      this.worker.postMessage(1000 / 30);
    } catch {
      this.timer = setInterval(tick, 1000 / 30);
    }
  }

  destroy() {
    this.worker?.postMessage(0);
    this.worker?.terminate();
    if (this.timer) clearInterval(this.timer);
    this.sources.forEach(s => s.stream.getTracks().forEach(t => t.stop()));
    this.sources = [];
    if (this.full instanceof HTMLVideoElement) this.full.pause();
    void this.audio.close();
  }

  resumeSound() { void this.audio.resume(); }

  /** One picture and one sound track: what is recorded and sent to the platforms */
  outputStream(): MediaStream {
    if (!this.output) this.output = new MediaStream([...this.canvas.captureStream(30).getVideoTracks(), ...this.mix.stream.getAudioTracks()]);
    return this.output;
  }

  // ── Sources ───────────────────────────────────────────────

  addSource(input: { id: string; label: string; kind: SourceKind; stream: MediaStream; muted?: boolean; onStage?: boolean }): StudioSource {
    this.removeSource(input.id, false);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = input.stream;
    void video.play().catch(() => {});
    const src: StudioSource = { id: input.id, label: input.label, kind: input.kind, stream: input.stream, video, muted: !!input.muted, gain: null, onStage: input.onStage ?? !this.sources.some(s => s.onStage) };
    if (input.stream.getAudioTracks().length) {
      const gain = this.audio.createGain();
      gain.gain.value = src.muted ? 0 : 1;
      this.audio.createMediaStreamSource(input.stream).connect(gain);
      gain.connect(this.mix);
      gain.connect(this.analyser);
      src.gain = gain;
      // Guests hear everyone but themselves
      this.buses.forEach((bus, owner) => { if (owner !== src.id) gain.connect(bus); });
    }
    this.sources = [...this.sources, src];
    this.resumeSound();
    this.onChange();
    return src;
  }

  removeSource(id: string, stopTracks = true) {
    const src = this.sources.find(s => s.id === id);
    if (!src) return;
    src.gain?.disconnect();
    if (stopTracks) src.stream.getTracks().forEach(t => t.stop());
    src.video.srcObject = null;
    this.sources = this.sources.filter(s => s.id !== id);
    this.onChange();
  }

  setOnStage(id: string, onStage: boolean) {
    this.sources = this.sources.map(s => (s.id === id ? { ...s, onStage } : s));
    this.onChange();
  }

  setMuted(id: string, muted: boolean) {
    this.sources = this.sources.map(s => {
      if (s.id !== id) return s;
      if (s.gain) s.gain.gain.value = muted ? 0 : 1;
      return { ...s, muted };
    });
    this.onChange();
  }

  /** The sound a guest hears: everyone on the programme except that guest */
  returnBus(ownerId: string): MediaStream {
    const bus = this.audio.createMediaStreamDestination();
    this.buses.set(ownerId, bus);
    this.sources.forEach(s => { if (s.id !== ownerId) s.gain?.connect(bus); });
    return bus.stream;
  }

  dropBus(ownerId: string) { this.buses.delete(ownerId); }

  /** How loud the programme is now, 0 to 1 */
  level(): number {
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
    return Math.min(1, peak * 1.4);
  }

  // ── Branding and media ────────────────────────────────────

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Without this a picture from another address would stop the canvas being streamed at all
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('The picture could not be loaded'));
      img.src = url;
    });
  }

  async setLogo(url: string | null) { this.logo = url ? await this.loadImage(url) : null; }
  async setBackground(url: string | null) { this.background = url ? await this.loadImage(url) : null; }

  /** A picture or video over the whole screen; nothing to go back to the cameras */
  async showFull(url: string | null, kind: 'image' | 'video' = 'image') {
    if (url === this.fullUrl) return;
    if (this.full instanceof HTMLVideoElement) { this.full.pause(); this.fullSource?.disconnect(); this.fullSource = null; }
    this.full = null;
    this.fullUrl = url ?? '';
    if (!url) { this.onChange(); return; }
    if (kind === 'image') {
      this.full = await this.loadImage(url);
    } else {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.playsInline = true;
      const sound = this.audio.createMediaElementSource(video);
      sound.connect(this.mix);
      sound.connect(this.analyser);
      this.fullSource = sound;
      this.full = video;
      this.resumeSound();
      await video.play();
    }
    this.onChange();
  }

  get fullShowing() { return this.fullUrl; }

  // ── Drawing ───────────────────────────────────────────────

  private drawCover(el: CanvasImageSource, srcW: number, srcH: number, x: number, y: number, w: number, h: number) {
    if (!srcW || !srcH) return;
    const c = coverCrop(srcW, srcH, { x, y, w, h });
    this.ctx.drawImage(el, c.x, c.y, c.w, c.h, x, y, w, h);
  }

  private draw() {
    const { ctx } = this;
    ctx.fillStyle = '#10131A';
    ctx.fillRect(0, 0, W, H);
    if (this.background) this.drawCover(this.background, this.background.naturalWidth, this.background.naturalHeight, 0, 0, W, H);

    if (this.full) {
      if (this.full instanceof HTMLVideoElement) this.drawCover(this.full, this.full.videoWidth, this.full.videoHeight, 0, 0, W, H);
      else this.drawCover(this.full, this.full.naturalWidth, this.full.naturalHeight, 0, 0, W, H);
    } else {
      const stage = this.sources.filter(s => s.onStage);
      const rects = layoutRects(this.layout, stage.length, W, H);
      stage.forEach((s, i) => {
        const r = rects[i];
        if (!r) return;
        if (s.video.readyState >= 2) this.drawCover(s.video, s.video.videoWidth, s.video.videoHeight, r.x, r.y, r.w, r.h);
        if (this.layout === 'pip' && i > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 3;
          ctx.strokeRect(r.x, r.y, r.w, r.h);
        }
      });
    }

    const showing = this.wordsOn && this.words && ['hymn', 'verse', 'announcement'].includes(this.words.type);
    if (showing) this.drawWords(this.words!);
    else if (this.banner) this.drawBand('', this.banner);
    else if (this.caption) this.drawCaption(this.caption);
    this.drawLogo();
  }

  private drawLogo() {
    if (!this.logo) return;
    const scale = Math.min(220 / (this.logo.naturalWidth || 1), 72 / (this.logo.naturalHeight || 1));
    const w = this.logo.naturalWidth * scale, h = this.logo.naturalHeight * scale;
    const x = this.logoCorner === 'top-left' ? 28 : W - w - 28;
    this.ctx.drawImage(this.logo, x, 24, w, h);
  }

  private drawWords(state: DisplayState) { this.drawBand(state.title ?? '', state.content); }

  private drawBand(title: string, text: string) {
    const { ctx } = this;
    const pad = 40, maxW = W - pad * 2, maxBody = H * 0.3;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const { size, lines } = fitWords(text, maxW, maxBody, at);
    const titleH = title ? 34 : 0;
    const bandH = titleH + lines.length * size * 1.25 + 36;
    ctx.fillStyle = 'rgba(10,14,24,.82)';
    ctx.fillRect(0, H - bandH, W, bandH);
    ctx.fillStyle = '#C9A24B';
    ctx.fillRect(0, H - bandH, W, 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let y = H - bandH + 16;
    if (title) {
      ctx.font = `700 22px ${FONT}`;
      ctx.fillStyle = '#E8C36A';
      ctx.fillText(title, W / 2, y, maxW);
      y += titleH;
    }
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach(line => { ctx.fillText(line, W / 2, y, maxW); y += size * 1.25; });
  }

  private drawCaption(text: string) {
    const { ctx } = this;
    ctx.font = `600 28px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tail = text.length > 110 ? text.slice(-110) : text;
    const w = Math.min(W - 80, ctx.measureText(tail).width + 40);
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect((W - w) / 2, H - 84, w, 50);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(tail, W / 2, H - 74, W - 100);
  }
}
