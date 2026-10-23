import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, BookOpen, Type } from 'lucide-react';
import { useReader, TEXT_SIZES, type ReaderSettings } from '../hooks/useReader';
import { useSwipe } from '../hooks/useSwipe';
import { Sheet } from './Dialog';

/**
 * Kindle-style reading for the Bible, hymns and devotion: a full-screen monochrome page,
 * book typography, tap the edges to turn a screen, tap the middle for controls.
 */

const PAGES = {
  paper: { bg: '#F4F1EA', text: '#1B1B1B', muted: '#6B6B6B', rule: '#D6D1C4' },
  night: { bg: '#0D0D0D', text: '#CFCFCF', muted: '#8A8A8A', rule: '#2E2E2E' },
} as const;

const MARGINS = { narrow: '34rem', normal: '30rem', wide: '25rem' } as const;

let fontRequested = false;
/** Literata (an open book face, OFL) is fetched only when someone first reads in serif */
function useBookFont(font: ReaderSettings['font']) {
  useEffect(() => {
    if (font !== 'serif' || fontRequested) return;
    fontRequested = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap';
    document.head.appendChild(link);
  }, [font]);
}

export const SERIF = "Literata, Georgia, 'Times New Roman', serif";
export const SANS = "Inter, system-ui, sans-serif";

/** Style for reading text on the normal (coloured) page, following the reader's size and font */
export function useReadingStyle(): CSSProperties {
  const { settings } = useReader();
  useBookFont(settings.font);
  return {
    fontSize: `${settings.size}px`,
    lineHeight: settings.leading,
    fontFamily: settings.font === 'serif' ? SERIF : SANS,
    textAlign: settings.justify ? 'justify' : undefined,
    hyphens: settings.justify ? 'auto' : undefined,
  };
}

// ── The "Aa" menu ────────────────────────────────────────────

