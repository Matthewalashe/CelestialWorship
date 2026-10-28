import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BookOpen, Download, ChevronRight, Check } from 'lucide-react';
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { BIBLE_VERSIONS, getBibleVersion, DEFAULT_VERSION_ID } from '../data/bibleVersions';
import { downloadVersionForOffline } from '../hooks/useBible';
import { useReadingProgress } from '../hooks/useProgress';
import { usePageTitle } from '../hooks/usePageTitle';
import { sanitizeSearchInput } from '../utils/sanitize';
import { parseReference } from '../utils/parseReference';
import { showToast } from '../components/Toast';
import { contentDefaults, tr } from '../i18n';

const VERSION_KEY = 'cw-bible-version';
const OFFLINE_KEY = 'cw-bible-offline';

const slugOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/** The divisions of the Protestant canon, as the contents page of a Bible lists them */
const DIVISIONS: { title: string; testament: 'OT' | 'NT'; books: string[] }[] = [
  { title: 'The Law', testament: 'OT', books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'] },
  { title: 'History', testament: 'OT', books: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther'] },
  { title: 'Poetry and Wisdom', testament: 'OT', books: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'] },
  { title: 'Major Prophets', testament: 'OT', books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'] },
  { title: 'Minor Prophets', testament: 'OT', books: ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'] },
  { title: 'The Gospels', testament: 'NT', books: ['Matthew', 'Mark', 'Luke', 'John'] },
  { title: 'The Early Church', testament: 'NT', books: ['Acts'] },
  { title: 'Letters of Paul', testament: 'NT', books: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'] },
  { title: 'Other Letters', testament: 'NT', books: ['Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'] },
  { title: 'Prophecy', testament: 'NT', books: ['Revelation'] },
];

const WELL_LOVED: { ref: string; book: string; chapter: number; what: string }[] = [
  { ref: 'ps23', book: 'Psalms', chapter: 23, what: 'The Lord is my shepherd' },
  { ref: 'jn3', book: 'John', chapter: 3, what: 'For God so loved the world' },
  { ref: 'mt5', book: 'Matthew', chapter: 5, what: 'The Beatitudes' },
  { ref: 'ps91', book: 'Psalms', chapter: 91, what: 'Under His wings' },
  { ref: 'rm8', book: 'Romans', chapter: 8, what: 'Nothing can separate us' },
  { ref: '1co13', book: '1 Corinthians', chapter: 13, what: 'The greatest is love' },
  { ref: 'is53', book: 'Isaiah', chapter: 53, what: 'The suffering servant' },
];

export default function Bible() {
  usePageTitle('bible');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { last, completedInBook } = useReadingProgress();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickRef, setQuickRef] = useState('');
  const [quickRefError, setQuickRefError] = useState<string | null>(null);
  const [testament, setTestament] = useState<'all' | 'OT' | 'NT'>('all');
  const [versionId, setVersionId] = useState<string>(() => {
    const fromUrl = searchParams.get('lang');
    if (fromUrl) return getBibleVersion(fromUrl).id;
    try { return getBibleVersion(localStorage.getItem(VERSION_KEY) ?? contentDefaults().bibleVersion).id; } catch { return DEFAULT_VERSION_ID; }
  });
  const version = getBibleVersion(versionId);
  const [download, setDownload] = useState<{ done: number; total: number } | null>(null);
  const [offlineVersions, setOfflineVersions] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const chooseVersion = (id: string) => {
    setVersionId(id);
    try { localStorage.setItem(VERSION_KEY, id); } catch {}
  };

  const filteredBooks = useMemo(() => {
    let books = testament === 'OT' ? OT_BOOKS : testament === 'NT' ? NT_BOOKS : BIBLE_BOOKS;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      books = books.filter(b => b.name.toLowerCase().includes(q) || b.abbreviation.toLowerCase().includes(q));
    }
    return books;
  }, [debouncedSearch, testament]);

  // Accepts "John 3", "Gen 1", "1 Cor 13:4-7", "Psalm 23"
  const handleQuickRef = (input: string) => {
    const ref = parseReference(input);
    const book = ref && BIBLE_BOOKS.find(b => b.name === ref.book);
    if (!ref || !book || ref.chapter < 1 || ref.chapter > book.chapters) {
      setQuickRefError(`Couldn't find "${input}". Try e.g. "John 3" or "Gen 1:1".`);
      return;
    }
    setQuickRefError(null);
    const verses = input.includes(':') ? `&v=${ref.verseStart}-${ref.verseEnd}` : '';
    navigate(`/bible/${slugOf(book.name)}/${ref.chapter}?lang=${versionId}${verses}`);
  };

  const startDownload = async () => {
    if (version.source.kind !== 'local') return;
    setDownload({ done: 0, total: BIBLE_BOOKS.length });
    const ok = await downloadVersionForOffline(version.id, BIBLE_BOOKS.map(b => b.name), (done, total) => setDownload({ done, total }));
    setDownload(null);
    if (ok > 0) {
      const next = [...new Set([...offlineVersions, version.id])];
      setOfflineVersions(next);
      try { localStorage.setItem(OFFLINE_KEY, JSON.stringify(next)); } catch {}
      showToast(ok === BIBLE_BOOKS.length ? `${version.abbreviation} saved for offline reading` : `${ok} books saved for offline reading`);
    } else {
      showToast(tr('Download failed, check your connection'));
    }
  };

  const continueBook = last ? BIBLE_BOOKS.find(b => b.name === last.book) : null;

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto pb-24 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-[Outfit] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          <BookOpen size={24} className="inline-block mr-2 align-text-bottom" />{' '}{tr('Bible')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('King James Version, Bibeli Mimọ and more')}</p>
      </div>

      {continueBook && last && (
        <Link
          to={`/bible/${slugOf(continueBook.name)}/${last.chapter}?lang=${last.versionId}`}
          className="flex items-center justify-between p-4 mb-4 rounded-2xl"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-accent-brand)' }}
        >
          <span>
            <span className="block text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr('Continue reading')}</span>
            <span className="block font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
              {tr(continueBook.name)} {last.chapter} · {getBibleVersion(last.versionId).abbreviation}
            </span>
          </span>
          <ChevronRight size={20} style={{ color: 'var(--color-accent-brand)' }} />
        </Link>
      )}

      {/* Version */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={versionId} onChange={e => chooseVersion(e.target.value)} aria-label={tr('Bible version')}
                className="flex-1 min-w-0 h-10 px-3 rounded-xl text-sm font-semibold border"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          {BIBLE_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.abbreviation}: {tr(v.name)}{v.preview ? tr(' (preview)') : ''}</option>)}
        </select>
        {version.source.kind === 'local' && (
          offlineVersions.includes(version.id) ? (
            <span className="h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
              <Check size={14} />{' '}{tr('Offline')}</span>
          ) : (
            <button onClick={startDownload} disabled={!!download}
                    className="h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 border disabled:opacity-60"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <Download size={14} /> {download ? `${download.done}/${download.total}` : tr('Download for offline')}
            </button>
          )
        )}
      </div>

      {/* Quick reference */}
      <form
        className="p-2 mb-1 flex gap-2 rounded-xl border"
        style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        onSubmit={e => { e.preventDefault(); if (quickRef.trim()) handleQuickRef(sanitizeSearchInput(quickRef)); }}
      >
        <input type="text" value={quickRef} onChange={e => setQuickRef(e.target.value)} placeholder={tr('Go to, e.g. "John 3:16" or "Ps 23"')}
               className="flex-1 bg-transparent text-sm px-2 outline-none" style={{ color: 'var(--color-text-primary)' }} aria-label={tr('Go to a passage')} />
        <button type="submit" className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-text-on-accent)' }}>{tr('Go')}</button>
      </form>
      {quickRefError
        ? <p className="text-xs mb-3 px-1" style={{ color: 'var(--color-warning)' }} role="alert">{quickRefError}</p>
        : <div className="mb-3" />}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(sanitizeSearchInput(e.target.value))} placeholder={tr('Find a book…')}
               className="flex-1 min-w-0 rounded-xl px-4 py-2.5 text-sm border"
               style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border)', outline: 'none' }} />
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={tr('Testament')}>
          {(['all', 'OT', 'NT'] as const).map(t => (
            <button key={t} onClick={() => setTestament(t)} aria-pressed={testament === t}
                    className="px-3 py-2 text-xs font-semibold"
                    style={testament === t
                      ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }
                      : { color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-card)' }}>
              {t === 'all' ? tr('All') : t === 'OT' ? tr('Old') : tr('New')}
            </button>
          ))}
        </div>
      </div>

      {/* Well-loved passages, a way in for anyone who doesn't know where to start */}
      {!debouncedSearch.trim() && testament === 'all' && (
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2 px-0.5" style={{ color: 'var(--color-text-muted)' }}>{tr('Well-loved passages')}</p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
            {WELL_LOVED.map(w => (
              <Link key={w.ref} to={`/bible/${slugOf(w.book)}/${w.chapter}?lang=${versionId}`} className="shrink-0 rounded-xl border px-3.5 py-2.5"
                    style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <span className="block text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>{tr(w.book)} {w.chapter}</span>
                <span className="block text-[11px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{tr(w.what)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Books, in the divisions of the Bible's own contents page */}
      <div className="space-y-6">
        {DIVISIONS.map(division => {
          const books = filteredBooks.filter(b => division.books.includes(b.name));
          if (!books.length) return null;
          return (
            <section key={division.title} aria-label={tr(division.title)}>
              <div className="flex items-baseline justify-between mb-2 px-0.5">
                <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{tr(division.title)}</h2>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr(division.testament === 'OT' ? 'Old Testament' : 'New Testament')}</span>
              </div>
              <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {books.map(book => {
                  const read = completedInBook(book.name);
                  return (
                    <li key={book.name}>
                      <Link to={`/bible/${slugOf(book.name)}/1?lang=${versionId}`}
                            className="flex flex-col justify-between h-full min-h-[4.25rem] p-2.5 rounded-xl border transition-transform active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                        <span className="block font-semibold text-[13px] leading-tight hyphens-auto break-words" lang={document.documentElement.lang} style={{ color: 'var(--color-text-primary)' }}>{tr(book.name)}</span>
                        <span className="block text-[11px] mt-1 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{book.chapters} {tr(book.chapters > 1 ? 'chapters' : 'chapter')}</span>
                        {read > 0 && (
                          <span className="block mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                                aria-label={`${read} / ${book.chapters}`}>
                            <span className="block h-full rounded-full" style={{ width: `${(read / book.chapters) * 100}%`, backgroundColor: 'var(--color-accent-brand)' }} />
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {filteredBooks.length === 0 && <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>{tr('No books found')}</div>}

      <p className="mt-8 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{version.copyright}</p>
    </div>
  );
}
