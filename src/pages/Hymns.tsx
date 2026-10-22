import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHymnSearch } from '../hooks/useHymns';
import { CATEGORY_LABELS, CATEGORY_COLORS, HymnCategory } from '../types';
import { sanitizeSearchInput } from '../utils/sanitize';

type HymnListLanguage = 'Both' | 'English' | 'Yoruba';

export default function Hymns() {
  usePageView('hymns');
  usePageTitle('hymns');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search, category and letter filters live in the URL so they survive "Back" from a hymn
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const letter = searchParams.get('letter') ?? '';
  const selectedCategories = useMemo(
    () => (searchParams.get('category') ?? '').split(',').filter((c): c is HymnCategory => c in CATEGORY_LABELS),
    [searchParams]
  );

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      if ((searchParams.get('q') ?? '') !== searchTerm) updateParams({ q: searchTerm || null });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const [language, setLanguageState] = useState<HymnListLanguage>(() => {
    try {
      const stored = localStorage.getItem('cw-hymn-list-lang');
      if (stored === 'English' || stored === 'Yoruba' || stored === 'Both') return stored;
    } catch {}
    return 'Both';
  });
  const setLanguage = (lang: HymnListLanguage) => {
    setLanguageState(lang);
    try { localStorage.setItem('cw-hymn-list-lang', lang); } catch {}
  };

  const { results: searchResults = [], loading, total } = useHymnSearch(debouncedTerm, selectedCategories);

  // Letter filter matches the start of either title, ignoring Yoruba tone marks (e.g. Ẹ -> E)
  const hymns = useMemo(() => {
    if (!letter) return searchResults;
    const startsWith = (title: string | null) =>
      !!title && title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().startsWith(letter);
    return searchResults.filter(h => startsWith(h.englishTitle) || startsWith(h.yorubaTitle));
  }, [searchResults, letter]);

  // Number shortcuts scroll to the first hymn at or after that number (numbering has gaps)
  const maxNumber = useMemo(() => hymns.reduce((max, h) => Math.max(max, h.number), 0), [hymns]);
  const numberJumps = useMemo(() => {
    const jumps = [1];
    for (let n = 100; n <= maxNumber; n += 100) jumps.push(n);
    return jumps;
  }, [maxNumber]);
  const jumpToNumber = (n: number) => {
    const target = hymns.find(h => h.number >= n);
    if (target) document.getElementById(`hymn-row-${target.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleCategory = (cat: HymnCategory) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    updateParams({ category: next.join(',') || null });
  };

  const isUnfiltered = !searchTerm && !letter && selectedCategories.length === 0;

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 flex flex-col h-screen">
      <div className="shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-6 font-outfit">Hymnal</h1>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by number, title, or lyrics..."
            value={searchTerm}
            onChange={e => setSearchTerm(sanitizeSearchInput(e.target.value))}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl py-4 px-5 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-brand)] transition-colors placeholder:text-[var(--color-text-secondary)] text-lg shadow-lg"
          />
        </div>

        <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
          {(Object.keys(CATEGORY_LABELS) as HymnCategory[]).map((key) => {
            const isSelected = selectedCategories.includes(key);
            const color = CATEGORY_COLORS[key] || '#94A3B8';
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-opacity-20 border-opacity-50 text-white'
                    : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-gray-500'
                }`}
                style={isSelected ? { backgroundColor: `${color}33`, borderColor: color, color } : {}}
              >
                {CATEGORY_LABELS[key]}
              </button>
            );
          })}
        </div>

        {/* A-Z Quick Jump */}
        <div className="flex flex-wrap gap-1 mt-3">
          {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(l => (
            <button
              key={l}
              onClick={() => updateParams({ letter: letter === l ? null : l })}
              className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
              style={{
                backgroundColor: letter === l ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
                color: letter === l ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
              aria-label={`Filter hymns starting with ${l}`}
              aria-pressed={letter === l}
            >
              {l}
            </button>
          ))}
          <button
            onClick={() => { setSearchTerm(''); setDebouncedTerm(''); updateParams({ q: null, letter: null, category: null }); }}
            className="px-3 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isUnfiltered ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
              color: isUnfiltered ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            aria-label="Show all hymns"
          >
            All
          </button>
        </div>

        {/* Quick number jump */}
        <div className="flex flex-wrap gap-1 mt-2">
          {numberJumps.map(n => (
            <button
              key={n}
              onClick={() => jumpToNumber(n)}
              className="px-2 h-7 rounded text-[10px] font-semibold transition-colors"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
              aria-label={`Jump to hymn ${n}`}
            >
              {n}+
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {hymns.length} of {total} hymn{total !== 1 ? 's' : ''}
          </p>
          <div className="flex bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border)]">
            {['English', 'Both', 'Yoruba'].map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang as HymnListLanguage)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  language === lang
                    ? 'bg-[var(--color-accent-brand)] text-[var(--color-bg-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-20 pr-2 custom-scrollbar">
        {loading ? (
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Searching hymns...</div>
        ) : hymns.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-text-secondary)]">No hymns found matching your criteria.</div>
        ) : (
          hymns.map((hymn) => (
            <button
              key={hymn.number}
              id={`hymn-row-${hymn.number}`}
              onClick={() => navigate(`/hymns/${hymn.number}`)}
              className="w-full text-left bg-[var(--color-bg-card)]/60 hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent-brand)]/40 rounded-xl p-4 transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="text-3xl font-black text-[var(--color-accent-gold)]/30 group-hover:text-[var(--color-accent-gold)] transition-colors w-16 text-center font-outfit">
                {hymn.number}
              </div>
              <div className="flex-1 min-w-0">
                {(language !== 'Yoruba' || !hymn.yorubaTitle) && (
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] truncate font-outfit">{hymn.englishTitle || hymn.yorubaTitle}</h3>
                )}
                {(language === 'Yoruba' || (language === 'Both' && hymn.englishTitle)) && hymn.yorubaTitle && (
                  <h3 className="text-md font-medium text-[var(--color-text-secondary)] truncate font-outfit"><span lang="yo">{hymn.yorubaTitle}</span></h3>
                )}
                <p className="text-sm text-[var(--color-text-secondary)]/70 truncate mt-1">
                  {hymn.verses?.[0]?.englishLines?.[0] || hymn.englishLyrics?.split('\n')[0] || hymn.verses?.[0]?.yorubaLines?.[0] || '...'}
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                {hymn.categories?.slice(0, 2).map((cat) => {
                  const color = CATEGORY_COLORS[cat] || '#94A3B8';
                  return (
                    <span
                      key={cat}
                      className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border"
                      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                  );
                })}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
