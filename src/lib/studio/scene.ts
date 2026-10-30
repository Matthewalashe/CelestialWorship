/** The arithmetic of the studio picture, kept free of the browser so it can be tested. */

export type StudioLayout = 'solo' | 'split' | 'grid' | 'pip';
export interface Rect { x: number; y: number; w: number; h: number }

/** Where each source on stage is drawn. The first source leads. */
export function layoutRects(layout: StudioLayout, count: number, W: number, H: number): Rect[] {
  if (count <= 0) return [];
  const full = { x: 0, y: 0, w: W, h: H };
  if (count === 1 || layout === 'solo') return [full];
  if (layout === 'pip') {
    const w = Math.round(W * 0.26), h = Math.round(w * 9 / 16), gap = Math.round(W * 0.02);
    return [full, ...Array.from({ length: count - 1 }, (_, i) => ({ x: W - w - gap, y: H - (h + gap) * (i + 1), w, h }))];
  }
  if (layout === 'split' && count === 2) return [{ x: 0, y: 0, w: W / 2, h: H }, { x: W / 2, y: 0, w: W / 2, h: H }];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const w = W / cols, h = H / rows;
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    // A short last row sits in the middle
    const inRow = row === rows - 1 ? count - cols * (rows - 1) : cols;
    const offset = (W - inRow * w) / 2;
    return { x: offset + (i % cols) * w, y: row * h, w, h };
  });
}

/** The part of a source to draw so it fills a box without stretching */
export function coverCrop(srcW: number, srcH: number, box: Rect): Rect {
  const scale = Math.max(box.w / srcW, box.h / srcH);
  const w = box.w / scale, h = box.h / scale;
  return { x: (srcW - w) / 2, y: (srcH - h) / 2, w, h };
}

/** Lines of text that fit a width, keeping the author's line breaks */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) continue;
    let line = '';
    for (const word of para.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > maxWidth) { out.push(line); line = word; }
      else line = next;
    }
    if (line) out.push(line);
  }
  return out;
}

/** The largest type at which the words fit the band: smaller steps until they do, and then what fits is shown */
export function fitWords(text: string, maxWidth: number, maxHeight: number, measureAt: (s: string, size: number) => number, sizes = [46, 40, 34, 30, 26, 22, 20]): { size: number; lines: string[] } {
  for (const size of sizes) {
    const lines = wrapText(text, maxWidth, s => measureAt(s, size));
    if (lines.length * size * 1.25 <= maxHeight) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  const lines = wrapText(text, maxWidth, s => measureAt(s, size));
  return { size, lines: lines.slice(0, Math.max(1, Math.floor(maxHeight / (size * 1.25)))) };
}
