import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { useSavedPassages } from '../hooks/useNotes';
import { BibleLanguage, BIBLE_LANGUAGE_LABELS } from '../types';
import { usePageView } from '../hooks/useAnalytics';

interface BibleChapterData {
  book: string;
  chapter: number;
  verses: Record<string, string>;
}

export default function BibleChapter() {
  usePageView('bible_chapter');
  const { book: bookSlug, chapter: chapterStr } = useParams<{ book: string; chapter: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showBibleVerse } = useDisplayController();
  const { passages, savePassage, deletePassage, refresh: refreshPassages } = useSavedPassages();

  const langParam = (searchParams.get('lang') as BibleLanguage) || 'en';
  const sideBySideParam = searchParams.get('sbs') === 'true';

  const [currentLang, setCurrentLang] = useState<BibleLanguage>(langParam);
  const [sideBySide, setSideBySide] = useState(sideBySideParam);

  const [data, setData] = useState<BibleChapterData | null>(null);
  const [dataSec, setDataSec] = useState<BibleChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Sync state with URL params
  useEffect(() => {
    setCurrentLang((searchParams.get('lang') as BibleLanguage) || 'en');
    setSideBySide(searchParams.get('sbs') === 'true');
  }, [searchParams]);

  const updateUrl = (l: BibleLanguage, sbs: boolean) => {
    const params = new URLSearchParams(searchParams);
    params.set('lang', l);
    if (sbs) params.set('sbs', 'true');
    else params.delete('sbs');
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleLangToggle = (l: BibleLanguage) => {
    updateUrl(l, sideBySide);
  };

  const handleSideBySideToggle = () => {
    updateUrl(currentLang, !sideBySide);
  };

  // Resolve book name from slug
  const bookInfo = useMemo(() => {
    if (!bookSlug) return null;
    const slug = bookSlug.toLowerCase();
    return BIBLE_BOOKS.find(
      b => b.name.toLowerCase().replace(/\s+/g, '-') === slug
    ) || null;
  }, [bookSlug]);

  const chapter = parseInt(chapterStr || '1', 10);

  // Parse verse highlight range from ?v=1-5
  const highlightRange = useMemo(() => {
    const v = searchParams.get('v');
    if (!v) return null;
    const [start, end] = v.split('-').map(Number);
    return { start, end: end || start };
  }, [searchParams]);

  // Check if a specific verse is saved
  const isVerseSaved = useCallback((verseNum: number) => {
    if (!bookInfo) return false;
    return passages.some(
      p => p.book === bookInfo.name && p.chapter === chapter && p.verseStart === verseNum && p.verseEnd === verseNum
    );
  }, [passages, bookInfo, chapter]);

  // Get saved passage ID for a verse
  const getSavedPassageId = useCallback((verseNum: number) => {
    if (!bookInfo) return null;
    const passage = passages.find(
      p => p.book === bookInfo.name && p.chapter === chapter && p.verseStart === verseNum && p.verseEnd === verseNum
    );
    return passage?.id || null;
  }, [passages, bookInfo, chapter]);

  // Handle save/unsave verse
  const handleToggleSave = async (verseNum: number, text: string) => {
    if (!bookInfo) return;
    const savedId = getSavedPassageId(verseNum);
    if (savedId) {
      await deletePassage(savedId);
      refreshPassages();
      setSavedToast('Passage removed');
    } else {
      await savePassage(bookInfo.name, chapter, verseNum, verseNum, text);
      refreshPassages();
      setSavedToast(`${bookInfo.name} ${chapter}:${verseNum} saved!`);
    }
    setTimeout(() => setSavedToast(null), 2000);
  };

  // Load chapter data
  useEffect(() => {
    if (!bookInfo) {
      setError('Book not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fileName = bookInfo.name.replace(/\s+/g, '');
    
    const fetchLang = (l: BibleLanguage) => 
      fetch(`/data/bible/${l}/${fileName}.json`)
        .then(r => {
          if (!r.ok) throw new Error(`Chapter not found (${l})`);
          return r.json();
        })
        .then(json => {
          const ch = json.chapters?.find((c: any) => Number(c.chapter) === chapter);
          if (!ch) {
            throw new Error(`Chapter ${chapter} not found in ${bookInfo.name} (${l})`);
          }
          const verses: Record<string, string> = {};
          if (Array.isArray(ch.verses)) {
            for (const v of ch.verses) {
              verses[String(v.verse)] = v.text;
            }
          }
          return { book: bookInfo.name, chapter, verses };
        });

    if (sideBySide) {
      Promise.all([
        fetchLang(currentLang),
        fetchLang(currentLang === 'en' ? 'yo' : 'en').catch(() => null)
      ])
      .then(([primary, secondary]) => {
        setData(primary);
        setDataSec(secondary);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    } else {
      fetchLang(currentLang)
        .then(primary => {
          setData(primary);
          setDataSec(null);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [bookInfo, chapter, currentLang, sideBySide]);

  // Scroll to highlighted verse
  useEffect(() => {
    if (highlightRange && !loading) {
      setTimeout(() => {
        const el = document.getElementById(`verse-${highlightRange.start}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightRange, loading]);

  const sortedVerses = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.verses)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (error || !bookInfo) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-red-400 mb-4">{error || 'Book not found'}</p>
        <Link to="/bible" className="text-[var(--color-accent-gold)] hover:underline">
          ← Back to Books
        </Link>
      </div>
    );
  }

  return (
    <div className={`max-w-${sideBySide ? '4xl' : '2xl'} mx-auto px-4 py-6 pb-24 transition-all duration-300`}>
      {/* Saved Toast */}
      {savedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
             style={{
               backgroundColor: 'var(--color-accent-gold)',
               color: 'var(--color-text-on-accent)',
               padding: '0.5rem 1rem',
               borderRadius: '0.75rem',
               fontSize: '0.875rem',
               fontWeight: 600,
               boxShadow: '0 8px 24px rgba(212, 168, 67, 0.3)',
             }}>
          {savedToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <Link to={`/bible?lang=${currentLang}`} className="text-[var(--color-accent-gold)] text-sm hover:underline">
          ← Books
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Toggles */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)]">
            <button
              onClick={() => handleLangToggle('en')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${currentLang === 'en' ? 'bg-[var(--color-accent-teal)] text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              EN
            </button>
            <button
              onClick={() => handleLangToggle('yo')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${currentLang === 'yo' ? 'bg-[var(--color-accent-teal)] text-white' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              YO
            </button>
          </div>

          <button
            onClick={handleSideBySideToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${sideBySide ? 'bg-[var(--color-accent-gold)] text-[#0A1628] border-[var(--color-accent-gold)]' : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text-primary)]'}`}
          >
            Side by Side
          </button>

          {/* Font size controls */}
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setFontSize(s => Math.max(14, s - 2))}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] flex items-center justify-center hover:bg-[var(--color-bg-card-hover)] transition-colors text-sm"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize(s => Math.min(28, s + 2))}
              className="w-8 h-8 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] flex items-center justify-center hover:bg-[var(--color-bg-card-hover)] transition-colors text-sm"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Book & Chapter title */}
      <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)] mb-1">
        {bookInfo.name}
      </h1>
      <div className="text-sm text-[var(--color-text-secondary)] mb-6">
        Chapter {chapter} of {bookInfo.chapters}
        {sideBySide && dataSec && (
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            Showing {BIBLE_LANGUAGE_LABELS[currentLang]} & {BIBLE_LANGUAGE_LABELS[currentLang === 'en' ? 'yo' : 'en']}
          </span>
        )}
      </div>

      {/* Chapter navigation */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
        {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map(ch => (
          <button
            key={ch}
            onClick={() => navigate(`/bible/${bookSlug}/${ch}?${searchParams.toString()}`)}
            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
              ch === chapter
                ? 'bg-[var(--color-accent-gold)] text-[#0A1628]'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>

      {/* Verses */}
      <div className={`space-y-3 leading-relaxed ${sideBySide ? 'flex flex-col' : ''}`} style={{ fontSize: `${fontSize}px` }}>
        {sortedVerses.map(([verseNum, text]) => {
          const num = parseInt(verseNum);
          const isHighlighted =
            highlightRange &&
            num >= highlightRange.start &&
            num <= highlightRange.end;
          const saved = isVerseSaved(num);
          const secText = dataSec?.verses[verseNum];

          return (
            <div
              key={verseNum}
              id={`verse-${verseNum}`}
              className={`group transition-colors rounded-lg px-2 py-1 -mx-2 relative ${
                isHighlighted
                  ? 'bg-[var(--color-accent-gold)]/15 border-l-2 border-[var(--color-accent-gold)]'
                  : ''
              } ${sideBySide ? 'flex flex-col sm:flex-row gap-4' : ''}`}
            >
              {sideBySide ? (
                <>
                  <div className="flex-1 pr-4 relative">
                    <span className="text-[var(--color-accent-gold)] font-semibold mr-2 text-[0.7em] align-super">
                      {verseNum}
                    </span>
                    <span className="text-[var(--color-text-primary)]">{text}</span>
                  </div>
                  {secText && (
                    <div className="flex-1 pt-2 sm:pt-0 sm:border-l border-[var(--color-border)] sm:pl-4 relative">
                      <span className="text-[var(--color-accent-gold)] font-semibold mr-2 text-[0.7em] align-super sm:hidden">
                        {verseNum}
                      </span>
                      <span className="text-[var(--color-text-secondary)]">{secText}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="pr-12">
                  <span className="text-[var(--color-accent-gold)] font-semibold mr-2 text-[0.7em] align-super">
                    {verseNum}
                  </span>
                  <span className="text-[var(--color-text-primary)]">{text}</span>
                </p>
              )}
              
              {/* Action buttons - visible on hover/focus */}
              <span className={`inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity absolute right-2 ${sideBySide ? 'top-1' : 'top-1/2 -translate-y-1/2 bg-[var(--color-bg-primary)] px-2 rounded-lg shadow-sm border border-[var(--color-border)]'}`}>
                <button
                  onClick={() => showBibleVerse(`${bookInfo.name} ${chapter}:${verseNum}`, text)}
                  className="text-[var(--color-accent-teal)] text-xs hover:scale-110 transition-transform p-1"
                  title="Send to display"
                >
                  📺
                </button>
                <button
                  onClick={() => handleToggleSave(num, text)}
                  className={`text-xs hover:scale-110 transition-transform p-1 ${
                    saved ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)]'
                  }`}
                  title={saved ? 'Remove from saved' : 'Save passage'}
                >
                  {saved ? '★' : '☆'}
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {/* Chapter navigation buttons */}
      <div className="flex justify-between mt-8 pt-4 border-t border-[var(--color-border)]">
        {chapter > 1 ? (
          <Link
            to={`/bible/${bookSlug}/${chapter - 1}?${searchParams.toString()}`}
            className="px-4 py-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
          >
            ← Chapter {chapter - 1}
          </Link>
        ) : (
          <div />
        )}
        {chapter < bookInfo.chapters ? (
          <Link
            to={`/bible/${bookSlug}/${chapter + 1}?${searchParams.toString()}`}
            className="px-4 py-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
          >
            Chapter {chapter + 1} →
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
