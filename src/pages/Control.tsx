import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Music, BookOpen, Megaphone, MonitorPlay, Search, ChevronLeft, ChevronRight, EyeOff, Image as ImageIcon, Wifi, WifiOff, ListOrdered, History as HistoryIcon, Send } from 'lucide-react';
import { useDisplayController, loadOperatorQueue, clearOperatorQueue, newRoomCode } from '../hooks/useLiveDisplay';
import { useHymnSearch, useHymns } from '../hooks/useHymns';
import { useBible } from '../hooks/useBible';
import { BIBLE_BOOKS, resolveBookName } from '../data/bibleBooks';
import type { DisplayState, Hymn } from '../types';
import { buildSlides, displayTitle } from '../utils/hymnText';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { tr } from '../i18n';

/**
 * The projector operator. Inspired by presentation software used in churches:
 * sources on the left, the item's slides in the middle, LIVE and NEXT monitors on the right.
 * Keys: → / Space / PageDown next · ← / PageUp previous · B black · L logo · 1–9 jump to a slide.
 */

type Source = 'hymns' | 'bible' | 'notices';
type Lang = 'yo' | 'both' | 'en';
interface Slide { label: string; state: DisplayState }

const btn = 'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const panel = 'rounded-2xl border bg-[var(--color-bg-card)] border-[var(--color-border)]';

