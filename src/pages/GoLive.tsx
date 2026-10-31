import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import qrcode from 'qrcode-generator';
import {
  ChevronLeft, Download, CheckCircle2, Users, Camera, MonitorUp, Smartphone, UserPlus, Radio, Square, Mic, MicOff, Trash2, Eye, EyeOff, Copy, Circle, Music2, Plus, X, ExternalLink, Layout as LayoutIcon, Image as ImageIcon, Captions, Settings2, Crop, Pause, Play, Activity, BarChart3, Aperture as CameraIcon, BadgeCheck, Type, Palette, AlertTriangle,
} from 'lucide-react';
import { Compositor, type LogoCorner, type StudioShape, type StudioSource } from '../lib/studio/compositor';
import type { StudioLayout } from '../lib/studio/scene';
import { hostRoom } from '../lib/studio/peers';
import { loadTargets, parseTarget, saveTargets, PLATFORM_HELP, relayReady, startRelay, targetUrl, type RelaySession, type StreamPlatform, type StreamTarget } from '../lib/studio/relay';
import { savedLogo, saveLogo } from '../lib/studio/media';
import { useLiveFeedback } from '../lib/studio/reactions';
import { CONNECT_DOWNLOAD, CONNECT_INSTALLER_PUBLISHED, CONNECT_OPEN, CONNECT_SETUP, connectRunning, isWindowsComputer, startConnect, type ConnectStats } from '../lib/studio/connect';
import { uploadNeeded, useStudioAllowance, type StudioAllowance } from '../lib/studio/allowance';
import { StudioRecorder, canSaveAsYouGo, chooseFile, clock, downloadBlob, saveSession, type RecordingResult, type StudioSession } from '../lib/studio/recording';
import { AnalyticsSheet, BackgroundPanel, FrameSheet, LogoPanel, PictureSheet, RecordSheet, SavedRecordingSheet, StreamSheet, SummarySheet } from '../components/StudioSheets';
import { newRoomCode, useDisplayReceiver } from '../hooks/useLiveDisplay';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { myAdminParishes } from '../lib/parishAdmin';
import { notifyLive, saveLivestream, setStreamStatus, type Destination, type LivePlatform } from '../lib/live';
import { normalizeHttpsUrl } from '../utils/safeUrl';
import { MediaGrid } from '../components/StudioMedia';
import { showToast } from '../components/Toast';
import { Sheet, confirmDialog } from '../components/Dialog';
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

type SpeechCtor = new () => { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null; onend: (() => void) | null };

