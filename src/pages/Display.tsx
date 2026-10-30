import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useDisplayReceiver } from '../hooks/useLiveDisplay';
import { tr } from '../i18n';

/** See-through words for OBS, vMix or Ecamm: add this page as a browser source over the cameras */
function Overlay({ room }: { room: string | null }) {
  const { displayState: state } = useDisplayReceiver(room);
  useEffect(() => {
    const els = [document.documentElement, document.body];
    const before = els.map(e => e.style.backgroundColor);
    els.forEach(e => { e.style.backgroundColor = 'transparent'; });
    document.body.style.overflow = 'hidden';
    return () => { els.forEach((e, i) => { e.style.backgroundColor = before[i]; }); document.body.style.overflow = ''; };
  }, []);
  const text = state.type === 'hymn' || state.type === 'verse' || state.type === 'announcement';
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'transparent' }}>
      {state.type === 'image' && state.imageUrl && <img src={state.imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />}
      {state.type === 'video' && state.imageUrl && <video src={state.imageUrl} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain"><track kind="captions" /></video>}
      {text && (
        <div className="absolute left-0 right-0 bottom-0 px-[4vw] py-[2vw] text-center text-white" style={{ backgroundColor: 'rgba(10,14,24,.82)', borderTop: '0.25vw solid #C9A24B' }}>
          {state.title && <p className="font-bold mb-[0.5vw]" style={{ color: '#E8C36A', fontSize: '1.7vw' }}>{tr(state.title)}</p>}
          <p className="font-semibold whitespace-pre-line" style={{ fontSize: state.content.length > 220 ? '2vw' : '3vw', lineHeight: 1.25 }}>{state.content}</p>
        </div>
      )}
    </div>
  );
}

export default function Display() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'overlay' ? <Overlay room={params.get('room')} /> : <FullDisplay />;
}

