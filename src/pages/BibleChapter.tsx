import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Moon, X, ChevronLeft, ChevronRight, Tv, Bookmark, Share2, MonitorSmartphone, Volume2, VolumeX,
  Copy, StickyNote, Image as ImageIcon, Columns2, Highlighter,
} from 'lucide-react';
import { useSwipe } from '../hooks/useSwipe';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { BIBLE_VERSIONS, getBibleVersion, companionVersion, DEFAULT_VERSION_ID } from '../data/bibleVersions';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { useSavedPassages, useChapterHighlights, notesApi } from '../hooks/useNotes';
import { useBible } from '../hooks/useBible';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { useReaderMode } from '../hooks/useReaderMode';
import { useWakeLock } from '../hooks/useWakeLock';
import { recordChapterOpened, recordChapterCompleted, useReadingProgress } from '../hooks/useProgress';
import { HIGHLIGHT_COLORS, type HighlightColor, type Note } from '../types/notes';
import { showToast } from '../components/Toast';
import { shareCard } from '../utils/shareCard';

const VERSION_KEY = 'cw-bible-version';
const FONT_KEY = 'cw-bible-font';

function storedNumber(key: string, fallback: number, min: number, max: number) {
  try {
    const n = Number(localStorage.getItem(key));
    if (n >= min && n <= max) return n;
  } catch {}
  return fallback;
}

/** "3-5,7" style label for a set of verse numbers */
function formatVerseList(verses: number[]): string {
  const sorted = [...verses].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const v of sorted.slice(1).concat(NaN)) {
    if (v === prev + 1) { prev = v; continue; }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = v;
    prev = v;
  }
  return parts.join(',');
}

const VerseItem = React.memo(function VerseItem({
  verseNum, text, textSec, isHighlighted, isSelected, isSpeaking, highlight, hasNote, isSaved, onSelect, sideBySide,
}: {
  verseNum: number;
  text: string;
  textSec?: string;
  isHighlighted: boolean;
  isSelected: boolean;
  isSpeaking: boolean;
  highlight?: HighlightColor;
  hasNote: boolean;
  isSaved: boolean;
  onSelect: (num: number) => void;
  sideBySide: boolean;
}) {
  const background = isSelected
    ? 'color-mix(in srgb, var(--color-accent-brand) 14%, transparent)'
    : highlight
      ? HIGHLIGHT_COLORS[highlight].background
      : isHighlighted || isSpeaking
        ? 'color-mix(in srgb, var(--color-accent-gold) 15%, transparent)'
        : undefined;

  const number = (
    <span className="font-semibold mr-1.5 text-[0.65em] align-super select-none" style={{ color: 'var(--color-accent-gold)' }}>
      {verseNum}
      {isSaved && <Bookmark size={9} className="inline ml-0.5 -mt-0.5" fill="currentColor" />}
      {hasNote && <StickyNote size={9} className="inline ml-0.5 -mt-0.5" />}
    </span>
  );

  return (
    <div
      id={`verse-${verseNum}`}
      onClick={() => onSelect(verseNum)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(verseNum); } }}
      className={`rounded-lg px-2 py-1 -mx-2 cursor-pointer transition-colors ${isSelected ? 'ring-1 ring-[var(--color-accent-brand)]/40' : ''} ${sideBySide ? 'grid sm:grid-cols-2 gap-x-6 gap-y-1' : ''}`}
      style={{ backgroundColor: background }}
    >
      <p>{number}<span style={{ color: 'var(--color-text-primary)' }}>{text}</span></p>
      {sideBySide && (
        <p className="sm:border-l sm:pl-6 text-[0.95em]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          <span className="sm:hidden">{number}</span>
          {textSec ?? <span className="italic opacity-60">—</span>}
        </p>
      )}
    </div>
  );
});

