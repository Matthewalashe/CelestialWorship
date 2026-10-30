import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import qrcode from 'qrcode-generator';
import {
  ChevronLeft, Download, CheckCircle2, Camera, MonitorUp, Smartphone, UserPlus, Radio, Square, Mic, MicOff, Trash2, Eye, EyeOff, Copy, Circle, Music2, Plus, X, ExternalLink, Layout as LayoutIcon, Image as ImageIcon, Captions, Settings2,
} from 'lucide-react';
import { Compositor, type LogoCorner, type StudioSource } from '../lib/studio/compositor';
import type { StudioLayout } from '../lib/studio/scene';
import { hostRoom } from '../lib/studio/peers';
import { loadTargets, saveTargets, PLATFORM_HELP, relayReady, startRelay, targetUrl, type RelaySession, type StreamPlatform, type StreamTarget } from '../lib/studio/relay';
import { savedLogo, saveLogo } from '../lib/studio/media';
import { CONNECT_DOWNLOAD, connectRunning, isWindowsComputer, startConnect } from '../lib/studio/connect';
import { newRoomCode, useDisplayReceiver } from '../hooks/useLiveDisplay';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { myAdminParishes } from '../lib/parishAdmin';
import { notifyLive, saveLivestream, setStreamStatus, type Destination, type LivePlatform } from '../lib/live';
import { normalizeHttpsUrl } from '../utils/safeUrl';
import { MediaGrid } from '../components/StudioMedia';
import { showToast } from '../components/Toast';
import { confirmDialog } from '../components/Dialog';
import { errorMessage } from '../lib/backend';
import { tr, trf } from '../i18n';
import Control from './Control';

/**
 * The Live Studio: as easy as a video call. Add cameras, press Go Live. The words come from the same operator desk
 * that drives the projector, so one person runs the screen in the room and the stream together.
 * A big church's cameras arrive through OBS's Virtual Camera or a capture card, which appear here like any webcam.
 */

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };
const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const chip = 'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50';
const LAYOUTS: { id: StudioLayout; label: string }[] = [{ id: 'solo', label: 'One' }, { id: 'split', label: 'Side by side' }, { id: 'grid', label: 'Grid' }, { id: 'pip', label: 'Corner' }];
const LIVE_RED = '#DC2626';

type SpeechCtor = new () => { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null };

