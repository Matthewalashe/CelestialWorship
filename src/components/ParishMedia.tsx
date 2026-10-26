import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Link2, Trash2, Play } from 'lucide-react';
import { listParishMedia, addParishMediaFile, addParishVideoLink, deleteParishMedia, setParishImage, type ParishMedia } from '../lib/media';
import { embedUrl } from '../lib/live';
import { Sheet, confirmDialog } from './Dialog';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import type { Parish } from '../hooks/useParishes';
import { tr } from '../i18n';

/** Video player for a gallery item: our own files play natively, YouTube/Facebook links embed */
function VideoItem({ item }: { item: ParishMedia }) {
  const embed = item.storage_path ? null : embedUrl({ platform: /facebook|fb\.watch/.test(item.url) ? 'facebook' : 'youtube', url: item.url });
  // Parish clips have no caption files; their written caption is shown under the video
  // eslint-disable-next-line jsx-a11y/media-has-caption
  if (item.storage_path) return <video src={item.url} controls preload="none" playsInline className="w-full rounded-xl bg-black aspect-video" />;
  if (embed) return <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black"><iframe src={embed.replace('autoplay=1', 'autoplay=0').replace('autoplay=true', 'autoplay=false')} title={item.caption ?? tr('Video')} loading="lazy" allowFullScreen className="absolute inset-0 w-full h-full" /></div>;
  return <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}><Play size={16} />{' '}{tr('Watch the video')}</a>;
}

/** The parish's pictures and videos, on its public page */
export function ParishGallery({ parishId }: { parishId: string }) {
  const [items, setItems] = useState<ParishMedia[]>([]);
  const [open, setOpen] = useState<ParishMedia | null>(null);
  useEffect(() => { listParishMedia(parishId).then(r => setItems(r ?? [])).catch(() => {}); }, [parishId]);
  if (!items.length) return null;
  const photos = items.filter(i => i.kind === 'image');
  const videos = items.filter(i => i.kind === 'video');
  return (
    <section className="space-y-3">
      <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Pictures & videos</h2>
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-1.5">
          {photos.slice(0, 12).map(p => (
            <li key={p.id}>
              <button onClick={() => setOpen(p)} className="block w-full aspect-square rounded-lg overflow-hidden" aria-label={p.caption ?? tr('Open picture')}>
                <img src={p.url} alt={p.caption ?? ''} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {videos.slice(0, 4).map(v => (
        <figure key={v.id}><VideoItem item={v} />{v.caption && <figcaption className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{v.caption}</figcaption>}</figure>
      ))}
      {open && (
        <Sheet label={open.caption ?? tr('Picture')} onClose={() => setOpen(null)} wide>
          <img src={open.url} alt={open.caption ?? ''} className="w-full h-auto rounded-xl" />
        </Sheet>
      )}
    </section>
  );
}

/** Parish admin: logo, cover and gallery */
export function ParishMediaManager({ parish, onSaved }: { parish: Parish & { logo_url?: string | null; cover_url?: string | null }; onSaved: () => void }) {
  const [items, setItems] = useState<ParishMedia[] | null>([]);
  const [caption, setCaption] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => { listParishMedia(parish.id).then(setItems).catch(e => showToast(errorMessage(e))); }, [parish.id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try { await fn(); showToast(done); load(); onSaved(); } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); }
  };
  const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
  const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
  const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4 space-y-3" style={card}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Logo and cover')}</p>
        <div className="relative w-full aspect-[8/3] rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-accent-brand), var(--color-accent-gold))' }}>
          {parish.cover_url && <img src={parish.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          {parish.logo_url && <img src={parish.logo_url} alt="" className="absolute left-3 bottom-3 w-16 h-16 rounded-xl object-cover border-2 border-white" />}
        </div>
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => logoInput.current?.click()} className="px-4 py-2 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Change logo')}</button>
          <button disabled={busy} onClick={() => coverInput.current?.click()} className="px-4 py-2 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Change cover')}</button>
        </div>
        <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(async () => { await setParishImage(parish.id, 'logo', f, parish.logo_url); }, 'Logo updated'); }} />
        <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) run(async () => { await setParishImage(parish.id, 'cover', f, parish.cover_url); }, 'Cover updated'); }} />
      </div>

      <div className="rounded-2xl border p-4 space-y-3" style={card}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Add pictures and videos')}</p>
        <input value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} placeholder={tr('Caption (optional), e.g. Harvest 2026')} className={field} style={fieldStyle} />
        <button disabled={busy} onClick={() => fileInput.current?.click()} className="w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 border-2 border-dashed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          <ImagePlus size={18} /> {busy ? tr('Uploading…') : tr('Choose photos or a short video')}
        </button>
        <input ref={fileInput} type="file" accept="image/*,video/mp4,video/webm" multiple className="hidden"
               onChange={e => { const files = [...(e.target.files ?? [])]; e.target.value = ''; if (files.length) run(async () => { for (const f of files.slice(0, 10)) await addParishMediaFile(parish.id, f, caption); setCaption(''); }, files.length > 1 ? `${Math.min(files.length, 10)} added` : 'Added'); }} />
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Photos are made smaller on your phone before they upload. Videos up to 50 MB (MP4); for longer videos add a link instead.')}</p>
        <div className="flex gap-2">
          <input value={link} onChange={e => setLink(e.target.value)} inputMode="url" placeholder={tr('YouTube or Facebook video link')} className={field} style={fieldStyle} />
          <button disabled={busy || !link.trim()} onClick={() => run(async () => { await addParishVideoLink(parish.id, link, caption); setLink(''); setCaption(''); }, 'Video added')}
                  className="px-3 rounded-xl shrink-0 disabled:opacity-50" aria-label={tr('Add video link')} style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}><Link2 size={18} /></button>
        </div>
      </div>

      {items === null && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('Pictures open when the church’s online service is set up.')}</p>}
      {items && items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map(i => (
            <li key={i.id} className="relative">
              {i.kind === 'image'
                ? <img src={i.url} alt={i.caption ?? ''} loading="lazy" className="w-full aspect-square object-cover rounded-lg" />
                : <div className="w-full aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}><Play size={22} /></div>}
              <button onClick={async () => { if (await confirmDialog({ title: tr('Delete this?'), confirmLabel: tr('Delete'), danger: true })) run(() => deleteParishMedia(i), 'Deleted'); }}
                      aria-label={tr('Delete')} className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
