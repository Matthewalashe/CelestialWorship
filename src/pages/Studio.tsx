import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorPlay, Radio, Square, Bell, Tv, EyeOff, Image as ImageIcon, Music2, BookOpen, Plus, X, ExternalLink } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useServices } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { useAuth } from '../hooks/useAuth';
import { useDisplayController, newRoomCode } from '../hooks/useLiveDisplay';
import { getServiceScheduleForDate, toISODate } from '../utils/dateUtils';
import { planHymns } from '../utils/hymnMatcher';
import { displayTitle, stanzaLabel } from '../utils/hymnText';
import { referenceToPath } from '../utils/parseReference';
import { myAdminParishes } from '../lib/parishAdmin';
import { listLivestreams, setStreamStatus, notifyLive, isStreamLive, shareMessage, streamLink, type Livestream } from '../lib/live';
import { hasPlan } from '../lib/plan';
import { ShareRow } from '../components/ShareRow';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import type { Hymn } from '../types';
import type { Parish } from '../hooks/useParishes';
import { tr } from '../i18n';
import { useHymnContext } from '../hooks/useHymnContext';

/**
 * Studio, the desktop workspace for media teams, livestreamers and choirs:
 * the order of service on the left, the hymn on the screen in the middle (one click or arrow key
 * per stanza), and the parish's broadcast on the right.
 */

type Lang = 'yo' | 'en' | 'both';
const panel = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const SETLIST_KEY = 'cw-studio-setlist';

function stanzaText(h: Hymn, i: number, lang: Lang) {
  const v = h.verses[i];
  const yo = v.yorubaLines.join('\n'), en = v.englishLines.join('\n');
  return lang === 'yo' ? (yo || en) : lang === 'en' ? (en || yo) : [yo, en].filter(Boolean).join('\n\n');
}

