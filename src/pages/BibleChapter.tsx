import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS } from '../data/bibleBooks';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { useSavedPassages } from '../hooks/useNotes';

interface BibleChapterData {
  book: string;
  chapter: number;
  verses: Record<string, string>;
}

export default function BibleChapter() {
  const { book: bookSlug, chapter: chapterStr } = useParams<{ book: string; chapter: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showBibleVerse } = useDisplayController();
  const { passages, savePassage, deletePassage, refresh: refreshPassages } = useSavedPassages();

  const [data, setData] = useState<BibleChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [savedToast, setSavedToast] = useState<string | null>(null);

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
    fetch(`/data/bible/en/${fileName}.json`)
      .then(r => {
        if (!r.ok) throw new Error('Chapter not found');
        return r.json();
      })
      .then(json => {
        // aruljohn format: { book, chapters: [{ chapter, verses: [{verse, text}] }] }
        const ch = json.chapters?.find((c: any) => Number(c.chapter) === chapter);
        if (!ch) {
          setError(`Chapter ${chapter} not found in ${bookInfo.name}`);
          return;
        }
        const verses: Record<string, string> = {};
        if (Array.isArray(ch.verses)) {
          for (const v of ch.verses) {
            verses[String(v.verse)] = v.text;
          }
        }
        setData({ book: bookInfo.name, chapter, verses });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookInfo, chapter]);

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
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
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
      <div className="flex items-center justify-between mb-4">
        <Link to="/bible" className="text-[var(--color-accent-gold)] text-sm hover:underline">
          ← Books
        </Link>
        <div className="flex items-center gap-2">
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

      {/* Book & Chapter title */}
      <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)] mb-1">
        {bookInfo.name}
      </h1>
      <div className="text-sm text-[var(--color-text-secondary)] mb-6">
        Chapter {chapter} of {bookInfo.chapters}
      </div>

      {/* Chapter navigation */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
        {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map(ch => (
          <button
            key={ch}
            onClick={() => navigate(`/bible/${bookSlug}/${ch}`)}
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
      <div className="space-y-3 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
        {sortedVerses.map(([verseNum, text]) => {
          const num = parseInt(verseNum);
          const isHighlighted =
            highlightRange &&
            num >= highlightRange.start &&
            num <= highlightRange.end;
          const saved = isVerseSaved(num);

          return (
            <p
              key={verseNum}
              id={`verse-${verseNum}`}
              className={`group transition-colors rounded-lg px-2 py-1 -mx-2 relative ${
                isHighlighted
                  ? 'bg-[var(--color-accent-gold)]/15 border-l-2 border-[var(--color-accent-gold)]'
                  : ''
              }`}
            >
              <span className="text-[var(--color-accent-gold)] font-semibold mr-2 text-[0.7em] align-super">
                {verseNum}
              </span>
              <span className="text-[var(--color-text-primary)]">{text}</span>
              
              {/* Action buttons - visible on hover/focus */}
              <span className="inline-flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => showBibleVerse(`${bookInfo.name} ${chapter}:${verseNum}`, text)}
                  className="text-[var(--color-accent-teal)] text-xs hover:scale-110 transition-transform"
                  title="Send to display"
                >
                  📺
                </button>
                <button
                  onClick={() => handleToggleSave(num, text)}
                  className={`text-xs hover:scale-110 transition-transform ${
                    saved ? 'text-[var(--color-accent-gold)]' : 'text-[var(--color-text-muted)]'
                  }`}
                  title={saved ? 'Remove from saved' : 'Save passage'}
                >
                  {saved ? '★' : '☆'}
                </button>
              </span>
            </p>
          );
        })}
      </div>

      {/* Chapter navigation buttons */}
      <div className="flex justify-between mt-8 pt-4 border-t border-[var(--color-border)]">
        {chapter > 1 ? (
          <Link
            to={`/bible/${bookSlug}/${chapter - 1}`}
            className="px-4 py-2 rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
          >
            ← Chapter {chapter - 1}
          </Link>
        ) : (
          <div />
        )}
        {chapter < bookInfo.chapters ? (
          <Link
            to={`/bible/${bookSlug}/${chapter + 1}`}
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
