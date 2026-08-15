import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHymn } from '../hooks/useHymns';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import { usePageView } from '../hooks/useAnalytics';

/** Detect if a verse is a chorus based on its number or line content */
function isChorus(verse: any): boolean {
  const num = String(verse.number || '').toLowerCase();
  if (num === 'cr' || num === 'chorus' || num === 'ch' || num === 'c') return true;
  const firstEn = (verse.english_lines?.[0] || verse.englishLines?.[0] || '').toLowerCase();
  const firstYo = (verse.yoruba_lines?.[0] || verse.yorubaLines?.[0] || '').toLowerCase();
  if (firstEn.startsWith('chorus') || firstYo.startsWith('chorus') || firstYo.startsWith('ègbè')) return true;
  return false;
}

/** Get lines from a verse, handling both snake_case and camelCase */
function getLines(verse: any, lang: 'en' | 'yo'): string[] {
  if (lang === 'en') return verse.english_lines || verse.englishLines || [];
  return verse.yoruba_lines || verse.yorubaLines || [];
}

/** Clean solfa notation — remove unnecessary spaces around colons */
function cleanSolfa(solfa: string): string {
  return solfa
    .replace(/\s*:\s*/g, ':')  // Remove spaces around colons
    .replace(/:(\S)/g, ': $1') // Add single space after colon before next note
    .replace(/:$/gm, '')       // Remove trailing colons on lines
    .trim();
}

