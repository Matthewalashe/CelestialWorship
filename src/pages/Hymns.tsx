import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHymnSearch } from '../hooks/useHymns';
import { CATEGORY_LABELS, CATEGORY_COLORS, HymnCategory } from '../types';

export default function Hymns() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<HymnCategory[]>([]);
  const [language, setLanguage] = useState<'Both' | 'English' | 'Yoruba'>('Both');

  const { results: hymns = [], loading } = useHymnSearch(searchTerm, selectedCategories);

  const toggleCategory = (cat: HymnCategory) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 flex flex-col h-screen">
      <div className="shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-6 font-outfit">Hymnal</h1>
        
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Search by number, title, or lyrics..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl py-4 px-5 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-teal)] transition-colors placeholder:text-[var(--color-text-secondary)] text-lg shadow-lg"
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

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing {hymns.length} hymn{hymns.length !== 1 ? 's' : ''}
          </p>
          <div className="flex bg-[var(--color-bg-card)] rounded-lg p-1 border border-[var(--color-border)]">
            {['English', 'Both', 'Yoruba'].map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  language === lang 
                    ? 'bg-[var(--color-accent-teal)] text-[var(--color-bg-primary)]' 
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
              onClick={() => navigate(`/hymns/${hymn.number}`)}
              className="w-full text-left bg-[var(--color-bg-card)]/60 hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent-teal)]/40 rounded-xl p-4 transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="text-3xl font-black text-[var(--color-accent-gold)]/30 group-hover:text-[var(--color-accent-gold)] transition-colors w-16 text-center font-outfit">
                {hymn.number}
              </div>
              <div className="flex-1 min-w-0">
                {(language === 'English' || language === 'Both') && (
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] truncate font-outfit">{hymn.englishTitle || hymn.yorubaTitle}</h3>
                )}
                {(language === 'Yoruba' || language === 'Both') && hymn.yorubaTitle && (
                  <h3 className="text-md font-medium text-[var(--color-text-secondary)] truncate font-outfit">{hymn.yorubaTitle}</h3>
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
