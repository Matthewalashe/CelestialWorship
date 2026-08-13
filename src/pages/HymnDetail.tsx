import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHymn } from '../hooks/useHymns';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';

export default function HymnDetail() {
  const { number } = useParams();
  const navigate = useNavigate();
  const { hymn, loading } = useHymn(Number(number));
  const { showHymnVerse } = useDisplayController();
  
  const [activeTab, setActiveTab] = useState<'English' | 'Yoruba' | 'Side-by-Side'>('English');
  const [showSolfa, setShowSolfa] = useState(false);

  if (loading) return <div className="p-4 text-center text-[var(--color-text-secondary)]">Loading...</div>;
  if (!hymn) return <div className="p-4 text-center text-red-400">Hymn not found</div>;

  const englishVerses = hymn.englishLyrics ? hymn.englishLyrics.split(/\n\n+/) : [];
  const yorubaVerses = hymn.yorubaLyrics ? hymn.yorubaLyrics.split(/\n\n+/) : [];
  
  const totalVerses = Math.max(englishVerses.length, yorubaVerses.length);
  const verses = Array.from({ length: totalVerses }).map((_, i) => ({
    number: i + 1,
    en: englishVerses[i] || '',
    yo: yorubaVerses[i] || ''
  }));

  const handleShare = () => {
    const text = `Hymn ${hymn.number} - ${hymn.englishTitle || hymn.yorubaTitle}\n\n` + 
      verses.map(v => `Verse ${v.number}\n${v.en || v.yo}`).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Lyrics copied to clipboard!');
  };

  const handleSendToDisplay = (verseIndex: number) => {
    const verse = verses[verseIndex];
    if (!verse) return;
    
    let content = verse.en;
    if (activeTab === 'Yoruba' && verse.yo) {
      content = verse.yo;
    } else if (activeTab === 'Side-by-Side' && verse.en && verse.yo) {
      content = `${verse.en}\n\n${verse.yo}`;
    } else if (!content && verse.yo) {
      content = verse.yo;
    }

    const title = hymn.englishTitle || hymn.yorubaTitle || `Hymn ${hymn.number}`;
    showHymnVerse(title, content, hymn.number, verseIndex + 1, totalVerses);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <div className="flex gap-2">
          {hymn.needsClergyReview && (
            <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-1 rounded border border-orange-500/30">
              Needs Clergy Review
            </span>
          )}
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-6xl font-black text-[var(--color-accent-gold)] mb-4 font-outfit drop-shadow-lg">
          {hymn.number}
        </h1>
        {hymn.englishTitle && <h2 className="text-3xl font-bold text-[var(--color-text-primary)] font-outfit mb-2">{hymn.englishTitle}</h2>}
        {hymn.yorubaTitle && <h3 className="text-xl font-medium text-[var(--color-text-secondary)] font-outfit mb-4">{hymn.yorubaTitle}</h3>}
        
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {hymn.categories?.map((cat: string) => {
            const color = (CATEGORY_COLORS as any)[cat] || '#94A3B8';
            return (
              <span 
                key={cat} 
                className="text-xs uppercase font-bold px-3 py-1 rounded-full border"
                style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
              >
                {((CATEGORY_LABELS as any)[cat] as string) || cat}
              </span>
            );
          })}
        </div>
      </div>

      {hymn.solfaNotation && (
        <div className="mb-8">
          <button 
            onClick={() => setShowSolfa(!showSolfa)}
            className="w-full bg-[var(--color-bg-card)]/50 border border-[var(--color-border)] py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            {showSolfa ? 'Hide Solfa Notation' : 'Show Solfa Notation'}
          </button>
          {showSolfa && (
            <div className="p-4 bg-[var(--color-bg-card)] rounded-lg mt-2 border border-[var(--color-border)] font-mono text-sm text-[var(--color-accent-teal)] whitespace-pre-wrap">
              {hymn.solfaNotation}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-center mb-8">
        <div className="flex bg-[var(--color-bg-card)] rounded-xl p-1 border border-[var(--color-border)]">
          {['English', 'Side-by-Side', 'Yoruba'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-[var(--color-accent-teal)] text-[var(--color-bg-primary)] shadow-md' 
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {verses.map((verse, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -left-4 md:-left-12 top-0 text-3xl font-black text-[var(--color-border)] group-hover:text-[var(--color-accent-gold)]/30 transition-colors font-outfit">
              {verse.number}
            </div>
            
            <div className={`grid gap-8 ${activeTab === 'Side-by-Side' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {(activeTab === 'English' || activeTab === 'Side-by-Side') && verse.en && (
                <div className="text-xl md:text-2xl leading-relaxed text-[var(--color-text-primary)] font-inter whitespace-pre-line">
                  {verse.en}
                </div>
              )}
              {(activeTab === 'Yoruba' || activeTab === 'Side-by-Side') && verse.yo && (
                <div className="text-xl md:text-2xl leading-relaxed text-[var(--color-text-primary)] font-inter whitespace-pre-line italic">
                  {verse.yo}
                </div>
              )}
            </div>

            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleSendToDisplay(idx)}
                className="bg-[var(--color-accent-teal)] text-[var(--color-bg-primary)] text-xs font-bold px-3 py-1.5 rounded shadow-lg hover:scale-105 transition-transform cursor-pointer"
              >
                Display Verse {verse.number}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-t border-[var(--color-border)] z-50">
        <div className="max-w-4xl mx-auto flex justify-end gap-4">
          <button 
            onClick={handleShare}
            className="px-6 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-bg-card)] transition-colors cursor-pointer"
          >
            Copy Text
          </button>
          <button 
            onClick={() => handleSendToDisplay(0)}
            className="px-6 py-3 rounded-xl bg-[var(--color-accent-teal)] text-[var(--color-bg-primary)] font-bold shadow-lg shadow-[var(--color-accent-teal)]/20 hover:shadow-[var(--color-accent-teal)]/40 transition-all flex items-center gap-2 cursor-pointer"
          >
            📺 Send V1 to Display
          </button>
        </div>
      </div>
    </div>
  );
}
