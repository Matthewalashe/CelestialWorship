import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Lock, Trash2, Film } from 'lucide-react';
import { Sheet, confirmDialog } from './Dialog';
import { DefaultBackgrounds } from './DisplayLookPanel';
import { cropImage } from './ImageCropper';
import { showToast } from './Toast';
import { addLogo, listLogos, removeLogo, type MediaItem } from '../lib/studio/media';
import { useLook } from '../lib/studio/look';
import { clock, downloadBlob, fileSize, loadSessions, type RecordingResult, type StudioSession } from '../lib/studio/recording';
import type { Compositor, LogoCorner, StudioSource } from '../lib/studio/compositor';
import type { ConnectStats } from '../lib/studio/connect';
import { GIVING_ON, STUDIO_PLANS, type StudioAllowance } from '../lib/studio/allowance';
import { makePoll, type LiveMessage, type LivePoll } from '../lib/studio/reactions';
import { ACCENTS, type BrandKit } from '../lib/studio/brand';
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
  const parishes = new Map<string, StudioSession[]>();
  sessions.forEach(s => { if (s.parish) parishes.set(s.parish, [...(parishes.get(s.parish) ?? []), s]); });
  const byParish = [...parishes.entries()];
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
            {allowance.allParishes && byParish.length > 1 && (
              <div>
                <p className="text-xs font-semibold pb-1">{tr('By parish')}</p>
                {byParish.map(([name, list]) => <Fact key={name} label={name} value={`${list.length} · ${clock(list.reduce((n, s) => n + s.ms, 0))}`} />)}
              </div>
            )}
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

// ── People on the app ───────────────────────────────────────

