import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BIBLE_BOOKS, OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { BibleLanguage, BIBLE_LANGUAGE_LABELS } from '../types';
import { useBibleAvailability } from '../hooks/useBible';
import { usePageView } from '../hooks/useAnalytics';

export default function Bible() {
  usePageView('bible');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [testament, setTestament] = useState<'all' | 'OT' | 'NT'>('all');
  const [lang, setLang] = useState<BibleLanguage>('en');
  const yorubaAvailable = useBibleAvailability('yo');

  const filteredBooks = useMemo(() => {
    let books = testament === 'OT' ? OT_BOOKS : testament === 'NT' ? NT_BOOKS : BIBLE_BOOKS;
    if (search.trim()) {
      const q = search.toLowerCase();
      books = books.filter(b => b.name.toLowerCase().includes(q) || b.abbreviation.toLowerCase().includes(q));
    }
    return books;
  }, [search, testament]);

  const handleQuickRef = (input: string) => {
    const match = input.trim().match(/^(.+?)\s+(\d+)$/);
    if (match) {
      const bookInput = match[1].toLowerCase().replace(/\s+/g, '-');
      navigate(`/bible/${bookInput}/${match[2]}?lang=${lang}`);
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto pb-24 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-[Outfit] font-bold" style={{ color: 'var(--color-text-primary)' }}>📖 Bible</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>King James Version & Bibeli Mimo (Yoruba)</p>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setLang('en')}
          className={`px-4 py-2 rounded-xl text-sm transition-colors ${lang === 'en' ? 'bg-[var(--color-accent-teal)] text-[var(--color-text-on-accent)]' : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-teal)]'}`}
        >
          {BIBLE_LANGUAGE_LABELS['en']}
        </button>
        <button
          onClick={() => yorubaAvailable && setLang('yo')}
          disabled={!yorubaAvailable}
          className={`px-4 py-2 rounded-xl text-sm transition-colors ${lang === 'yo' ? 'bg-[var(--color-accent-teal)] text-[var(--color-text-on-accent)]' : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'} ${!yorubaAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-accent-teal)]'}`}
        >
          {BIBLE_LANGUAGE_LABELS['yo']}{!yorubaAvailable ? ' — Coming soon' : ''}
        </button>
      </div>
      {/* Quick Reference */}
      <div className="card p-3 mb-4 flex gap-2" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.75rem' }}>
        <input type="text" placeholder='Quick jump — e.g. "John 3" or "Gen 1"' className="flex-1 bg-transparent text-sm px-2 outline-none" style={{ color: 'var(--color-text-primary)' }} onKeyDown={(e) => { if (e.key === 'Enter') handleQuickRef((e.target as HTMLInputElement).value); }} />
        <button className="px-4 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-accent-gold)', color: '#0A1628', fontWeight: 600 }} onClick={(e) => { const input = (e.currentTarget.previousElementSibling as HTMLInputElement)?.value; if (input) handleQuickRef(input); }}>Go</button>
      </div>
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..." className="flex-1 rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', outline: 'none' }} />
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          {(['all', 'OT', 'NT'] as const).map(t => (
            <button key={t} onClick={() => setTestament(t)} className={`px-3 py-2 text-xs font-semibold transition-colors ${testament === t ? 'bg-[var(--color-accent-teal)] text-white' : ''}`} style={testament !== t ? { color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-card)' } : {}}>{t === 'all' ? 'All' : t === 'OT' ? 'Old' : 'New'}</button>
          ))}
        </div>
      </div>
      {/* Books Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredBooks.map(book => (
          <button key={book.name} onClick={() => navigate(`/bible/${book.name.toLowerCase().replace(/\s+/g, '-')}/1?lang=${lang}`)} className="p-3 text-left hover:scale-[1.02] transition-transform" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.75rem' }}>
            <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{book.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{book.chapters} chapters</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${book.testament === 'OT' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{book.testament}</span>
            </div>
          </button>
        ))}
      </div>
      {filteredBooks.length === 0 && (<div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>No books found</div>)}
    </div>
  );
}
