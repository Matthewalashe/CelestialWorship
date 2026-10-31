import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Trash2, Film } from 'lucide-react';
import { Sheet, confirmDialog } from './Dialog';
import { DefaultBackgrounds } from './DisplayLookPanel';
import { cropImage } from './ImageCropper';
import { showToast } from './Toast';
import { addLogo, listLogos, removeLogo, type MediaItem } from '../lib/studio/media';
import { useLook } from '../lib/studio/look';
import { clock, downloadBlob, fileSize, loadSessions, type RecordingResult, type StudioSession } from '../lib/studio/recording';
import type { Compositor, LogoCorner, StudioSource } from '../lib/studio/compositor';
import type { ConnectStats } from '../lib/studio/connect';
import type { StudioAllowance } from '../lib/studio/allowance';
import { WHOLE_VIEW } from '../lib/studio/scene';
import { errorMessage } from '../lib/backend';
import { tr, trf } from '../i18n';

/** The studio's smaller windows: everything that asks, tells or saves, one at a time */

const smallBtn = 'text-[11px] font-semibold px-2 py-1 rounded-lg border';
const border = { borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };
const row = 'flex items-center justify-between gap-3 py-2 border-b text-sm';

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className={row} style={border}><span style={muted}>{label}</span><span className="font-semibold text-right">{value}</span></div>;
}

// ── Framing a camera ────────────────────────────────────────

