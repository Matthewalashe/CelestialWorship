import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, Search, X } from 'lucide-react';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHymnSearch } from '../hooks/useHymns';
import { useFavoriteHymns } from '../hooks/useFavorites';
import { CATEGORY_LABELS, CATEGORY_COLORS, HymnCategory } from '../types';
import type { Hymn } from '../types';
import { sanitizeSearchInput } from '../utils/sanitize';
import { normalizeForSearch } from '../utils/search';
import { displayTitle, type HymnLanguage } from '../utils/hymnText';
import { contentDefaults, tr } from '../i18n';

type LyricsView = 'yo' | 'both' | 'en';
// Shared with the hymn page so both remember the same choice
const VIEW_KEY = 'cw-hymn-view';

function readView(): LyricsView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'yo' || v === 'en' || v === 'both') return v;
  } catch {}
  return contentDefaults().hymnView;
}

export default function Hymns() {
  usePageView('hymns');
  usePageTitle('hymns');
  const [searchParams, setSearchParams] = useSearchParams();
  const { favorites } = useFavoriteHymns();

  // Search and filters live in the URL so they survive "Back" from a hymn
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const letter = searchParams.get('letter') ?? '';
  const sectionId = searchParams.get('section') ?? '';
  const favoritesOnly = searchParams.get('fav') === '1';
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
    }, 250);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const [view, setViewState] = useState<LyricsView>(readView);
  const setView = (v: LyricsView) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  };
  const titleLang: HymnLanguage = view === 'en' ? 'en' : 'yo';

  const { results: searchResults = [], loading, total, hymns: allHymns } = useHymnSearch(debouncedTerm, selectedCategories);

  // Sections of the printed hymnal, in hymnal order
  const sections = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; count: number }>();
    for (const h of allHymns) {
      if (!h.section) continue;
      const entry = seen.get(h.section.id);
      if (entry) entry.count++;
      else seen.set(h.section.id, { id: h.section.id, label: h.section.english, count: 1 });
    }
    return [...seen.values()];
  }, [allHymns]);

  const hymns = useMemo(() => {
    let list: Hymn[] = searchResults;
    if (sectionId) list = list.filter(h => h.section?.id === sectionId);
    if (favoritesOnly) list = list.filter(h => favorites.includes(h.number));
    if (letter) {
      // Matches the start of the title shown (first line for untitled hymns), ignoring tone marks
      list = list.filter(h => normalizeForSearch(displayTitle(h, titleLang)).toUpperCase().startsWith(letter));
    }
    return list;
  }, [searchResults, sectionId, favoritesOnly, favorites, letter, titleLang]);

  // Number shortcuts scroll to the first hymn at or after that number (numbering has gaps)
  const maxNumber = useMemo(() => hymns.reduce((max, h) => Math.max(max, h.number), 0), [hymns]);
  const numberJumps = useMemo(() => {
    const jumps = [1];
    for (let n = 100; n <= maxNumber; n += 100) jumps.push(n);
    return jumps;
  }, [maxNumber]);
  const jumpToNumber = (n: number) => {
    const target = hymns.find(h => h.number >= n);
    if (target) document.getElementById(`hymn-row-${target.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleCategory = (cat: HymnCategory) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    updateParams({ category: next.join(',') || null });
  };

  const hasFilters = !!(searchTerm || letter || sectionId || favoritesOnly || selectedCategories.length);
  const clearAll = () => {
    setSearchTerm('');
    setDebouncedTerm('');
    updateParams({ q: null, letter: null, category: null, section: null, fav: null });
  };

  const chip = 'whitespace-nowrap px-3 h-8 rounded-full text-xs font-semibold transition-all border inline-flex items-center gap-1';

  return (
    <div className="px-4 pt-4 pb-24 max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-3xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Hymnal')}</h1>
        <div className="flex rounded-lg p-0.5 border" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
             role="group" aria-label={tr('Title language')}>
          {([['yo', 'Yorùbá'], ['both', 'Both'], ['en', 'English']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className="px-2.5 py-1 text-xs font-semibold rounded-md transition-colors"
              style={view === key
                ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }
                : { color: 'var(--color-text-secondary)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search stays visible while scrolling */}
      <div className="sticky top-0 md:top-0 z-[5] -mx-4 px-4 pt-1 pb-3" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="search"
            inputMode="search"
            placeholder={tr('Number, title or words from the hymn…')}
            value={searchTerm}
            onChange={e => setSearchTerm(sanitizeSearchInput(e.target.value))}
            className="w-full rounded-xl py-3.5 pl-11 pr-10 text-base border focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            aria-label={tr('Search hymns')}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" aria-label={tr('Clear search')}
                    style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button
          onClick={() => updateParams({ fav: favoritesOnly ? null : '1' })}
          aria-pressed={favoritesOnly}
          className={chip}
          style={favoritesOnly
            ? { backgroundColor: '#EF444422', borderColor: '#EF4444', color: '#EF4444' }
            : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <Heart size={12} fill={favoritesOnly ? 'currentColor' : 'none'} />{' '}{tr('Favourites')}{favorites.length ? ` (${favorites.length})` : ''}
        </button>
        <select
          value={sectionId}
          onChange={e => updateParams({ section: e.target.value || null })}
          className={`${chip} pr-2 cursor-pointer`}
          style={{
            backgroundColor: sectionId ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
            color: sectionId ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
          }}
          aria-label={tr('Hymnal section')}
        >
          <option value="">{tr('All sections')}</option>
          {sections.map(s => (
            <option key={s.id} value={s.id}>{tr(s.label)} ({s.count})</option>
          ))}
        </select>
        {(Object.keys(CATEGORY_LABELS) as HymnCategory[]).map(key => {
          const isSelected = selectedCategories.includes(key);
          const color = CATEGORY_COLORS[key] || '#94A3B8';
          return (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              aria-pressed={isSelected}
              className={chip}
              style={isSelected
                ? { backgroundColor: `${color}22`, borderColor: color, color }
                : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {tr(CATEGORY_LABELS[key])}
            </button>
          );
        })}
      </div>

      {/* A–Z and number shortcuts */}
      <div className="flex gap-1 mt-2 overflow-x-auto hide-scrollbar pb-1">
        {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(l => (
          <button
            key={l}
            onClick={() => updateParams({ letter: letter === l ? null : l })}
            className="w-8 h-8 shrink-0 rounded-lg text-xs font-bold flex items-center justify-center transition-colors border"
            style={{
              backgroundColor: letter === l ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
              color: letter === l ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            }}
            aria-label={`Hymns starting with ${l}`}
            aria-pressed={letter === l}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {numberJumps.map(n => (
          <button
            key={n}
            onClick={() => jumpToNumber(n)}
            className="px-2.5 h-7 rounded-md text-[11px] font-semibold border"
            style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
            aria-label={`Jump to hymn ${n}`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mt-4 mb-2">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {hymns.length === total ? `${total} hymns` : `${hymns.length} of ${total} hymns`}
        </p>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Clear filters')}</button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>{tr('Loading hymns…')}</div>
      ) : hymns.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--color-text-secondary)' }}>
          {favoritesOnly && favorites.length === 0
            ? tr('No favourites yet — tap the heart on a hymn to save it here.')
            : tr('No hymns match.')}
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
          {hymns.map(hymn => {
            const primary = displayTitle(hymn, titleLang);
            const secondary = view === 'both' ? displayTitle(hymn, 'en') : null;
            const category = hymn.categories[0];
            return (
              <li key={hymn.number} id={`hymn-row-${hymn.number}`} style={{ borderColor: 'var(--color-border)' }}>
                <Link to={`/hymns/${hymn.number}`} className="flex items-center gap-3 px-3 py-3 hover:bg-[var(--color-bg-card-hover)] transition-colors">
                  <span className="w-12 shrink-0 text-center text-xl font-black font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>
                    {hymn.number}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate" style={{ color: 'var(--color-text-primary)' }} lang={titleLang}>
                      {primary}
                    </span>
                    {secondary && secondary !== primary && (
                      <span className="block text-sm truncate" style={{ color: 'var(--color-text-secondary)' }} lang="en">{secondary}</span>
                    )}
                    <span className="block text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {[hymn.section?.english, category ? CATEGORY_LABELS[category] : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {favorites.includes(hymn.number) && <Heart size={14} className="shrink-0" fill="#EF4444" color="#EF4444" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