export default function BibleChapter() {
  usePageView('bible_chapter');
  const { book: bookSlug, chapter: chapterStr } = useParams<{ book: string; chapter: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showBibleVerse } = useDisplayController();
  const { passages, savePassage, deletePassage } = useSavedPassages();
  const { isCompleted } = useReadingProgress();

  // Version comes from the URL, then the last one used, then KJV
  const versionId = searchParams.get('lang') || (() => {
    try { return localStorage.getItem(VERSION_KEY) || DEFAULT_VERSION_ID; } catch { return DEFAULT_VERSION_ID; }
  })();
  const version = getBibleVersion(versionId);
  const sideBySide = searchParams.get('sbs') === 'true';
  const secondVersion = getBibleVersion(searchParams.get('with') || companionVersion(version).id);

  const { readerMode, cycleReaderMode, isReaderActive } = useReaderMode();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  const [fontSize, setFontSizeState] = useState(() => storedNumber(FONT_KEY, 18, 14, 30));
  const [selected, setSelected] = useState<number[]>([]);
  const [showColors, setShowColors] = useState(false);
  const [speakingVerse, setSpeakingVerse] = useState<number | null>(null);
  const [chapterNotes, setChapterNotes] = useState<Note[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const setFontSize = (delta: number) => setFontSizeState(s => {
    const next = Math.min(30, Math.max(14, s + delta));
    try { localStorage.setItem(FONT_KEY, String(next)); } catch {}
    return next;
  });

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    setSearchParams(params, { replace: true });
  };

  const chooseVersion = (id: string) => {
    try { localStorage.setItem(VERSION_KEY, id); } catch {}
    updateParams({ lang: id, with: secondVersion.id === id ? null : searchParams.get('with') });
  };

  const bookInfo = useMemo(() => {
    if (!bookSlug) return null;
    const slug = bookSlug.toLowerCase();
    return BIBLE_BOOKS.find(b => b.name.toLowerCase().replace(/\s+/g, '-') === slug) || null;
  }, [bookSlug]);

  const chapter = parseInt(chapterStr || '1', 10);
  const validChapter = !!bookInfo && chapter >= 1 && chapter <= bookInfo.chapters;

  usePageTitle('bible_chapter', bookInfo ? `${bookInfo.name} ${chapter} (${version.abbreviation})` : undefined);

  const { data, loading, error } = useBible(validChapter ? bookInfo!.name : '', chapter, version.id);
  const { data: dataSec } = useBible(validChapter && sideBySide ? bookInfo!.name : '', chapter, secondVersion.id);
  const { highlights, setHighlight } = useChapterHighlights(bookInfo?.name, chapter);

  const highlightRange = useMemo(() => {
    const v = searchParams.get('v');
    if (!v) return null;
    const [start, end] = v.split('-').map(Number);
    return { start, end: end || start };
  }, [searchParams]);

  // Remember where the reader is, for "Continue reading"
  useEffect(() => {
    if (bookInfo && data) recordChapterOpened(bookInfo.name, chapter, version.id);
  }, [bookInfo, chapter, version.id, data]);

  // Reaching the end of the chapter marks it read
  useEffect(() => {
    const el = endRef.current;
    if (!el || !bookInfo || !data) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        recordChapterCompleted(bookInfo.name, chapter);
        observer.disconnect();
      }
    }, { threshold: 1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [bookInfo, chapter, data]);

  // Notes attached to this chapter
  const refreshNotes = useCallback(async () => {
    if (!bookInfo) return;
    setChapterNotes(await notesApi.getNotesFor({ kind: 'bible', book: bookInfo.name, chapter, verseStart: 1, verseEnd: 999 }));
  }, [bookInfo, chapter]);
  useEffect(() => { refreshNotes(); }, [refreshNotes]);
  useEffect(() => {
    const onChange = () => refreshNotes();
    window.addEventListener('cw-library-changed', onChange);
    return () => window.removeEventListener('cw-library-changed', onChange);
  }, [refreshNotes]);

  const versesWithNotes = useMemo(() => {
    const set = new Set<number>();
    for (const n of chapterNotes) {
      if (n.link?.kind === 'bible') for (let v = n.link.verseStart; v <= n.link.verseEnd; v++) set.add(v);
    }
    return set;
  }, [chapterNotes]);

  const savedVerses = useMemo(() => {
    const set = new Set<number>();
    if (!bookInfo) return set;
    for (const p of passages) {
      if (p.book === bookInfo.name && p.chapter === chapter) for (let v = p.verseStart; v <= p.verseEnd; v++) set.add(v);
    }
    return set;
  }, [passages, bookInfo, chapter]);

  // Selection resets with the chapter
  useEffect(() => { setSelected([]); setShowColors(false); }, [bookSlug, chapter, version.id]);

  useEffect(() => {
    if (highlightRange && data) {
      const t = setTimeout(() => {
        document.getElementById(`verse-${highlightRange.start}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      return () => clearTimeout(t);
    }
  }, [highlightRange, data]);

  const sortedVerses = useMemo(
    () => (data ? Object.entries(data.verses).sort(([a], [b]) => parseInt(a) - parseInt(b)) : []),
    [data],
  );

  const toggleSelect = useCallback((num: number) => {
    setSelected(prev => (prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]));
  }, []);

  const selectedSorted = [...selected].sort((a, b) => a - b);
  const reference = bookInfo && selected.length ? `${bookInfo.name} ${chapter}:${formatVerseList(selected)}` : '';
  const selectedText = selectedSorted.map(n => data?.verses[n]).filter(Boolean).join(' ');

  const chapterPath = useCallback((ch: number) => {
    const params = new URLSearchParams(searchParams);
    params.delete('v');
    const qs = params.toString();
    return `/bible/${bookSlug}/${ch}${qs ? `?${qs}` : ''}`;
  }, [searchParams, bookSlug]);

  // ── Selection actions ──
  const clearSelection = () => { setSelected([]); setShowColors(false); };

  const applyHighlight = async (color: HighlightColor | null) => {
    await setHighlight(selected, color);
    showToast(color ? `Highlighted ${reference}` : 'Highlight removed');
    clearSelection();
  };

  const toggleSave = async () => {
    if (!bookInfo || !selected.length) return;
    const start = selectedSorted[0];
    const end = selectedSorted[selectedSorted.length - 1];
    const existing = passages.find(p => p.book === bookInfo.name && p.chapter === chapter && p.verseStart === start && p.verseEnd === end);
    if (existing) {
      await deletePassage(existing.id);
      showToast('Removed from saved passages');
    } else {
      await savePassage(bookInfo.name, chapter, start, end, selectedText);
      showToast(`${reference} saved`);
    }
    clearSelection();
  };

  const addNote = () => {
    if (!bookInfo) return;
    const start = selectedSorted[0];
    const end = selectedSorted[selectedSorted.length - 1];
    navigate(`/notes?new=1&book=${encodeURIComponent(bookInfo.name)}&chapter=${chapter}&from=${start}&to=${end}`);
  };

  const shareUrl = () => `${window.location.origin}/bible/${bookSlug}/${chapter}?lang=${version.id}&v=${selectedSorted[0]}-${selectedSorted[selectedSorted.length - 1]}`;

  const copySelection = async () => {
    try {
      await navigator.clipboard.writeText(`${selectedText}\n— ${reference} (${version.abbreviation})`);
      showToast('Copied');
    } catch {
      showToast("Couldn't copy");
    }
    clearSelection();
  };

  const shareSelection = async () => {
    const text = `“${selectedText}”\n— ${reference} (${version.abbreviation})`;
    if (navigator.share) {
      try { await navigator.share({ title: reference, text, url: shareUrl() }); clearSelection(); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl()}`);
      showToast('Verse and link copied');
    } catch {}
    clearSelection();
  };

  const shareImage = async () => {
    try {
      const result = await shareCard({ text: selectedText, reference, footer: version.abbreviation });
      if (result === 'downloaded') showToast('Image saved');
    } catch {
      showToast("Couldn't create the image");
    }
    clearSelection();
  };

  const sendToDisplay = () => {
    showBibleVerse(`${reference} (${version.abbreviation})`, selectedText);
    showToast('Sent to display');
  };

  // ── Read aloud, verse by verse so the current verse is shown ──
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingVerse(null);
  }, []);

  const readAloud = () => {
    if (speakingVerse !== null) { stopSpeaking(); return; }
    if (!('speechSynthesis' in window) || !sortedVerses.length) {
      showToast('Read aloud isn’t supported on this device');
      return;
    }
    const lang = version.language === 'yo' ? 'yo' : 'en';
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.toLowerCase().startsWith(lang));
    if (lang === 'yo' && !voice) showToast('No Yorùbá voice on this device — it will sound English');
    const startIndex = selected.length ? sortedVerses.findIndex(([n]) => Number(n) === selectedSorted[0]) : 0;
    const speakFrom = (i: number) => {
      if (i >= sortedVerses.length) { setSpeakingVerse(null); return; }
      const [num, text] = sortedVerses[i];
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'yo' ? 'yo-NG' : 'en-GB';
      if (voice) u.voice = voice;
      u.rate = 0.92;
      u.onstart = () => {
        setSpeakingVerse(Number(num));
        document.getElementById(`verse-${num}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      u.onend = () => speakFrom(i + 1);
      u.onerror = () => setSpeakingVerse(null);
      window.speechSynthesis.speak(u);
    };
    window.speechSynthesis.cancel();
    speakFrom(Math.max(0, startIndex));
    clearSelection();
  };

  useEffect(() => stopSpeaking, [stopSpeaking, bookSlug, chapter]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => { if (bookInfo && chapter < bookInfo.chapters) navigate(chapterPath(chapter + 1)); },
    onSwipeRight: () => { if (chapter > 1) navigate(chapterPath(chapter - 1)); },
    threshold: 80,
  });

  if (!bookInfo || !validChapter) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>That chapter doesn't exist.</p>
        <Link to="/bible" className="btn-primary px-6 py-2 rounded-xl text-sm">Back to books</Link>
      </div>
    );
  }

  const iconButton = 'h-9 min-w-9 px-2 rounded-lg inline-flex items-center justify-center gap-1 text-xs font-semibold transition-colors';
  const cardStyle = { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' };

  return (
    <div data-reader={readerMode !== 'off' ? readerMode : undefined}
         className={`${sideBySide ? 'max-w-4xl' : 'max-w-2xl'} mx-auto px-4 py-5 ${selected.length ? 'pb-48' : 'pb-24'}`}
         {...swipeHandlers}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <Link to={`/bible?lang=${version.id}`} className="text-sm inline-flex items-center gap-1" style={{ color: 'var(--color-accent-gold)' }}>
          <ChevronLeft size={16} /> Books
        </Link>
        <div className="flex items-center gap-1.5">
          <button onClick={readAloud} className={iconButton} style={{ ...cardStyle, color: speakingVerse !== null ? 'var(--color-accent-brand)' : cardStyle.color }}
                  aria-label={speakingVerse !== null ? 'Stop reading' : 'Read aloud'} title={speakingVerse !== null ? 'Stop reading' : 'Read aloud'}>
            {speakingVerse !== null ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={() => setFontSize(-2)} className={iconButton} style={cardStyle} aria-label="Smaller text">A−</button>
          <button onClick={() => setFontSize(2)} className={iconButton} style={cardStyle} aria-label="Larger text">A+</button>
          <button onClick={() => updateParams({ sbs: sideBySide ? null : 'true' })} className={iconButton}
                  style={{ ...cardStyle, color: sideBySide ? 'var(--color-accent-gold)' : cardStyle.color }}
                  aria-pressed={sideBySide} aria-label="Side by side" title="Side by side">
            <Columns2 size={16} />
          </button>
          <button onClick={cycleReaderMode} className={iconButton}
                  style={isReaderActive ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' } : cardStyle}
                  aria-label="Reading mode" title={readerMode === 'off' ? 'Paper reading mode' : readerMode === 'paper' ? 'Dim paper' : 'Exit reading mode'}>
            {readerMode === 'off' ? <BookOpen size={16} /> : readerMode === 'paper' ? <Moon size={16} /> : <X size={16} />}
          </button>
          {wakeLockSupported && (
            <button onClick={toggleWakeLock} className={iconButton}
                    style={{ ...cardStyle, color: wakeLockActive ? 'var(--color-accent-gold)' : cardStyle.color }}
                    aria-pressed={wakeLockActive} aria-label={wakeLockActive ? 'Allow screen to sleep' : 'Keep screen on'}>
              <MonitorSmartphone size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Title + versions */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>
            {bookInfo.name} {chapter}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Chapter {chapter} of {bookInfo.chapters}{isCompleted(bookInfo.name, chapter) ? ' · Read ✓' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={version.id} onChange={e => chooseVersion(e.target.value)} aria-label="Bible version"
                  className="h-9 px-2 rounded-lg text-xs font-semibold border"
                  style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
            {BIBLE_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.abbreviation} — {v.name}</option>)}
          </select>
          {sideBySide && (
            <select value={secondVersion.id} onChange={e => updateParams({ with: e.target.value })} aria-label="Second version"
                    className="h-9 px-2 rounded-lg text-xs font-semibold border"
                    style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
              {BIBLE_VERSIONS.filter(v => v.id !== version.id).map(v => <option key={v.id} value={v.id}>with {v.abbreviation}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Chapter strip */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-2 hide-scrollbar">
        {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map(ch => (
          <button
            key={ch}
            onClick={() => navigate(chapterPath(ch))}
            className="min-w-[36px] h-9 rounded-lg text-sm font-medium flex-shrink-0 relative"
            style={ch === chapter
              ? { backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-text-on-accent)' }
              : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
            aria-current={ch === chapter ? 'page' : undefined}
          >
            {ch}
            {isCompleted(bookInfo.name, ch) && ch !== chapter && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
            )}
          </button>
        ))}
      </div>

      {version.preview && (
        <p className="text-xs mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          This edition is digitised from a 1900 printing and is still being proofread. If a word looks wrong, compare with your printed Bibeli Mimọ.
        </p>
      )}

      {chapterNotes.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowNotes(s => !s)} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}>
            <StickyNote size={14} /> {chapterNotes.length} note{chapterNotes.length > 1 ? 's' : ''} on this chapter
          </button>
          {showNotes && (
            <ul className="mt-2 space-y-2">
              {chapterNotes.map(n => (
                <li key={n.id}>
                  <Link to={`/notes?open=${n.id}`} className="block p-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                    <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {n.link?.kind === 'bible' ? `v${n.link.verseStart}${n.link.verseEnd > n.link.verseStart ? `-${n.link.verseEnd}` : ''} · ` : ''}{n.title || 'Note'}
                    </span>
                    <span className="block line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{n.content}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Verses */}
      {loading ? (
        <div className="py-16 text-center animate-pulse" style={{ color: 'var(--color-text-secondary)' }}>Loading…</div>
      ) : error || !data ? (
        <div className="py-10 text-center">
          <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>{error || 'Couldn’t load this chapter.'}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {version.preview && (
              <button onClick={() => chooseVersion('yo')} className="btn-primary px-5 py-2 rounded-xl text-sm">Read in Yorùbá Òde-Òní</button>
            )}
            {version.id !== DEFAULT_VERSION_ID && (
              <button onClick={() => chooseVersion(DEFAULT_VERSION_ID)} className="px-5 py-2 rounded-xl text-sm border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>Read in KJV</button>
            )}
          </div>
        </div>
      ) : (
        <>
          {sideBySide && (
            <div className="hidden sm:grid grid-cols-2 gap-x-6 text-[11px] uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>
              <span>{version.abbreviation}</span><span className="pl-6">{secondVersion.abbreviation}</span>
            </div>
          )}
          <div className="space-y-2 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
            {sortedVerses.map(([verseNum, text]) => {
              const num = parseInt(verseNum);
              return (
                <VerseItem
                  key={verseNum}
                  verseNum={num}
                  text={text}
                  textSec={dataSec?.verses[verseNum]}
                  isHighlighted={!!highlightRange && num >= highlightRange.start && num <= highlightRange.end}
                  isSelected={selected.includes(num)}
                  isSpeaking={speakingVerse === num}
                  highlight={highlights.get(num)}
                  hasNote={versesWithNotes.has(num)}
                  isSaved={savedVerses.has(num)}
                  onSelect={toggleSelect}
                  sideBySide={sideBySide}
                />
              );
            })}
          </div>
          <div ref={endRef} className="h-1" />
          <p className="mt-6 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {data.copyright}
            {sideBySide && dataSec && dataSec.copyright !== data.copyright && <><br />{dataSec.copyright}</>}
          </p>
        </>
      )}

      {/* Chapter navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {chapter > 1 ? (
          <Link to={chapterPath(chapter - 1)} className="px-4 py-2 rounded-lg inline-flex items-center gap-1" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
            <ChevronLeft size={16} /> Chapter {chapter - 1}
          </Link>
        ) : <div />}
        {chapter < bookInfo.chapters ? (
          <Link to={chapterPath(chapter + 1)} className="px-4 py-2 rounded-lg inline-flex items-center gap-1" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
            Chapter {chapter + 1} <ChevronRight size={16} />
          </Link>
        ) : <div />}
      </div>

      {/* Selection action bar */}
      {selected.length > 0 && (
        <div className="fixed left-0 right-0 md:left-64 bottom-[68px] md:bottom-0 z-10 px-3 pb-3 animate-slide-up">
          <div className="max-w-2xl mx-auto rounded-2xl border shadow-xl p-3"
               style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{reference}</span>
              <button onClick={clearSelection} className="p-1" aria-label="Clear selection" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>
            {showColors ? (
              <div className="flex items-center gap-2">
                {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(c => (
                  <button key={c} onClick={() => applyHighlight(c)} aria-label={`Highlight ${HIGHLIGHT_COLORS[c].label}`}
                          className="w-9 h-9 rounded-full border-2" style={{ backgroundColor: HIGHLIGHT_COLORS[c].swatch, borderColor: 'var(--color-bg-card)' }} />
                ))}
                <button onClick={() => applyHighlight(null)} className="ml-auto text-xs font-semibold px-3 h-9 rounded-lg" style={cardStyle}>Remove</button>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {[
                  { label: 'Highlight', icon: <Highlighter size={18} />, onClick: () => setShowColors(true) },
                  { label: 'Save', icon: <Bookmark size={18} />, onClick: toggleSave },
                  { label: 'Note', icon: <StickyNote size={18} />, onClick: addNote },
                  { label: 'Copy', icon: <Copy size={18} />, onClick: copySelection },
                  { label: 'Share', icon: <Share2 size={18} />, onClick: shareSelection },
                  { label: 'Image', icon: <ImageIcon size={18} />, onClick: shareImage },
                  { label: 'Display', icon: <Tv size={18} />, onClick: sendToDisplay },
                ].map(a => (
                  <button key={a.label} onClick={a.onClick} className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold"
                          style={{ color: 'var(--color-text-secondary)' }}>
                    {a.icon}{a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