function Segmented<T extends string | number | boolean>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: ReactNode; aria?: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <div className="flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={label}>
        {options.map(o => (
          <button key={String(o.value)} onClick={() => onChange(o.value)} aria-pressed={value === o.value} aria-label={o.aria}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={value === o.value ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : { color: 'var(--color-text-secondary)' }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReaderSettingsSheet({ onClose, wakeLock }: { onClose: () => void; wakeLock?: WakeLockControl }) {
  const { settings, update } = useReader();
  const sizeIndex = Math.max(0, TEXT_SIZES.indexOf(settings.size));
  return (
    <Sheet label="Reading settings" title="Aa  Reading" onClose={onClose}>
      <div className="space-y-4">
        <Segmented label="Page" value={settings.page} onChange={page => update({ page })}
                   options={[{ value: 'normal', label: 'Colour' }, { value: 'paper', label: 'Paper' }, { value: 'night', label: 'Night' }]} />
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Text size</p>
          <div className="flex items-center gap-3">
            <button onClick={() => update({ size: TEXT_SIZES[Math.max(0, sizeIndex - 1)] })} aria-label="Smaller text" className="w-10 h-10 rounded-xl border text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>A</button>
            <input type="range" min={0} max={TEXT_SIZES.length - 1} step={1} value={sizeIndex} aria-label="Text size"
                   onChange={e => update({ size: TEXT_SIZES[Number(e.target.value)] })} className="flex-1 accent-current" style={{ color: 'var(--color-text-primary)' }} />
            <button onClick={() => update({ size: TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, sizeIndex + 1)] })} aria-label="Larger text" className="w-10 h-10 rounded-xl border text-xl font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>A</button>
          </div>
        </div>
        <Segmented label="Typeface" value={settings.font} onChange={font => update({ font })}
                   options={[{ value: 'serif', label: <span style={{ fontFamily: SERIF }}>Book</span> }, { value: 'sans', label: <span style={{ fontFamily: SANS }}>Clean</span> }]} />
        <Segmented<ReaderSettings['leading']> label="Line spacing" value={settings.leading} onChange={leading => update({ leading })}
                   options={[{ value: 1.5, label: 'Tight' }, { value: 1.75, label: 'Normal' }, { value: 2, label: 'Loose' }]} />
        <Segmented<ReaderSettings['margin']> label="Margins" value={settings.margin} onChange={margin => update({ margin })}
                   options={[{ value: 'narrow', label: 'Narrow' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }]} />
        <Segmented label="Alignment" value={settings.justify} onChange={justify => update({ justify })}
                   options={[{ value: false, label: 'Left' }, { value: true, label: 'Justified' }]} />
        {wakeLock?.supported && (
          <label className="flex items-center justify-between text-sm py-1" style={{ color: 'var(--color-text-primary)' }}>
            Keep the screen on while reading
            <input type="checkbox" checked={wakeLock.active} onChange={wakeLock.toggle} className="w-5 h-5" />
          </label>
        )}
      </div>
    </Sheet>
  );
}

export interface WakeLockControl { supported: boolean; active: boolean; toggle: () => void }

/** The two buttons every reading page shows: "Aa" and "Read" */
export function ReaderButtons({ wakeLock }: { wakeLock?: WakeLockControl }) {
  const { setReading } = useReader();
  const [open, setOpen] = useState(false);
  const cls = 'h-9 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-semibold';
  const style = { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' };
  return (
    <>
      <button onClick={() => setOpen(true)} className={cls} style={style} aria-label="Reading settings"><Type size={16} /></button>
      <button onClick={() => setReading(true)} className={cls} style={style} aria-label="Reading mode"><BookOpen size={16} /> <span className="hidden sm:inline">Read</span></button>
      {open && <ReaderSettingsSheet onClose={() => setOpen(false)} wakeLock={wakeLock} />}
    </>
  );
}

// ── The full-screen page ─────────────────────────────────────

export function ReaderFrame({ title, place, children, prev, next, wakeLock, onLeave, pageKey }: {
  title: string;
  /** Changes when the content changes (defaults to the title), to start again at the top */
  pageKey?: string | number;
  /** e.g. "Chapter 3 of 50", "Step 4 of 12" */
  place?: string;
  children: ReactNode;
  prev?: { label: string; go: () => void };
  next?: { label: string; go: () => void };
  wakeLock?: WakeLockControl;
  onLeave?: () => void;
}) {
  const { settings, setReading } = useReader();
  const pal = PAGES[settings.page === 'night' ? 'night' : 'paper'];
  const scroller = useRef<HTMLDivElement>(null);
  const [chrome, setChrome] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  useBookFont(settings.font);

  const leave = () => { setReading(false); onLeave?.(); };

  // Controls fade after a moment, like an e-reader
  useEffect(() => {
    if (!chrome || settingsOpen) return;
    const t = setTimeout(() => setChrome(false), 3500);
    return () => clearTimeout(t);
  }, [chrome, settingsOpen]);

  // A new chapter starts at the top
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setProgress(0); }, [title, pageKey]);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);

  const turn = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    const atStart = el.scrollTop <= 4;
    if (dir === 1 && atEnd) { next?.go(); return; }
    if (dir === -1 && atStart) { prev?.go(); return; }
    el.scrollBy({ top: dir * (el.clientHeight - 48) });
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (settingsOpen) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); turn(1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); turn(-1); }
      else if (e.key === 'Escape') leave();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const swipe = useSwipe({ onSwipeLeft: () => next?.go(), onSwipeRight: () => prev?.go() });

  const onTap = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('a, button, input, select, textarea, [role=button]')) return;
    if (window.getSelection()?.toString()) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.25) turn(-1);
    else if (x > 0.75) turn(1);
    else setChrome(c => !c);
  };

  const vars = {
    '--color-bg-primary': pal.bg, '--color-bg-secondary': pal.bg, '--color-bg-card': pal.bg, '--color-bg-card-hover': pal.bg,
    '--color-text-primary': pal.text, '--color-text-secondary': pal.text, '--color-text-muted': pal.muted,
    '--color-accent-brand': pal.text, '--color-accent-gold': pal.muted, '--color-accent-blue': pal.text,
    '--color-border': pal.rule, '--color-text-on-accent': pal.bg,
    backgroundColor: pal.bg, color: pal.text,
  } as CSSProperties;

  const bar = 'absolute left-0 right-0 flex items-center gap-2 px-3 transition-opacity duration-200';
  const barBtn = 'h-10 min-w-10 px-2 inline-flex items-center justify-center rounded-lg text-sm';

  return createPortal(
    <div className="fixed inset-0 z-[60] reader-frame" data-reader-page={settings.page} style={vars} role="document" aria-label={`Reading: ${title}`} {...swipe}>
      {/* Tap zones mirror the arrow / Page keys handled on window above */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div ref={scroller} onClick={onTap}
           onScroll={e => { const el = e.currentTarget; setProgress(el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 1); }}
           className="h-full overflow-y-auto overscroll-contain"
           style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))', paddingBottom: '4.5rem' }}>
        <div className="mx-auto px-6" style={{ maxWidth: MARGINS[settings.margin] }}>
          <h1 className={`text-center ${place ? "mb-1" : "mb-8"}`} style={{ fontFamily: SERIF, fontSize: `${Math.round(settings.size * 1.25)}px`, fontWeight: 600 }}>{title}</h1>
          {place && <p className="text-center text-xs uppercase tracking-[0.2em] mb-8" style={{ color: pal.muted }}>{place}</p>}
          <div className="reader-body" style={{
            fontFamily: settings.font === 'serif' ? SERIF : SANS, fontSize: `${settings.size}px`, lineHeight: settings.leading,
            textAlign: settings.justify ? 'justify' : 'left', hyphens: settings.justify ? 'auto' : 'manual',
          }}>
            {children}
          </div>
          {next && (
            <button onClick={next.go} className="block mx-auto mt-12 mb-4 px-5 py-2.5 text-sm border rounded-full" style={{ borderColor: pal.rule, color: pal.text }}>
              {next.label} ›
            </button>
          )}
        </div>
      </div>

      {/* Top bar */}
      <div className={`${bar} top-0 pt-[env(safe-area-inset-top)] h-14`} style={{ backgroundColor: pal.bg, borderBottom: `1px solid ${pal.rule}`, opacity: chrome ? 1 : 0, pointerEvents: chrome ? 'auto' : 'none' }}>
        <button onClick={leave} className={barBtn} aria-label="Leave reading mode"><X size={20} /></button>
        <p className="flex-1 text-center text-sm truncate" style={{ fontFamily: SERIF }}>{title}</p>
        <button onClick={() => setSettingsOpen(true)} className={barBtn} aria-label="Reading settings"><Type size={18} /></button>
      </div>

      {/* Bottom bar: where you are, and the previous/next chapter */}
      <div className={`${bar} bottom-0 h-14 pb-[env(safe-area-inset-bottom)]`} style={{ backgroundColor: pal.bg, borderTop: chrome ? `1px solid ${pal.rule}` : 'none' }}>
        <button onClick={prev?.go} disabled={!prev} className={`${barBtn} disabled:opacity-20`} aria-label={prev ? prev.label : 'No previous'} style={{ opacity: chrome ? 1 : 0, pointerEvents: chrome ? 'auto' : 'none' }}><ChevronLeft size={20} /></button>
        <p className="flex-1 text-center text-[11px] tracking-wide" style={{ color: pal.muted }} aria-live="off">
          {place ? `${place} · ` : ''}{Math.round(progress * 100)}%
        </p>
        <button onClick={next?.go} disabled={!next} className={`${barBtn} disabled:opacity-20`} aria-label={next ? next.label : 'No next'} style={{ opacity: chrome ? 1 : 0, pointerEvents: chrome ? 'auto' : 'none' }}><ChevronRight size={20} /></button>
      </div>

      {settingsOpen && <ReaderSettingsSheet onClose={() => setSettingsOpen(false)} wakeLock={wakeLock} />}
    </div>,
    document.body,
  );
}