function FullDisplay() {
  const room = new URLSearchParams(window.location.search).get('room');
  const { displayState: state, connected } = useDisplayReceiver(room);
  const logoUrl = '/logo.png';

  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.body.style.cursor = 'none';
    document.body.style.overflow = 'hidden';
    
    // Inject styles for hiding scrollbars but allowing scrolling
    const style = document.createElement('style');
    style.innerHTML = `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.cursor = 'auto';
      document.body.style.overflow = 'auto';
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center p-16 font-inter overflow-hidden relative">
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${!state || state.type === 'blank' ? 'opacity-100 bg-black z-50' : 'opacity-0 pointer-events-none'}`}></div>
      <div className={`w-full h-full flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${(!state || state.type === 'blank') ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
        
        {state?.type === 'logo' && (
          <div className="flex flex-col items-center justify-center animate-slide-up relative">
            <div className="absolute inset-0 bg-[var(--color-accent-gold)]/10 blur-[100px] rounded-full animate-pulse"></div>
            <img src={state.imageUrl ?? logoUrl} alt={tr('Celestial Church of Christ')} className="w-64 h-64 object-contain mb-8 z-10 drop-shadow-[0_0_30px_rgba(212,168,67,0.5)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            {!state.imageUrl && <h1 className="text-7xl font-[Outfit] font-bold tracking-widest text-white drop-shadow-2xl z-10 text-center uppercase">{tr('CelestialWorship')}</h1>}
            {!state.imageUrl && <p className="text-3xl text-[var(--color-accent-gold)] font-medium mt-4 tracking-widest uppercase z-10">{tr('Celestial Church of Christ')}</p>}
            {room && (
              <p className="text-lg text-white/40 mt-10 z-10 tracking-widest">
                {connected ? `Screen ${room.toUpperCase()} ready` : `Connecting to ${room.toUpperCase()}…`}
              </p>
            )}
          </div>
        )}

        {state?.type === 'image' && state.imageUrl && <img src={state.imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />}
        {state?.type === 'video' && state.imageUrl && <video src={state.imageUrl} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain"><track kind="captions" /></video>}

        {state?.type === 'hymn' && (
          <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center animate-fade-in relative pt-24 pb-16">
            <div className="absolute top-0 left-0 right-0 text-center flex flex-col items-center animate-slide-up">
              <div className="bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)]/50 px-6 py-2 rounded-full mb-4 backdrop-blur-sm">
                <h2 className="text-3xl font-[Outfit] text-[var(--color-accent-gold)] font-bold tracking-widest uppercase">{tr('Hymn')}{' '}{state.hymnNumber}</h2>
              </div>
              <h3 className="text-4xl text-white/90 font-medium drop-shadow-lg">{tr(state.title)}</h3>
            </div>
            
            <AutoScaledText maxFontSize={8} minFontSize={2.5} className="mt-16 animate-slide-up w-full flex-1 flex flex-col justify-center hide-scrollbar" style={{ animationDelay: '100ms' }}>
              <div className="text-center drop-shadow-2xl text-white">
                {state.content.split('\n').map((line, i) => (
                  <p key={i} className="leading-[1.4] font-bold" style={{ marginBottom: line.trim() === '' ? '0.6em' : '0.15em' }}>
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            </AutoScaledText>

            {(state.verseIndex !== undefined && state.totalVerses !== undefined) && (
              <div className="absolute bottom-0 left-0 right-0 text-center animate-fade-in opacity-60">
                <p className="text-2xl font-medium tracking-widest uppercase">{tr('Verse')}{' '}{state.verseIndex}{' '}{tr('of')}{' '}{state.totalVerses}</p>
              </div>
            )}
          </div>
        )}

        {state?.type === 'verse' && (
          <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center animate-fade-in relative pt-24 pb-16">
            <div className="absolute top-0 left-0 right-0 text-center animate-slide-up">
              <div className="inline-block bg-[var(--color-accent-brand)]/20 border border-[var(--color-accent-brand)]/50 px-8 py-3 rounded-2xl backdrop-blur-md">
                <h2 className="text-5xl font-[Outfit] text-[var(--color-accent-brand)] font-bold tracking-wider">{tr(state.title)}</h2>
              </div>
            </div>
            <AutoScaledText maxFontSize={8} minFontSize={2.5} className="mt-12 w-full flex-1 flex flex-col justify-center hide-scrollbar animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="text-center drop-shadow-2xl text-white">
                <span className="text-[var(--color-accent-brand)]/50 font-serif text-[0.6em]">"</span>
                {state.content.split('\n').map((line, i) => (
                  <p key={i} className="leading-[1.5] font-bold" style={{ marginBottom: '0.15em' }}>
                    {line || '\u00A0'}
                  </p>
                ))}
                <span className="text-[var(--color-accent-brand)]/50 font-serif text-[0.6em]">"</span>
              </div>
            </AutoScaledText>
          </div>
        )}

        {state?.type === 'announcement' && (
          <div className="w-full max-w-6xl flex flex-col items-center justify-center h-full animate-fade-in p-8">
            <div className="w-full h-full max-h-[80vh] flex flex-col bg-[var(--color-bg-primary)]/80 p-16 rounded-[3rem] border border-[var(--color-accent-gold)]/40 backdrop-blur-2xl relative overflow-hidden animate-slide-up">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[var(--color-accent-gold)] to-transparent opacity-70"></div>
              {state.title && (
                <h2 className="text-6xl md:text-7xl font-[Outfit] text-[var(--color-accent-gold)] font-black mb-12 uppercase tracking-[0.2em] text-center drop-shadow-lg shrink-0">
                  {tr(state.title)}
                </h2>
              )}
              <AutoScaledText maxFontSize={6} minFontSize={2} className="flex-1 flex flex-col justify-center hide-scrollbar">
                <div className={`leading-[1.4] text-center font-bold text-white whitespace-pre-line drop-shadow-xl ${!state.title ? 'mt-8' : ''}`}>
                  {state.content}
                </div>
              </AutoScaledText>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AutoScaledText({ 
  children, 
  maxFontSize = 8, 
  minFontSize = 2.5,
  className = '', 
  style = {} 
}: { 
  children: React.ReactNode; 
  maxFontSize?: number;
  minFontSize?: number;
  className?: string; 
  style?: React.CSSProperties;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [computedSize, setComputedSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Binary search for the largest font size that fits
    let lo = minFontSize;
    let hi = maxFontSize;
    let best = minFontSize;

    // Temporarily remove transition for measurement
    content.style.transition = 'none';

    for (let i = 0; i < 20; i++) { // 20 iterations = very precise
      const mid = (lo + hi) / 2;
      content.style.fontSize = `${mid}rem`;

      // Force layout recalculation
      const contentHeight = content.scrollHeight;
      const contentWidth = content.scrollWidth;
      const containerHeight = container.clientHeight;
      const containerWidth = container.clientWidth;

      if (contentHeight <= containerHeight && contentWidth <= containerWidth) {
        best = mid;
        lo = mid; // Try larger
      } else {
        hi = mid; // Too big, try smaller
      }
    }

    // Apply the best size found
    content.style.transition = '';
    content.style.fontSize = `${best}rem`;
    setComputedSize(best);
  }, [children, maxFontSize, minFontSize]);

  // Also re-measure on window resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      let lo = minFontSize;
      let hi = maxFontSize;
      let best = minFontSize;
      content.style.transition = 'none';

      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        content.style.fontSize = `${mid}rem`;
        if (content.scrollHeight <= container.clientHeight && content.scrollWidth <= container.clientWidth) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }

      content.style.transition = '';
      content.style.fontSize = `${best}rem`;
      setComputedSize(best);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maxFontSize, minFontSize]);

  return (
    <div 
      ref={containerRef} 
      className={`overflow-hidden ${className}`} 
      style={style}
    >
      <div 
        ref={contentRef} 
        className="w-full flex flex-col items-center justify-center transition-[font-size] duration-300" 
        style={{ fontSize: `${computedSize}rem` }}
      >
        {children}
      </div>
    </div>
  );
}