export function AudiencePanel({ connected, messages, poll, shownId, pollOnScreen, onShow, onDismiss, onStartPoll, onClosePoll, onClearPoll, onPollOnScreen }: {
  connected: boolean; messages: LiveMessage[]; poll: LivePoll | null; shownId: string | null; pollOnScreen: boolean;
  onShow: (m: LiveMessage | null) => void; onDismiss: (id: string) => void; onStartPoll: (p: LivePoll) => void; onClosePoll: () => void; onClearPoll: () => void; onPollOnScreen: (on: boolean) => void;
}) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState(['', '']);
  const field = 'w-full rounded-xl px-3 py-2 text-sm border outline-none';
  const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', ...border, color: 'var(--color-text-primary)' };
  const start = () => {
    const made = makePoll(crypto.randomUUID(), question, answers);
    if (!made) { showToast(tr('Write a question and at least two answers')); return; }
    onStartPoll(made);
    setQuestion(''); setAnswers(['', '']);
  };
  const prayers = messages.filter(m => m.kind === 'prayer');
  const comments = messages.filter(m => m.kind === 'comment');
  const total = poll ? poll.counts.reduce((a, b) => a + b, 0) : 0;
  return (
    <div className="rounded-2xl border p-3 space-y-4" style={{ backgroundColor: 'var(--color-bg-card)', ...border }}>
      {!connected && <p className="text-xs" style={muted}>{tr('This opens when you are live and listed in Online Church. It covers people watching on the app; comments on YouTube or Facebook stay there.')}</p>}
      <section className="space-y-2">
        <p className="text-xs font-semibold">{tr('Poll')}</p>
        {poll ? (
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold">{poll.question}</p>
            {poll.options.map((o, i) => <div key={o} className="flex justify-between gap-2 text-xs"><span>{o}</span><span className="font-semibold">{poll.counts[i]} ({total ? Math.round((poll.counts[i] / total) * 100) : 0}%)</span></div>)}
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={pollOnScreen} onChange={e => onPollOnScreen(e.target.checked)} /> {tr('Show on the screen')}</label>
            <div className="flex flex-wrap gap-1">
              {poll.open && <button onClick={onClosePoll} className={smallBtn} style={border}>{tr('Stop the voting')}</button>}
              <button onClick={onClearPoll} className={smallBtn} style={border}>{tr('Remove the poll')}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <input value={question} onChange={e => setQuestion(e.target.value)} maxLength={140} placeholder={tr('Your question')} className={field} style={fieldStyle} />
            {answers.map((a, i) => <input key={i} value={a} onChange={e => setAnswers(answers.map((x, j) => (j === i ? e.target.value : x)))} maxLength={60} placeholder={trf('Answer {n}', { n: i + 1 })} className={field} style={fieldStyle} />)}
            <div className="flex gap-1">
              {answers.length < 4 && <button onClick={() => setAnswers([...answers, ''])} className={smallBtn} style={border}>{tr('Add an answer')}</button>}
              <button onClick={start} disabled={!connected} className={`${smallBtn} disabled:opacity-50`} style={border}>{tr('Start the poll')}</button>
            </div>
          </div>
        )}
      </section>
      <section className="space-y-2">
        <p className="text-xs font-semibold">{tr('Comments')} ({comments.length})</p>
        {comments.map(m => (
          <div key={m.id} className="rounded-xl border p-2 text-sm" style={border}>
            {m.name && <p className="text-xs font-semibold">{m.name}</p>}
            <p className="break-words">{m.text}</p>
            <div className="flex gap-1 pt-1">
              <button onClick={() => onShow(shownId === m.id ? null : m)} className={smallBtn} style={border}>{shownId === m.id ? tr('Take off the screen') : tr('Show on the screen')}</button>
              <button onClick={() => { if (shownId === m.id) onShow(null); onDismiss(m.id); }} className={smallBtn} style={border}>{tr('Dismiss')}</button>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <p className="text-xs font-semibold">{tr('Prayer requests')} ({prayers.length})</p>
        <p className="text-[11px]" style={muted}>{tr('Only you see these, and they carry no name.')}</p>
        {prayers.map(m => (
          <div key={m.id} className="rounded-xl border p-2 text-sm" style={border}>
            <p className="break-words">{m.text}</p>
            <button onClick={() => onDismiss(m.id)} className={`${smallBtn} mt-1`} style={border}>{tr('Prayed for')}</button>
          </div>
        ))}
      </section>
    </div>
  );
}

// ── Saved looks ─────────────────────────────────────────────

export function BrandPanel({ kits, accent, limit, onAccent, onSave, onApply, onRemove }: { kits: BrandKit[]; accent: string; limit: number; onAccent: (c: string) => void; onSave: () => void; onApply: (k: BrandKit) => void; onRemove: (k: BrandKit) => void }) {
  return (
    <div className="rounded-2xl border p-3 space-y-3" style={{ backgroundColor: 'var(--color-bg-card)', ...border }}>
      <fieldset>
        <legend className="text-xs font-semibold pb-1.5">{tr('Colour of lines and titles')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {ACCENTS.map(a => <button key={a.color} onClick={() => onAccent(a.color)} aria-pressed={accent === a.color} aria-label={tr(a.name)} title={tr(a.name)} className="w-8 h-8 rounded-lg border-2" style={{ backgroundColor: a.color, borderColor: accent === a.color ? 'var(--color-accent-brand)' : 'var(--color-border)' }} />)}
        </div>
      </fieldset>
      <button onClick={onSave} disabled={kits.length >= limit} className="w-full py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-50" style={border}>{tr('Save this look')}</button>
      <p className="text-[11px]" style={muted}>{limit === 0 ? tr('Upgrade to save your looks.') : tr('Saves your logo, colour and words, to bring back with one tap. Kept on this computer.')}</p>
      {kits.map(k => (
        <div key={k.id} className="flex items-center gap-2 rounded-xl border p-2" style={border}>
          <span aria-hidden className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: k.accent }} />
          <span className="flex-1 min-w-0 text-sm font-semibold truncate">{k.name}</span>
          <button onClick={() => onApply(k)} className={smallBtn} style={border}>{tr('Use')}</button>
          <button onClick={async () => { if (await confirmDialog({ title: tr('Delete this look?'), confirmLabel: tr('Delete'), danger: true })) onRemove(k); }} aria-label={`${tr('Remove')} ${k.name}`} style={muted}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Giving goal ─────────────────────────────────────────────

export interface GoalDraft { label: string; raised: string; target: string; on: boolean }

export function GivingPanel({ goal, onChange }: { goal: GoalDraft; onChange: (g: GoalDraft) => void }) {
  const field = 'w-full rounded-xl px-3 py-2 text-sm border outline-none font-normal mt-1 disabled:opacity-60';
  const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', ...border, color: 'var(--color-text-primary)' };
  return (
    <div className="rounded-2xl border p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-card)', ...border }}>
      {!GIVING_ON && <p className="text-xs font-semibold inline-flex items-center gap-1.5"><Lock size={13} aria-hidden /> {tr('This opens when secure giving is ready.')}</p>}
      <label className="block text-xs font-semibold">{tr('What is it for?')}<input disabled={!GIVING_ON} value={goal.label} onChange={e => onChange({ ...goal, label: e.target.value })} maxLength={40} placeholder={tr('e.g. Building fund')} className={field} style={fieldStyle} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">{tr('Goal')}<input disabled={!GIVING_ON} value={goal.target} onChange={e => onChange({ ...goal, target: e.target.value })} inputMode="numeric" className={field} style={fieldStyle} /></label>
        <label className="block text-xs font-semibold">{tr('Given so far')}<input disabled={!GIVING_ON} value={goal.raised} onChange={e => onChange({ ...goal, raised: e.target.value })} inputMode="numeric" className={field} style={fieldStyle} /></label>
      </div>
      <button disabled={!GIVING_ON || !goal.label.trim() || !(Number(goal.target) > 0)} onClick={() => onChange({ ...goal, on: !goal.on })} aria-pressed={goal.on} className="w-full py-2 rounded-xl border text-sm font-semibold disabled:opacity-50" style={border}>{goal.on ? tr('Hide the goal') : tr('Show the goal')}</button>
    </div>
  );
}

// ── Plans (only offered when pricing is on) ─────────────────

export function PlansSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label={tr('Plans')} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        {STUDIO_PLANS.map(p => (
          <div key={p.tier} className="rounded-2xl border p-3" style={border}>
            <p className="font-bold pb-2">{tr(p.name)}</p>
            <ul className="space-y-1 text-xs">{p.features.map(f => <li key={f}>{tr(f)}</li>)}</ul>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
