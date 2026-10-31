import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Film } from 'lucide-react';
import { addMedia, listMedia, removeMedia, type MediaItem } from '../lib/studio/media';
import { cropImage } from './ImageCropper';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

/** A church's pictures and videos: add once, then one tap to show */
export function MediaGrid({ onPick, actions }: { onPick?: (item: MediaItem) => void; actions?: (item: MediaItem) => React.ReactNode }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(() => { listMedia().then(setItems).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const cropped = await cropImage(f);
        if (!cropped) continue;
        const item = await addMedia(cropped);
        if (item.local) showToast(tr('Kept on this computer until you close the page'));
      }
      load();
    } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*,video/mp4,video/webm" multiple className="hidden" onChange={e => add(e.target.files)} />
      <button onClick={() => input.current?.click()} disabled={busy} className="w-full py-2.5 rounded-xl border border-dashed text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}>
        <ImagePlus size={16} aria-hidden /> {busy ? tr('Adding…') : tr('Add pictures or videos')}
      </button>
      {items.length === 0 && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Your flyers, offering details and announcement videos will wait here.')}</p>}
      <ul className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <li key={item.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
            <button onClick={() => onPick?.(item)} disabled={!onPick} className="block w-full aspect-video bg-black" title={item.name}>
              {item.kind === 'image'
                ? <img src={item.url} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                : <span className="w-full h-full grid place-items-center text-white"><Film size={22} aria-label={tr('Video')} /></span>}
            </button>
            <div className="flex items-center gap-1 px-2 py-1">
              <span className="flex-1 min-w-0 text-[11px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{item.name}</span>
              <button aria-label={`${tr('Remove')} ${item.name}`} className="p-1" style={{ color: 'var(--color-text-muted)' }}
                      onClick={() => removeMedia(item).then(load).catch(e => showToast(errorMessage(e)))}><Trash2 size={13} /></button>
            </div>
            {actions && <div className="flex flex-wrap gap-1 px-2 pb-2">{actions(item)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