function SourceTile({ source, compositor }: { source: StudioSource; compositor: Compositor }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = source.stream; }, [source.stream]);
  const hasSound = source.stream.getAudioTracks().length > 0;
  return (
    <li className="w-40 shrink-0 rounded-xl border overflow-hidden" style={{ ...card, borderColor: source.onStage ? LIVE_RED : card.borderColor }}>
      <button onClick={() => compositor.setOnStage(source.id, !source.onStage)} aria-pressed={source.onStage} className="relative block w-full aspect-video bg-black" title={source.onStage ? tr('Take off stage') : tr('Bring on stage')}>
        <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />
        <span className="absolute left-1 bottom-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: source.onStage ? LIVE_RED : 'rgba(0,0,0,.65)' }}>{source.onStage ? tr('ON STAGE') : tr('Backstage')}</span>
      </button>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="flex-1 min-w-0 text-xs font-semibold truncate" title={source.label}>{source.label}</span>
        {hasSound && (
          <button onClick={() => compositor.setMuted(source.id, !source.muted)} aria-pressed={source.muted} aria-label={source.muted ? tr('Unmute') : tr('Mute')} className="p-1" style={{ color: source.muted ? LIVE_RED : 'var(--color-text-secondary)' }}>
            {source.muted ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        <button onClick={() => compositor.removeSource(source.id)} aria-label={`${tr('Remove')} ${source.label}`} className="p-1" style={muted}><Trash2 size={14} /></button>
      </div>
    </li>
  );
}

function AddCamera({ compositor, onClose }: { compositor: Compositor; onClose: () => void }) {
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState('');
  const [mic, setMic] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Device names are hidden until the browser has been given permission once
      try { (await navigator.mediaDevices.getUserMedia({ video: true, audio: true })).getTracks().forEach(t => t.stop()); } catch {}
      const all = await navigator.mediaDevices.enumerateDevices();
      setCams(all.filter(d => d.kind === 'videoinput'));
      setMics(all.filter(d => d.kind === 'audioinput'));
    })().catch(() => {});
  }, []);

  const add = async () => {
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: cam ? { exact: cam } : undefined, width: { ideal: 1920 }, height: { ideal: 1080 } },
        // Singing and instruments: the phone-call filters would cut them to pieces
        audio: mic === 'none' ? false : { deviceId: mic ? { exact: mic } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const label = cams.find(c => c.deviceId === cam)?.label || stream.getVideoTracks()[0]?.label || tr('Camera');
      compositor.addSource({ id: `cam-${crypto.randomUUID()}`, label, kind: 'camera', stream });
      onClose();
    } catch (e) {
      showToast((e as Error).name === 'NotAllowedError' ? tr('Please allow the camera in your browser') : tr('That camera could not be opened. Is another app using it?'));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border p-3 space-y-2" style={card}>
      <label className="block text-xs font-semibold">{tr('Camera')}
        <select value={cam} onChange={e => setCam(e.target.value)} className={`${field} mt-1 font-normal`} style={fieldStyle}>
          {cams.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || tr('Camera')}</option>)}
        </select>
      </label>
      <label className="block text-xs font-semibold">{tr('Microphone or sound desk')}
        <select value={mic} onChange={e => setMic(e.target.value)} className={`${field} mt-1 font-normal`} style={fieldStyle}>
          {mics.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || tr('Microphone')}</option>)}
          <option value="none">{tr('No sound from here')}</option>
        </select>
      </label>
      <button onClick={add} disabled={busy} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Add this camera')}</button>
      <details className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <summary className="font-semibold cursor-pointer">{tr('Bigger cameras? Use OBS or a capture card')}</summary>
        <ol className="list-decimal pl-4 mt-1.5 space-y-1">
          <li>{tr('In OBS, set up your cameras as usual and press “Start Virtual Camera”.')}</li>
          <li>{tr('Come back here and choose “OBS Virtual Camera” above. A capture card shows up by its own name.')}</li>
          <li>{tr('Choose your sound desk or USB mixer as the microphone.')}</li>
        </ol>
      </details>
    </div>
  );
}

function InvitePanel({ code }: { code: string }) {
  const link = useCallback((role: 'phone' | 'guest') => `${window.location.origin}/join-studio/${code}?role=${role}`, [code]);
  const phoneQr = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(link('phone'));
    qr.make();
    return qr.createDataURL(5, 2);
  }, [link]);
  const copy = (text: string) => { navigator.clipboard.writeText(text).then(() => showToast(tr('Copied'))).catch(() => {}); };
  return (
    <div className="rounded-2xl border p-3 space-y-3" style={card}>
      <div className="flex gap-3 items-center">
        <img src={phoneQr} alt={tr('Scan with a phone to use it as a camera')} className="w-28 h-28 rounded-lg bg-white" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Smartphone size={15} aria-hidden /> {tr('Phone as a camera')}</p>
          <p className="text-xs" style={muted}>{tr('Scan this with the phone. No app needed.')}</p>
          <button onClick={() => copy(link('phone'))} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}><Copy size={13} aria-hidden /> {tr('Copy link')}</button>
        </div>
      </div>
      <div className="border-t pt-3 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm font-semibold flex items-center gap-1.5"><UserPlus size={15} aria-hidden /> {tr('Invite a guest')}</p>
        <p className="text-xs" style={muted}>{tr('A minister or speaker joins from anywhere with this link, and waits backstage until you bring them on.')}</p>
        <button onClick={() => copy(link('guest'))} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}><Copy size={13} aria-hidden /> {tr('Copy guest link')}</button>
      </div>
    </div>
  );
}

