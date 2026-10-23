import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BookOpen, Download, ChevronRight, Check } from 'lucide-react';
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { BIBLE_VERSIONS, getBibleVersion, DEFAULT_VERSION_ID } from '../data/bibleVersions';
import { downloadVersionForOffline } from '../hooks/useBible';
import { useReadingProgress } from '../hooks/useProgress';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { sanitizeSearchInput } from '../utils/sanitize';
import { parseReference } from '../utils/parseReference';
import { showToast } from '../components/Toast';
import { contentDefaults, tr } from '../i18n';

const VERSION_KEY = 'cw-bible-version';
const OFFLINE_KEY = 'cw-bible-offline';

const slugOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

export default function Bible() {
  usePageView('bible');
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
      showToast(tr('Download failed — check your connection'));
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
              {continueBook.name} {last.chapter} · {getBibleVersion(last.versionId).abbreviation}
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
          {BIBLE_VERSIONS.map(v => <option key={v.id} value={v.id}>{v.abbreviation} — {v.name}{v.preview ? tr(' (preview)') : ''}</option>)}
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
        <input type="text" value={quickRef} onChange={e => setQuickRef(e.target.value)} placeholder={tr('Go to — e.g. "John 3:16" or "Ps 23"')}
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

      {/* Books */}
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredBooks.map(book => {
          const read = completedInBook(book.name);
          return (
            <li key={book.name}>
              <Link to={`/bible/${slugOf(book.name)}/1?lang=${versionId}`}
                    className="block p-3 rounded-xl border h-full"
                    style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
                <span className="block font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{book.name}</span>
                <span className="block text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {book.chapters}{' '}{tr('chapter')}{book.chapters > 1 ? 's' : ''} · {book.testament === 'OT' ? tr('Old') : tr('New')}{' '}{tr('Testament')}</span>
                {read > 0 && (
                  <span className="block mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        aria-label={`${read} of ${book.chapters} chapters read`}>
                    <span className="block h-full rounded-full" style={{ width: `${(read / book.chapters) * 100}%`, backgroundColor: 'var(--color-success)' }} />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {filteredBooks.length === 0 && <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>{tr('No books found')}</div>}

      <p className="mt-8 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{version.copyright}</p>
    </div>
  );
}