export default function Studio() {
  usePageTitle('studio', 'Studio');
  const { services } = useServices();
  const { hymns } = useHymns();
  const { lessons } = useTodaysLessons();
  const display = useDisplayController();
  const today = useMemo(() => new Date(), []);
  const schedule = getServiceScheduleForDate(today);
  const [serviceId, setServiceId] = useState<string>(() => schedule[0]?.id ?? 'lords_day_service');
  const service = services.find(s => s.id === serviceId) ?? null;

  // Order of service with the matcher's hymn for each slot
  const hymnContext = useHymnContext(toISODate(today), serviceId);
  const plan = useMemo(() => {
    if (!service || !hymns.length) return [];
    return planHymns(service, hymns, hymnContext);
  }, [service, hymns, hymnContext]);

  // A setlist the choir adds to by number
  const [setlist, setSetlist] = useState<number[]>(() => { try { return JSON.parse(localStorage.getItem(SETLIST_KEY) || '[]'); } catch { return []; } });
  const saveSetlist = (l: number[]) => { setSetlist(l); try { localStorage.setItem(SETLIST_KEY, JSON.stringify(l)); } catch {} };
  const [addNumber, setAddNumber] = useState('');

  const [hymnNo, setHymnNo] = useState<number | null>(null);
  const hymn = hymns.find(h => h.number === hymnNo) ?? null;
  const [lang, setLang] = useState<Lang>('yo');
  const [solfa, setSolfa] = useState(false);
  const [live, setLive] = useState<number | null>(null); // stanza on screen

  const project = useCallback((i: number) => {
    if (!hymn) return;
    display.showHymnVerse(displayTitle(hymn, lang === 'en' ? 'en' : 'yo'), stanzaText(hymn, i, lang), hymn.number, i + 1, hymn.verses.length);
    setLive(i);
  }, [hymn, lang, display]);

  // Arrow keys move through the stanzas; B blanks the screen
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (!hymn) return;
      if (['ArrowDown', 'ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); project(Math.min(hymn.verses.length - 1, (live ?? -1) + 1)); }
      else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); project(Math.max(0, (live ?? 1) - 1)); }
      else if (e.key.toLowerCase() === 'b') { display.blankScreen(); setLive(null); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [hymn, live, project, display]);

  const openHymn = (n: number) => { setHymnNo(n); setLive(null); };
  const readings = (service?.steps ?? []).flatMap(s => s.scriptureReferences?.length ? s.scriptureReferences : s.scriptureRef ? [s.scriptureRef] : []);
  const todaysReadings = lessons.flatMap(l => [l.firstLesson, l.secondLesson]).filter(Boolean);

  const openScreen = () => window.open(display.room ? `/display?room=${display.room}` : '/display', 'celestialworship-display', 'width=1920,height=1080');

  return (
    <>
    <div className="lg:hidden px-4 py-10 text-center space-y-3">
      <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Studio is made for a computer')}</p>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('On a phone or tablet, use the operator to put hymns and verses on the screen.')}</p>
      <Link to="/control" className="btn-primary inline-block px-5 py-2 rounded-xl text-sm font-semibold">{tr('Open the operator')}</Link>
    </div>
    <div className="hidden lg:flex flex-col h-[calc(100vh-1rem)] p-4 gap-3">
      {/* Bar */}
      <div className="flex items-center gap-2 rounded-2xl border px-4 py-2.5" style={panel}>
        <MonitorPlay size={20} style={{ color: 'var(--color-accent-brand)' }} />
        <h1 className="font-bold font-[Outfit] mr-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Studio')}</h1>
        <select value={serviceId} onChange={e => setServiceId(e.target.value)} aria-label={tr('Service')} className="rounded-lg px-2 py-1.5 text-sm border"
                style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          {services.map(s => <option key={s.id} value={s.id}>{tr(s.displayName)}{schedule.some(x => x.id === s.id) ? tr(' (today)') : ''}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { display.blankScreen(); setLive(null); }} className="h-9 px-3 rounded-lg text-sm inline-flex items-center gap-1.5 border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} title={tr('Blank screen (B)')}><EyeOff size={15} />{' '}{tr('Blank')}</button>
          <button onClick={() => { display.showLogo(); setLive(null); }} className="h-9 px-3 rounded-lg text-sm inline-flex items-center gap-1.5 border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><ImageIcon size={15} />{' '}{tr('Logo')}</button>
          <button onClick={openScreen} className="h-9 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}><Tv size={15} />{' '}{tr('Open screen')}</button>
          {display.room ? (
            <span className="text-xs px-2" style={{ color: display.remoteConnected ? 'var(--color-success)' : 'var(--color-text-muted)' }} title={tr('Open /display on another device with this code')}>{tr('Screen code')}{' '}<b className="tracking-widest">{display.room}</b>
            </span>
          ) : (
            <button onClick={() => display.setRoom(newRoomCode())} className="text-xs px-2 underline" style={{ color: 'var(--color-text-secondary)' }}>{tr('Use another device as the screen')}</button>
          )}
          <Link to="/control" className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('Full operator')}{' '}<ExternalLink size={12} /></Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr_340px] gap-3">
        {/* Order of service + setlist */}
        <aside className="rounded-2xl border overflow-y-auto p-3 space-y-4" style={panel}>
          <section>
            <h2 className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Order of service')}</h2>
            {!plan.length && <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>}
            <ul className="space-y-1">
              {plan.map(p => {
                const n = p.slot.fixedHymnNumber ?? p.selected?.hymnNumber;
                return (
                  <li key={p.stepNumber + p.slotName}>
                    <button disabled={!n} onClick={() => n && openHymn(n)} className="w-full text-left rounded-lg px-2.5 py-2 text-sm disabled:opacity-50"
                            style={{ backgroundColor: n === hymnNo ? 'var(--color-bg-primary)' : 'transparent', color: 'var(--color-text-primary)' }}>
                      <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{p.stepNumber}. {p.slotName}{p.slot.fixedHymnNumber ? tr(' · prescribed') : ''}</span>
                      {n ? <span className="font-semibold">{n} · {displayTitle(hymns.find(h => h.number === n)!, 'yo')}</span> : tr('Choose a hymn')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {(readings.length > 0 || todaysReadings.length > 0) && (
            <section>
              <h2 className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Readings')}</h2>
              <ul className="space-y-1">
                {[...todaysReadings, ...readings].map((r, i) => (
                  <li key={`${r!.raw}-${i}`}>
                    <Link to={referenceToPath(r!)} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      <BookOpen size={14} style={{ color: 'var(--color-text-muted)' }} /> {r!.raw}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] mt-1 px-2.5" style={{ color: 'var(--color-text-muted)' }}>{tr('Select verses there and choose Display.')}</p>
            </section>
          )}

          <section>
            <h2 className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Choir setlist')}</h2>
            <form onSubmit={e => { e.preventDefault(); const n = Number(addNumber); if (hymns.some(h => h.number === n) && !setlist.includes(n)) saveSetlist([...setlist, n]); setAddNumber(''); }} className="flex gap-1 mb-2">
              <input value={addNumber} onChange={e => setAddNumber(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={tr('Hymn number')} aria-label={tr('Add a hymn by number')}
                     className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-sm border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <button type="submit" aria-label={tr('Add')} className="px-2.5 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}><Plus size={16} /></button>
            </form>
            <ul className="space-y-1">
              {setlist.map(n => (
                <li key={n} className="flex items-center gap-1">
                  <button onClick={() => openHymn(n)} className="flex-1 text-left rounded-lg px-2.5 py-1.5 text-sm truncate" style={{ backgroundColor: n === hymnNo ? 'var(--color-bg-primary)' : 'transparent', color: 'var(--color-text-primary)' }}>
                    {n} · {hymns.find(h => h.number === n) ? displayTitle(hymns.find(h => h.number === n)!, 'yo') : ''}
                  </button>
                  <button onClick={() => saveSetlist(setlist.filter(x => x !== n))} aria-label={`Remove hymn ${n}`} className="p-1" style={{ color: 'var(--color-text-muted)' }}><X size={14} /></button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* Preview: one click per stanza */}
        <main className="rounded-2xl border overflow-y-auto p-5" style={panel}>
          {!hymn ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
              <Music2 size={36} />
              <p>{tr('Choose a hymn from the order of service or the setlist.')}</p>
              <p className="text-xs">{tr('Click a stanza to put it on the screen · ↑ ↓ to move · B to blank')}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold font-[Outfit] flex-1" style={{ color: 'var(--color-text-primary)' }}>{hymn.number}. {displayTitle(hymn, lang === 'en' ? 'en' : 'yo')}</h2>
                <div className="inline-flex rounded-lg p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={tr('Language')}>
                  {([['yo', 'Yorùbá'], ['both', 'Both'], ['en', 'English']] as const).map(([v, t]) => (
                    <button key={v} onClick={() => setLang(v)} aria-pressed={lang === v} className="px-2.5 py-1 rounded-md text-xs font-semibold"
                            style={lang === v ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : { color: 'var(--color-text-secondary)' }}>{t}</button>
                  ))}
                </div>
                {hymn.solfaNotation && (
                  <button onClick={() => setSolfa(s => !s)} aria-pressed={solfa} className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                          style={{ borderColor: 'var(--color-border)', color: solfa ? 'var(--color-accent-brand)' : 'var(--color-text-secondary)' }}>{tr('Sol-fa')}</button>
                )}
                <Link to={`/hymns/${hymn.number}`} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tr('Open hymn')}</Link>
              </div>
              {solfa && hymn.solfaNotation && (
                <pre className="mb-4 p-3 rounded-xl text-sm font-mono whitespace-pre-wrap" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>{hymn.solfaNotation}</pre>
              )}
              <ol className="grid grid-cols-2 gap-3">
                {hymn.verses.map((v, i) => (
                  <li key={i}>
                    <button onClick={() => project(i)} aria-pressed={live === i} className="w-full text-left rounded-xl border-2 p-3 h-full"
                            style={{ borderColor: live === i ? '#EF4444' : 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}>
                      <span className="flex items-center justify-between text-[11px] font-semibold mb-1.5" style={{ color: live === i ? '#EF4444' : 'var(--color-text-muted)' }}>
                        {stanzaLabel(v)} {live === i && <span>{tr('ON SCREEN')}</span>}
                      </span>
                      <span className="block whitespace-pre-line text-[15px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{stanzaText(hymn, i, lang)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </main>

        {/* Broadcast */}
        <aside className="rounded-2xl border overflow-y-auto p-3" style={panel}>
          <LivePanel />
        </aside>
      </div>
    </div>
    </>
  );
}

function LivePanel() {
  const { user } = useAuth();
  const [pages, setPages] = useState<{ parish: Parish; role: string }[]>([]);
  const [parishId, setParishId] = useState('');
  const [plan, setPlan] = useState<boolean | null>(null);
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    myAdminParishes().then(list => {
      const teams = list.filter(m => ['shepherd', 'admin', 'media'].includes(m.role));
      setPages(teams);
      if (teams[0]) setParishId(p => p || teams[0].parish.id);
    }).catch(() => {});
  }, [user]);

  const load = useCallback(() => {
    if (!parishId) return;
    hasPlan(parishId).then(setPlan);
    listLivestreams({ parishId, limit: 20 }).then(r => setStreams(r ?? [])).catch(() => {});
  }, [parishId]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const h = (text: string) => <h2 className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{text}</h2>;
  if (!user) return <>{h('Live')}<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}><Link to="/signin" className="underline">{tr('Sign in')}</Link>{' '}{tr('to run your parish’s livestream.')}</p></>;
  if (!pages.length) return <>{h('Live')}<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Livestream controls appear here for a parish’s shepherd, administrators and media team.')}</p></>;

  const parish = pages.find(p => p.parish.id === parishId)?.parish;
  const liveNow = streams.find(isStreamLive);
  const next = streams.filter(s => s.status === 'scheduled').sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))[0];
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); load(); } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); } };

  return (
    <div className="space-y-4">
      <div>
        {h('Live')}
        {pages.length > 1 && (
          <select value={parishId} onChange={e => setParishId(e.target.value)} aria-label={tr('Parish')} className="w-full rounded-lg px-2 py-1.5 text-sm border mb-2"
                  style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            {pages.map(p => <option key={p.parish.id} value={p.parish.id}>{p.parish.name}</option>)}
          </select>
        )}
        {plan === false && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Livestreaming is part of the Partner plan.')}{' '}<Link to={`/parish-admin?parish=${parishId}&tab=plan`} className="underline">{tr('See the plan')}</Link></p>}
      </div>

      {plan && liveNow && (
        <div className="rounded-xl border-2 p-3 space-y-2" style={{ borderColor: '#EF4444' }}>
          <p className="text-xs font-bold flex items-center gap-1" style={{ color: '#EF4444' }}><Radio size={14} />{' '}{tr('LIVE ·')}{' '}{liveNow.started_at ? `since ${new Date(liveNow.started_at).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}` : ''}</p>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr(liveNow.title)}</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => run(() => setStreamStatus(liveNow.id, 'ended'))} className="px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}><Square size={13} />{' '}{tr('End')}</button>
            {!liveNow.notified_at && <button disabled={busy} onClick={() => run(async () => { const n = await notifyLive(liveNow.id); showToast(`${n} alerted`); })} className="px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1 border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Bell size={13} />{' '}{tr('Alert')}</button>}
          </div>
          <ShareRow text={shareMessage(parish?.name ?? '', liveNow)} url={streamLink(liveNow.id)} />
        </div>
      )}

      {plan && !liveNow && next && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Next ·')}{' '}{next.scheduled_at ? new Date(next.scheduled_at).toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</p>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr(next.title)}</p>
          <button disabled={busy} onClick={() => run(async () => { await setStreamStatus(next.id, 'live'); try { const n = await notifyLive(next.id); showToast(`Live: ${n} alerted`); } catch { showToast(tr('Live. Alerts could not be sent.')); } })}
                  className="w-full py-2 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1.5" style={{ backgroundColor: '#EF4444', color: '#fff' }}><Radio size={15} />{' '}{tr('Go live')}</button>
          <ShareRow text={shareMessage(parish?.name ?? '', next)} url={streamLink(next.id)} />
        </div>
      )}

      {plan && (
        <Link to={`/parish-admin?parish=${parishId}&tab=live`} className="block text-sm font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
          {liveNow || next ? tr('All broadcasts and channels') : tr('Schedule or start a broadcast')} ›
        </Link>
      )}
    </div>
  );
}