// ── Going live ───────────────────────────────────────────────

interface LiveSession { relay: RelaySession | null; streamId: string | null; startedAt: number }

const toLivePlatform = (p: StreamPlatform): LivePlatform => (p === 'custom' ? 'other' : p);

function GoLiveDialog({ compositor, onClose, onLive, onLost }: { compositor: Compositor; onClose: () => void; onLive: (session: LiveSession) => void; onLost: (reason: string) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [parishId, setParishId] = useState('');
  const [mode, setMode] = useState<'studio' | 'other'>('studio');
  const [targets, setTargets] = useState<StreamTarget[]>(loadTargets);
  const [picked, setPicked] = useState<string[]>(() => loadTargets().map(t => t.id));
  const [adding, setAdding] = useState<StreamPlatform | null>(null);
  const [draft, setDraft] = useState({ server: '', key: '', watchUrl: '' });
  const [links, setLinks] = useState('');
  const [alert, setAlert] = useState(true);
  const [ready, setReady] = useState<boolean | null>(null);
  const [helper, setHelper] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { relayReady().then(setReady); }, []);
  // Notices Connect as soon as it is opened, so nobody has to reload
  useEffect(() => {
    let live = true;
    const look = () => connectRunning().then(found => { if (live) setHelper(found); });
    look();
    const t = setInterval(look, 3000);
    return () => { live = false; clearInterval(t); };
  }, []);
  const canStream = helper || ready === true;
  useEffect(() => {
    if (!user) return;
    myAdminParishes().then(list => {
      const mine = list.filter(m => ['shepherd', 'admin', 'media'].includes(m.role)).map(m => ({ id: m.parish.id, name: m.parish.name }));
      setPages(mine);
      if (mine[0]) setParishId(mine[0].id);
    }).catch(() => {});
  }, [user]);

  const addTarget = () => {
    if (!adding) return;
    const server = adding === 'custom' ? draft.server : PLATFORM_HELP[adding].server;
    if (!draft.key.trim() || !/^rtmps?:\/\//.test(server.trim())) { showToast(tr('Paste the stream key, and the server address if asked')); return; }
    const t: StreamTarget = { id: crypto.randomUUID(), platform: adding, name: tr(PLATFORM_HELP[adding].label), server: server.trim(), key: draft.key.trim(), watchUrl: draft.watchUrl.trim() };
    const next = [...targets, t];
    setTargets(next); saveTargets(next); setPicked(p => [...p, t.id]);
    setAdding(null); setDraft({ server: '', key: '', watchUrl: '' });
  };
  const removeTarget = (id: string) => { const next = targets.filter(t => t.id !== id); setTargets(next); saveTargets(next); setPicked(p => p.filter(x => x !== id)); };

  const go = async () => {
    setBusy(true);
    let relay: RelaySession | null = null;
    try {
      const chosen = targets.filter(t => picked.includes(t.id));
      let destinations: Destination[] = [];
      if (mode === 'studio') {
        if (!chosen.length) throw new Error(tr('Add at least one place to stream to'));
        if (helper) {
          relay = await startConnect(compositor.outputStream(), chosen.map(targetUrl), { onLost: onLost, onProblem: m => showToast(tr(m)) });
        } else {
          if (!user) throw new Error(tr('Sign in to go live'));
          relay = await startRelay(compositor.outputStream(), chosen.map(targetUrl), () => showToast(tr('The connection dropped. Check your internet.')));
        }
        destinations = chosen.filter(t => normalizeHttpsUrl(t.watchUrl)).map(t => ({ platform: toLivePlatform(t.platform), url: normalizeHttpsUrl(t.watchUrl)! }));
      } else {
        for (const line of links.split(/\s+/).filter(Boolean)) {
          const url = normalizeHttpsUrl(line);
          if (!url) throw new Error(trf('{link} is not a valid link', { link: line }));
          destinations.push({ platform: /youtu/.test(url) ? 'youtube' : /facebook|fb\.watch/.test(url) ? 'facebook' : /instagram/.test(url) ? 'instagram' : /tiktok/.test(url) ? 'tiktok' : 'other', url });
        }
      }
      let streamId: string | null = null;
      if (parishId) {
        const saved = await saveLivestream({ parish_id: parishId, title: title.trim() || tr('Live service'), description: null, scheduled_at: new Date().toISOString(), destinations, status: 'live' });
        streamId = saved.id;
        if (alert) await notifyLive(saved.id).catch(() => {});
      }
      onLive({ relay, streamId, startedAt: Date.now() });
    } catch (e) {
      await relay?.stop().catch(() => {});
      showToast(errorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={tr('Go live')}>
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-4" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-[Outfit]">{tr('Go live')}</h2>
          <button onClick={onClose} aria-label={tr('Close')} className="p-1"><X size={20} /></button>
        </div>

        <label className="block text-sm font-semibold">{tr('What is this service called?')}
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={140} placeholder={tr('e.g. Sunday service')} className={`${field} mt-1 font-normal`} style={fieldStyle} />
        </label>

        {pages.length > 0 ? (
          <label className="block text-sm font-semibold">{tr('Show it in Online Church under')}
            <select value={parishId} onChange={e => setParishId(e.target.value)} className={`${field} mt-1 font-normal`} style={fieldStyle}>
              {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="">{tr('Do not list it')}</option>
            </select>
          </label>
        ) : (
          <p className="text-xs" style={muted}>{user ? <>{tr('To appear in Online Church, your parish or ministry needs a page.')}{' '}<Link to="/directory" className="underline">{tr('Add yours')}</Link></> : <><Link to="/signin" className="underline">{tr('Sign in')}</Link>{' '}{tr('to go live and appear in Online Church.')}</>}</p>
        )}

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={tr('How are you streaming?')}>
          {([['studio', 'From this studio'], ['other', 'From OBS or another app']] as const).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className="py-2.5 px-2 rounded-xl border text-sm font-semibold"
                    style={mode === id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : { borderColor: 'var(--color-border)' }}>{tr(label)}</button>
          ))}
        </div>

        {mode === 'studio' ? (
          <div className="space-y-2">
            {helper ? (
              <p className="text-xs rounded-xl p-3 flex items-center gap-2" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}><CheckCircle2 size={15} aria-hidden style={{ color: 'var(--color-success)' }} /> {tr('CelestialWorship Connect is running. You are ready.')}</p>
            ) : ready !== true && (
              <div className="text-xs rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}>
                {isWindowsComputer() ? (
                  <>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('One small free helper is needed, once')}</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>{tr('Download CelestialWorship Connect and unzip it.')}</li>
                      <li>{tr('Open CelestialWorshipConnect.exe. If Windows warns you, choose “More info”, then “Run anyway”.')}</li>
                      <li>{tr('Leave it open. This box will change by itself.')}</li>
                    </ol>
                    <a href={CONNECT_DOWNLOAD} className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold"><Download size={14} aria-hidden /> {tr('Download for Windows')}</a>
                  </>
                ) : <p>{tr('Streaming straight from the studio needs a Windows computer for now. On this one, record here, or stream from OBS and choose the other option.')}</p>}
              </div>
            )}
            {targets.map(t => (
              <label key={t.id} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                <input type="checkbox" checked={picked.includes(t.id)} onChange={e => setPicked(p => (e.target.checked ? [...p, t.id] : p.filter(x => x !== t.id)))} />
                <span className="flex-1 font-semibold">{t.name}</span>
                <span className="text-xs" style={muted}>••••{t.key.slice(-4)}</span>
                <button onClick={e => { e.preventDefault(); removeTarget(t.id); }} aria-label={`${tr('Remove')} ${t.name}`} style={muted}><Trash2 size={14} /></button>
              </label>
            ))}
            {adding ? (
              <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr(PLATFORM_HELP[adding].steps)}{' '}
                  {PLATFORM_HELP[adding].link && <a href={PLATFORM_HELP[adding].link} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">{tr('Open it')} <ExternalLink size={11} /></a>}
                </p>
                {adding === 'custom' && <input value={draft.server} onChange={e => setDraft({ ...draft, server: e.target.value })} placeholder={tr('Server address (rtmp://…)')} className={field} style={fieldStyle} />}
                <input value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} type="password" autoComplete="off" placeholder={tr('Stream key')} className={field} style={fieldStyle} />
                <input value={draft.watchUrl} onChange={e => setDraft({ ...draft, watchUrl: e.target.value })} inputMode="url" placeholder={tr('Your channel or page link, so people can watch (optional)')} className={field} style={fieldStyle} />
                <p className="text-[11px]" style={muted}>{tr('Your key stays on this computer.')}</p>
                <div className="flex gap-2">
                  <button onClick={addTarget} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">{tr('Save')}</button>
                  <button onClick={() => setAdding(null)} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PLATFORM_HELP) as StreamPlatform[]).map(p => (
                  <button key={p} onClick={() => setAdding(p)} className="text-xs font-semibold px-3 py-1.5 rounded-full border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)' }}><Plus size={13} aria-hidden /> {p === 'custom' ? tr('Other') : PLATFORM_HELP[p].label}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <label className="block text-sm font-semibold">{tr('Where can people watch?')}
            <textarea value={links} onChange={e => setLinks(e.target.value)} rows={2} placeholder={tr('Paste your YouTube or Facebook live link')} className={`${field} mt-1 font-normal resize-none`} style={fieldStyle} />
          </label>
        )}

        {parishId && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={alert} onChange={e => setAlert(e.target.checked)} /> {tr('Alert our members and followers')}
          </label>
        )}

        <button onClick={go} disabled={busy || (mode === 'studio' ? !canStream : !parishId)} className="w-full py-3.5 rounded-xl font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: LIVE_RED }}>
          <Radio size={18} aria-hidden /> {busy ? tr('Starting…') : tr('Go live now')}
        </button>
      </div>
    </div>
  );
}

