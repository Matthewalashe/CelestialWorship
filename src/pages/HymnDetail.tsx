import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useHymn } from '../hooks/useHymns';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import type { Hymn, HymnVerse } from '../types';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { useReaderMode } from '../hooks/useReaderMode';
import { useWakeLock } from '../hooks/useWakeLock';
import { useSwipe } from '../hooks/useSwipe';
import { useFavoriteHymns, recordHymnView } from '../hooks/useFavorites';
import { displayTitle, stanzaLabel, type HymnLanguage } from '../utils/hymnText';
import { showToast } from '../components/Toast';
import { BookOpen, Moon, X, Tv, Share2, Music2, MonitorSmartphone, Heart, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

type LyricsView = 'yo' | 'both' | 'en';

const VIEW_KEY = 'cw-hymn-view';
const FONT_KEY = 'cw-hymn-font';
const FONT_MIN = 16;
const FONT_MAX = 30;

function readStored<T extends string | number>(key: string, fallback: T, valid: (v: string) => boolean): T {
  try {
    const value = localStorage.getItem(key);
    if (value !== null && valid(value)) return (typeof fallback === 'number' ? Number(value) : value) as T;
  } catch {}
  return fallback;
}

function store(key: string, value: string | number) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

/** Clean solfa notation — remove unnecessary spaces around colons */
function cleanSolfa(solfa: string): string {
  return solfa
    .replace(/\s*:\s*/g, ':')
    .replace(/:(\S)/g, ': $1')
    .replace(/:$/gm, '')
    .trim();
}

/** Split a trailing "Amin"/"Amen" off the final line so it can be set on its own */
function splitAmen(lines: string[]): { lines: string[]; amen: string | null } {
  if (lines.length === 0) return { lines, amen: null };
  const last = lines[lines.length - 1];
  const match = last.match(/^(.*?)[\s,.;]*\b(Amin|Amen)\.?$/i);
  if (!match) return { lines, amen: null };
  const rest = match[1].trim();
  return {
    lines: rest ? [...lines.slice(0, -1), rest] : lines.slice(0, -1),
    amen: match[2][0].toUpperCase() + match[2].slice(1).toLowerCase(),
  };
}

function StanzaLines({ lines, lang, muted, chorus }: { lines: string[]; lang: HymnLanguage; muted?: boolean; chorus?: boolean }) {
  return (
    <div lang={lang} className="space-y-1">
      {lines.map((line, i) => (
        // Hanging indent: a line that wraps on a narrow screen continues indented
        <p
          key={i}
          className={`pl-6 -indent-6 ${chorus ? 'italic' : ''}`}
          style={{ color: muted ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

function Stanza({
  verse, view, isLast, onDisplay,
}: {
  verse: HymnVerse;
  view: LyricsView;
  isLast: boolean;
  onDisplay: () => void;
}) {
  const chorus = verse.kind === 'chorus';
  const yo = isLast ? splitAmen(verse.yorubaLines) : { lines: verse.yorubaLines, amen: null };
  const en = isLast ? splitAmen(verse.englishLines) : { lines: verse.englishLines, amen: null };
  const showYo = view !== 'en' && yo.lines.length > 0;
  const showEn = view !== 'yo' && en.lines.length > 0;
  // A stanza missing in the chosen language falls back to the other one
  const fallbackYo = view === 'en' && !showEn && yo.lines.length > 0;
  const fallbackEn = view === 'yo' && !showYo && en.lines.length > 0;
  const amen = (showYo || fallbackYo ? yo.amen : null) || (showEn || fallbackEn ? en.amen : null);

  return (
    <section
      className="group relative grid grid-cols-[2.25rem_1fr] gap-x-2"
      aria-label={stanzaLabel(verse)}
    >
      {/* Gutter: verse number, or a chorus marker */}
      <div className="pt-[0.2em] text-right select-none">
        {chorus ? (
          <span className="text-[0.6em] font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-gold)' }}>
            {view === 'en' ? 'Cho.' : 'Ègbè'}
          </span>
        ) : (
          <span className="font-[Outfit] font-bold text-[0.8em]" style={{ color: 'var(--color-accent-brand)' }}>
            {verse.number}
          </span>
        )}
      </div>

      <div
        className={chorus ? 'pl-4 border-l-2' : ''}
        style={chorus ? { borderColor: 'color-mix(in srgb, var(--color-accent-gold) 50%, transparent)' } : undefined}
      >
        {verse.repeat ? (
          <p className="text-[0.75em] italic" style={{ color: 'var(--color-text-muted)' }}>Repeat chorus</p>
        ) : (
          <div className={view === 'both' && showYo && showEn ? 'grid gap-3 md:grid-cols-2 md:gap-8' : ''}>
            {(showYo || fallbackYo) && <StanzaLines lines={yo.lines} lang="yo" chorus={chorus} />}
            {(showEn || fallbackEn) && (
              <div className={view === 'both' && showYo ? 'text-[0.9em] md:text-[1em]' : ''}>
                <StanzaLines lines={en.lines} lang="en" chorus={chorus} muted={view === 'both' && showYo} />
              </div>
            )}
          </div>
        )}
        {amen && (
          <p className="mt-2 pl-6 text-[0.8em] font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--color-accent-gold)' }}>
            {amen}
          </p>
        )}
      </div>

      {/* Send this stanza to the projector (operators) */}
      <button
        onClick={onDisplay}
        className="absolute -top-1 right-0 p-1.5 rounded-lg transition-opacity opacity-60 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus:opacity-100"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label={`Show ${stanzaLabel(verse)} on the display`}
        title="Show on display"
      >
        <Tv size={16} />
      </button>
    </section>
  );
}

export default function HymnDetail() {
  usePageView('hymn_detail');
  const { number } = useParams();
  const navigate = useNavigate();
  const { hymn, prevNumber, nextNumber, loading } = useHymn(Number(number));
  const { showHymnVerse } = useDisplayController();
  const { isFavorite, toggleFavorite } = useFavoriteHymns();

  const [view, setViewState] = useState<LyricsView>(() =>
    readStored<LyricsView>(VIEW_KEY, 'yo', v => v === 'yo' || v === 'en' || v === 'both'));
  const [fontSize, setFontSizeState] = useState<number>(() =>
    readStored<number>(FONT_KEY, 20, v => Number(v) >= FONT_MIN && Number(v) <= FONT_MAX));
  const [showSolfa, setShowSolfa] = useState(false);

  const setView = (v: LyricsView) => { setViewState(v); store(VIEW_KEY, v); };
  const changeFont = (delta: number) => {
    setFontSizeState(size => {
      const next = Math.min(FONT_MAX, Math.max(FONT_MIN, size + delta));
      store(FONT_KEY, next);
      return next;
    });
  };

  const titleLang: HymnLanguage = view === 'en' ? 'en' : 'yo';
  usePageTitle('hymn_detail', hymn ? `CCC Hymn #${hymn.number} — ${displayTitle(hymn, titleLang)}` : undefined);

  const { readerMode, cycleReaderMode, isReaderActive } = useReaderMode();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  useEffect(() => {
    if (hymn) recordHymnView(hymn.number);
    setShowSolfa(false);
  }, [hymn]);

  const goTo = useCallback((n: number | null) => {
    if (n !== null) navigate(`/hymns/${n}`, { replace: true });
  }, [navigate]);

  // Arrow keys move between hymns on desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') goTo(prevNumber);
      if (e.key === 'ArrowRight') goTo(nextNumber);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, prevNumber, nextNumber]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => goTo(nextNumber),
    onSwipeRight: () => goTo(prevNumber),
    threshold: 80,
  });

  if (loading) return <div className="p-4 text-center text-[var(--color-text-secondary)]">Loading...</div>;
  if (!hymn) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>Hymn {number} isn't in the hymnal.</p>
        <Link to="/hymns" className="btn-primary px-6 py-2 rounded-xl text-sm">Browse hymns</Link>
      </div>
    );
  }

  const verses = hymn.verses;
  const favorite = isFavorite(hymn.number);
  const mainTitle = displayTitle(hymn, titleLang);
  const otherTitle = displayTitle(hymn, titleLang === 'yo' ? 'en' : 'yo');

  const shareText = (h: Hymn) => {
    const lang: HymnLanguage = view === 'en' ? 'en' : 'yo';
    const body = h.verses.map(v => {
      const lines = lang === 'en' ? v.englishLines : v.yorubaLines;
      return `${stanzaLabel(v, lang)}\n${lines.join('\n')}`;
    }).join('\n\n');
    return `CCC Hymn ${h.number} — ${displayTitle(h, lang)}\n\n${body}`;
  };

  const handleShare = async () => {
    const text = shareText(hymn);
    const url = `${window.location.origin}/hymns/${hymn.number}`;
    if (navigator.share) {
      try { await navigator.share({ title: `CCC Hymn ${hymn.number}`, text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      showToast('Lyrics copied');
    } catch {
      showToast("Couldn't copy the lyrics");
    }
  };

  const handleSendToDisplay = (verseIndex: number) => {
    const verse = verses[verseIndex];
    if (!verse) return;
    const yo = verse.yorubaLines.join('\n');
    const en = verse.englishLines.join('\n');
    const content = view === 'yo' ? (yo || en) : view === 'en' ? (en || yo) : [yo, en].filter(Boolean).join('\n\n');
    showHymnVerse(displayTitle(hymn, titleLang), content, hymn.number, verseIndex + 1, verses.length);
    showToast(`${stanzaLabel(verse)} sent to display`);
  };

  const iconButton = 'h-9 min-w-9 px-2 rounded-lg inline-flex items-center justify-center gap-1 text-xs font-medium transition-colors';

  return (
    <div data-reader={readerMode !== 'off' ? readerMode : undefined} className="p-4 max-w-3xl mx-auto pb-36" {...swipeHandlers}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => toggleFavorite(hymn.number)}
            className={iconButton}
            style={{ backgroundColor: 'var(--color-bg-card)', color: favorite ? '#EF4444' : 'var(--color-text-secondary)' }}
            aria-pressed={favorite}
            aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => changeFont(-2)} className={iconButton} style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }} aria-label="Smaller text">A−</button>
          <button onClick={() => changeFont(2)} className={iconButton} style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }} aria-label="Larger text">A+</button>
          <button
            onClick={cycleReaderMode}
            className={iconButton}
            style={{
              backgroundColor: isReaderActive ? 'var(--color-text-primary)' : 'var(--color-bg-card)',
              color: isReaderActive ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
            }}
            aria-label="Reading mode"
            title={readerMode === 'off' ? 'Paper reading mode' : readerMode === 'paper' ? 'Dim paper' : 'Exit reading mode'}
          >
            {readerMode === 'off' ? <BookOpen size={16} /> : readerMode === 'paper' ? <Moon size={16} /> : <X size={16} />}
          </button>
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={iconButton}
              style={{ backgroundColor: 'var(--color-bg-card)', color: wakeLockActive ? 'var(--color-accent-gold)' : 'var(--color-text-secondary)' }}
              aria-label={wakeLockActive ? 'Allow screen to sleep' : 'Keep screen on'}
              aria-pressed={wakeLockActive}
              title={wakeLockActive ? 'Screen will stay on' : 'Keep screen on'}
            >
              <MonitorSmartphone size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Heading */}
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black font-[Outfit] mb-3"
             style={{ backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-text-on-accent)' }}>
          {hymn.number}
        </div>
        <h1 className="text-xl md:text-2xl font-bold font-[Outfit] leading-snug" style={{ color: 'var(--color-text-primary)' }}
            lang={titleLang}>
          {mainTitle}
        </h1>
        {view === 'both' && otherTitle !== mainTitle && (
          <p className="text-sm mt-1 italic" style={{ color: 'var(--color-text-secondary)' }}>{otherTitle}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {hymn.section && (
            <Link
              to={`/hymns?section=${hymn.section.id}`}
              className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
            >
              {hymn.section.english}
            </Link>
          )}
          {hymn.categories.map(cat => {
            const color = CATEGORY_COLORS[cat] || '#94A3B8';
            return (
              <Link
                key={cat}
                to={`/hymns?category=${cat}`}
                className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border"
                style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Language */}
      <div className="flex justify-center mb-6">
        <div className="flex rounded-xl p-1 border" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
             role="group" aria-label="Lyrics language">
          {([['yo', 'Yorùbá'], ['both', 'Both'], ['en', 'English']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all"
              style={view === key
                ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }
                : { color: 'var(--color-text-secondary)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Solfa */}
      {hymn.solfaNotation && (
        <div className="mb-6">
          <button
            onClick={() => setShowSolfa(s => !s)}
            className="w-full border py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            aria-expanded={showSolfa}
          >
            <Music2 size={16} /> {showSolfa ? 'Hide solfa' : 'Show solfa'}
          </button>
          {showSolfa && (
            <pre className="p-4 rounded-xl mt-2 border font-mono text-[13px] leading-relaxed overflow-x-auto"
                 style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}>
              {cleanSolfa(hymn.solfaNotation)}
            </pre>
          )}
        </div>
      )}

      {hymn.needsVerseSplitReview && (
        <p className="flex items-start gap-2 text-xs mb-6 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          The printed layout of this hymn was irregular, so its verses may not line up exactly between Yorùbá and English.
        </p>
      )}

      {/* Lyrics */}
      <article className="space-y-7 leading-[1.6]" style={{ fontSize: `${fontSize}px` }}>
        {verses.map((verse, idx) => (
          <Stanza
            key={idx}
            verse={verse}
            view={view}
            isLast={idx === verses.length - 1}
            onDisplay={() => handleSendToDisplay(idx)}
          />
        ))}
      </article>

      {/* Bottom bar: previous / share / next */}
      <div className="fixed bottom-[68px] md:bottom-0 left-0 md:left-64 right-0 px-4 py-2.5 backdrop-blur-xl border-t z-10"
           style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 85%, transparent)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => goTo(prevNumber)}
            disabled={prevNumber === null}
            className="h-10 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
          >
            <ChevronLeft size={16} /> {prevNumber ?? ''}
          </button>
          <button
            onClick={handleShare}
            className="h-10 px-5 rounded-xl text-sm font-bold inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}
          >
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={() => goTo(nextNumber)}
            disabled={nextNumber === null}
            className="h-10 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}
          >
            {nextNumber ?? ''} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
