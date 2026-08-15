import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useDisplayReceiver } from '../hooks/useLiveDisplay';

export default function Display() {
  const { displayState: state } = useDisplayReceiver();
  const [logoUrl, setLogoUrl] = useState('/logo.png');

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
            <img src={logoUrl} alt="Celestial Church of Christ" className="w-64 h-64 object-contain mb-8 z-10 drop-shadow-[0_0_30px_rgba(212,168,67,0.5)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 className="text-7xl font-[Outfit] font-bold tracking-widest text-white drop-shadow-2xl z-10 text-center uppercase">CelestialWorship</h1>
            <p className="text-3xl text-[var(--color-accent-gold)] font-medium mt-4 tracking-widest uppercase z-10">Celestial Church of Christ</p>
          </div>
        )}

        {state?.type === 'hymn' && (
          <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center animate-fade-in relative pt-24 pb-16">
            <div className="absolute top-0 left-0 right-0 text-center flex flex-col items-center animate-slide-up">
              <div className="bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)]/50 px-6 py-2 rounded-full mb-4 backdrop-blur-sm">
                <h2 className="text-3xl font-[Outfit] text-[var(--color-accent-gold)] font-bold tracking-widest uppercase">Hymn {state.hymnNumber}</h2>
              </div>
              <h3 className="text-4xl text-white/90 font-medium drop-shadow-lg">{state.title}</h3>
            </div>
            
            <AutoScaledText maxFontSize={5.5} className="mt-16 animate-slide-up w-full flex-1 flex flex-col justify-center hide-scrollbar" style={{ animationDelay: '100ms' }}>
              <div className="leading-[1.3] text-center font-bold whitespace-pre-line drop-shadow-2xl text-white">
                {state.content}
              </div>
              {state.subtitle && (
                <div className="text-[0.7em] leading-[1.3] text-center font-medium italic whitespace-pre-line drop-shadow-xl text-[var(--color-accent-gold)]/90 mt-4">
                  {state.subtitle}
                </div>
              )}
            </AutoScaledText>

            {(state.verseIndex !== undefined && state.totalVerses !== undefined) && (
              <div className="absolute bottom-0 left-0 right-0 text-center animate-fade-in opacity-60">
                <p className="text-2xl font-medium tracking-widest uppercase">Verse {state.verseIndex} of {state.totalVerses}</p>
              </div>
            )}
          </div>
        )}

        {state?.type === 'verse' && (
          <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center animate-fade-in relative pt-24 pb-16">
            <div className="absolute top-0 left-0 right-0 text-center animate-slide-up">
              <div className="inline-block bg-[var(--color-accent-teal)]/20 border border-[var(--color-accent-teal)]/50 px-8 py-3 rounded-2xl backdrop-blur-md">
                <h2 className="text-5xl font-[Outfit] text-[var(--color-accent-teal)] font-bold tracking-wider">{state.title}</h2>
              </div>
            </div>
            <AutoScaledText maxFontSize={5.5} className="mt-12 w-full flex-1 flex flex-col justify-center hide-scrollbar animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="leading-[1.4] text-center font-bold drop-shadow-2xl text-white">
                <span className="text-[var(--color-accent-teal)]/50 mr-4 font-serif">"</span>
                {state.content}
                <span className="text-[var(--color-accent-teal)]/50 ml-4 font-serif">"</span>
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
                  {state.title}
                </h2>
              )}
              <AutoScaledText maxFontSize={4.5} className="flex-1 flex flex-col justify-center hide-scrollbar">
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

function AutoScaledText({ children, maxFontSize, className = '', style = {} }: { children: React.ReactNode, maxFontSize: number, className?: string, style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let currentSize = maxFontSize;
    const minSize = 1.5; // absolute minimum size in rem
    content.style.fontSize = `${currentSize}rem`;

    const adjustSize = () => {
      if (
        (content.scrollHeight > container.clientHeight || content.scrollWidth > container.clientWidth) &&
        currentSize > minSize
      ) {
        currentSize -= 0.1;
        content.style.fontSize = `${currentSize}rem`;
        requestAnimationFrame(adjustSize);
      }
    };

    // Reset on content change
    setFontSize(maxFontSize);
    content.style.fontSize = `${maxFontSize}rem`;
    
    // Using requestAnimationFrame to let the browser paint with the max size and then adjust
    requestAnimationFrame(adjustSize);
  }, [children, maxFontSize]);

  return (
    <div ref={containerRef} className={`overflow-y-auto ${className}`} style={style}>
      <div ref={contentRef} className="w-full h-auto transition-all duration-200 flex flex-col items-center justify-center" style={{ fontSize: `${fontSize}rem` }}>
        {children}
      </div>
    </div>
  );
}