// ── The studio ───────────────────────────────────────────────

export default function GoLive() {
  usePageTitle('live', 'Live Studio');
  const navigate = useNavigate();
  const [compositor] = useState(() => new Compositor());
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [layout, setLayout] = useState<StudioLayout>('solo');
  const [panel, setPanel] = useState<'add' | 'phone' | 'brand' | null>('add');
  const [view, setView] = useState<'studio' | 'words'>('studio');
  const [code] = useState(newRoomCode);
  const [goLive, setGoLive] = useState(false);
  const [live, setLive] = useState<LiveSession | null>(null);
  const [elapsed, setElapsed] = useState('');
  const [wordsOn, setWordsOn] = useState(true);
  const [banner, setBanner] = useState('');
  const [logo, setLogo] = useState<string | null>(savedLogo);
  const [corner, setCorner] = useState<LogoCorner>('top-right');
  const [captions, setCaptions] = useState(false);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [fullUrl, setFullUrl] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const { displayState } = useDisplayReceiver(null);
  const firstWords = useRef(true);

  useEffect(() => {
    compositor.onChange = () => setSources(compositor.sources);
    compositor.canvas.className = 'w-full h-full block';
    compositor.canvas.setAttribute('aria-label', tr('The picture going out'));
    stage.current?.appendChild(compositor.canvas);
    return () => { compositor.destroy(); };
  }, [compositor]);

  useEffect(() => hostRoom(code, compositor, name => showToast(trf('{name} could not connect on that network', { name }))), [code, compositor]);

  // The operator desk's words reach the stream too. What was left on the desk last time is not shown again.
  useEffect(() => {
    if (firstWords.current) { firstWords.current = false; return; }
    compositor.words = displayState;
    if (displayState.type === 'image' || displayState.type === 'video') {
      void compositor.showFull(displayState.imageUrl ?? null, displayState.type).then(() => setFullUrl(compositor.fullShowing)).catch(e => showToast(errorMessage(e)));
    } else if (compositor.fullShowing) {
      void compositor.showFull(null).then(() => setFullUrl(''));
    }
  }, [displayState, compositor]);

  useEffect(() => { compositor.layout = layout; }, [layout, compositor]);
  useEffect(() => { compositor.wordsOn = wordsOn; }, [wordsOn, compositor]);
  useEffect(() => { compositor.banner = banner; }, [banner, compositor]);
  useEffect(() => { compositor.logoCorner = corner; }, [corner, compositor]);
  useEffect(() => { saveLogo(logo && /^https?:/.test(logo) ? logo : null); void compositor.setLogo(logo).catch(() => setLogo(null)); }, [logo, compositor]);

  useEffect(() => {
    const t = setInterval(() => {
      setLevel(compositor.level());
      if (live) {
        const s = Math.floor((Date.now() - live.startedAt) / 1000);
        setElapsed(`${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
      }
    }, 200);
    return () => clearInterval(t);
  }, [compositor, live]);

  // Do not lose a service to a stray click or a sleeping laptop
  useEffect(() => {
    if (!live && !recording) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { window.removeEventListener('beforeunload', warn); void lock?.release(); };
  }, [live, recording]);

  // Live captions, where the browser can do it
  const speech = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  const SpeechApi = speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
  useEffect(() => {
    if (!captions || !SpeechApi) { compositor.caption = ''; return; }
    const rec = new SpeechApi();
    let on = true;
    rec.lang = document.documentElement.lang === 'fr' ? 'fr-FR' : 'en-NG';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => { compositor.caption = e.results[e.results.length - 1][0].transcript; };
    rec.onend = () => { if (on) { try { rec.start(); } catch {} } };
    try { rec.start(); } catch {}
    return () => { on = false; rec.stop(); compositor.caption = ''; };
  }, [captions, SpeechApi, compositor]);

  const shareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      const id = `screen-${crypto.randomUUID()}`;
      compositor.addSource({ id, label: tr('Shared screen'), kind: 'screen', stream });
      stream.getVideoTracks()[0].addEventListener('ended', () => compositor.removeSource(id));
    } catch {}
  };

  const endLive = async () => {
    if (!live) return;
    await live.relay?.stop().catch(() => {});
    if (live.streamId) await setStreamStatus(live.streamId, 'ended').catch(e => showToast(errorMessage(e)));
    setLive(null);
    showToast(tr('The broadcast has ended'));
  };

  // The stream stopped on its own: say so plainly, and end the listing so nobody is sent to an empty service
  const lost = (reason: string) => {
    showToast(tr(reason));
    setLive(current => {
      if (current?.streamId) void setStreamStatus(current.streamId, 'ended').catch(() => {});
      return null;
    });
  };

  const toggleRecord = () => {
    if (recorder.current) { recorder.current.stop(); recorder.current = null; setRecording(false); return; }
    compositor.resumeSound();
    const type = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!type) { showToast(tr('This browser cannot record. Try Chrome or Edge.')); return; }
    const rec = new MediaRecorder(compositor.outputStream(), { mimeType: type, videoBitsPerSecond: 4_000_000 });
    const parts: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(parts, { type }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `service-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };
    rec.start(5000);
    recorder.current = rec;
    setRecording(true);
  };

  const exit = async () => {
    if ((live || recording) && !(await confirmDialog({ title: tr('Leave the studio?'), message: tr('This ends what is going out.'), confirmLabel: tr('Leave') }))) return;
    if (recording) toggleRecord();
    await endLive();
    navigate('/');
  };

  const onStage = sources.filter(s => s.onStage);
  const panelBtn = (id: NonNullable<typeof panel>, label: string, icon: React.ReactNode) => (
    <button onClick={() => setPanel(p => (p === id ? null : id))} aria-pressed={panel === id} className={chip}
            style={panel === id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : card}>{icon} {tr(label)}</button>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <header className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b" style={card}>
        <button onClick={exit} className="text-sm inline-flex items-center gap-1 pr-1" style={{ color: 'var(--color-text-secondary)' }}><ChevronLeft size={16} aria-hidden /> {tr('Exit')}</button>
        <h1 className="font-bold font-[Outfit]">{tr('Live Studio')}</h1>
        <div className="inline-flex rounded-xl p-0.5 border ml-1" style={{ borderColor: 'var(--color-border)' }} role="tablist">
          {([['studio', 'Cameras'], ['words', 'Words & screen']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={view === id ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : { color: 'var(--color-text-secondary)' }}>{tr(label)}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span aria-hidden title={tr('Sound level')} className="hidden sm:block w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <span className="block h-full transition-[width] duration-150" style={{ width: `${Math.round(level * 100)}%`, backgroundColor: level > 0.9 ? LIVE_RED : 'var(--color-success)' }} />
          </span>
          <button onClick={toggleRecord} aria-pressed={recording} className={chip} style={recording ? { color: LIVE_RED, borderColor: LIVE_RED } : card}><Circle size={14} fill={recording ? LIVE_RED : 'none'} aria-hidden /> {recording ? tr('Stop recording') : tr('Record')}</button>
          {live ? (
            <button onClick={endLive} className={`${chip} text-white`} style={{ backgroundColor: LIVE_RED, borderColor: 'transparent' }}><Square size={14} aria-hidden /> {tr('End')} · {elapsed}</button>
          ) : (
            <button onClick={() => { compositor.resumeSound(); setGoLive(true); }} className={`${chip} text-white`} style={{ backgroundColor: LIVE_RED, borderColor: 'transparent' }}><Radio size={15} aria-hidden /> {tr('Go live')}</button>
          )}
        </div>
      </header>

      {/* Kept mounted behind the cameras so the desk's slide and place are not lost when switching */}
      <div className={view === 'words' ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}>
        <Control embedded active={view === 'words'} />
      </div>

      <div className={view === 'studio' ? 'flex-1 grid gap-3 p-3 lg:grid-cols-[1fr_340px] min-h-0' : 'fixed right-3 bottom-3 w-56 z-20 shadow-xl rounded-xl overflow-hidden'}>
        <div className="min-w-0 space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video" ref={stage} style={live ? { outline: `3px solid ${LIVE_RED}` } : undefined}>
            {live && <span className="absolute left-2 top-2 text-[11px] font-bold text-white px-2 py-0.5 rounded z-10" style={{ backgroundColor: LIVE_RED }}>● {tr('LIVE')}</span>}
            {view === 'studio' && onStage.length === 0 && !fullUrl && (
              <p className="absolute inset-0 grid place-items-center text-white/80 text-sm text-center px-6">{sources.length ? tr('Tap a camera below to bring it on stage.') : tr('Add a camera to begin.')}</p>
            )}
          </div>
          {view === 'studio' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold inline-flex items-center gap-1" style={muted}><LayoutIcon size={13} aria-hidden /> {tr('Layout')}</span>
                {LAYOUTS.map(l => (
                  <button key={l.id} onClick={() => setLayout(l.id)} aria-pressed={layout === l.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                          style={layout === l.id ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)', borderColor: 'transparent' } : card}>{tr(l.label)}</button>
                ))}
                <button onClick={() => setWordsOn(w => !w)} aria-pressed={wordsOn} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1" style={card}>
                  {wordsOn ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />} {wordsOn ? tr('Words show on stream') : tr('Words hidden from stream')}
                </button>
              </div>
              {sources.length > 0 && (
                <ul className="flex gap-2 overflow-x-auto pb-1">
                  {sources.map(s => <SourceTile key={s.id} source={s} compositor={compositor} />)}
                </ul>
              )}
            </>
          )}
        </div>

        {view === 'studio' && (
          <aside className="space-y-3 min-w-0">
            <div className="flex flex-wrap gap-2">
              {panelBtn('add', 'Camera', <Camera size={15} aria-hidden />)}
              <button onClick={shareScreen} className={chip} style={card}><MonitorUp size={15} aria-hidden /> {tr('Share a screen')}</button>
              {panelBtn('phone', 'Phone or guest', <Smartphone size={15} aria-hidden />)}
              {panelBtn('brand', 'Logo & media', <ImageIcon size={15} aria-hidden />)}
            </div>
            {panel === 'add' && <AddCamera compositor={compositor} onClose={() => setPanel(null)} />}
            {panel === 'phone' && <InvitePanel code={code} />}
            {panel === 'brand' && (
              <div className="rounded-2xl border p-3 space-y-3" style={card}>
                <label className="block text-xs font-semibold">{tr('A line across the bottom')}
                  <input value={banner} onChange={e => setBanner(e.target.value)} maxLength={120} placeholder={tr('e.g. Welcome to CCC Ketu Parish')} className={`${field} mt-1 font-normal`} style={fieldStyle} />
                </label>
                {logo && (
                  <div className="flex items-center gap-2 text-xs">
                    <img src={logo} alt="" className="h-8 max-w-20 object-contain" />
                    <select value={corner} onChange={e => setCorner(e.target.value as LogoCorner)} aria-label={tr('Logo position')} className="rounded-lg border px-2 py-1" style={fieldStyle}>
                      <option value="top-right">{tr('Top right')}</option>
                      <option value="top-left">{tr('Top left')}</option>
                    </select>
                    <button onClick={() => setLogo(null)} className="ml-auto underline" style={muted}>{tr('Remove logo')}</button>
                  </div>
                )}
                {fullUrl && <button onClick={() => void compositor.showFull(null).then(() => setFullUrl(''))} className="w-full py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: LIVE_RED }}>{tr('Back to the cameras')}</button>}
                <MediaGrid actions={item => (
                  <>
                    {item.kind === 'image' && <button onClick={() => setLogo(item.url)} className="text-[11px] font-semibold px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>{tr('Use as logo')}</button>}
                    <button onClick={() => void compositor.showFull(item.url, item.kind).then(() => setFullUrl(compositor.fullShowing)).catch(e => showToast(errorMessage(e)))} className="text-[11px] font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: 'var(--color-accent-brand)' }}>{tr('Show now')}</button>
                    {item.kind === 'image' && <button onClick={() => void compositor.setBackground(item.url).catch(() => {})} className="text-[11px] font-semibold px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>{tr('Background')}</button>}
                  </>
                )} />
                {SpeechApi && (
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={captions} onChange={e => setCaptions(e.target.checked)} /><Captions size={15} aria-hidden /> {tr('Live captions (English or French)')}</label>
                )}
              </div>
            )}
            {sources.length === 0 && panel !== 'add' && (
              <p className="text-xs rounded-xl p-3 flex gap-2" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}><Music2 size={14} className="shrink-0 mt-0.5" aria-hidden />{tr('Add a camera, choose your words, then press Go live. That is all.')}</p>
            )}
            <p className="text-[11px] flex items-start gap-1.5" style={muted}><Settings2 size={12} className="shrink-0 mt-0.5" aria-hidden />{tr('Use Chrome or Edge on a computer, on a cable or strong Wi-Fi. Keep this window open while you are live.')}</p>
          </aside>
        )}
      </div>

      {goLive && <GoLiveDialog compositor={compositor} onClose={() => setGoLive(false)} onLive={s => { setLive(s); setGoLive(false); showToast(tr('You are live')); }} onLost={lost} />}
    </div>
  );
}
