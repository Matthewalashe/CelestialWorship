/**
 * Shrink a photo on the phone before uploading: WebP, at most the size it is shown at,
 * optionally cropped to a shape (square avatar, 3:1 banner). Keeps uploads and pages light.
 */
export async function resizeImage(file: File, opts: { maxWidth: number; maxHeight: number; aspect?: number; quality?: number }): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (opts.aspect) {
    // Centre crop to the shape
    if (sw / sh > opts.aspect) { sw = Math.round(sh * opts.aspect); sx = Math.round((bitmap.width - sw) / 2); }
    else { sh = Math.round(sw / opts.aspect); sy = Math.round((bitmap.height - sh) / 2); }
  }
  const scale = Math.min(1, opts.maxWidth / sw, opts.maxHeight / sh);
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', opts.quality ?? 0.82));
  // Safari without WebP encoding falls back to JPEG
  return blob && blob.type === 'image/webp' ? blob : await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', opts.quality ?? 0.82));
}
