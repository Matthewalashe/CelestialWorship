import type { DisplayState } from '../../types';
import { cropRect, fitWords, layoutRects, WHOLE_VIEW, wrapText, type CropView, type StudioLayout } from './scene';
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
export type StudioQuality = '720p' | '1080p';
export interface TextSettings {
  /** Bigger or smaller, all on-screen words together */
  scale: number;
  position: 'bottom' | 'middle' | 'top';
  ticker: 'bottom' | 'top';
  /** What is behind the words: see-through, a light shade, or dark. Auto is see-through unless a camera is showing. */
  plate: 'auto' | 'clear' | 'soft' | 'dark';
  /** On a tall picture, stay above the buttons TikTok and Instagram put over the bottom of the screen */
  lift: boolean;
  logoScale: number;
}
export const DEFAULT_TEXT: TextSettings = { scale: 1, position: 'bottom', ticker: 'bottom', plate: 'auto', lift: false, logoScale: 1 };
export interface PollView { question: string; options: string[]; counts: number[] }
export interface GoalView { label: string; raisedText: string; targetText: string; share: number }

const LONG = 1280, SHORT = 720;
/** Pictures per second: going out, in the preview, and when nothing on screen is moving */
const SENDING_RATE = 30, PREVIEW_RATE = 15, RESTING_RATE = 4;
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';
/** Draws even when the window is behind another: browsers slow a page's own timers, not a worker's */
const TICK_WORKER = 'let t;onmessage=e=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),e.data)}';