function SourceTile({ source, compositor, onFrame }: { source: StudioSource; compositor: Compositor; onFrame: () => void }) {
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
        <button onClick={onFrame} aria-label={`${tr('Frame')} ${source.label}`} title={tr('Frame')} className="p-1" style={{ color: 'var(--color-text-secondary)' }}><Crop size={14} /></button>
        <button onClick={async () => { if (await confirmDialog({ title: trf('Remove {name}?', { name: source.label }), confirmLabel: tr('Remove'), danger: true })) compositor.removeSource(source.id); }} aria-label={`${tr('Remove')} ${source.label}`} className="p-1" style={muted}><Trash2 size={14} /></button>
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
        // The picture going out is 720p: asking a webcam for more only makes the computer work harder
        video: { deviceId: cam ? { exact: cam } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
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

interface LiveSession { relay: RelaySession | null; streamId: string | null; startedAt: number; title: string; platforms: string[] }

const toLivePlatform = (p: StreamPlatform): LivePlatform => (p === 'custom' ? 'other' : p);

function GoLiveDialog({ compositor, allowance, shape, onShape, stats, onStarting, onClose, onLive, onLost, onReconnecting, onBack }: {
  compositor: Compositor; allowance: StudioAllowance; shape: StudioShape; onShape: (s: StudioShape) => void; stats: React.RefObject<ConnectStats | null>; onStarting: (on: boolean) => void;
  onClose: () => void; onLive: (session: LiveSession) => void; onLost: (reason: string) => void; onReconnecting: () => void; onBack: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [parishId, setParishId] = useState('');
  const [mode, setMode] = useState<'studio' | 'other'>('studio');
  const [targets, setTargets] = useState<StreamTarget[]>(loadTargets);
  const [picked, setPicked] = useState<string[]>(() => loadTargets().map(t => t.id));
  const [adding, setAdding] = useState<StreamPlatform | null>(null);
  const [draft, setDraft] = useState({ name: '', server: '', key: '', watchUrl: '' });
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
    const parsed = parseTarget(PLATFORM_HELP[adding].server || draft.server, draft.key);
    if (!parsed) { showToast(tr('Paste the stream key, and the server address if asked')); return; }
    const label = tr(PLATFORM_HELP[adding].label);
    const same = targets.filter(t => t.platform === adding).length;
    const t: StreamTarget = { id: crypto.randomUUID(), platform: adding, name: draft.name.trim() || (same ? `${label} ${same + 1}` : label), ...parsed, watchUrl: draft.watchUrl.trim() };
    const next = [...targets, t];
    setTargets(next); saveTargets(next);
    setPicked(p => (p.length < allowance.platforms ? [...p, t.id] : p));
    setAdding(null); setDraft({ name: '', server: '', key: '', watchUrl: '' });
  };
  const pick = (id: string, on: boolean) => {
    if (on && picked.length >= allowance.platforms) { showToast(trf('The free plan streams to {n} platforms at once. Upgrade to add more.', { n: allowance.platforms })); return; }
    setPicked(p => (on ? [...p, id] : p.filter(x => x !== id)));
  };
  const chosenNow = targets.filter(t => picked.includes(t.id));
  const wantsTall = chosenNow.some(t => PLATFORM_HELP[t.platform].tall);
  const wantsWide = chosenNow.some(t => !PLATFORM_HELP[t.platform].tall);
  const removeTarget = (id: string) => { const next = targets.filter(t => t.id !== id); setTargets(next); saveTargets(next); setPicked(p => p.filter(x => x !== id)); };

  const go = async () => {
    setBusy(true);
    let relay: RelaySession | null = null;
    try {
      const chosen = chosenNow.slice(0, allowance.platforms);
      let destinations: Destination[] = [];
      if (mode === 'studio') {
        if (!chosen.length) throw new Error(tr('Add at least one place to stream to'));
        const onStageNow = compositor.sources.filter(s => s.onStage);
        if (!onStageNow.length && !compositor.fullShowing) {
          if (!(await confirmDialog({ title: tr('Nothing is on the screen'), message: tr('People would see an empty picture. Go live anyway?'), confirmLabel: tr('Go live anyway') }))) return;
        }
        const heard = compositor.sources.some(s => s.gain && !s.muted);
        if (!heard) {
          if (!(await confirmDialog({ title: tr('There is no sound'), message: tr('No microphone is on, so people would hear nothing. Go live anyway?'), confirmLabel: tr('Go live anyway') }))) return;
        }
        // Every platform is sent the whole stream, so the internet must carry them all at once
        if (chosen.length > 1) {
          const sure = await confirmDialog({
            title: trf('Streaming to {n} platforms at once', { n: chosen.length }),
            message: trf('You need at least {mbps} Mbps of upload speed, and about {gb} GB of data each hour. If your internet is slower, every stream will suffer. Test it at fast.com first (press “Show more info”).', { mbps: uploadNeeded(chosen.length), gb: (chosen.length * 1.35).toFixed(1) }),
            confirmLabel: tr('Go live'),
          });
          if (!sure) return;
        }
        onStarting(true);
        if (helper) {
          relay = await startConnect(compositor.outputStream(), chosen.map(targetUrl), { onLost, onProblem: m => showToast(tr(m)), onStats: s => { stats.current = s; }, onReconnecting, onBack });
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
      onLive({ relay, streamId, startedAt: Date.now(), title: title.trim() || tr('Live service'), platforms: mode === 'studio' ? chosen.map(t => t.name) : destinations.map(d => d.platform) });
    } catch (e) {
      await relay?.stop().catch(() => {});
      showToast(errorMessage(e));
    } finally { setBusy(false); onStarting(false); }
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
                {isWindowsComputer() ? (CONNECT_INSTALLER_PUBLISHED ? (
                  <>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Install our small free helper, once')}</p>
                    <p>{tr('It starts by itself with your computer after that, and you will not see it. If Windows warns you, choose “More info”, then “Run anyway”.')}</p>
                    <div className="flex flex-wrap gap-2">
                      <a href={CONNECT_SETUP} className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold"><Download size={14} aria-hidden /> {tr('Install for Windows')}</a>
                      <a href={CONNECT_OPEN} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold border" style={{ borderColor: 'var(--color-border)' }}>{tr('Already installed? Open it')}</a>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('One small free helper is needed, once')}</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>{tr('Download CelestialWorship Connect and unzip it.')}</li>
                      <li>{tr('Open CelestialWorshipConnect.exe. If Windows warns you, choose “More info”, then “Run anyway”.')}</li>
                      <li>{tr('Leave it open. This box will change by itself.')}</li>
                    </ol>
                    <a href={CONNECT_DOWNLOAD} className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold"><Download size={14} aria-hidden /> {tr('Download for Windows')}</a>
                  </>
                )) : <p>{tr('Streaming straight from the studio needs a Windows computer for now. On this one, record here, or stream from OBS and choose the other option.')}</p>}
              </div>
            )}
            {targets.map(t => (
              <label key={t.id} className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                <input type="checkbox" checked={picked.includes(t.id)} onChange={e => pick(t.id, e.target.checked)} />
                <span className="flex-1 font-semibold">{t.name}</span>
                <span className="text-xs" style={muted}>••••{t.key.slice(-4)}</span>
                <button onClick={async e => { e.preventDefault(); if (await confirmDialog({ title: trf('Remove {name}?', { name: t.name }), message: tr('Its stream key will be forgotten on this computer.'), confirmLabel: tr('Remove'), danger: true })) removeTarget(t.id); }} aria-label={`${tr('Remove')} ${t.name}`} style={muted}><Trash2 size={14} /></button>
              </label>
            ))}
            {adding ? (
              <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr(PLATFORM_HELP[adding].steps)}{' '}
                  {PLATFORM_HELP[adding].link && <a href={PLATFORM_HELP[adding].link} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">{tr('Open it')} <ExternalLink size={11} /></a>}
                </p>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} maxLength={60} placeholder={tr('A name for this account, e.g. Ketu Parish page')} className={field} style={fieldStyle} />
                {!PLATFORM_HELP[adding].server && <input value={draft.server} onChange={e => setDraft({ ...draft, server: e.target.value })} placeholder={tr('Server address (rtmp://…)')} className={field} style={fieldStyle} />}
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
            <p className="text-[11px]" style={muted}>{tr('You can add several accounts of the same platform, such as two Facebook pages. Each needs its own stream key.')}</p>
            {chosenNow.length > 1 && (
              <p className="text-xs rounded-xl p-3 flex gap-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}><AlertTriangle size={15} className="shrink-0" aria-hidden /> {trf('{n} platforms need at least {mbps} Mbps of upload speed.', { n: chosenNow.length, mbps: uploadNeeded(chosenNow.length) })}</p>
            )}
            {wantsTall && shape === 'wide' && (
              <div className="text-xs rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <p>{wantsWide ? tr('TikTok and Instagram show a tall picture, YouTube and Facebook a wide one, and one shape goes to all. Choose the one that matters most today.') : tr('TikTok and Instagram show a tall picture. A wide one appears small, with bars.')}</p>
                <button onClick={() => onShape('tall')} className="font-semibold underline">{tr('Make the picture tall')}</button>
              </div>
            )}
            {wantsWide && shape === 'tall' && (
              <div className="text-xs rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <p>{tr('Your picture is tall. On YouTube, Facebook and X it will have bars at the sides.')}</p>
                <button onClick={() => onShape('wide')} className="font-semibold underline">{tr('Make the picture wide')}</button>
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

/** The sound meter redraws itself, so a moving needle does not redraw the whole page */
function LevelMeter({ compositor }: { compositor: Compositor }) {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const t = setInterval(() => {
      if (!bar.current || document.hidden) return;
      const level = compositor.level();
      bar.current.style.width = `${Math.round(level * 100)}%`;
      bar.current.style.backgroundColor = level > 0.9 ? LIVE_RED : 'var(--color-success)';
    }, 200);
    return () => clearInterval(t);
  }, [compositor]);
  return (
    <span aria-hidden title={tr('Sound level')} className="hidden sm:block w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <span ref={bar} className="block h-full" style={{ width: 0 }} />
    </span>
  );
}

function LiveClock({ startedAt }: { startedAt: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(t); }, []);
  return <>{clock(Date.now() - startedAt)}</>;
}

type Panel = 'add' | 'phone' | 'logo' | 'text' | 'backgrounds' | 'media';

export default function GoLive() {
  usePageTitle('live', 'Live Studio');
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowance = useStudioAllowance(!!user);
  const [compositor] = useState(() => new Compositor());
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [layout, setLayout] = useState<StudioLayout>('solo');
  const [shape, setShape] = useState<StudioShape>('wide');
  const [panel, setPanel] = useState<Panel | null>('add');
  const [view, setView] = useState<'studio' | 'words'>('studio');
  const [code] = useState(newRoomCode);
  const [goLive, setGoLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [live, setLive] = useState<LiveSession | null>(null);
  const [paused, setPaused] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [wordsOn, setWordsOn] = useState(true);
  const [banner, setBanner] = useState('');
  const [logo, setLogo] = useState<string | null>(savedLogo);
  const [logoKind, setLogoKind] = useState<'image' | 'video'>('image');
  const [corner, setCorner] = useState<LogoCorner>('top-right');
  const [captions, setCaptions] = useState(false);
  const [transcriptLength, setTranscriptLength] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingAt, setRecordingAt] = useState(0);
  const [fullUrl, setFullUrl] = useState('');
  const [wordsStyle, setWordsStyle] = useState<'band' | 'full'>('band');
  const [cut, setCut] = useState(false);
  const [person, setPerson] = useState({ name: '', title: '' });
  const [nameOn, setNameOn] = useState(false);
  const [ticker, setTicker] = useState('');
  const [boxText, setBoxText] = useState('');
  const [showReactions, setShowReactions] = useState(true);
  const [sheet, setSheet] = useState<'record' | 'options' | 'stream' | 'analytics' | null>(null);
  const [framing, setFraming] = useState<string | null>(null);
  const [saved, setSaved] = useState<RecordingResult | null>(null);
  const [picture, setPicture] = useState<Blob | null>(null);
  const [summary, setSummary] = useState<StudioSession | null>(null);
  const { viewers, totals } = useLiveFeedback(live?.streamId ?? null, emoji => compositor.addReaction(emoji));
  const stage = useRef<HTMLDivElement>(null);
  const recorder = useRef<StudioRecorder | null>(null);
  const stats = useRef<ConnectStats | null>(null);
  const peak = useRef(0);
  const drops = useRef(0);
  const reactionCount = useRef(0);
  const transcript = useRef<string[]>([]);
  const { displayState } = useDisplayReceiver(null);
  const firstWords = useRef(true);
  const warnedLimit = useRef(false);
  const liveNow = useRef<LiveSession | null>(null);
  liveNow.current = live;

  useEffect(() => {
    compositor.onChange = () => { setSources(compositor.sources); setFullUrl(compositor.fullShowing); };
    compositor.onSourceLost = name => showToast(trf('{name} has stopped. Check that it is still plugged in.', { name }));
    compositor.canvas.className = 'absolute inset-0 w-full h-full object-contain block';
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
      void compositor.showFull(displayState.imageUrl ?? null, displayState.type).catch(e => showToast(errorMessage(e)));
    } else if (compositor.fullShowing) {
      void compositor.showFull(null);
    }
  }, [displayState, compositor]);

  useEffect(() => { compositor.layout = layout; }, [layout, compositor]);
  useEffect(() => { compositor.setShape(shape); }, [shape, compositor]);
  useEffect(() => { compositor.wordsOn = wordsOn; }, [wordsOn, compositor]);
  useEffect(() => { compositor.banner = banner; }, [banner, compositor]);
  useEffect(() => { compositor.wordsStyle = wordsStyle; }, [wordsStyle, compositor]);
  useEffect(() => { compositor.fadeMs = cut ? 0 : 500; }, [cut, compositor]);
  useEffect(() => { compositor.nameCard = nameOn && person.name.trim() ? { name: person.name.trim(), title: person.title.trim() } : null; }, [nameOn, person, compositor]);
  useEffect(() => { compositor.ticker = ticker.trim(); }, [ticker, compositor]);
  useEffect(() => { compositor.card = boxText.trim(); }, [boxText, compositor]);
  useEffect(() => { compositor.showReactions = showReactions; }, [showReactions, compositor]);
  useEffect(() => { compositor.logoCorner = corner; }, [corner, compositor]);
  useEffect(() => { compositor.watermark = allowance.watermark; }, [allowance.watermark, compositor]);
  useEffect(() => { compositor.setPaused(paused, tr('We will be right back')); }, [paused, compositor]);
  useEffect(() => { compositor.setSending(!!live || recording || starting); }, [live, recording, starting, compositor]);
  useEffect(() => {
    saveLogo(logo && /^https?:/.test(logo) ? logo : null);
    void compositor.setLogo(logo, logoKind === 'video' || /\.(mp4|webm)(\?|$)/i.test(logo ?? '') ? 'video' : 'image').catch(() => { showToast(tr('That logo could not be shown')); setLogo(null); });
  }, [logo, logoKind, compositor]);

  useEffect(() => { peak.current = Math.max(peak.current, viewers); }, [viewers]);
  useEffect(() => { reactionCount.current = Object.values(totals).reduce((a, b) => a + b, 0); }, [totals]);

  // Number keys bring a camera on stage, as on a vision mixer
  useEffect(() => {
    if (view !== 'studio') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || document.querySelector('[role="dialog"]')) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const s = compositor.sources[n - 1];
        if (s) compositor.setOnStage(s.id, !s.onStage);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, compositor]);

  // Do not lose a service to a stray click or a sleeping laptop
  useEffect(() => {
    if (!live && !recording) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    let lock: WakeLockSentinel | null = null;
    const hold = () => { if (document.visibilityState === 'visible') navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {}); };
    hold();
    // The browser lets go of it whenever the window is hidden
    document.addEventListener('visibilitychange', hold);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('visibilitychange', hold); void lock?.release(); };
  }, [live, recording]);

  // Live captions, where the browser can do it
  const speech = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  const SpeechApi = speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
  const captionsOn = captions && allowance.transcript;
  useEffect(() => {
    if (!captionsOn || !SpeechApi) { compositor.caption = ''; return; }
    const rec = new SpeechApi();
    let on = true;
    rec.lang = document.documentElement.lang === 'fr' ? 'fr-FR' : 'en-NG';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = e => {
      const last = e.results[e.results.length - 1];
      if (!last) return;
      compositor.caption = last[0]?.transcript ?? '';
      if (last.isFinal && last[0]?.transcript.trim()) { transcript.current.push(last[0].transcript.trim()); setTranscriptLength(transcript.current.length); }
    };
    rec.onend = () => { if (on) { try { rec.start(); } catch {} } };
    try { rec.start(); } catch {}
    return () => { on = false; rec.stop(); compositor.caption = ''; };
  }, [captionsOn, SpeechApi, compositor]);

  const shareScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      compositor.addSource({ id: `screen-${crypto.randomUUID()}`, label: tr('Shared screen'), kind: 'screen', stream, quietWhenLost: true });
    } catch {}
  };

  const finishLive = (session: LiveSession) => {
    const record: StudioSession = { at: session.startedAt, title: session.title, ms: Date.now() - session.startedAt, platforms: session.platforms, peakViewers: peak.current, reactions: reactionCount.current, drops: drops.current };
    saveSession(record);
    setSummary(record);
    setLive(null); setPaused(false); setReconnecting(false);
    stats.current = null;
  };

  const stopLive = async () => {
    if (!live) return;
    const session = live;
    await session.relay?.stop().catch(() => {});
    if (session.streamId) await setStreamStatus(session.streamId, 'ended').catch(e => showToast(errorMessage(e)));
    finishLive(session);
  };

  const askEnd = async () => {
    if (!live) return;
    const yes = await confirmDialog({ title: tr('End the broadcast?'), message: trf('You have been live for {time}. Everyone watching will be disconnected.', { time: clock(Date.now() - live.startedAt) }), confirmLabel: tr('End the broadcast'), danger: true });
    if (yes) await stopLive();
  };

  const askPause = async () => {
    if (paused) {
      if (await confirmDialog({ title: tr('Come back on air?'), message: tr('The cameras and sound return at once.'), confirmLabel: tr('Resume') })) { setPaused(false); recorder.current?.resume(); }
      return;
    }
    const message = live ? tr('Viewers stay connected and see “We will be right back”, with no sound. Any recording pauses too.') : tr('The recording pauses until you resume.');
    if (await confirmDialog({ title: live ? tr('Pause the broadcast?') : tr('Pause the recording?'), message, confirmLabel: tr('Pause') })) { setPaused(true); recorder.current?.pause(); }
  };

  // The stream stopped on its own and could not be brought back: say so plainly, and end the listing so nobody is sent to an empty service
  const lost = (reason: string) => {
    showToast(tr(reason));
    const current = liveNow.current;
    if (!current) return;
    if (current.streamId) void setStreamStatus(current.streamId, 'ended').catch(() => {});
    finishLive(current);
  };

  // The free plan's limit on one stream, once pricing is on
  useEffect(() => {
    if (!live || allowance.hours === Infinity) return;
    warnedLimit.current = false;
    const limit = allowance.hours * 3_600_000;
    const t = setInterval(() => {
      const used = Date.now() - live.startedAt;
      if (used >= limit) { showToast(trf('The free plan streams for up to {hours} hours at a time. Upgrade to stream for longer.', { hours: allowance.hours })); void stopLive(); }
      else if (used >= limit - 600_000 && !warnedLimit.current) { warnedLimit.current = true; showToast(tr('Ten minutes left on the free plan. Upgrade to stream for longer.')); }
    }, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, allowance.hours]);

  const startRecording = async (toDisk: boolean) => {
    setSheet(null);
    compositor.resumeSound();
    try {
      let file = null;
      if (toDisk) { file = await chooseFile(); if (!file) return; }
      setRecording(true);
      recorder.current = await StudioRecorder.start(compositor.outputStream(), file, m => showToast(tr(m)));
      setRecordingAt(Date.now());
    } catch (e) { setRecording(false); showToast(errorMessage(e)); }
  };

  const stopRecording = async () => {
    if (!recorder.current) return;
    const rec = recorder.current;
    recorder.current = null;
    setRecording(false);
    if (!live) setPaused(false);
    setSaved(await rec.stop());
  };

  const askStopRecording = async () => {
    if (await confirmDialog({ title: tr('Stop recording?'), message: tr('You will be able to save it next.'), confirmLabel: tr('Stop recording') })) await stopRecording();
  };

  const takePicture = async () => {
    const blob = await compositor.picture();
    if (blob) setPicture(blob);
  };

  const exit = async () => {
    if ((live || recording) && !(await confirmDialog({ title: tr('Leave the studio?'), message: tr('This ends what is going out.'), confirmLabel: tr('Leave'), danger: true }))) return;
    if (recording) await stopRecording();
    await stopLive();
    navigate('/');
  };

  // The desk is heavy: it only redraws when its own state changes
  const desk = useMemo(() => <Control embedded active={view === 'words'} />, [view]);

  const onStage = sources.filter(s => s.onStage);
  const framingSource = sources.find(s => s.id === framing);
  const sending = !!live || recording;
  const panelBtn = (id: Panel, label: string, icon: React.ReactNode) => (
    <button onClick={() => setPanel(p => (p === id ? null : id))} aria-pressed={panel === id} className={chip}
            style={panel === id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : card}>{icon} {tr(label)}</button>
  );
  const studio = view === 'studio';

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <header className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b shrink-0" style={card}>
        <button onClick={exit} className="text-sm inline-flex items-center gap-1 pr-1" style={{ color: 'var(--color-text-secondary)' }}><ChevronLeft size={16} aria-hidden /> {tr('Exit')}</button>
        <h1 className="font-bold font-[Outfit]">{tr('Live Studio')}</h1>
        <div className="inline-flex rounded-xl p-0.5 border ml-1" style={{ borderColor: 'var(--color-border)' }} role="tablist">
          {([['studio', 'Cameras'], ['words', 'Words & screen']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={view === id ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : { color: 'var(--color-text-secondary)' }}>{tr(label)}</button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <LevelMeter compositor={compositor} />
          <button onClick={() => setSheet('options')} aria-label={tr('Options')} title={tr('Options')} className={chip} style={card}><Settings2 size={15} aria-hidden /></button>
          <button onClick={() => setSheet('analytics')} aria-label={tr('Analytics')} title={tr('Analytics')} className={chip} style={card}><BarChart3 size={15} aria-hidden /></button>
          <button onClick={() => void takePicture()} aria-label={tr('Take a picture')} title={tr('Take a picture')} className={chip} style={card}><CameraIcon size={15} aria-hidden /></button>
          {live && (
            <button onClick={() => setSheet('stream')} className={chip} style={card} title={tr('Your stream')}><Activity size={14} aria-hidden /> <Users size={14} aria-hidden /> {viewers}</button>
          )}
          {sending && <button onClick={() => void askPause()} className={chip} style={card}>{paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />} {paused ? tr('Resume') : tr('Pause')}</button>}
          {recording
            ? <button onClick={() => void askStopRecording()} className={chip} style={{ color: LIVE_RED, borderColor: LIVE_RED }}><Circle size={14} fill={LIVE_RED} aria-hidden /> {tr('Stop recording')} · <LiveClock startedAt={recordingAt || Date.now()} /></button>
            : <button onClick={() => setSheet('record')} className={chip} style={card}><Circle size={14} aria-hidden /> {tr('Record')}</button>}
          {live ? (
            <button onClick={() => void askEnd()} className={`${chip} text-white`} style={{ backgroundColor: LIVE_RED, borderColor: 'transparent' }}><Square size={14} aria-hidden /> {tr('End')} · <LiveClock startedAt={live.startedAt} /></button>
          ) : (
            <button onClick={() => { compositor.resumeSound(); setGoLive(true); }} className={`${chip} text-white`} style={{ backgroundColor: LIVE_RED, borderColor: 'transparent' }}><Radio size={15} aria-hidden /> {tr('Go live')}</button>
          )}
        </div>
      </header>

      {/* Kept mounted behind the cameras so the desk's slide and place are not lost when switching */}
      <div className={studio ? 'hidden' : 'flex-1 min-h-0 flex flex-col'}>{desk}</div>

      <div className={studio ? 'flex-1 grid gap-3 p-3 lg:grid-cols-[1fr_340px] lg:grid-rows-[minmax(0,1fr)] min-h-0 lg:overflow-hidden' : 'fixed right-3 bottom-3 w-56 z-20 shadow-xl rounded-xl overflow-hidden'}>
        {/* The screen stays where it is; only the right-hand column scrolls */}
        <div className={studio ? 'min-w-0 flex flex-col gap-3 lg:min-h-0 lg:h-full' : 'min-w-0'}>
          <div className={`relative rounded-xl overflow-hidden bg-black w-full ${shape === 'tall' ? 'aspect-[9/16] max-h-[70vh]' : 'aspect-video'} ${studio ? 'lg:aspect-auto lg:max-h-none lg:flex-1 lg:min-h-0' : ''}`} ref={stage} style={live ? { outline: `3px solid ${LIVE_RED}` } : undefined}>
            {live && <span className="absolute left-1/2 -translate-x-1/2 top-2 text-[11px] font-bold text-white px-2 py-0.5 rounded z-10" style={{ backgroundColor: LIVE_RED }}>● {reconnecting ? tr('RECONNECTING') : paused ? tr('PAUSED') : tr('LIVE')}</span>}
            {!live && recording && <span className="absolute left-1/2 -translate-x-1/2 top-2 text-[11px] font-bold text-white px-2 py-0.5 rounded z-10" style={{ backgroundColor: LIVE_RED }}>● {paused ? tr('PAUSED') : tr('RECORDING')}</span>}
            {studio && onStage.length === 0 && !fullUrl && (
              <p className="absolute inset-0 grid place-items-center text-white/80 text-sm text-center px-6 z-10">{sources.length ? tr('Tap a camera below to bring it on stage.') : tr('Add a camera to begin.')}</p>
            )}
          </div>
          {studio && (
            <>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-semibold inline-flex items-center gap-1" style={muted}><LayoutIcon size={13} aria-hidden /> {tr('Layout')}</span>
                {LAYOUTS.map(l => (
                  <button key={l.id} onClick={() => setLayout(l.id)} aria-pressed={layout === l.id} className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                          style={layout === l.id ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)', borderColor: 'transparent' } : card}>{tr(l.label)}</button>
                ))}
                <button onClick={() => setWordsStyle(w => (w === 'band' ? 'full' : 'band'))} aria-pressed={wordsStyle === 'full'} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border" style={card}>{wordsStyle === 'band' ? tr('Words over the cameras') : tr('Words fill the screen')}</button>
                <button onClick={() => setWordsOn(w => !w)} aria-pressed={wordsOn} className="px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1" style={card}>
                  {wordsOn ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />} {wordsOn ? tr('Words show on stream') : tr('Words hidden from stream')}
                </button>
              </div>
              {sources.length > 0 && (
                <ul className="flex gap-2 overflow-x-auto pb-1 shrink-0">
                  {sources.map(s => <SourceTile key={s.id} source={s} compositor={compositor} onFrame={() => setFraming(s.id)} />)}
                </ul>
              )}
            </>
          )}
        </div>

        {studio && (
          <aside className="space-y-3 min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
            <div className="flex flex-wrap gap-2">
              {panelBtn('add', 'Camera', <Camera size={15} aria-hidden />)}
              <button onClick={shareScreen} className={chip} style={card}><MonitorUp size={15} aria-hidden /> {tr('Share a screen')}</button>
              {panelBtn('phone', 'Phone or guest', <Smartphone size={15} aria-hidden />)}
              {panelBtn('logo', 'Logo', <BadgeCheck size={15} aria-hidden />)}
              {panelBtn('text', 'On-screen text', <Type size={15} aria-hidden />)}
              {panelBtn('backgrounds', 'Backgrounds', <Palette size={15} aria-hidden />)}
              {panelBtn('media', 'Media', <ImageIcon size={15} aria-hidden />)}
            </div>
            {panel === 'add' && <AddCamera compositor={compositor} onClose={() => setPanel(null)} />}
            {panel === 'phone' && <InvitePanel code={code} />}
            {panel === 'logo' && <LogoPanel logo={logo} corner={corner} watermark={allowance.watermark} onCorner={setCorner} onLogo={item => { setLogoKind(item?.kind ?? 'image'); setLogo(item?.url ?? null); }} />}
            {panel === 'backgrounds' && <BackgroundPanel compositor={compositor} />}
            {panel === 'text' && (
              <div className="rounded-2xl border p-3 space-y-3" style={card}>
                <label className="block text-xs font-semibold">{tr('Scrolling text')}
                  <input value={ticker} onChange={e => setTicker(e.target.value)} maxLength={240} placeholder={tr('e.g. Join us every Wednesday for Mercy Day Service')} className={`${field} mt-1 font-normal`} style={fieldStyle} />
                </label>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">{tr('Name on screen')}</p>
                  <input value={person.name} onChange={e => setPerson({ ...person, name: e.target.value })} maxLength={60} placeholder={tr('e.g. Evangelist A. Bada')} className={field} style={fieldStyle} />
                  <input value={person.title} onChange={e => setPerson({ ...person, title: e.target.value })} maxLength={80} placeholder={tr('e.g. Today’s minister')} className={field} style={fieldStyle} />
                  <button onClick={() => setNameOn(n => !n)} disabled={!person.name.trim()} aria-pressed={nameOn} className={`${chip} w-full`} style={nameOn ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : card}>{nameOn ? tr('Hide the name') : tr('Show the name')}</button>
                </div>
                <label className="block text-xs font-semibold">{tr('A box in the corner')}
                  <textarea value={boxText} onChange={e => setBoxText(e.target.value)} rows={3} maxLength={200} placeholder={tr('e.g. Offering: bank name, account number')} className={`${field} mt-1 font-normal resize-none`} style={fieldStyle} />
                </label>
                <label className="block text-xs font-semibold">{tr('A line across the bottom')}
                  <input value={banner} onChange={e => setBanner(e.target.value)} maxLength={120} placeholder={tr('e.g. Welcome to CCC Ketu Parish')} className={`${field} mt-1 font-normal`} style={fieldStyle} />
                </label>
              </div>
            )}
            {panel === 'media' && (
              <div className="rounded-2xl border p-3 space-y-3" style={card}>
                {fullUrl && <button onClick={() => void compositor.showFull(null)} className="w-full py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: LIVE_RED }}>{tr('Back to the cameras')}</button>}
                <MediaGrid actions={item => (
                  <>
                    <button onClick={() => void compositor.showFull(item.url, item.kind).catch(e => showToast(errorMessage(e)))} className="text-[11px] font-semibold px-2 py-1 rounded-lg text-white" style={{ backgroundColor: 'var(--color-accent-brand)' }}>{tr('Show now')}</button>
                    {item.kind === 'image' && <button onClick={() => void compositor.setBackground(item.url).catch(() => {})} className="text-[11px] font-semibold px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>{tr('Background')}</button>}
                  </>
                )} />
              </div>
            )}
            {sources.length === 0 && panel !== 'add' && (
              <p className="text-xs rounded-xl p-3 flex gap-2" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}><Music2 size={14} className="shrink-0 mt-0.5" aria-hidden />{tr('Add a camera, choose your words, then press Go live. That is all.')}</p>
            )}
            <p className="text-[11px] flex items-start gap-1.5" style={muted}><Settings2 size={12} className="shrink-0 mt-0.5" aria-hidden />{tr('Use Chrome or Edge on a computer, on a cable or strong Wi-Fi. Keep this window open while you are live.')}</p>
          </aside>
        )}
      </div>

      {goLive && <GoLiveDialog compositor={compositor} allowance={allowance} shape={shape} onShape={setShape} stats={stats} onStarting={setStarting} onClose={() => setGoLive(false)}
                               onLive={s => { peak.current = 0; drops.current = 0; setLive(s); setGoLive(false); showToast(tr('You are live')); }} onLost={lost}
                               onReconnecting={() => { drops.current += 1; setReconnecting(true); showToast(tr('The connection dropped. Trying again…')); }} onBack={() => { setReconnecting(false); showToast(tr('You are back on air')); }} />}
      {sheet === 'record' && <RecordSheet canDisk={canSaveAsYouGo()} onChoose={toDisk => void startRecording(toDisk)} onClose={() => setSheet(null)} />}
      {sheet === 'stream' && live && <StreamSheet startedAt={live.startedAt} stats={stats} platforms={live.platforms} viewers={viewers} totals={totals} reconnecting={reconnecting} onClose={() => setSheet(null)} />}
      {sheet === 'analytics' && <AnalyticsSheet allowance={allowance} onClose={() => setSheet(null)} />}
      {sheet === 'options' && (
        <Sheet label={tr('Options')} onClose={() => setSheet(null)}>
          <div className="space-y-4 text-sm">
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold">{tr('Shape of the picture')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {([['wide', 'Wide (YouTube, Facebook, X)'], ['tall', 'Tall (TikTok, Instagram)']] as const).map(([id, label]) => (
                  <button key={id} disabled={sending} onClick={() => setShape(id)} aria-pressed={shape === id} className="py-2 px-2 rounded-xl border text-xs font-semibold disabled:opacity-50"
                          style={shape === id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : { borderColor: 'var(--color-border)' }}>{tr(label)}</button>
                ))}
              </div>
              {sending && <p className="text-[11px]" style={muted}>{tr('The shape can be changed when nothing is going out.')}</p>}
            </fieldset>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!cut} onChange={e => setCut(!e.target.checked)} /> {tr('Fade between pictures')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showReactions} onChange={e => setShowReactions(e.target.checked)} /> {tr('Show reactions from the app on the stream')}</label>
            {SpeechApi && (allowance.transcript ? (
              <label className="flex items-center gap-2"><input type="checkbox" checked={captions} onChange={e => setCaptions(e.target.checked)} /><Captions size={15} aria-hidden /> {tr('Live captions (English or French)')}</label>
            ) : <p className="text-xs" style={muted}>{tr('Upgrade for live captions and a transcript.')}</p>)}
            {transcriptLength > 0 && (
              <button onClick={() => { downloadBlob(new Blob([transcript.current.join('\n')], { type: 'text/plain;charset=utf-8' }), `transcript-${new Date().toISOString().slice(0, 10)}.txt`); }} className={`${chip} w-full`} style={card}><Download size={14} aria-hidden /> {tr('Download the transcript')}</button>
            )}
          </div>
        </Sheet>
      )}
      {framingSource && <FrameSheet source={framingSource} compositor={compositor} onClose={() => setFraming(null)} />}
      {saved && <SavedRecordingSheet result={saved} onClose={() => setSaved(null)} />}
      {picture && <PictureSheet picture={picture} onClose={() => setPicture(null)} />}
      {summary && <SummarySheet session={summary} allowance={allowance} onClose={() => setSummary(null)} />}
    </div>
  );
}