export function FrameSheet({ source, compositor, onClose }: { source: StudioSource; compositor: Compositor; onClose: () => void }) {
  const [view, setView] = useState(source.view);
  const change = (next: typeof view) => { setView(next); compositor.setView(source.id, next); };
  return (
    <Sheet label={trf('Frame {name}', { name: source.label })} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs" style={muted}>{tr('Watch the main screen as you move these. This matters most for a tall picture, to keep the speaker in view.')}</p>
        <label className="block text-xs font-semibold">{tr('Zoom')}<input type="range" min={1} max={4} step={0.05} value={view.zoom} onChange={e => change({ ...view, zoom: Number(e.target.value) })} className="w-full" /></label>
        <label className="block text-xs font-semibold">{tr('Left and right')}<input type="range" min={0} max={1} step={0.01} value={view.x} onChange={e => change({ ...view, x: Number(e.target.value) })} className="w-full" /></label>
        <label className="block text-xs font-semibold">{tr('Up and down')}<input type="range" min={0} max={1} step={0.01} value={view.y} onChange={e => change({ ...view, y: Number(e.target.value) })} className="w-full" /></label>
        <div className="flex justify-end gap-2">
          <button onClick={() => change(WHOLE_VIEW)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{tr('Reset')}</button>
          <button onClick={onClose} className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold">{tr('Done')}</button>
        </div>
      </div>
    </Sheet>
  );
}

// ── Logos ───────────────────────────────────────────────────

const CORNERS: { id: LogoCorner; label: string }[] = [{ id: 'top-right', label: 'Top right' }, { id: 'top-left', label: 'Top left' }, { id: 'bottom-right', label: 'Bottom right' }, { id: 'bottom-left', label: 'Bottom left' }];

export function LogoPanel({ logo, corner, watermark, onLogo, onCorner }: { logo: string | null; corner: LogoCorner; watermark: boolean; onLogo: (item: MediaItem | null) => void; onCorner: (c: LogoCorner) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const load = () => { listLogos().then(setItems).catch(() => {}); };
  useEffect(load, []);
  const add = async (file?: File) => {
    if (!file) return;
    const cropped = await cropImage(file, { title: 'Crop your logo' });
    if (!cropped) return;
    setBusy(true);
    try { const item = await addLogo(cropped); onLogo(item); load(); } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl border p-3 space-y-3" style={{ backgroundColor: 'var(--color-bg-card)', ...border }}>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/webm,video/mp4" className="hidden" onChange={e => { void add(e.target.files?.[0]); e.target.value = ''; }} />
      <button onClick={() => input.current?.click()} disabled={busy} className="w-full py-2.5 rounded-xl border border-dashed text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ ...border, color: 'var(--color-accent-brand)' }}>
        <ImagePlus size={16} aria-hidden /> {busy ? tr('Adding…') : tr('Add a logo')}
      </button>
      <p className="text-[11px]" style={muted}>{tr('PNG, JPG, SVG or a moving GIF. For a 3D logo, export it from your design program as a GIF or a short WebM or MP4 video.')}</p>
      <label className="block text-xs font-semibold">{tr('Where it sits')}
        <select value={corner} onChange={e => onCorner(e.target.value as LogoCorner)} className="mt-1 w-full rounded-xl px-3 py-2 text-sm border font-normal" style={{ backgroundColor: 'var(--color-bg-primary)', ...border, color: 'var(--color-text-primary)' }}>
          {CORNERS.map(c => <option key={c.id} value={c.id}>{tr(c.label)}</option>)}
        </select>
      </label>
      {logo && <button onClick={() => onLogo(null)} className="text-xs underline" style={muted}>{tr('Take the logo off the screen')}</button>}
      {watermark && <p className="text-[11px]" style={muted}>{tr('Our small mark stays at the top left beside your logo.')}</p>}
      <ul className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <li key={item.id} className="rounded-xl border overflow-hidden" style={{ ...border, outline: item.url === logo ? '2px solid var(--color-accent-brand)' : undefined }}>
            <button onClick={() => onLogo(item)} className="block w-full aspect-video bg-black/70" title={tr('Use this logo')}>
              {item.kind === 'image' ? <img src={item.url} alt={item.name} className="w-full h-full object-contain" loading="lazy" /> : <span className="w-full h-full grid place-items-center text-white"><Film size={20} aria-label={tr('Video')} /></span>}
            </button>
            <div className="flex items-center gap-1 px-2 py-1">
              <span className="flex-1 min-w-0 text-[11px] truncate">{item.name}</span>
              <button aria-label={`${tr('Remove')} ${item.name}`} className="p-1" style={muted}
                      onClick={async () => { if (await confirmDialog({ title: tr('Delete this logo?'), confirmLabel: tr('Delete'), danger: true })) { removeLogo(item).then(load).catch(e => showToast(errorMessage(e))); if (item.url === logo) onLogo(null); } }}><Trash2 size={13} /></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Backgrounds ─────────────────────────────────────────────

export function BackgroundPanel({ compositor }: { compositor: Compositor }) {
  const { look, update } = useLook();
  return (
    <div className="rounded-2xl border p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-card)', ...border }}>
      <p className="text-[11px]" style={muted}>{tr('Pictures ready for you to use. To add your own, go to Media.')}</p>
      <button onClick={() => void compositor.setBackground(null)} className={smallBtn} style={border}>{tr('No picture behind the cameras')}</button>
      <DefaultBackgrounds actions={url => (
        <>
          <button onClick={() => void compositor.setBackground(url).catch(() => {})} className={smallBtn} style={border}>{tr('Behind the cameras')}</button>
          <button onClick={() => update({ hymn: { ...look.hymn, url, kind: 'image' } })} className={smallBtn} style={border}>{tr('For hymns')}</button>
          <button onClick={() => update({ verse: { ...look.verse, url, kind: 'image' } })} className={smallBtn} style={border}>{tr('For the Bible')}</button>
        </>
      )} />
    </div>
  );
}

// ── Starting a recording, and saving one ────────────────────

export function RecordSheet({ canDisk, onChoose, onClose }: { canDisk: boolean; onChoose: (toDisk: boolean) => void; onClose: () => void }) {
  return (
    <Sheet label={tr('Record this service')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('The recording is exactly what the main screen shows, with its sound. Keep this window open until you stop.')}</p>
        {canDisk && <button onClick={() => onChoose(true)} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">{tr('Choose a file, and save as it records (best)')}</button>}
        <button onClick={() => onChoose(false)} className="w-full py-3 rounded-xl text-sm font-semibold border" style={border}>{tr('Keep it here, and save when I stop')}</button>
        {canDisk && <p className="text-[11px]" style={muted}>{tr('Saving as it records is safer: a long service stays safe even if the computer has trouble.')}</p>}
      </div>
    </Sheet>
  );
}

export function SavedRecordingSheet({ result, onClose }: { result: RecordingResult; onClose: () => void }) {
  const close = async () => {
    if (result.blob && !(await confirmDialog({ title: tr('Discard this recording?'), message: tr('It has not been saved, and it cannot be brought back.'), confirmLabel: tr('Discard'), danger: true }))) return;
    onClose();
  };
  return (
    <Sheet label={tr('Your recording')} onClose={() => void close()}>
      <div className="space-y-3">
        <Fact label={tr('Length')} value={clock(result.ms)} />
        <Fact label={tr('Size')} value={fileSize(result.bytes)} />
        <Fact label={tr('File')} value={result.name} />
        {result.savedToDisk && !result.blob && <p className="text-sm">{tr('It has been saved in the file you chose.')}</p>}
        {result.blob ? (
          <button onClick={() => { downloadBlob(result.blob!, result.name); onClose(); }} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"><Download size={16} aria-hidden /> {tr('Download the recording')}</button>
        ) : <button onClick={onClose} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">{tr('Done')}</button>}
      </div>
    </Sheet>
  );
}

export function PictureSheet({ picture, onClose }: { picture: Blob; onClose: () => void }) {
  const [url] = useState(() => URL.createObjectURL(picture));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <Sheet label={tr('A picture of the screen')} onClose={onClose}>
      <div className="space-y-3">
        <img src={url} alt="" className="w-full max-h-[55vh] object-contain rounded-xl bg-black" />
        <button onClick={() => { downloadBlob(picture, `celestialworship-${Date.now()}.jpg`); onClose(); }} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"><Download size={16} aria-hidden /> {tr('Download the picture')}</button>
      </div>
    </Sheet>
  );
}

// ── While live ──────────────────────────────────────────────

export function StreamSheet({ startedAt, stats, platforms, viewers, totals, reconnecting, onClose }: { startedAt: number; stats: React.RefObject<ConnectStats | null>; platforms: string[]; viewers: number; totals: Record<string, number>; reconnecting: boolean; onClose: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  const s = stats.current;
  const health = reconnecting ? tr('Reconnecting…') : !s ? tr('Not measured for this kind of stream') : s.speed !== null && s.speed < 0.9 ? tr('Struggling: your internet cannot keep up') : tr('Good');
  return (
    <Sheet label={tr('Your stream')} onClose={onClose}>
      <div>
        <Fact label={tr('Live for')} value={clock(Date.now() - startedAt)} />
        <Fact label={tr('Health')} value={health} />
        {s && <Fact label={tr('Pictures per second')} value={Math.round(s.fps)} />}
        {s?.kbps != null && <Fact label={tr('Speed going out')} value={`${(s.kbps / 1000).toFixed(1)} Mbps`} />}
        <Fact label={tr('Going to')} value={platforms.join(', ') || '–'} />
        <Fact label={tr('Watching on the app')} value={viewers} />
        {Object.entries(totals).map(([emoji, n]) => <Fact key={emoji} label={emoji} value={n} />)}
        <p className="text-[11px] pt-2" style={muted}>{tr('People watching on YouTube, Facebook and other platforms are counted in those platforms’ own studios.')}</p>
      </div>
    </Sheet>
  );
}

export function SummarySheet({ session, allowance, onClose }: { session: StudioSession; allowance: StudioAllowance; onClose: () => void }) {
  return (
    <Sheet label={tr('Your broadcast has ended')} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Fact label={tr('Length')} value={clock(session.ms)} />
          <Fact label={tr('Went to')} value={session.platforms.join(', ') || '–'} />
          {allowance.analytics && <Fact label={tr('Most watching on the app')} value={session.peakViewers} />}
          {allowance.analytics && <Fact label={tr('Reactions')} value={session.reactions} />}
          {allowance.analytics && <Fact label={tr('Connection drops')} value={session.drops} />}
        </div>
        {!allowance.analytics && <p className="text-xs" style={muted}>{tr('Upgrade to see viewers, reactions and your past broadcasts.')}</p>}
        <button onClick={onClose} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">{tr('Done')}</button>
      </div>
    </Sheet>
  );
}

export function AnalyticsSheet({ allowance, onClose }: { allowance: StudioAllowance; onClose: () => void }) {
  const [sessions] = useState(loadSessions);
  if (!allowance.analytics) {
    return <Sheet label={tr('Analytics')} onClose={onClose}><p className="text-sm">{tr('Upgrade to see viewers, reactions and your past broadcasts.')}</p></Sheet>;
  }
  const total = sessions.reduce((n, s) => n + s.ms, 0);
  const peak = sessions.reduce((n, s) => Math.max(n, s.peakViewers), 0);
  return (
    <Sheet label={tr('Analytics')} onClose={onClose} wide>
      <div className="space-y-3">
        {sessions.length === 0 ? <p className="text-sm" style={muted}>{tr('Your broadcasts will be listed here after you go live.')}</p> : (
          <>
            <div>
              <Fact label={tr('Broadcasts')} value={sessions.length} />
              <Fact label={tr('Time live')} value={clock(total)} />
              <Fact label={tr('Most watching on the app')} value={peak} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead style={muted}><tr><th className="py-1 pr-2 font-semibold">{tr('Date')}</th><th className="pr-2 font-semibold">{tr('Service')}</th><th className="pr-2 font-semibold">{tr('Length')}</th><th className="pr-2 font-semibold">{tr('Watching')}</th><th className="font-semibold">{tr('Reactions')}</th></tr></thead>
                <tbody>{sessions.map(s => <tr key={s.at} className="border-t" style={border}><td className="py-1.5 pr-2 whitespace-nowrap">{new Date(s.at).toLocaleDateString()}</td><td className="pr-2">{s.title}</td><td className="pr-2">{clock(s.ms)}</td><td className="pr-2">{s.peakViewers}</td><td>{s.reactions}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="text-[11px]" style={muted}>{tr('Counts are for people on the app, and this list is kept on this computer.')}</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
