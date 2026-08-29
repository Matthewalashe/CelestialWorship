import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Music, BookOpen, Megaphone, MonitorPlay, Search, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { CCCLogo } from '../components/icons/celestial-icons';
import { useDisplayController } from '../hooks/useLiveDisplay';
import { useHymnSearch } from '../hooks/useHymns';
import { useBible } from '../hooks/useBible';
import { BIBLE_BOOKS, resolveBookName } from '../data/bibleBooks';
import { DisplayState, Hymn } from '../types';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';

interface HistoryItem {
  id: string;
  timestamp: Date;
  state: DisplayState;
}

export default function Control() {
  usePageView('operator');
  usePageTitle('control');
  const { sendToDisplay, blankScreen, showLogo } = useDisplayController();
  const [displayState, setDisplayState] = useState<DisplayState>({ type: 'blank', content: '' });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [activeTab, setActiveTab] = useState<'hymns' | 'bible' | 'announcements'>('hymns');

  const updateDisplay = (newState: DisplayState) => {
    sendToDisplay(newState);
    setDisplayState(newState);
    setHistory(prev => {
      const newHistory = [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date(), state: newState }, ...prev].slice(0, 10);
      return newHistory;
    });
  };

  const handleShowLogo = () => updateDisplay({ type: 'logo', content: '' });
  const handleClearDisplay = () => updateDisplay({ type: 'blank', content: '' });

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-inter overflow-hidden">
      {/* Top Persistent Controls */}
      <div className="flex justify-between items-center bg-[var(--color-bg-card)] p-4 border-b border-[var(--color-border)] shadow-sm shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold mb-1">Live Status</div>
            <div className="text-lg font-bold text-[var(--color-accent-gold)] flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${displayState.type !== 'blank' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
              {displayState.type.toUpperCase()}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleShowLogo} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-6 py-2 rounded-lg font-bold hover:bg-[var(--color-accent-gold)]/20 transition-colors shadow-sm text-sm">
              LOGO
            </button>
            <button onClick={handleClearDisplay} className="bg-red-500/20 text-red-400 border border-red-500/50 px-6 py-2 rounded-lg font-bold hover:bg-red-500/40 transition-colors shadow-sm text-sm">
              BLACK
            </button>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="flex items-center gap-4">
          <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-bold text-right">Live Preview</div>
          <div className="w-48 h-24 bg-black border-2 border-[var(--color-accent-gold)] rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-2 text-center text-white shrink-0">
            {displayState.type === 'logo' && <div className="text-[var(--color-accent-gold)] font-bold text-sm flex items-center justify-center"><CCCLogo size={18} className="inline mr-1" /> CCC LIVE</div>}
            {displayState.type === 'hymn' && (
              <>
                <div className="text-[10px] text-[var(--color-accent-gold)] font-bold">Hymn {displayState.hymnNumber} (V{displayState.verseIndex})</div>
                <div className="text-[8px] line-clamp-3 mt-1 leading-tight">{displayState.content}</div>
              </>
            )}
            {displayState.type === 'verse' && (
              <>
                <div className="text-[10px] text-[var(--color-accent-gold)] font-bold">{displayState.title}</div>
                <div className="text-[8px] line-clamp-3 mt-1 leading-tight">{displayState.content}</div>
              </>
            )}
            {displayState.type === 'announcement' && (
              <>
                <div className="text-[10px] text-[var(--color-accent-gold)] font-bold uppercase">{displayState.title}</div>
                <div className="text-[8px] line-clamp-3 mt-1 leading-tight">{displayState.content}</div>
              </>
            )}
            {displayState.type === 'blank' && <div className="text-[10px] text-gray-600">BLANK</div>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-24 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col shrink-0">
          <button onClick={() => setActiveTab('hymns')} className={`flex flex-col items-center justify-center p-4 h-24 border-b border-[var(--color-border)] transition-colors ${activeTab === 'hymns' ? 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] border-r-4 border-r-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}>
            <Music size={28} className="mb-1" />
            <span className="text-xs font-bold">Hymns</span>
          </button>
          <button onClick={() => setActiveTab('bible')} className={`flex flex-col items-center justify-center p-4 h-24 border-b border-[var(--color-border)] transition-colors ${activeTab === 'bible' ? 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] border-r-4 border-r-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}>
            <BookOpen size={28} className="mb-1" />
            <span className="text-xs font-bold">Bible</span>
          </button>
          <button onClick={() => setActiveTab('announcements')} className={`flex flex-col items-center justify-center p-4 h-24 border-b border-[var(--color-border)] transition-colors ${activeTab === 'announcements' ? 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] border-r-4 border-r-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}>
            <Megaphone size={28} className="mb-1" />
            <span className="text-xs font-bold">Alerts</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-primary)]">
          {activeTab === 'hymns' && <HymnsTab displayState={displayState} updateDisplay={updateDisplay} />}
          {activeTab === 'bible' && <BibleTab displayState={displayState} updateDisplay={updateDisplay} />}
          {activeTab === 'announcements' && <AnnouncementsTab updateDisplay={updateDisplay} />}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[var(--color-bg-card)] border-t border-[var(--color-border)] h-16 shrink-0 flex items-center justify-between px-4">
        <div className="flex items-center gap-4 flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <span className="text-xs text-[var(--color-text-secondary)] font-bold uppercase tracking-widest shrink-0">History</span>
          {history.length === 0 && <span className="text-sm text-[var(--color-text-muted)] italic">No items displayed yet</span>}
          {history.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 bg-[var(--color-bg-secondary)] px-3 py-1 rounded-md text-xs border border-[var(--color-border)] shrink-0">
              <span className="text-[var(--color-text-muted)]">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className="font-bold text-[var(--color-accent-gold)]">
                {item.state.type === 'hymn' ? `Hymn ${item.state.hymnNumber}` : item.state.type === 'verse' ? item.state.title : item.state.type === 'logo' ? 'LOGO' : item.state.type === 'blank' ? 'BLACK' : item.state.title}
              </span>
            </div>
          ))}
        </div>
        <button 
          onClick={() => window.open('/display', 'celestialworship-display', 'width=1920,height=1080')}
          className="ml-4 shrink-0 bg-[var(--color-accent-brand)]/20 text-[var(--color-accent-brand)] border border-[var(--color-accent-brand)]/50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-[var(--color-accent-brand)]/40 transition-colors flex items-center gap-2"
        >
          <MonitorPlay size={18} className="inline mr-1" /> Open Display Window
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function HymnsTab({ displayState, updateDisplay }: { displayState: DisplayState, updateDisplay: (state: DisplayState) => void }) {
  const [search, setSearch] = useState('');
  const { results: hymns = [] } = useHymnSearch(search, []);
  const [selectedHymn, setSelectedHymn] = useState<Hymn | null>(null);
  const [displayLang, setDisplayLang] = useState<'en' | 'yo'>('en');

  const handleSelectHymn = (hymn: Hymn) => {
    setSelectedHymn(hymn);
    setSearch('');
  };

  const handleDisplayVerse = (verseIndex: number, enContent: string, yoContent: string) => {
    if (!selectedHymn) return;
    const totalVerses = selectedHymn.verses?.length || 1;

    // Send only the selected language
    const content = displayLang === 'yo' ? (yoContent || enContent) : (enContent || yoContent);

    updateDisplay({
      type: 'hymn',
      hymnNumber: selectedHymn.number,
      title: selectedHymn.englishTitle || selectedHymn.yorubaTitle || `Hymn ${selectedHymn.number}`,
      content,
      verseIndex: verseIndex,
      totalVerses: totalVerses
    });
  };

  let hymnVerses: { index: number; en: string; yo: string }[] = [];
  if (selectedHymn) {
    // Use structured verses array
    if (selectedHymn.verses && selectedHymn.verses.length > 0) {
      hymnVerses = selectedHymn.verses.map((v: any) => ({
        index: v.number || (selectedHymn.verses!.indexOf(v) + 1),
        en: (v.english_lines || v.englishLines || []).join('\n'),
        yo: (v.yoruba_lines || v.yorubaLines || []).join('\n'),
      }));
    } else {
      const enVerses = selectedHymn.englishLyrics ? selectedHymn.englishLyrics.split(/\n\n+/) : [];
      const yoVerses = selectedHymn.yorubaLyrics ? selectedHymn.yorubaLyrics.split(/\n\n+/) : [];
      const total = Math.max(enVerses.length, yoVerses.length);
      hymnVerses = Array.from({ length: total }).map((_, i) => ({
        index: i + 1,
        en: enVerses[i] || '',
        yo: yoVerses[i] || ''
      }));
    }
  }

  const activeVerseIndex = displayState.type === 'hymn' && displayState.hymnNumber === selectedHymn?.number ? displayState.verseIndex : -1;

  const handleNextVerse = () => {
    if (activeVerseIndex && activeVerseIndex < hymnVerses.length) {
      const next = hymnVerses[activeVerseIndex];
      handleDisplayVerse(next.index, next.en, next.yo);
    }
  };

  const handlePrevVerse = () => {
    if (activeVerseIndex && activeVerseIndex > 1) {
      const prev = hymnVerses[activeVerseIndex - 2];
      handleDisplayVerse(prev.index, prev.en, prev.yo);
    }
  };

  if (!selectedHymn) {
    return (
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <h2 className="text-3xl font-[Outfit] font-bold text-[var(--color-accent-gold)] mb-6">Select a Hymn</h2>
        <div className="relative mb-6">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input 
            type="text" 
            placeholder="Search Hymn Number or Title..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] rounded-2xl py-4 pl-12 pr-4 text-xl focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors shadow-sm"
          />
        </div>
        
        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
          {search ? hymns.slice(0, 20).map((hymn: Hymn) => (
            <button
              key={hymn.number}
              onClick={() => handleSelectHymn(hymn)}
              className="w-full flex items-center gap-6 text-left bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-bg-card-hover)] transition-all shadow-sm group"
            >
              <div className="w-16 h-16 rounded-lg bg-[var(--color-bg-secondary)] flex items-center justify-center font-bold text-2xl text-[var(--color-accent-gold)] group-hover:bg-[var(--color-accent-gold)]/20 transition-colors shrink-0">
                {hymn.number}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold group-hover:text-[var(--color-accent-gold)] transition-colors">{hymn.englishTitle || hymn.yorubaTitle}</div>
                <div className="text-sm text-[var(--color-text-secondary)] line-clamp-1">{hymn.englishLyrics.split('\n')[0] || hymn.yorubaLyrics.split('\n')[0]}</div>
              </div>
            </button>
          )) : (
            <div className="flex items-center justify-center h-48 text-[var(--color-text-muted)] italic">
              Type to search for a hymn...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-[var(--color-bg-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] px-3 py-1 rounded-md font-bold text-sm">HYMN {selectedHymn.number}</span>
            <span className="text-xs text-[var(--color-text-secondary)] uppercase font-bold tracking-wider">{selectedHymn.categories.join(', ').replace(/_/g, ' ')}</span>
          </div>
          <h2 className="text-3xl font-[Outfit] font-bold text-[var(--color-text-primary)]">{selectedHymn.englishTitle || selectedHymn.yorubaTitle}</h2>
        </div>
        <button 
          onClick={() => setSelectedHymn(null)}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-6 py-3 rounded-xl text-sm font-bold hover:bg-[var(--color-border-hover)] transition-colors self-start md:self-auto shadow-sm"
        >
          Change Hymn
        </button>
      </div>
      
      {/* Quick Nav + Language Toggle */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-[Outfit] font-bold text-[var(--color-accent-gold)]">Verses</h3>
          <div className="flex gap-2">
            <button 
              onClick={handlePrevVerse}
              disabled={!activeVerseIndex || activeVerseIndex <= 1}
              className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              <ChevronLeft size={16} className="inline" /> Prev
            </button>
            <button 
              onClick={handleNextVerse}
              disabled={!activeVerseIndex || activeVerseIndex >= hymnVerses.length}
              className="px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              Next <ChevronRight size={16} className="inline" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-secondary)] uppercase font-bold tracking-wider">Display Language:</span>
          <div className="flex bg-[var(--color-bg-card)] rounded-lg p-0.5 border border-[var(--color-border)]">
            <button
              onClick={() => setDisplayLang('en')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                displayLang === 'en' ? 'bg-[var(--color-accent-brand)] text-[var(--color-bg-primary)] shadow' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setDisplayLang('yo')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                displayLang === 'yo' ? 'bg-[var(--color-accent-brand)] text-[var(--color-bg-primary)] shadow' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              Yorùbá
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8 pr-2">
        {hymnVerses.map((verse) => {
          const isActive = activeVerseIndex === verse.index;
          return (
            <button
              key={verse.index}
              onClick={() => handleDisplayVerse(verse.index, verse.en, verse.yo)}
              className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden ${
                isActive 
                  ? 'bg-[var(--color-accent-gold)]/10 border-[var(--color-accent-gold)] shadow-[0_0_20px_rgba(212,168,67,0.15)] ring-1 ring-[var(--color-accent-gold)]' 
                  : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-accent-gold)]/50 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className={`text-xl font-bold px-3 py-1 rounded-md ${isActive ? 'bg-[var(--color-accent-gold)] text-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] group-hover:bg-[var(--color-accent-gold)]/20 group-hover:text-[var(--color-accent-gold)]'}`}>
                  Verse {verse.index}
                </span>
                {isActive && <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent-gold)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-accent-gold)]"></span>
                </span>}
              </div>
              <div className={`text-sm line-clamp-4 ${isActive ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                {verse.en}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function BibleTab({ displayState, updateDisplay }: { displayState: DisplayState, updateDisplay: (state: DisplayState) => void }) {
  const [quickRef, setQuickRef] = useState('');
  
  const [selectedBook, setSelectedBook] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerseRange, setSelectedVerseRange] = useState<number[]>([]);
  const [bibleLang, setBibleLang] = useState<'en' | 'yo'>('en');

  const { data: chapterData, loading } = useBible(selectedBook, selectedChapter, bibleLang);

  const bookInfo = BIBLE_BOOKS.find(b => b.name === selectedBook) || BIBLE_BOOKS[0];
  const chapters = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1);

  const handleQuickRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRef) return;
    
    const match = quickRef.match(/^(\d?\s*[a-zA-Z\s]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
    if (match) {
      const bookStr = match[1].trim();
      const ch = parseInt(match[2], 10);
      const resolved = resolveBookName(bookStr);
      if (resolved) {
        setSelectedBook(resolved);
        setSelectedChapter(ch);
        setSelectedVerseRange([]);
        setQuickRef('');
      }
    }
  };

  const handleSelectVerse = (verseNumStr: string, text: string) => {
    const vNum = parseInt(verseNumStr, 10);
    
    updateDisplay({
      type: 'verse',
      title: `${selectedBook} ${selectedChapter}:${vNum}`,
      content: text
    });
    
    setSelectedVerseRange([vNum]);
  };
  
  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'NT');

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col xl:flex-row gap-6 h-full">
        {/* Left side: Book & Chapter Selection */}
        <div className="w-full xl:w-1/3 flex flex-col gap-4">
          <form onSubmit={handleQuickRef} className="relative">
            <Zap size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Quick Jump (e.g. John 3:16)"
              value={quickRef}
              onChange={e => setQuickRef(e.target.value)}
              className="w-full bg-[var(--color-bg-card)] border-2 border-[var(--color-border)] rounded-xl py-3 pl-12 pr-4 text-md focus:outline-none focus:border-[var(--color-accent-brand)] shadow-sm"
            />
          </form>

          {/* Bible Language Toggle */}
          <div className="flex items-center gap-2 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-3">
            <span className="text-xs text-[var(--color-text-secondary)] uppercase font-bold tracking-wider">Language:</span>
            <div className="flex bg-[var(--color-bg-secondary)] rounded-lg p-0.5 flex-1">
              <button
                onClick={() => setBibleLang('en')}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  bibleLang === 'en' ? 'bg-[var(--color-accent-brand)] text-[var(--color-bg-primary)] shadow' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                English (KJV)
              </button>
              <button
                onClick={() => setBibleLang('yo')}
                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  bibleLang === 'yo' ? 'bg-[var(--color-accent-brand)] text-[var(--color-bg-primary)] shadow' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                Yorùbá
              </button>
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 flex flex-col flex-1 overflow-hidden shadow-sm">
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">Books</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
              <div>
                <h4 className="text-xs font-bold text-[var(--color-accent-gold)] mb-2 sticky top-0 bg-[var(--color-bg-card)] py-1">Old Testament</h4>
                <div className="grid grid-cols-3 gap-1">
                  {otBooks.map(b => (
                    <button
                      key={b.name}
                      onClick={() => { setSelectedBook(b.name); setSelectedChapter(1); setSelectedVerseRange([]); }}
                      className={`text-xs py-2 px-1 rounded-md truncate transition-colors font-medium ${selectedBook === b.name ? 'bg-[var(--color-accent-brand)] text-white' : 'hover:bg-[var(--color-bg-secondary)]'}`}
                      title={b.name}
                    >
                      {b.abbreviation}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-accent-gold)] mb-2 sticky top-0 bg-[var(--color-bg-card)] py-1">New Testament</h4>
                <div className="grid grid-cols-3 gap-1">
                  {ntBooks.map(b => (
                    <button
                      key={b.name}
                      onClick={() => { setSelectedBook(b.name); setSelectedChapter(1); setSelectedVerseRange([]); }}
                      className={`text-xs py-2 px-1 rounded-md truncate transition-colors font-medium ${selectedBook === b.name ? 'bg-[var(--color-accent-brand)] text-white' : 'hover:bg-[var(--color-bg-secondary)]'}`}
                      title={b.name}
                    >
                      {b.abbreviation}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Chapters & Verses */}
        <div className="w-full xl:w-2/3 flex flex-col bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-2xl font-[Outfit] font-bold text-[var(--color-accent-gold)] mb-4">{selectedBook}</h2>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin">
              {chapters.map(ch => (
                <button
                  key={ch}
                  onClick={() => { setSelectedChapter(ch); setSelectedVerseRange([]); }}
                  className={`px-4 py-2 rounded-lg font-bold shrink-0 transition-colors ${selectedChapter === ch ? 'bg-[var(--color-accent-brand)] text-white shadow-md' : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent-brand)]/50'}`}
                >
                  Ch {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-[var(--color-bg-primary)]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] animate-pulse font-medium">Loading chapter...</div>
            ) : !chapterData ? (
              <div className="flex items-center justify-center h-full text-red-400 font-medium">Failed to load {selectedBook} {selectedChapter}</div>
            ) : (
              <div className="space-y-3 max-w-3xl mx-auto pb-12">
                {Object.entries(chapterData.verses).map(([vNumStr, text]) => {
                  const vNum = parseInt(vNumStr, 10);
                  const isSelected = selectedVerseRange.includes(vNum);
                  const isActiveOnDisplay = displayState.type === 'verse' && displayState.title === `${selectedBook} ${selectedChapter}:${vNum}`;
                  
                  return (
                    <div 
                      key={vNumStr} 
                      className={`flex gap-4 p-4 rounded-xl transition-all hover:bg-[var(--color-bg-card)] ${
                        isActiveOnDisplay ? 'bg-[var(--color-accent-brand)]/10 shadow-sm' : 
                        isSelected ? 'bg-[var(--color-accent-gold)]/5' : ''
                      }`}
                    >
                      <div className="font-bold text-[var(--color-text-secondary)] min-w-[2rem] text-right pt-1">{vNumStr}</div>
                      <div className="flex-1 text-lg leading-relaxed">{text}</div>
                      <button 
                        onClick={() => handleSelectVerse(vNumStr, text)}
                        className={`shrink-0 px-6 py-2 rounded-lg font-bold self-start transition-all shadow-sm ${
                          isActiveOnDisplay ? 'bg-[var(--color-accent-brand)] text-white ring-2 ring-offset-2 ring-offset-[var(--color-bg-primary)] ring-[var(--color-accent-brand)]' : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-accent-brand)] hover:text-white hover:border-[var(--color-accent-brand)]'
                        }`}
                      >
                        {isActiveOnDisplay ? 'Live' : 'Send'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function AnnouncementsTab({ updateDisplay }: { updateDisplay: (state: DisplayState) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSend = () => {
    if (!title && !content) return;
    updateDisplay({
      type: 'announcement',
      title: title.trim(),
      content: content.trim()
    });
  };

  const applyPreset = (presetTitle: string, presetContent: string) => {
    setTitle(presetTitle);
    setContent(presetContent);
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col gap-6 pt-4">
      <h2 className="text-3xl font-[Outfit] font-bold text-[var(--color-accent-gold)]">Announcements</h2>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => applyPreset('Welcome', 'Welcome to Celestial Church of Christ!\nWe are glad you are here.')} className="px-5 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-sm font-bold hover:border-[var(--color-accent-gold)] transition-colors whitespace-nowrap shadow-sm">
          Welcome
        </button>
        <button onClick={() => applyPreset('Tithes & Offering', 'Please prepare your tithes and offering.')} className="px-5 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-sm font-bold hover:border-[var(--color-accent-gold)] transition-colors whitespace-nowrap shadow-sm">
          Offering
        </button>
        <button onClick={() => applyPreset('Closing', 'Thanks for worshipping with us!\nHave a blessed week ahead.')} className="px-5 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-sm font-bold hover:border-[var(--color-accent-gold)] transition-colors whitespace-nowrap shadow-sm">
          Closing
        </button>
        <button onClick={() => applyPreset('Notice', '')} className="px-5 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-sm font-bold hover:border-[var(--color-accent-gold)] transition-colors whitespace-nowrap shadow-sm">
          Custom Notice
        </button>
      </div>

      <div className="bg-[var(--color-bg-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm flex flex-col gap-4">
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">Title (Optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. ANNOUNCEMENT"
            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xl focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 uppercase tracking-wider">Message Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message here..."
            rows={6}
            className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-[var(--color-accent-gold)] transition-colors resize-none"
          />
        </div>
        
        <button 
          onClick={handleSend}
          disabled={!title && !content}
          className="mt-4 w-full bg-gradient-to-r from-[var(--color-accent-gold)] to-yellow-600 text-white font-bold text-xl py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Send to Display
        </button>
      </div>
    </div>
  );
}
