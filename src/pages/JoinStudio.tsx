import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, SwitchCamera, Video, LogOut } from 'lucide-react';
import { joinRoom, type GuestRole, type GuestStatus } from '../lib/studio/peers';
import { usePageTitle } from '../hooks/usePageTitle';
import { tr } from '../i18n';

/** Where a phone or a guest joins the studio from a link: no account, no app, one button */
export default function JoinStudio() {
  usePageTitle('live', 'Join the studio');
  const { code = '' } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const role: GuestRole = params.get('role') === 'phone' ? 'phone' : 'guest';
  const [name, setName] = useState(role === 'phone' ? tr('Phone camera') : '');
  const [facing, setFacing] = useState<'user' | 'environment'>(role === 'phone' ? 'environment' : 'user');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [problem, setProblem] = useState('');
  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [micOn, setMicOn] = useState(true);
  const preview = useRef<HTMLVideoElement>(null);
  const back = useRef<HTMLAudioElement>(null);
  const session = useRef<ReturnType<typeof joinRoom> | null>(null);
  const id = useRef(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: role === 'guest' })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(old => { old?.getTracks().forEach(t => t.stop()); return s; });
        void session.current?.replaceVideo(s.getVideoTracks()[0]);
        setProblem('');
      })
      .catch(() => setProblem(tr('Please allow the camera in your browser, then reload this page.')));
    return () => { cancelled = true; };
  }, [facing, role]);

  useEffect(() => { if (preview.current && stream) preview.current.srcObject = stream; }, [stream]);

  // A phone that sleeps stops filming
  useEffect(() => {
    if (!status) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { void lock?.release(); };
  }, [status]);

  useEffect(() => () => { session.current?.leave(); }, []);

  const join = () => {
    if (!stream) return;
    setStatus('connecting');
    session.current = joinRoom(code, { id: id.current, name: name.trim() || tr('Guest'), role }, stream, setStatus, s => {
      if (back.current) { back.current.srcObject = s; void back.current.play().catch(() => {}); }
    });
  };
  const leave = () => { session.current?.leave(); session.current = null; setStatus(null); };
  const toggleMic = () => { stream?.getAudioTracks().forEach(t => { t.enabled = !micOn; }); setMicOn(!micOn); };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 gap-4" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <h1 className="text-xl font-bold font-[Outfit] text-center">{role === 'phone' ? tr('Use this phone as a camera') : tr('Join the service as a guest')}</h1>
      <div className="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden bg-black">
        <video ref={preview} autoPlay muted playsInline className="w-full h-full object-cover" />
        {problem && <p className="absolute inset-0 grid place-items-center text-sm text-white text-center p-6">{problem}</p>}
      </div>
      <audio ref={back} autoPlay><track kind="captions" /></audio>

      <div className="flex gap-2">
        <button onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))} aria-label={tr('Switch camera')} className="p-3 rounded-full border" style={{ borderColor: 'var(--color-border)' }}><SwitchCamera size={20} /></button>
        {role === 'guest' && <button onClick={toggleMic} aria-pressed={!micOn} aria-label={micOn ? tr('Mute') : tr('Unmute')} className="p-3 rounded-full border" style={{ borderColor: 'var(--color-border)' }}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</button>}
      </div>

      {!status ? (
        <div className="w-full max-w-md space-y-3">
          <label className="block text-sm font-semibold">{tr('Your name')}
            <input value={name} onChange={e => setName(e.target.value)} maxLength={40} className="mt-1 w-full rounded-xl px-3 py-3 border outline-none font-normal"
                   style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          </label>
          <button onClick={join} disabled={!stream} className="btn-primary w-full py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"><Video size={18} aria-hidden /> {tr('Join')}</button>
          {role === 'phone' && <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>{tr('Turn the phone sideways, keep it plugged in, and rest it somewhere steady.')}</p>}
        </div>
      ) : (
        <div className="w-full max-w-md text-center space-y-3" aria-live="polite">
          {status === 'connecting' && <p className="font-semibold animate-pulse">{tr('Waiting for the studio to open…')}</p>}
          {status === 'backstage' && <p className="font-semibold" style={{ color: 'var(--color-success)' }}>{tr('You are connected. The host will bring you on.')}</p>}
          {status === 'failed' && <p className="font-semibold" style={{ color: 'var(--color-warning)' }}>{tr('This network would not connect. Try mobile data or another Wi-Fi.')}</p>}
          <button onClick={leave} className="px-4 py-2 rounded-xl border text-sm font-semibold inline-flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}><LogOut size={15} aria-hidden /> {tr('Leave')}</button>
        </div>
      )}
    </div>
  );
}
