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
  /** Words across the bottom over the cameras, or filling the screen on their background */
  wordsStyle: 'band' | 'full' = 'band';
  /** Milliseconds of cross-fade between pictures; 0 is a straight cut */
  fadeMs = 500;
  nameCard: { name: string; title: string } | null = null;
  ticker = '';
  card = '';
  showReactions = true;
  private floating: { emoji: string; x: number; born: number; drift: number }[] = [];
  private snapshot = document.createElement('canvas');
  private sceneKey = '';
  private fadeStart = 0;
  private wordsKey = '';
  private wordsStart = 0;
  private lookUrl = '';
  private lookEl: HTMLImageElement | HTMLVideoElement | null = null;
  private tickerStart = 0;
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

  /** A reaction from someone watching rises up the side of the picture */
  addReaction(emoji: string) {
    if (!this.showReactions || this.floating.length > 30) return;
    this.floating.push({ emoji, x: W - 60 - Math.random() * 110, born: performance.now(), drift: Math.random() * 40 - 20 });
  }

  private syncLook(url?: string, kind?: 'image' | 'video') {
    const wanted = url ?? '';
    if (wanted === this.lookUrl) return;
    this.lookUrl = wanted;
    if (this.lookEl instanceof HTMLVideoElement) this.lookEl.pause();
    this.lookEl = null;
    if (!url) return;
    if (kind === 'video') {
      const v = document.createElement('video');
      v.crossOrigin = 'anonymous'; v.src = url; v.muted = true; v.loop = true; v.playsInline = true;
      void v.play().catch(() => {});
      this.lookEl = v;
    } else {
      void this.loadImage(url).then(img => { if (this.lookUrl === url) this.lookEl = img; }).catch(() => {});
    }
  }

  private drawCover(el: CanvasImageSource, srcW: number, srcH: number, x: number, y: number, w: number, h: number) {
    if (!srcW || !srcH) return;
    const c = coverCrop(srcW, srcH, { x, y, w, h });
    this.ctx.drawImage(el, c.x, c.y, c.w, c.h, x, y, w, h);
  }

  private draw() {
    const { ctx } = this;
    // A change of picture cross-fades from the last frame shown
    const key = `${this.layout}|${this.fullUrl}|${this.sources.filter(s => s.onStage).map(s => s.id).join(',')}`;
    if (key !== this.sceneKey) {
      if (this.sceneKey && this.fadeMs) {
        this.snapshot.width = W; this.snapshot.height = H;
        this.snapshot.getContext('2d')!.drawImage(this.canvas, 0, 0);
        this.fadeStart = performance.now();
      }
      this.sceneKey = key;
    }
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

    const fading = this.fadeStart ? (performance.now() - this.fadeStart) / this.fadeMs : 1;
    if (fading < 1) {
      ctx.globalAlpha = 1 - fading;
      ctx.drawImage(this.snapshot, 0, 0);
      ctx.globalAlpha = 1;
    } else this.fadeStart = 0;

    const showing = this.wordsOn && this.words && ['hymn', 'verse', 'announcement'].includes(this.words.type);
    this.syncLook(showing && this.wordsStyle === 'full' ? this.words!.look?.url : undefined, this.words?.look?.kind);
    if (showing) {
      const wordsKey = `${this.words!.title}|${this.words!.content}`;
      if (wordsKey !== this.wordsKey) { this.wordsKey = wordsKey; this.wordsStart = performance.now(); }
      ctx.globalAlpha = this.fadeMs ? Math.min(1, (performance.now() - this.wordsStart) / Math.max(150, this.fadeMs * 0.6)) : 1;
      if (this.wordsStyle === 'full') this.drawFullWords(this.words!);
      else this.drawWords(this.words!);
      ctx.globalAlpha = 1;
    } else {
      this.wordsKey = '';
      if (this.banner) this.drawBand('', this.banner);
      else if (this.caption) this.drawCaption(this.caption);
      if (this.nameCard && !this.banner) this.drawNameCard(this.nameCard);
      if (this.ticker) this.drawTicker(this.ticker);
    }
    if (this.card) this.drawCard(this.card);
    this.drawLogo();
    this.drawFloating();
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

  /** The words filling the screen on the parish's background, as on the projector */
  private drawFullWords(state: DisplayState) {
    const { ctx } = this;
    ctx.fillStyle = state.look?.color ?? '#000000';
    ctx.fillRect(0, 0, W, H);
    if (this.lookEl) {
      if (this.lookEl instanceof HTMLVideoElement) this.drawCover(this.lookEl, this.lookEl.videoWidth, this.lookEl.videoHeight, 0, 0, W, H);
      else this.drawCover(this.lookEl, this.lookEl.naturalWidth, this.lookEl.naturalHeight, 0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,0,${state.look?.dim ?? 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
    const at = (s: string, size: number) => { ctx.font = `700 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const { size, lines } = fitWords(state.content, W - 140, H - 190, at, [72, 62, 54, 46, 40, 34, 28]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (state.title) {
      ctx.font = `700 28px ${FONT}`;
      ctx.fillStyle = '#E8C36A';
      ctx.fillText(state.title, W / 2, 44, W - 140);
    }
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    let y = 96 + (H - 150 - lines.length * size * 1.25) / 2;
    lines.forEach(line => { ctx.fillText(line, W / 2, y, W - 140); y += size * 1.25; });
  }

  /** Who is speaking, low on the left */
  private drawNameCard({ name, title }: { name: string; title: string }) {
    const { ctx } = this;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 34px ${FONT}`;
    const nameW = ctx.measureText(name).width;
    ctx.font = `500 22px ${FONT}`;
    const titleW = title ? ctx.measureText(title).width : 0;
    const w = Math.min(W - 120, Math.max(nameW, titleW) + 48), h = title ? 96 : 66, x = 40, y = H - h - 70;
    ctx.fillStyle = 'rgba(10,14,24,.88)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#C9A24B';
    ctx.fillRect(x, y, 6, h);
    ctx.font = `700 34px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(name, x + 24, y + 12, w - 36);
    if (title) {
      ctx.font = `500 22px ${FONT}`;
      ctx.fillStyle = '#E8C36A';
      ctx.fillText(title, x + 24, y + 56, w - 36);
    }
  }

  /** Scrolling text along the very bottom */
  private drawTicker(text: string) {
    const { ctx } = this;
    if (!this.tickerStart) this.tickerStart = performance.now();
    ctx.font = `600 24px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(text).width + 80;
    const travelled = ((performance.now() - this.tickerStart) * 0.09) % (W + width);
    ctx.fillStyle = 'rgba(10,14,24,.88)';
    ctx.fillRect(0, H - 44, W, 44);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, W - travelled, H - 22);
  }

  /** A box in the corner: giving details, a phone number, a verse */
  private drawCard(text: string) {
    const { ctx } = this;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const { size, lines } = fitWords(text, 340, 220, at, [26, 22, 20, 18]);
    const h = lines.length * size * 1.25 + 28, x = W - 380, y = 112;
    ctx.fillStyle = 'rgba(10,14,24,.88)';
    ctx.fillRect(x, y, 368, h);
    ctx.fillStyle = '#C9A24B';
    ctx.fillRect(x, y, 368, 3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach((line, i) => ctx.fillText(line, x + 14, y + 14 + i * size * 1.25, 340));
  }

  private drawFloating() {
    const { ctx } = this;
    const now = performance.now();
    this.floating = this.floating.filter(f => now - f.born < 3200);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `38px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", ${FONT}`;
    for (const f of this.floating) {
      const t = (now - f.born) / 3200;
      ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      ctx.fillText(f.emoji, f.x + Math.sin(t * 6) * f.drift, H - 90 - t * 380);
    }
    ctx.globalAlpha = 1;
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
