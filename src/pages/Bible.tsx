import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';

export default function Bible() {
  const [search, setSearch] = useState('');
  const [testament, setTestament] = useState<'all' | 'OT' | 'NT'>('all');
  const navigate = useNavigate();

  const filteredBooks = useMemo(() => {
    let books = testament === 'OT' ? OT_BOOKS : testament === 'NT' ? NT_BOOKS : BIBLE_BOOKS;
    if (search.trim()) {
      const q = search.toLowerCase();
      books = books.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.abbreviation.toLowerCase().includes(q)
      );
    }
    return books;
  }, [search, testament]);

  // Quick reference input
  const [quickRef, setQuickRef] = useState('');

  const handleQuickGo = () => {
    if (!quickRef.trim()) return;
    // Try to parse "Genesis 1" or "Gen 1" format
    const match = quickRef.trim().match(/^(.+?)\s+(\d+)$/);
    if (match) {
      const bookName = match[1].trim().toLowerCase().replace(/\s+/g, '-');
      const chapter = match[2];
      navigate(`/bible/${bookName}/${chapter}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">
          📖 Bible Reader
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          King James Version & Bibeli Mimo (Yoruba)
        </p>
        <div className="flex gap-2 mt-3">
          <button className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'var(--color-accent-teal)', color: 'var(--color-text-on-accent)' }}>
            🇬🇧 English (KJV)
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                  disabled title="Coming soon">
            🇳🇬 Yorùbá — Coming Soon
          </button>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-4 mb-6">
        <label className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">
          Quick Reference
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickRef}
            onChange={e => setQuickRef(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickGo()}
            placeholder="e.g. Genesis 1, John 3, Psalm 23"
            className="flex-1 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-lg px-4 py-3 text-sm border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent-gold)]/50 transition-colors"
          />
          <button
            onClick={handleQuickGo}
            className="px-5 py-3 rounded-lg bg-gradient-to-r from-[#D4A843] to-[#E8C36A] text-[#0A1628] font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go
          </button>
        </div>
      </div>

      {/* Search & Testament Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search books..."
          className="flex-1 bg-[var(--color-bg-card)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-xl px-4 py-3 text-sm border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent-gold)]/50 transition-colors"
        />
        <div className="flex gap-2">
          {(['all', 'OT', 'NT'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTestament(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                testament === t
                  ? 'bg-[var(--color-accent-gold)] text-[#0A1628]'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {t === 'all' ? 'All' : t === 'OT' ? 'Old Testament' : 'New Testament'}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredBooks.map(book => (
          <Link
            key={book.name}
            to={`/bible/${book.name.toLowerCase().replace(/\s+/g, '-')}/1`}
            className="group bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-accent-gold)]/50 hover:bg-[var(--color-bg-card-hover)] transition-all"
          >
            <div className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors">
              {book.name}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              {book.chapters} chapter{book.chapters !== 1 ? 's' : ''}
            </div>
            <div className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-full inline-block ${
              book.testament === 'OT'
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {book.testament === 'OT' ? 'Old Testament' : 'New Testament'}
            </div>
          </Link>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          No books found matching "{search}"
        </div>
      )}
    </div>
  );
}
