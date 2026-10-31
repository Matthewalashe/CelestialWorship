/**
 * A logo that moves. A canvas only ever draws the first frame of a GIF, so moving pictures are unpacked into their
 * frames here, once, at the small size the logo is shown. A short video (the usual export from 3D programs) just loops.
 */

export interface LogoPicture {
  width: number;
  height: number;
  /** What to draw at this moment */
  frame: (now: number) => CanvasImageSource | null;
  moving: boolean;
  dispose: () => void;
}

const MAX_FRAMES = 240;
const SHOWN_HEIGHT = 144;

interface DecodedImage { image: VideoFrame; complete?: boolean }
interface ImageDecoderLike {
  tracks: { ready: Promise<void>; selectedTrack?: { frameCount: number } };
  decode: (o: { frameIndex: number }) => Promise<DecodedImage>;
  close: () => void;
}
type ImageDecoderCtor = (new (o: { data: ArrayBuffer; type: string }) => ImageDecoderLike) & { isTypeSupported: (t: string) => Promise<boolean> };

function stillPicture(img: HTMLImageElement): LogoPicture {
  return { width: img.naturalWidth || 300, height: img.naturalHeight || 100, frame: () => img, moving: false, dispose: () => {} };
}

function loadStill(url: string): Promise<LogoPicture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(stillPicture(img));
    img.onerror = () => reject(new Error('The picture could not be loaded'));
    img.src = url;
  });
}

function loadVideo(url: string): Promise<LogoPicture> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.onloadeddata = () => {
      void v.play().catch(() => {});
      resolve({ width: v.videoWidth, height: v.videoHeight, frame: () => v, moving: true, dispose: () => { v.pause(); v.removeAttribute('src'); v.load(); } });
    };
    v.onerror = () => reject(new Error('The video could not be loaded'));
    v.src = url;
  });
}

async function loadAnimated(url: string): Promise<LogoPicture> {
  const Decoder = (window as unknown as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;
  if (!Decoder) return loadStill(url);
  const response = await fetch(url);
  const blob = await response.blob();
  const type = blob.type || 'image/gif';
  if (!(await Decoder.isTypeSupported(type))) return loadStill(url);
  const decoder = new Decoder({ data: await blob.arrayBuffer(), type });
  await decoder.tracks.ready;
  const count = Math.min(decoder.tracks.selectedTrack?.frameCount ?? 1, MAX_FRAMES);
  if (count <= 1) { decoder.close(); return loadStill(url); }

  const frames: { at: number; image: ImageBitmap }[] = [];
  let total = 0, width = 0, height = 0;
  for (let i = 0; i < count; i++) {
    const { image } = await decoder.decode({ frameIndex: i });
    if (!i) { width = image.displayWidth; height = image.displayHeight; }
    const scale = Math.min(1, SHOWN_HEIGHT / height);
    const bitmap = await createImageBitmap(image, { resizeWidth: Math.max(1, Math.round(width * scale)), resizeHeight: Math.max(1, Math.round(height * scale)) });
    // Frames that give no time are shown for a tenth of a second, as browsers do
    const ms = (image.duration ?? 0) / 1000 || 100;
    frames.push({ at: total, image: bitmap });
    total += Math.max(20, ms);
    image.close();
  }
  decoder.close();
  return {
    width, height, moving: true,
    frame: now => {
      const t = now % total;
      let lo = 0, hi = frames.length - 1;
      while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid].at <= t) lo = mid; else hi = mid - 1; }
      return frames[lo].image;
    },
    dispose: () => frames.forEach(f => f.image.close()),
  };
}

export function isMovingFile(type: string, name: string): boolean {
  return /^video\//.test(type) || /\.(mp4|webm|gif|apng)$/i.test(name) || type === 'image/gif' || type === 'image/apng';
}

export async function loadLogo(url: string, hint: 'video' | 'image' = 'image'): Promise<LogoPicture> {
  if (hint === 'video' || /\.(mp4|webm)(\?|$)/i.test(url)) return loadVideo(url);
  // Local files have no extension to go by, so anything may be animated; the decoder finds out
  try { return await loadAnimated(url); } catch { return loadStill(url); }
}