/** What the projector shows, drawn small — the same layout as the Display page */
function Monitor({ state, label, live }: { state: DisplayState | null; label: string; live?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[11px] font-bold tracking-widest uppercase ${live ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>{live && '● '}{label}</span>
        {state && state.type !== 'blank' && state.type !== 'logo' && <span className="text-[11px] text-[var(--color-text-muted)] truncate ml-2">{tr(state.title)}</span>}
      </div>
      <div className={`relative aspect-video rounded-xl overflow-hidden bg-black text-white flex flex-col items-center justify-center p-4 text-center ${live ? 'ring-2 ring-red-500' : 'ring-1 ring-[var(--color-border)]'}`}>
        {!state || state.type === 'blank' ? <span className="text-xs text-white/70">{state ? tr('Black screen') : tr('Nothing next')}</span>
          : state.type === 'logo' ? <img src="/logo.png" alt={tr('Logo')} className="w-1/4 opacity-90" />
          : (
            <>
              {state.title && <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8C36A] mb-1.5 line-clamp-1">{tr(state.title)}</span>}
              <span className="text-[13px] leading-snug whitespace-pre-line line-clamp-6 font-medium">{state.content}</span>
              {state.type === 'hymn' && state.totalVerses ? <span className="absolute bottom-1.5 right-2.5 text-[9px] text-white/70">{state.verseIndex}/{state.totalVerses}</span> : null}
            </>
          )}
      </div>
    </div>
  );
}

// ── Hymns ────────────────────────────────────────────────────

function hymnSlides(hymn: Hymn, lang: Lang, repeatChorus: boolean): Slide[] {
  const slides = buildSlides(hymn, repeatChorus);
  return slides.map((s, i) => {
    const yo = s.verse.yorubaLines.join('\n'), en = s.verse.englishLines.join('\n');
    const content = lang === 'yo' ? (yo || en) : lang === 'en' ? (en || yo) : [yo, en].filter(Boolean).join('\n\n');
    return {
      label: s.label,
      state: { type: 'hymn', hymnNumber: hymn.number, title: `${hymn.number} · ${displayTitle(hymn, lang === 'en' ? 'en' : 'yo')}`, content, verseIndex: i + 1, totalVerses: slides.length },
    };
  });
}

function HymnSource({ onPick, current }: { onPick: (h: Hymn) => void; current: number | null }) {
  const [search, setSearch] = useState('');
  const { results = [] } = useHymnSearch(search, []);
  const { hymns } = useHymns();
  const [queue, setQueue] = useState(loadOperatorQueue);
  const row = (h: Hymn, sub?: string) => (
    <button key={`${h.number}-${sub ?? ''}`} onClick={() => onPick(h)}
            className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl ${current === h.number ? 'bg-[var(--color-accent-brand)] text-[var(--color-text-on-accent)]' : 'hover:bg-[var(--color-bg-secondary)]'}`}>
      <span className="w-10 text-center font-bold tabular-nums">{h.number}</span>
      <span className="flex-1 min-w-0">
        {sub && <span className="block text-[11px] opacity-70">{sub}</span>}
        <span className="block text-sm font-semibold truncate">{displayTitle(h, 'yo')}</span>
      </span>
    </button>
  );
  return (
    <div className="flex flex-col min-h-0 h-full">
      <label className="relative block mb-2">
        <span className="sr-only">{tr('Find a hymn')}</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('Number or words')} inputMode="search"
               className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm border outline-none bg-[var(--color-bg-primary)] border-[var(--color-border)]" />
      </label>
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-0.5">
        {search
          ? results.slice(0, 30).map(h => row(h))
          : queue && queue.items.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-muted)] flex items-center gap-1"><ListOrdered size={13} /> {queue.serviceName}</span>
                <button onClick={() => { clearOperatorQueue(); setQueue(null); }} className="text-[11px] text-[var(--color-text-muted)] hover:text-red-600">{tr('Clear')}</button>
              </div>
              {queue.items.map((item, i) => { const h = hymns.find(x => x.number === item.hymnNumber); return h ? <React.Fragment key={i}>{row(h, item.slotName)}</React.Fragment> : null; })}
            </>
          ) : <p className="text-sm text-[var(--color-text-muted)] p-3">{tr('Type a hymn number or words. Plan a service in “Plan hymns” and its hymns line up here.')}</p>}
      </div>
    </div>
  );
}

// ── Bible ────────────────────────────────────────────────────

function BibleSource({ book, chapter, lang, onChange }: { book: string; chapter: number; lang: 'en' | 'yo'; onChange: (b: string, c: number, l: 'en' | 'yo') => void }) {
  const [ref, setRef] = useState('');
  const info = BIBLE_BOOKS.find(b => b.name === book) ?? BIBLE_BOOKS[0];
  const jump = (e: React.FormEvent) => {
    e.preventDefault();
    const m = ref.match(/^(\d?\s*[a-zA-Z\s]+)\s+(\d+)/);
    const resolved = m && resolveBookName(m[1].trim());
    if (resolved) { onChange(resolved, Number(m![2]), lang); setRef(''); }
  };
  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <form onSubmit={jump}>
        <label className="sr-only" htmlFor="op-ref">{tr('Go to a passage')}</label>
        <input id="op-ref" value={ref} onChange={e => setRef(e.target.value)} placeholder={tr('Go to, e.g. John 3')}
               className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none bg-[var(--color-bg-primary)] border-[var(--color-border)]" />
      </form>
      <div className="flex gap-1">
        {([['en', 'KJV'], ['yo', 'Yorùbá']] as const).map(([l, t]) => (
          <button key={l} onClick={() => onChange(book, chapter, l)} aria-pressed={lang === l}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${lang === l ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>{t}</button>
        ))}
      </div>
      <select value={book} onChange={e => onChange(e.target.value, 1, lang)} aria-label={tr('Book')} className="rounded-xl px-3 py-2 text-sm border bg-[var(--color-bg-primary)] border-[var(--color-border)]">
        {BIBLE_BOOKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
      </select>
      <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-1 content-start">
        {Array.from({ length: info.chapters }, (_, i) => i + 1).map(c => (
          <button key={c} onClick={() => onChange(book, c, lang)} aria-pressed={chapter === c}
                  className={`py-2 rounded-lg text-sm font-semibold tabular-nums ${chapter === c ? 'bg-[var(--color-accent-brand)] text-[var(--color-text-on-accent)]' : 'bg-[var(--color-bg-secondary)]'}`}>{c}</button>
        ))}
      </div>
    </div>
  );
}

// ── Notices ──────────────────────────────────────────────────

const PRESETS: [string, string][] = [
  ['Welcome', 'Welcome to the Celestial Church of Christ!\nWe are glad you are here.'],
  ['Tithes & offering', 'Please prepare your tithes and offering.'],
  ['Silence', 'Let us keep silence before the Lord.'],
  ['Closing', 'Thank you for worshipping with us.\nHave a blessed week.'],
];

function NoticeSource({ onSend }: { onSend: (s: DisplayState) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(([t, c]) => <button key={t} onClick={() => { setTitle(t); setContent(c); }} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-bg-secondary)]">{t}</button>)}
      </div>
      <label className="text-xs text-[var(--color-text-muted)]">{tr('Title')}<input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm border outline-none bg-[var(--color-bg-primary)] border-[var(--color-border)]" />
      </label>
      <label className="text-xs text-[var(--color-text-muted)]">{tr('Message')}<textarea value={content} onChange={e => setContent(e.target.value)} rows={5} className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm border outline-none resize-none bg-[var(--color-bg-primary)] border-[var(--color-border)]" />
      </label>
      <button disabled={!title.trim() && !content.trim()} onClick={() => onSend({ type: 'announcement', title: title.trim(), content: content.trim() })}
              className={`${btn} py-2.5 bg-[var(--color-accent-brand)] text-[var(--color-text-on-accent)]`}><Send size={15} />{' '}{tr('Show')}</button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function Control() {
  usePageView('operator');
  usePageTitle('control', 'Operator');
  const { sendToDisplay, room, setRoom, remoteConnected } = useDisplayController();
  const { hymns } = useHymns();

  const [source, setSource] = useState<Source>('hymns');
  const [live, setLive] = useState<DisplayState>({ type: 'blank', content: '' });
  const [history, setHistory] = useState<{ at: Date; state: DisplayState }[]>([]);

  // Hymn being presented
  const [hymnNo, setHymnNo] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>('yo');
  const [repeatChorus, setRepeatChorus] = useState(true);
  // Bible being presented
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [bibleLang, setBibleLang] = useState<'en' | 'yo'>('en');
  const [picked, setPicked] = useState<number[]>([]);
  const { data: chapterData, loading: bibleLoading } = useBible(book, chapter, bibleLang);
  const [mode, setMode] = useState<'hymn' | 'bible'>('hymn');

  const hymn = hymns.find(h => h.number === hymnNo) ?? null;

  const slides: Slide[] = useMemo(() => {
    if (mode === 'hymn') return hymn ? hymnSlides(hymn, lang, repeatChorus) : [];
    if (!chapterData) return [];
    return Object.entries(chapterData.verses).map(([v, text]) => ({
      label: v, state: { type: 'verse', title: `${book} ${chapter}:${v}${bibleLang === 'yo' ? ' (Yorùbá)' : ' (KJV)'}`, content: text },
    }));
  }, [mode, hymn, lang, repeatChorus, chapterData, book, chapter, bibleLang]);

  const sameAsLive = useCallback((s: DisplayState) => s.type === live.type && s.title === live.title && s.content === live.content, [live]);
  const liveIndex = slides.findIndex(s => sameAsLive(s.state));
  const nextSlide = slides[liveIndex + 1] ?? (liveIndex === -1 ? slides[0] : undefined);

  const go = useCallback((state: DisplayState) => {
    sendToDisplay(state);
    setLive(state);
    setHistory(h => [{ at: new Date(), state }, ...h.filter(x => !(x.state.title === state.title && x.state.content === state.content))].slice(0, 12));
  }, [sendToDisplay]);

  const next = useCallback(() => { if (nextSlide) go(nextSlide.state); }, [nextSlide, go]);
  const prev = useCallback(() => { if (liveIndex > 0) go(slides[liveIndex - 1].state); }, [liveIndex, slides, go]);
  const black = useCallback(() => go({ type: 'blank', content: '' }), [go]);
  const logo = useCallback(() => go({ type: 'logo', content: '' }), [go]);

  // Several verses together
  const sendPicked = () => {
    if (!chapterData || !picked.length) return;
    const nums = [...picked].sort((a, b) => a - b);
    const text = nums.map(n => `${n} ${chapterData.verses[String(n)]}`).join('\n');
    const range = nums.length > 1 && nums[nums.length - 1] - nums[0] === nums.length - 1 ? `${nums[0]}-${nums[nums.length - 1]}` : nums.join(',');
    go({ type: 'verse', title: `${book} ${chapter}:${range}${bibleLang === 'yo' ? ' (Yorùbá)' : ' (KJV)'}`, content: text });
    setPicked([]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key.toLowerCase() === 'b') black();
      else if (e.key.toLowerCase() === 'l') logo();
      else if (/^[1-9]$/.test(e.key) && slides[Number(e.key) - 1]) go(slides[Number(e.key) - 1].state);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, black, logo, go, slides]);

  const openScreen = () => window.open(room ? `/display?room=${room}` : '/display', 'celestialworship-display', 'width=1920,height=1080');
  const sourceTabs: [Source, string, React.ReactNode][] = [['hymns', 'Hymns', <Music size={16} />], ['bible', 'Bible', <BookOpen size={16} />], ['notices', 'Notices', <Megaphone size={16} />]];
  const itemTitle = mode === 'hymn' ? (hymn ? `${hymn.number} · ${displayTitle(hymn, lang === 'en' ? 'en' : 'yo')}` : null) : `${book} ${chapter}`;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Bar */}
      <header className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <Link to="/" className="text-sm text-[var(--color-text-secondary)] inline-flex items-center gap-1 pr-2"><ChevronLeft size={16} />{' '}{tr('Exit')}</Link>
        <h1 className="font-bold font-[Outfit] flex items-center gap-2"><MonitorPlay size={18} className="text-[var(--color-accent-brand)]" />{' '}{tr('Operator')}</h1>
        <div className="ml-auto flex items-center gap-2 text-xs">
          {room ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${remoteConnected ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`} title={`Open ${window.location.host}/display?room=${room} on the screen device`}>
              {remoteConnected ? <Wifi size={14} /> : <WifiOff size={14} />}{' '}{tr('Screen code')}{' '}<b className="tracking-widest text-[var(--color-text-primary)]">{room}</b>
              <button onClick={() => setRoom(null)} className="ml-1 underline">{tr('stop')}</button>
            </span>
          ) : (
            <button onClick={() => setRoom(newRoomCode())} className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)]">{tr('Use another device as the screen')}</button>
          )}
          <button onClick={openScreen} className={`${btn} px-3 py-1.5 bg-[var(--color-accent-brand)] text-[var(--color-text-on-accent)] text-sm`}><MonitorPlay size={15} />{' '}{tr('Open screen')}</button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid gap-3 p-3 lg:grid-cols-[300px_1fr_340px]">
        {/* Sources */}
        <aside className={`${panel} p-3 flex flex-col min-h-[320px] lg:min-h-0 order-2 lg:order-1`}>
          <div className="flex gap-1 mb-3" role="tablist">
            {sourceTabs.map(([id, label, icon]) => (
              <button key={id} role="tab" aria-selected={source === id} onClick={() => setSource(id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${source === id ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'}`}>{icon}{label}</button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            {source === 'hymns' && <HymnSource current={mode === 'hymn' ? hymnNo : null} onPick={h => { setHymnNo(h.number); setMode('hymn'); }} />}
            {source === 'bible' && <BibleSource book={book} chapter={chapter} lang={bibleLang} onChange={(b, c, l) => { setBook(b); setChapter(c); setBibleLang(l); setPicked([]); setMode('bible'); }} />}
            {source === 'notices' && <NoticeSource onSend={go} />}
          </div>
        </aside>

        {/* Slides */}
        <main className={`${panel} p-3 flex flex-col min-h-[360px] lg:min-h-0 order-3 lg:order-2`}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-bold text-lg flex-1 min-w-0 truncate">{itemTitle ?? tr('Choose a hymn or a passage')}</h2>
            {mode === 'hymn' && hymn && (
              <>
                <div className="inline-flex rounded-lg p-0.5 border border-[var(--color-border)]" role="group" aria-label={tr('Language on screen')}>
                  {([['yo', 'Yorùbá'], ['both', 'Both'], ['en', 'English']] as const).map(([v, t]) => (
                    <button key={v} onClick={() => setLang(v)} aria-pressed={lang === v} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${lang === v ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'text-[var(--color-text-secondary)]'}`}>{t}</button>
                  ))}
                </div>
                <label className="text-xs inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                  <input type="checkbox" checked={repeatChorus} onChange={e => setRepeatChorus(e.target.checked)} />{' '}{tr('Chorus after each verse')}</label>
              </>
            )}
            {mode === 'bible' && picked.length > 0 && (
              <button onClick={sendPicked} className={`${btn} px-3 py-1.5 text-sm bg-[var(--color-accent-brand)] text-[var(--color-text-on-accent)]`}><Send size={14} />{' '}{tr('Show')}{' '}{picked.length}{' '}{tr('verses')}</button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {mode === 'bible' && bibleLoading ? <p className="text-sm text-[var(--color-text-muted)] p-4 animate-pulse">{tr('Loading…')}</p>
              : slides.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] p-4">{tr('Pick a hymn, a Bible chapter or a notice on the left. Click a slide to put it on the screen.')}</p>
              : (
                <ol className={`grid gap-2 ${mode === 'hymn' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {slides.map((s, i) => {
                    const isLive = i === liveIndex;
                    const isNext = nextSlide === s;
                    const verse = Number(s.label);
                    return (
                      <li key={`${s.label}-${i}`} className="relative">
                        <button onClick={() => go(s.state)} aria-current={isLive || undefined}
                                className={`w-full h-full flex flex-col text-left rounded-xl border-2 p-3 ${isLive ? 'border-red-500 bg-red-500/5' : isNext ? 'border-[var(--color-accent-brand)]/60' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}>
                          <span className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span className={isLive ? 'text-red-600' : 'text-[var(--color-text-muted)]'}>{mode === 'hymn' ? `${i < 9 ? `${i + 1} · ` : ''}${s.label}` : `Verse ${s.label}`}</span>
                            {isLive ? <span className="text-red-600">{tr('LIVE')}</span> : isNext ? <span className="text-[var(--color-accent-brand)]">{tr('NEXT')}</span> : null}
                          </span>
                          <span className={`block whitespace-pre-line text-sm leading-relaxed ${mode === 'hymn' ? 'line-clamp-6' : ''}`}>{s.state.content}</span>
                        </button>
                        {mode === 'bible' && (
                          <label className="absolute top-2.5 right-3 text-[11px] inline-flex items-center gap-1 text-[var(--color-text-muted)]" title={tr('Select to show several verses together')}>
                            <input type="checkbox" aria-label={`Select verse ${s.label}`} checked={picked.includes(verse)} onChange={e => setPicked(p => (e.target.checked ? [...p, verse] : p.filter(x => x !== verse)))} />
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
          </div>
        </main>

        {/* Monitors and controls */}
        <aside className="flex flex-col gap-3 order-1 lg:order-3 min-h-0">
          <div className={`${panel} p-3 space-y-3`}>
            <Monitor state={live} label={tr('Live')} live />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={prev} disabled={liveIndex <= 0} className={`${btn} py-3 bg-[var(--color-bg-secondary)]`}><ChevronLeft size={18} />{' '}{tr('Prev')}</button>
              <button onClick={next} disabled={!nextSlide} className={`${btn} py-3 bg-[var(--color-accent-brand)] text-[var(--color-text-on-accent)]`}>{tr('Next')}{' '}<ChevronRight size={18} /></button>
              <button onClick={black} className={`${btn} py-2.5 ${live.type === 'blank' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-secondary)]'}`} title="B"><EyeOff size={16} />{' '}{tr('Black')}</button>
              <button onClick={logo} className={`${btn} py-2.5 ${live.type === 'logo' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-secondary)]'}`} title="L"><ImageIcon size={16} />{' '}{tr('Logo')}</button>
            </div>
            <Monitor state={nextSlide?.state ?? null} label={tr('Next')} />
            <p className="text-[11px] text-[var(--color-text-muted)]">{tr('Keys: → Space next · ← previous · 1–9 slide · B black · L logo. Clickers work too.')}</p>
          </div>
          <div className={`${panel} p-3 flex-1 min-h-0 overflow-y-auto hidden lg:block`}>
            <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-muted)] mb-2 flex items-center gap-1"><HistoryIcon size={13} />{' '}{tr('Shown')}</p>
            {history.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">{tr('Nothing yet.')}</p> : (
              <ul className="space-y-1">
                {history.map((h, i) => (
                  <li key={i}>
                    <button onClick={() => go(h.state)} className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] flex gap-2">
                      <span className="text-[var(--color-text-muted)] tabular-nums">{h.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="truncate">{h.state.type === 'blank' ? tr('Black') : h.state.type === 'logo' ? tr('Logo') : h.state.title || h.state.content.slice(0, 40)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
