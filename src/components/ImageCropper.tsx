import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sheet } from './Dialog';
import { cropRect, type CropView } from '../lib/studio/scene';
import { tr } from '../i18n';

/**
 * Choose which part of a picture to keep: drag to move it, slide to zoom. Works anywhere with one line:
 *   const cropped = await cropImage(file, { aspect: 1, round: true });  // null if cancelled
 * Moving pictures and drawings are passed through whole, since cropping would flatten them.
 */

export interface CropOptions {
  /** Width divided by height. Leave out to offer the common shapes. */
  aspect?: number;
  round?: boolean;
  title?: string;
}

const SHAPES: { label: string; aspect: number | null }[] = [
  { label: 'As it is', aspect: null }, { label: 'Wide', aspect: 16 / 9 }, { label: 'Square', aspect: 1 }, { label: 'Tall', aspect: 9 / 16 },
];
const MAX_SIDE = 2400;

function Cropper({ file, options, finish }: { file: File; options: CropOptions; finish: (result: File | null) => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [shape, setShape] = useState<number | null>(options.aspect ?? null);
  const [view, setView] = useState<CropView>({ zoom: 1, x: 0.5, y: 0.5 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const image = useRef<HTMLImageElement | null>(null);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const aspect = shape ?? (size ? size.w / size.h : 1);
  const crop = size ? cropRect(size.w, size.h, aspect, view) : null;

  const save = async () => {
    if (!crop || !image.current) return;
    if (shape === null && view.zoom === 1) { finish(file); return; }
    const scale = Math.min(1, MAX_SIDE / Math.max(crop.w, crop.h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(crop.w * scale);
    canvas.height = Math.round(crop.h * scale);
    canvas.getContext('2d')!.drawImage(image.current, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    // See-through pictures must stay see-through
    const type = /png|webp/.test(file.type) ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, type, 0.92));
    if (!blob) { finish(file); return; }
    finish(new File([blob], file.name.replace(/\.\w+$/, type === 'image/png' ? '.png' : '.jpg'), { type }));
  };

  const box = 300;
  const previewW = aspect >= 1 ? box : box * aspect;
  const previewH = aspect >= 1 ? box / aspect : box;
  const shown = crop && size ? { scale: previewW / crop.w } : null;

  return (
    <Sheet label={tr(options.title ?? 'Crop your picture')} onClose={() => finish(null)}>
      <div className="space-y-3">
        <div className="grid place-items-center rounded-xl p-3 bg-black">
          <div
            className={`relative overflow-hidden touch-none cursor-move ${options.round ? 'rounded-full' : 'rounded'}`}
            style={{ width: previewW, height: previewH, backgroundColor: '#222' }}
            data-testid="crop-area"
            onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y }; }}
            onPointerMove={e => {
              if (!drag.current || !crop || !size || !shown) return;
              const spareW = size.w - crop.w, spareH = size.h - crop.h;
              const dx = (e.clientX - drag.current.px) / shown.scale, dy = (e.clientY - drag.current.py) / shown.scale;
              setView(v => ({ ...v, x: spareW > 0 ? Math.min(1, Math.max(0, drag.current!.x - dx / spareW)) : 0.5, y: spareH > 0 ? Math.min(1, Math.max(0, drag.current!.y - dy / spareH)) : 0.5 }));
            }}
            onPointerUp={() => { drag.current = null; }}
          >
            <img
              ref={image} src={url} alt="" draggable={false}
              onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="absolute max-w-none select-none pointer-events-none"
              style={crop && shown && size ? { left: -crop.x * shown.scale, top: -crop.y * shown.scale, width: size.w * shown.scale, height: size.h * shown.scale } : { width: '100%' }}
            />
          </div>
        </div>
        {options.aspect === undefined && (
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label={tr('Shape')}>
            {SHAPES.map(s => (
              <button key={s.label} role="radio" aria-checked={shape === s.aspect} onClick={() => { setShape(s.aspect); setView(v => ({ ...v, x: 0.5, y: 0.5 })); }}
                      className="py-1.5 rounded-lg text-xs font-semibold border"
                      style={shape === s.aspect ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)', borderColor: 'transparent' } : { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr(s.label)}</button>
            ))}
          </div>
        )}
        <label className="block text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{tr('Zoom')}
          <input type="range" min={1} max={4} step={0.05} value={view.zoom} onChange={e => setView(v => ({ ...v, zoom: Number(e.target.value) }))} className="w-full" />
        </label>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Drag the picture to choose what shows.')}</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => finish(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{tr('Cancel')}</button>
          <button onClick={() => void save()} disabled={!crop} className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Use this')}</button>
        </div>
      </div>
    </Sheet>
  );
}

/** Whether cropping would damage this file: videos, moving pictures and drawings go through whole */
export function canCrop(file: File): boolean {
  return /^image\/(jpeg|png|webp|bmp|avif)$/.test(file.type);
}

export function cropImage(file: File, options: CropOptions = {}): Promise<File | null> {
  if (!canCrop(file)) return Promise.resolve(file);
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(<Cropper file={file} options={options} finish={result => { root.unmount(); host.remove(); resolve(result); }} />);
  });
}
