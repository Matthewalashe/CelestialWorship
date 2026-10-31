import type { DisplayState } from '../../types';
import { cropRect, fitWords, layoutRects, WHOLE_VIEW, type CropView, type StudioLayout } from './scene';
import { loadLogo, type LogoPicture } from './animatedLogo';

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
  /** How this camera is framed in the picture */
  view: CropView;
  gain: GainNode | null;
}

export type LogoCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type StudioShape = 'wide' | 'tall';

const LONG = 1280, SHORT = 720;
/** Pictures per second: going out, in the preview, and when nothing on screen is moving */
const SENDING_RATE = 30, PREVIEW_RATE = 15, RESTING_RATE = 4;
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';
/** Draws even when the window is behind another: browsers slow a page's own timers, not a worker's */
const TICK_WORKER = 'let t;onmessage=e=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),e.data)}';

export class Compositor {
  readonly canvas = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private W = LONG;
  private H = SHORT;
  /** Recording or streaming: every picture counts. Otherwise the computer is left to rest. */
  private sending = false;
  private rate = 0;
  private lastDrawn = '';
  /** Our mark, top left, on everything that goes out, unless the church has upgraded */
  watermark = true;
  /** Hearing a camera or microphone stop by itself, such as a cable pulled out */
  onSourceLost: (label: string) => void = () => {};
  private paused = false;
  private pausedText = '';
  private master: GainNode;
  private fullLoad = 0;
  private mark: HTMLImageElement | null = null;
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
  private logo: LogoPicture | null = null;
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
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.audio = new AudioContext();
    this.mix = this.audio.createMediaStreamDestination();
    this.master = this.audio.createGain();
    this.master.connect(this.mix);
    this.analyser = this.audio.createAnalyser();
    this.analyser.fftSize = 512;
    // A silent note keeps the sound track running when no microphone is on
    const silence = this.audio.createConstantSource();
    const nothing = this.audio.createGain();
    nothing.gain.value = 0;
    silence.connect(nothing).connect(this.mix);
    silence.start();
    // Nothing to mix until there is a sound to mix
    void this.audio.suspend().catch(() => {});
    void this.loadImage('/emblem.png').then(img => { this.mark = img; }).catch(() => {});
    this.drawSafely();
    this.lastDrawn = this.signature();
    this.setRate(RESTING_RATE);
  }

  private tick = () => {
    const rate = this.sending ? SENDING_RATE : this.isMoving() ? PREVIEW_RATE : RESTING_RATE;
    if (rate !== this.rate) this.setRate(rate);
    if (!this.sending) {
      // Nobody is looking and nothing is going out
      if (document.hidden) return;
      const now = this.signature();
      if (rate === RESTING_RATE && now === this.lastDrawn) return;
      this.lastDrawn = now;
    }
    this.drawSafely();
  };

  /** One bad frame, from a camera vanishing or a file failing, must never stop the picture */
  private drawSafely() {
    try { this.draw(); } catch {
      this.ctx.globalAlpha = 1;
      this.ctx.shadowBlur = 0;
    }
  }

  private setRate(rate: number) {
    this.rate = rate;
    if (!this.worker && !this.timer) {
      try {
        this.worker = new Worker(URL.createObjectURL(new Blob([TICK_WORKER], { type: 'text/javascript' })));
        this.worker.onmessage = this.tick;
      } catch { /* the page's own timer below */ }
    }
    if (this.worker) { this.worker.postMessage(1000 / rate); return; }
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(this.tick, 1000 / rate);
  }

  /** Whether anything on screen changes by itself */
  private isMoving(): boolean {
    return this.sources.some(s => s.onStage)
      || this.full instanceof HTMLVideoElement
      || this.lookEl instanceof HTMLVideoElement
      || !!this.ticker
      || this.floating.length > 0
      || !!this.fadeStart
      || !!this.logo?.moving
      || (!!this.wordsKey && performance.now() - this.wordsStart < 1000);
  }

  /** Everything else that decides the picture: while it is unchanged there is nothing to redraw */
  private signature(): string {
    return JSON.stringify([this.W, this.layout, this.wordsOn, this.wordsStyle, this.words?.type, this.words?.title, this.words?.content, this.words?.look, this.banner, this.caption, this.card, this.nameCard,
      this.paused, this.watermark, !!this.mark, this.logoCorner, !!this.logo, this.background?.src, this.fullUrl, !!this.full, this.lookUrl, !!this.lookEl]);
  }

  /** Wide for YouTube and Facebook, tall for TikTok and Instagram. Not while something is going out. */
  setShape(shape: StudioShape) {
    if (this.sending) return;
    const tall = shape === 'tall';
    this.W = tall ? SHORT : LONG;
    this.H = tall ? LONG : SHORT;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.fadeStart = 0;
    this.sceneKey = '';
    this.drawSafely();
  }

  /** Stays on air with a card and no sound: the platforms see a stream that never broke */
  setPaused(on: boolean, text: string) {
    this.paused = on;
    this.pausedText = text;
    this.master.gain.value = on ? 0 : 1;
  }

  get isTall() { return this.H > this.W; }

  /** Recording or streaming has started or stopped */
  setSending(on: boolean) {
    this.sending = on;
    if (on) this.resumeSound();
    this.setRate(on ? SENDING_RATE : PREVIEW_RATE);
  }

  /** The picture as it is now, with everything on it */
  picture(): Promise<Blob | null> {
    return new Promise(resolve => this.canvas.toBlob(resolve, 'image/jpeg', 0.92));
  }

  destroy() {
    this.worker?.postMessage(0);
    this.worker?.terminate();
    if (this.timer) clearInterval(this.timer);
    this.sources.forEach(s => s.stream.getTracks().forEach(t => t.stop()));
    this.sources = [];
    if (this.full instanceof HTMLVideoElement) this.full.pause();
    this.logo?.dispose();
    void this.audio.close();
  }

  resumeSound() { void this.audio.resume(); }

  /** One picture and one sound track: what is recorded and sent to the platforms */
  outputStream(): MediaStream {
    if (!this.output) this.output = new MediaStream([...this.canvas.captureStream(30).getVideoTracks(), ...this.mix.stream.getAudioTracks()]);
    return this.output;
  }

  // ── Sources ───────────────────────────────────────────────

  addSource(input: { id: string; label: string; kind: SourceKind; stream: MediaStream; muted?: boolean; onStage?: boolean; quietWhenLost?: boolean }): StudioSource {
    this.removeSource(input.id, false);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = input.stream;
    void video.play().catch(() => {});
    const src: StudioSource = { id: input.id, label: input.label, kind: input.kind, stream: input.stream, video, muted: !!input.muted, gain: null, onStage: input.onStage ?? !this.sources.some(s => s.onStage), view: WHOLE_VIEW };
    if (input.stream.getAudioTracks().length) {
      const gain = this.audio.createGain();
      gain.gain.value = src.muted ? 0 : 1;
      this.audio.createMediaStreamSource(input.stream).connect(gain);
      gain.connect(this.master);
      gain.connect(this.analyser);
      src.gain = gain;
      // Guests hear everyone but themselves
      this.buses.forEach((bus, owner) => { if (owner !== src.id) gain.connect(bus); });
    }
    this.sources = [...this.sources, src];
    // A cable pulled out or a screen share stopped: take it off the picture rather than freeze on its last frame
    input.stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      if (!this.sources.some(s => s.id === src.id)) return;
      if (!input.quietWhenLost) this.onSourceLost(src.label);
      this.removeSource(src.id);
    });
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

  setView(id: string, view: CropView) {
    this.sources = this.sources.map(s => (s.id === id ? { ...s, view } : s));
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
    if (!this.sources.length && !this.full) return 0;
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

  async setLogo(url: string | null, kind: 'image' | 'video' = 'image') {
    const next = url ? await loadLogo(url, kind) : null;
    this.logo?.dispose();
    this.logo = next;
  }

  async setBackground(url: string | null) { this.background = url ? await this.loadImage(url) : null; }

  /** A picture or video over the whole screen; nothing to go back to the cameras */
  async showFull(url: string | null, kind: 'image' | 'video' = 'image') {
    if (url === this.fullUrl) return;
    // A slow file must not replace something chosen after it
    const load = ++this.fullLoad;
    if (this.full instanceof HTMLVideoElement) { this.full.pause(); this.fullSource?.disconnect(); this.fullSource = null; }
    this.full = null;
    this.fullUrl = url ?? '';
    if (!url) { this.onChange(); return; }
    if (kind === 'image') {
      const img = await this.loadImage(url);
      if (load !== this.fullLoad) return;
      this.full = img;
    } else {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.playsInline = true;
      const sound = this.audio.createMediaElementSource(video);
      sound.connect(this.master);
      sound.connect(this.analyser);
      // When the video finishes, back to the cameras rather than hold its last frame
      video.onended = () => { if (load === this.fullLoad) void this.showFull(null); };
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
    this.floating.push({ emoji, x: this.W - 60 - Math.random() * 110, born: performance.now(), drift: Math.random() * 40 - 20 });
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

  private drawCover(el: CanvasImageSource, srcW: number, srcH: number, x: number, y: number, w: number, h: number, view = WHOLE_VIEW) {
    if (!srcW || !srcH) return;
    const c = cropRect(srcW, srcH, w / h, view);
    this.ctx.drawImage(el, c.x, c.y, c.w, c.h, x, y, w, h);
  }

  private draw() {
    const { ctx, W, H } = this;
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
        if (s.video.readyState >= 2) this.drawCover(s.video, s.video.videoWidth, s.video.videoHeight, r.x, r.y, r.w, r.h, s.view);
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
      if (this.wordsStyle === 'full') { this.drawFullWords(this.words!); ctx.globalAlpha = 1; }
    } else {
      this.wordsKey = '';
    }
    // Everything low on the screen stands above the scrolling text, and above what a tall platform's own buttons cover
    let floor = H > W ? 300 : 0;
    if (this.ticker) floor = Math.max(floor, 44);
    const wordsBand = showing && this.wordsStyle === 'band';
    let raised = floor;
    if (wordsBand) { raised = this.drawWords(this.words!, floor); ctx.globalAlpha = 1; }
    else if (!showing) {
      if (this.banner) raised = this.drawBand('', this.banner, floor);
      else if (this.caption) { this.drawCaption(this.caption, floor); raised = floor + 84; }
    }
    if (this.nameCard && !showing && !this.banner) this.drawNameCard(this.nameCard, floor);
    if (this.ticker) this.drawTicker(this.ticker);
    if (this.card) this.drawCard(this.card);
    this.drawLogo(raised);
    if (this.paused) this.drawPaused();
    this.drawWatermark();
    this.drawFloating();
  }

  private drawPaused() {
    const { ctx, W, H } = this;
    ctx.fillStyle = '#0B1B44';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `700 ${W > H ? 54 : 40}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.pausedText, W / 2, H / 2, W - 80);
  }

  /** Our mark, top left: above everything, so it is the same on every picture */
  private drawWatermark() {
    if (!this.watermark) return;
    const { ctx } = this;
    const x = 20, y = 18, h = 34;
    let left = x;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.9;
    if (this.mark?.naturalWidth) {
      const w = (this.mark.naturalWidth / this.mark.naturalHeight) * h;
      ctx.drawImage(this.mark, x, y, w, h);
      left += w + 8;
    }
    ctx.font = `700 19px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('CelestialWorship', left, y + h / 2);
    ctx.restore();
  }

  private drawLogo(bottom: number) {
    if (!this.logo) return;
    const { W, H } = this;
    const image = this.logo.frame(performance.now());
    if (!image) return;
    const scale = Math.min(220 / (this.logo.width || 1), 72 / (this.logo.height || 1));
    const w = this.logo.width * scale, h = this.logo.height * scale;
    const left = this.logoCorner.endsWith('left');
    const x = left ? 28 : W - w - 28;
    let y: number;
    if (this.logoCorner.startsWith('top')) y = left && this.watermark ? 60 : 24;
    else {
      // Clear of the name on screen too, which sits low on the left
      const name = left && this.nameCard ? 170 + bottom : 0;
      y = H - Math.max(bottom, name) - h - 20;
    }
    this.ctx.drawImage(image, x, y, w, h);
  }

  private drawWords(state: DisplayState, floor: number) { return this.drawBand(state.title ?? '', state.content, floor); }

  /** Returns how far up the screen the band reaches */
  private drawBand(title: string, text: string, floor: number): number {
    const { ctx, W, H } = this;
    const pad = 40, maxW = W - pad * 2, maxBody = H * 0.3;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const { size, lines } = fitWords(text, maxW, maxBody, at);
    const titleH = title ? 34 : 0;
    const bandH = titleH + lines.length * size * 1.25 + 36;
    ctx.fillStyle = 'rgba(10,14,24,.82)';
    const top = H - floor - bandH;
    ctx.fillRect(0, top, W, bandH);
    ctx.fillStyle = '#C9A24B';
    ctx.fillRect(0, top, W, 3);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let y = top + 16;
    if (title) {
      ctx.font = `700 22px ${FONT}`;
      ctx.fillStyle = '#E8C36A';
      ctx.fillText(title, W / 2, y, maxW);
      y += titleH;
    }
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach(line => { ctx.fillText(line, W / 2, y, maxW); y += size * 1.25; });
    return floor + bandH;
  }

  /** The words filling the screen on the parish's background, as on the projector */
  private drawFullWords(state: DisplayState) {
    const { ctx, W, H } = this;
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
  private drawNameCard({ name, title }: { name: string; title: string }, floor: number) {
    const { ctx, W, H } = this;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 34px ${FONT}`;
    const nameW = ctx.measureText(name).width;
    ctx.font = `500 22px ${FONT}`;
    const titleW = title ? ctx.measureText(title).width : 0;
    const w = Math.min(W - 120, Math.max(nameW, titleW) + 48), h = title ? 96 : 66, x = 40, y = H - h - floor - 26;
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
    const { ctx, W, H } = this;
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
    const { ctx, W } = this;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const boxW = Math.min(368, W - 24), inner = boxW - 28;
    const { size, lines } = fitWords(text, inner, 220, at, [26, 22, 20, 18]);
    const h = lines.length * size * 1.25 + 28, x = W - boxW - 12, y = 112;
    ctx.fillStyle = 'rgba(10,14,24,.88)';
    ctx.fillRect(x, y, boxW, h);
    ctx.fillStyle = '#C9A24B';
    ctx.fillRect(x, y, boxW, 3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach((line, i) => ctx.fillText(line, x + 14, y + 14 + i * size * 1.25, inner));
  }

  private drawFloating() {
    const { ctx, H } = this;
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

  private drawCaption(text: string, floor: number) {
    const { ctx, W, H } = this;
    ctx.font = `600 28px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tail = text.length > 110 ? text.slice(-110) : text;
    const w = Math.min(W - 80, ctx.measureText(tail).width + 40);
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect((W - w) / 2, H - floor - 84, w, 50);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(tail, W / 2, H - floor - 74, W - 100);
  }
}