/** The position of one sharp, loud pitch among the frequencies, or -1. Music and speech spread much wider. */
export function ringingBin(data: ArrayLike<number>): number {
  let peak = -1, top = 0, sum = 0;
  for (let i = 3; i < data.length; i++) {
    sum += data[i];
    if (data[i] > top) { top = data[i]; peak = i; }
  }
  const average = sum / Math.max(1, data.length - 3);
  return top >= 200 && top - average >= 120 ? peak : -1;
}

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
  text: TextSettings = DEFAULT_TEXT;
  private qr: HTMLImageElement | null = null;
  /** The colour of lines and titles, from the church's saved look */
  accent = '#E8C36A';
  /** A comment the host has chosen to show */
  spotlight: { name: string; text: string } | null = null;
  pollView: PollView | null = null;
  goal: GoalView | null = null;
  /** A video shown over the whole screen has played to its end */
  onFullEnded: () => void = () => {};
  private scale = 1;
  private tall: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
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
    void this.loadImage('/pwa-192x192.png').then(img => { this.mark = img; }).catch(() => {});
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
      this.text, !!this.qr, this.paused, this.accent, this.spotlight, this.pollView, this.goal, this.scale, this.watermark, !!this.mark, this.logoCorner, !!this.logo, this.background?.src, this.fullUrl, !!this.full, this.lookUrl, !!this.lookEl]);
  }

  /** Wide for YouTube and Facebook, tall for TikTok and Instagram. Not while something is going out. */
  setShape(shape: StudioShape) {
    if (this.sending) return;
    const tall = shape === 'tall';
    this.W = tall ? SHORT : LONG;
    this.H = tall ? LONG : SHORT;
    this.applySize();
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

  /** Everything is laid out on a 1280 by 720 plan and scaled, so 1080p changes only the sharpness */
  private applySize() {
    this.canvas.width = Math.round(this.W * this.scale);
    this.canvas.height = Math.round(this.H * this.scale);
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }

  /** Not while something is going out */
  setQuality(quality: StudioQuality) {
    if (this.sending) return;
    this.scale = quality === '1080p' ? 1.5 : 1;
    this.applySize();
    this.fadeStart = 0;
    this.sceneKey = '';
    this.drawSafely();
  }

  get isTall() { return this.H > this.W; }

  /** Recording or streaming has started or stopped */
  setSending(on: boolean) {
    this.sending = on;
    if (on) this.resumeSound();
    this.setRate(on ? SENDING_RATE : PREVIEW_RATE);
  }

  /** The middle of the picture, upright: a clip ready for TikTok and Instagram, made while everything else carries on */
  tallStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    this.tall = { canvas, ctx: canvas.getContext('2d', { alpha: false })! };
    this.drawTall();
    return new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...this.mix.stream.getAudioTracks()]);
  }

  stopTall() { this.tall = null; }

  private drawTall() {
    if (!this.tall) return;
    const { width: w, height: h } = this.canvas;
    const cw = Math.min(w, h * (9 / 16));
    this.tall.ctx.drawImage(this.canvas, (w - cw) / 2, 0, cw, h, 0, 0, 720, 1280);
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

  /** Which pitch stands far above the rest now, if any: how a microphone hearing its own speakers begins */
  ringingPitch(): number {
    if (!this.sources.length) return -1;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return ringingBin(data);
  }

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

  /** A code on the picture so people can follow on the app; nothing to take it off */
  async setQr(dataUrl: string | null) { this.qr = dataUrl ? await this.loadImage(dataUrl) : null; }

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
      video.onended = () => { if (load === this.fullLoad) { void this.showFull(null); this.onFullEnded(); } };
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
        this.snapshot.width = this.canvas.width; this.snapshot.height = this.canvas.height;
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
      ctx.drawImage(this.snapshot, 0, 0, W, H);
      ctx.globalAlpha = 1;
    } else this.fadeStart = 0;

    const showing = this.wordsOn && this.words && ['hymn', 'verse', 'announcement'].includes(this.words.type);
    const stageEmpty = !this.full && !this.sources.some(s => s.onStage);
    this.syncLook(showing && (this.wordsStyle === 'full' || stageEmpty) ? this.words!.look?.url : undefined, this.words?.look?.kind);
    // With no camera, the chosen hymn or Bible background stands behind the words
    if (showing && this.wordsStyle === 'band' && stageEmpty) this.drawLookBehind(this.words!);
    if (showing) {
      const wordsKey = `${this.words!.title}|${this.words!.content}`;
      if (wordsKey !== this.wordsKey) { this.wordsKey = wordsKey; this.wordsStart = performance.now(); }
      ctx.globalAlpha = this.fadeMs ? Math.min(1, (performance.now() - this.wordsStart) / Math.max(150, this.fadeMs * 0.6)) : 1;
      if (this.wordsStyle === 'full') { this.drawFullWords(this.words!); ctx.globalAlpha = 1; }
    } else {
      this.wordsKey = '';
    }
    // Everything low on the screen stands above the scrolling text, and above what a tall platform's own buttons cover
    const lift = H > W && this.text.lift ? 300 : 0;
    const floor = lift + (this.ticker && this.text.ticker === 'bottom' ? this.tickerHeight() : 0);
    const wordsBand = showing && this.wordsStyle === 'band';
    let raised = floor;
    if (wordsBand) { raised = this.drawWords(this.words!, floor); ctx.globalAlpha = 1; }
    else if (!showing) {
      if (this.banner) raised = this.drawBand('', this.banner, floor);
      else if (this.caption) { this.drawCaption(this.caption, floor); raised = floor + 84; }
    }
    if (this.spotlight && !showing) this.drawSpotlight(this.spotlight, Math.max(raised, floor));
    else if (this.nameCard && !showing && !this.banner) this.drawNameCard(this.nameCard, floor);
    if (this.pollView) this.drawPoll(this.pollView);
    if (this.goal) this.drawGoal(this.goal);
    if (this.ticker) this.drawTicker(this.ticker, lift);
    if (this.card) this.drawCard(this.card);
    this.drawLogo(raised);
    if (this.qr) this.drawQr(raised);
    if (this.paused) this.drawPaused();
    this.drawWatermark();
    this.drawFloating();
    this.drawTall();
  }

  /** A viewer's comment, chosen by the host */
  private drawSpotlight({ name, text }: { name: string; text: string }, floor: number) {
    const { ctx, W, H } = this;
    const boxW = Math.min(760, W - 80), inner = boxW - 44;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const { size, lines } = fitWords(text, inner, 150, at, [30, 26, 22, 20]);
    const h = lines.length * size * 1.25 + (name ? 62 : 32), x = 40, y = H - floor - h - 26;
    ctx.fillStyle = 'rgba(10,14,24,.9)';
    ctx.fillRect(x, y, boxW, h);
    ctx.fillStyle = this.accent;
    ctx.fillRect(x, y, 6, h);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let line = y + 16;
    if (name) {
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(name, x + 24, line, inner);
      line += 32;
    }
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach(l => { ctx.fillText(l, x + 24, line, inner); line += size * 1.25; });
  }

  private drawPoll({ question, options, counts }: PollView) {
    const { ctx, W } = this;
    const boxW = Math.min(460, W - 40), x = 20, y = 110, inner = boxW - 32;
    const total = counts.reduce((a, b) => a + b, 0);
    const at = (s: string, size: number) => { ctx.font = `700 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const { size, lines } = fitWords(question, inner, 90, at, [26, 22, 20]);
    const top = lines.length * size * 1.25 + 24;
    ctx.fillStyle = 'rgba(10,14,24,.9)';
    ctx.fillRect(x, y, boxW, top + options.length * 50 + 8);
    ctx.fillStyle = this.accent;
    ctx.fillRect(x, y, boxW, 3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    lines.forEach((l, i) => ctx.fillText(l, x + 16, y + 14 + i * size * 1.25, inner));
    options.forEach((option, i) => {
      const rowY = y + top + i * 50, share = total ? counts[i] / total : 0;
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.fillRect(x + 16, rowY, inner, 42);
      ctx.fillStyle = this.accent;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + 16, rowY, inner * share, 42);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `600 21px ${FONT}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(option, x + 26, rowY + 21, inner - 90);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(share * 100)}%`, x + 16 + inner - 10, rowY + 21);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
    });
  }

  /** How far the church is towards a giving goal */
  private drawGoal({ label, raisedText, targetText, share }: GoalView) {
    const { ctx, W, H } = this;
    const boxW = Math.min(460, W - 40), x = (W - boxW) / 2, y = W > H ? 20 : 74;
    ctx.fillStyle = 'rgba(10,14,24,.9)';
    ctx.fillRect(x, y, boxW, 74);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = `700 21px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, x + 14, y + 10, boxW * 0.5);
    ctx.textAlign = 'right';
    ctx.fillStyle = this.accent;
    ctx.fillText(`${raisedText} / ${targetText}`, x + boxW - 14, y + 10, boxW * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(x + 14, y + 44, boxW - 28, 16);
    ctx.fillStyle = this.accent;
    ctx.fillRect(x + 14, y + 44, (boxW - 28) * share, 16);
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
    const x = 20, y = 16, h = 44;
    let left = x;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.7)';
    ctx.shadowBlur = 6;
    if (this.mark?.naturalWidth) {
      ctx.beginPath();
      ctx.roundRect(x, y, h, h, 9);
      ctx.save();
      ctx.clip();
      ctx.drawImage(this.mark, x, y, h, h);
      ctx.restore();
      left += h + 10;
    }
    ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('CelestialWorship', left, y + h / 2);
    ctx.restore();
  }

  /** How dark the panel behind words is */
  private plate(): number {
    const { plate } = this.text;
    if (plate === 'dark') return 0.85;
    if (plate === 'soft') return 0.45;
    if (plate === 'clear') return 0;
    return this.full || this.sources.some(s => s.onStage) ? 0.82 : 0;
  }

  /** Words with little or nothing behind them need a soft edge to stay readable */
  private withEdge(draw: () => void) {
    const { ctx } = this;
    ctx.save();
    if (this.plate() < 0.6) { ctx.shadowColor = 'rgba(0,0,0,.9)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    draw();
    ctx.restore();
  }

  private drawLookBehind(state: DisplayState) {
    const { ctx, W, H } = this;
    if (this.lookEl) {
      if (this.lookEl instanceof HTMLVideoElement) this.drawCover(this.lookEl, this.lookEl.videoWidth, this.lookEl.videoHeight, 0, 0, W, H);
      else this.drawCover(this.lookEl, this.lookEl.naturalWidth, this.lookEl.naturalHeight, 0, 0, W, H);
      ctx.fillStyle = `rgba(0,0,0,${state.look?.dim ?? 0.45})`;
      ctx.fillRect(0, 0, W, H);
    } else if (state.look?.color && state.look.color !== '#000000') {
      ctx.fillStyle = state.look.color;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawQr(bottom: number) {
    const { ctx, W, H } = this;
    const size = 170, pad = 8, x = W - size - 28, y = H - bottom - size - 28;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - pad, y - pad, size + pad * 2, size + pad * 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.qr!, x, y, size, size);
    ctx.imageSmoothingEnabled = true;
  }

  private drawLogo(bottom: number) {
    if (!this.logo) return;
    const { W, H } = this;
    const image = this.logo.frame(performance.now());
    if (!image) return;
    const scale = Math.min(240 * this.text.logoScale / (this.logo.width || 1), 90 * this.text.logoScale / (this.logo.height || 1));
    const w = this.logo.width * scale, h = this.logo.height * scale;
    const left = this.logoCorner.endsWith('left');
    const x = left ? 28 : W - w - 28;
    let y: number;
    if (this.logoCorner.startsWith('top')) y = left && this.watermark ? 72 : 24;
    else {
      // Clear of the name on screen too, which sits low on the left
      const name = left && this.nameCard ? 170 + bottom : 0;
      y = H - Math.max(bottom, name) - h - 20;
    }
    this.ctx.drawImage(image, x, y, w, h);
  }

  private drawWords(state: DisplayState, floor: number) { return this.drawBand(state.title ?? '', state.content, floor); }

  /** Returns how far up the screen the band reaches, measured from the bottom. Long words are never cut off. */
  private drawBand(title: string, text: string, floor: number): number {
    const { ctx, W, H } = this;
    const k = this.text.scale;
    const pad = 36, maxW = W - pad * 2;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const steps = (W > H ? [64, 56, 50, 44, 38, 32, 28, 24] : [58, 52, 46, 40, 36, 32, 28, 24]).map(n => Math.round(n * k));
    // The band keeps to part of the screen if it can; a long verse may take more rather than lose its end
    const roomy = H - 110 - floor;
    let fit = fitWords(text, maxW, Math.min(roomy, H * 0.45), at, steps.filter(n => n >= 36 * k));
    if (wrapText(text, maxW, t => at(t, fit.size)).length > fit.lines.length) fit = fitWords(text, maxW, roomy, at, steps);
    const { size, lines } = fit;
    const titleSize = Math.round(32 * k);
    const titleH = title ? titleSize * 1.4 : 0;
    const bandH = titleH + lines.length * size * 1.25 + 36;
    const top = this.text.position === 'middle' ? (H - bandH) / 2 : this.text.position === 'top' ? 76 : H - floor - bandH;
    const alpha = this.plate();
    if (alpha > 0) {
      ctx.fillStyle = `rgba(10,14,24,${alpha})`;
      ctx.fillRect(0, top, W, bandH);
      ctx.fillStyle = this.accent;
      ctx.fillRect(0, top, W, 3);
    }
    const base = ctx.globalAlpha;
    this.withEdge(() => {
      ctx.globalAlpha = base;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      let y = top + 16;
      if (title) {
        ctx.font = `700 ${titleSize}px ${FONT}`;
        ctx.fillStyle = this.accent;
        ctx.fillText(title, W / 2, y, maxW);
        y += titleH;
      }
      ctx.font = `600 ${size}px ${FONT}`;
      ctx.fillStyle = '#FFFFFF';
      lines.forEach(line => { ctx.fillText(line, W / 2, y, maxW); y += size * 1.25; });
    });
    return this.text.position === 'bottom' ? floor + bandH : floor;
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
    const k = this.text.scale;
    const { size, lines } = fitWords(state.content, W - 100, H - 190, at, [84, 72, 62, 54, 46, 40, 34, 28, 24].map(n => Math.round(n * k)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (state.title) {
      ctx.font = `700 ${Math.round(34 * k)}px ${FONT}`;
      ctx.fillStyle = this.accent;
      ctx.fillText(state.title, W / 2, 76, W - 100);
    }
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    let y = 110 + (H - 150 - lines.length * size * 1.25) / 2;
    lines.forEach(line => { ctx.fillText(line, W / 2, y, W - 100); y += size * 1.25; });
  }

  /** Who is speaking, low on the left */
  private drawNameCard({ name, title }: { name: string; title: string }, floor: number) {
    const { ctx, W, H } = this;
    const k = this.text.scale, nameSize = Math.round(42 * k), titleSize = Math.round(28 * k);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${nameSize}px ${FONT}`;
    const nameW = ctx.measureText(name).width;
    ctx.font = `500 ${titleSize}px ${FONT}`;
    const titleW = title ? ctx.measureText(title).width : 0;
    const w = Math.min(W - 60, Math.max(nameW, titleW) + 48), h = nameSize * 1.45 + (title ? titleSize * 1.4 : 0) + 8, x = 30, y = H - h - floor - 26;
    ctx.fillStyle = 'rgba(10,14,24,.88)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = this.accent;
    ctx.fillRect(x, y, 6, h);
    ctx.font = `700 ${nameSize}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(name, x + 24, y + 10, w - 36);
    if (title) {
      ctx.font = `500 ${titleSize}px ${FONT}`;
      ctx.fillStyle = this.accent;
      ctx.fillText(title, x + 24, y + 10 + nameSize * 1.35, w - 36);
    }
  }

  private tickerHeight() { return Math.round(60 * this.text.scale); }

  /** Scrolling text, along the very bottom or the top */
  private drawTicker(text: string, lift: number) {
    const { ctx, W, H } = this;
    if (!this.tickerStart) this.tickerStart = performance.now();
    const h = this.tickerHeight();
    const y = this.text.ticker === 'top' ? 72 : H - lift - h;
    ctx.font = `600 ${Math.round(36 * this.text.scale)}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(text).width + 80;
    const travelled = ((performance.now() - this.tickerStart) * 0.11) % (W + width);
    const alpha = Math.max(this.plate(), 0.55);
    ctx.fillStyle = `rgba(10,14,24,${alpha})`;
    ctx.fillRect(0, y, W, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, W - travelled, y + h / 2);
  }

  /** A box in the corner: giving details, a phone number, a verse */
  private drawCard(text: string) {
    const { ctx, W } = this;
    const at = (s: string, size: number) => { ctx.font = `600 ${size}px ${FONT}`; return ctx.measureText(s).width; };
    const boxW = Math.min(368, W - 24), inner = boxW - 28;
    const { size, lines } = fitWords(text, inner, 300, at, [34, 30, 26, 22].map(n => Math.round(n * this.text.scale)));
    const h = lines.length * size * 1.25 + 28, x = W - boxW - 12, y = 130;
    ctx.fillStyle = 'rgba(10,14,24,.88)';
    ctx.fillRect(x, y, boxW, h);
    ctx.fillStyle = this.accent;
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
    ctx.font = `600 ${Math.round(36 * this.text.scale)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tail = text.length > 110 ? text.slice(-110) : text;
    const w = Math.min(W - 80, ctx.measureText(tail).width + 40);
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect((W - w) / 2, H - floor - 90, w, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(tail, W / 2, H - floor - 80, W - 60);
  }
}
