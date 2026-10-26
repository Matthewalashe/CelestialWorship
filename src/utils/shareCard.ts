/**
 * Square image card for sharing a verse or hymn stanza (WhatsApp, Instagram…).
 * Drawn on a canvas so it works offline and needs no server.
 */

interface CardOptions {
  text: string;
  reference: string;
  /** Small line at the bottom, e.g. the Bible version */
  footer?: string;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function renderShareCard({ text, reference, footer }: CardOptions): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#0A1628');
  bg.addColorStop(1, '#1B2B4B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Soft gold glow
  const glow = ctx.createRadialGradient(size * 0.8, size * 0.15, 20, size * 0.8, size * 0.15, size * 0.7);
  glow.addColorStop(0, 'rgba(212, 168, 67, 0.25)');
  glow.addColorStop(1, 'rgba(212, 168, 67, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  try { await document.fonts?.ready; } catch {}

  // Fit the text: shrink the font until it fits the card
  const margin = 110;
  const maxWidth = size - margin * 2;
  let fontSize = 64;
  let lines: string[] = [];
  for (; fontSize >= 28; fontSize -= 2) {
    ctx.font = `italic 500 ${fontSize}px "Noto Sans", Inter, sans-serif`;
    lines = wrapLines(ctx, `“${text.trim()}”`, maxWidth);
    if (lines.length * fontSize * 1.4 < size - 420) break;
  }

  ctx.fillStyle = '#F8FAFC';
  ctx.textBaseline = 'top';
  const lineHeight = fontSize * 1.4;
  let y = (size - lines.length * lineHeight) / 2 - 40;
  for (const line of lines) {
    ctx.fillText(line, margin, y);
    y += lineHeight;
  }

  ctx.fillStyle = '#D4A843';
  ctx.font = `700 ${Math.max(34, Math.round(fontSize * 0.7))}px Outfit, Inter, sans-serif`;
  ctx.fillText(`: ${reference}`, margin, y + 30);

  ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
  ctx.font = '500 28px Inter, sans-serif';
  ctx.fillText(footer ? `${footer} · CelestialWorship` : 'CelestialWorship', margin, size - margin);

  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png'));
}

/** Share the card as an image where the device allows it, otherwise download it */
export async function shareCard(options: CardOptions): Promise<'shared' | 'downloaded'> {
  const blob = await renderShareCard(options);
  const fileName = `${options.reference.replace(/[^\w]+/g, '-')}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: options.reference });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