export default function HymnDetail() {
  usePageView('hymn_detail');
  const { number } = useParams();
  const navigate = useNavigate();
  const { hymn, loading } = useHymn(Number(number));
  const { showHymnVerse } = useDisplayController();
  
  const [activeTab, setActiveTab] = useState<'English' | 'Yoruba' | 'Side-by-Side'>('English');
  const [showSolfa, setShowSolfa] = useState(false);

  if (loading) return <div className="p-4 text-center text-[var(--color-text-secondary)]">Loading...</div>;
  if (!hymn) return <div className="p-4 text-center text-red-400">Hymn not found</div>;

  const verses = hymn.verses || [];
  const totalVerses = verses.length;
  const solfa = hymn.solfaNotation || hymn.solfa_notation || null;

  const handleShare = () => {
    const text = `Hymn ${hymn.number} - ${hymn.englishTitle || hymn.yorubaTitle}\n\n` + 
      verses.map((v: any) => {
        const label = isChorus(v) ? 'Chorus' : `Verse ${v.number}`;
        return `${label}\n${getLines(v, 'en').join('\n') || getLines(v, 'yo').join('\n')}`;
      }).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Lyrics copied to clipboard!');
  };

  const handleSendToDisplay = (verseIndex: number) => {
    const verse = verses[verseIndex];
    if (!verse) return;
    
    // Send only the selected language
    let content: string;
    if (activeTab === 'Yoruba') {
      content = getLines(verse, 'yo').join('\n');
    } else if (activeTab === 'Side-by-Side') {
      const en = getLines(verse, 'en').join('\n');
      const yo = getLines(verse, 'yo').join('\n');
      content = en && yo ? `${en}\n\n${yo}` : en || yo;
    } else {
      content = getLines(verse, 'en').join('\n') || getLines(verse, 'yo').join('\n');
    }

    const title = hymn.englishTitle || hymn.yorubaTitle || `Hymn ${hymn.number}`;
    showHymnVerse(title, content, hymn.number, verseIndex + 1, totalVerses);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-32">
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)}
        className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer mb-6 inline-flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold)]/60 text-[var(--color-bg-primary)] text-3xl font-black font-outfit mb-4 shadow-lg shadow-[var(--color-accent-gold)]/20">
          {hymn.number}
        </div>
        {hymn.englishTitle && <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] font-outfit mb-1">{hymn.englishTitle}</h2>}
        {hymn.yorubaTitle && <h3 className="text-lg font-medium text-[var(--color-text-secondary)] font-outfit italic">{hymn.yorubaTitle}</h3>}
        
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {hymn.categories?.map((cat: string) => {
            const color = (CATEGORY_COLORS as any)[cat] || '#94A3B8';
            return (
              <span 
                key={cat} 
                className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border"
                style={{ color, borderColor: `${color}55`, backgroundColor: `${color}11` }}
              >
                {((CATEGORY_LABELS as any)[cat] as string) || cat}
              </span>
            );
          })}
        </div>
      </div>

      {/* Solfa Notation */}
      {solfa && (
        <div className="mb-8">
          <button 
            onClick={() => setShowSolfa(!showSolfa)}
            className="w-full bg-[var(--color-bg-card)]/50 border border-[var(--color-border)] py-2.5 rounded-xl text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-teal)] hover:border-[var(--color-accent-teal)]/30 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🎼</span>
            {showSolfa ? 'Hide Solfa' : 'Show Solfa Notation'}
          </button>
          {showSolfa && (
            <div className="p-5 bg-[var(--color-bg-card)] rounded-xl mt-2 border border-[var(--color-accent-teal)]/20 font-mono text-[13px] leading-relaxed text-[var(--color-accent-teal)] overflow-x-auto">
              {cleanSolfa(solfa).split('\n').map((line: string, i: number) => (
                <div key={i} className="min-h-[1.25rem]">{line}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Language Toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-[var(--color-bg-card)] rounded-xl p-1 border border-[var(--color-border)] shadow-sm">
          {['English', 'Side-by-Side', 'Yoruba'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
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

      {/* Verses / Stanzas */}
      <div className="space-y-6">
        {verses.map((verse: any, idx: number) => {
          const chorus = isChorus(verse);
          const enLines = getLines(verse, 'en');
          const yoLines = getLines(verse, 'yo');
          const stanzaLabel = chorus ? 'Chorus' : `${verse.number}`;

          return (
            <div 
              key={idx} 
              className={`relative group rounded-2xl overflow-hidden transition-all ${
                chorus 
                  ? 'bg-[var(--color-accent-gold)]/5 border-l-4 border-[var(--color-accent-gold)]/40 pl-5 pr-5 py-5'
                  : 'card p-5 md:p-6 bg-[var(--color-bg-card)]/30 border border-[var(--color-border)]/50'
              }`}
            >
              {/* Stanza label */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center justify-center font-bold font-outfit rounded-lg text-sm ${
                  chorus
                    ? 'bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)] px-3 py-1'
                    : 'bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)] w-8 h-8'
                }`}>
                  {stanzaLabel}
                </span>
                {chorus && <span className="text-xs text-[var(--color-accent-gold)]/60 uppercase tracking-widest font-bold">Chorus</span>}
              </div>

              {/* Lyrics */}
              <div className={`${activeTab === 'Side-by-Side' ? 'grid md:grid-cols-2 gap-6' : ''}`}>
                {(activeTab === 'English' || activeTab === 'Side-by-Side') && enLines.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {enLines.map((line: string, i: number) => (
                      <p key={i} className={`text-lg md:text-xl leading-snug text-[var(--color-text-primary)] ${
                        chorus ? 'italic text-[var(--color-accent-gold)]/90' : ''
                      }`}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                {(activeTab === 'Yoruba' || activeTab === 'Side-by-Side') && yoLines.length > 0 && (
                  <div className={`flex flex-col gap-0.5 ${activeTab === 'Side-by-Side' ? 'md:border-l md:border-[var(--color-border)]/30 md:pl-6' : ''}`}>
                    {yoLines.map((line: string, i: number) => (
                      <p key={i} className={`text-lg md:text-xl leading-snug ${
                        chorus 
                          ? 'italic text-[var(--color-accent-gold)]/90' 
                          : 'text-[var(--color-text-primary)]'
                      } ${activeTab !== 'Side-by-Side' ? '' : 'text-[var(--color-text-secondary)]'}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Send to display button */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                  onClick={() => handleSendToDisplay(idx)}
                  className="bg-[var(--color-accent-teal)] text-[var(--color-bg-primary)] text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg hover:scale-105 transition-transform cursor-pointer"
                >
                  📺 Display
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-t border-[var(--color-border)] z-50">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          <button 
            onClick={handleShare}
            className="px-5 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)] font-bold hover:bg-[var(--color-bg-card)] transition-colors cursor-pointer text-sm"
          >
            📋 Copy
          </button>
          <button 
            onClick={() => handleSendToDisplay(0)}
            className="px-5 py-3 rounded-xl bg-[var(--color-accent-teal)] text-[var(--color-bg-primary)] font-bold shadow-lg shadow-[var(--color-accent-teal)]/20 hover:shadow-[var(--color-accent-teal)]/40 transition-all flex items-center gap-2 cursor-pointer text-sm"
          >
            📺 Send Verse 1
          </button>
        </div>
      </div>
    </div>
  );
}
