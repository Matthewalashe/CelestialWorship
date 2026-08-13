import React, { useEffect, useState } from 'react';
import { useDisplayReceiver } from '../hooks/useLiveDisplay';

export default function Display() {
  const { displayState: state } = useDisplayReceiver();
  const [logoUrl, setLogoUrl] = useState('/logo.png'); // Fallback logic could be handled if needed, assuming /logo.png exists in public

  // Ensure pure black background and hide cursor for OBS/Projector
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.body.style.cursor = 'none';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.cursor = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center p-16 font-inter overflow-hidden relative">
      
      {/* Absolute overlay for crossfade background effect if needed */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${!state || state.type === 'blank' ? 'opacity-100 bg-black z-50' : 'opacity-0 pointer-events-none'}`}></div>

      <div className={`w-full h-full flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${(!state || state.type === 'blank') ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
        
        {state?.type === 'logo' && (
          <div className="flex flex-col items-center justify-center animate-slide-up relative">
            <div className="absolute inset-0 bg-[var(--color-accent-gold)]/10 blur-[100px] rounded-full animate-pulse"></div>
            <img 
              src={logoUrl} 
              alt="Celestial Church of Christ" 
              className="w-64 h-64 object-contain mb-8 z-10 drop-shadow-[0_0_30px_rgba(212,168,67,0.5)]" 
              onError={(e) => {
                // Fallback if logo not found
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden w-64 h-64 rounded-full border-4 border-[var(--color-accent-gold)] items-center justify-center mb-8 shadow-[0_0_60px_rgba(212,168,67,0.3)] bg-[var(--color-bg-primary)] z-10 flex text-[var(--color-accent-gold)] text-8xl font-black">⛪</div>
            
            <h1 className="text-7xl font-[Outfit] font-bold tracking-widest text-white drop-shadow-2xl z-10 text-center uppercase">
              CelestialWorship
            </h1>
            <p className="text-3xl text-[var(--color-accent-gold)] font-medium mt-4 tracking-widest uppercase z-10">
              Celestial Church of Christ
            </p>
          </div>
        )}

        {state?.type === 'hymn' && (
          <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center animate-fade-in relative">
            <div className="absolute top-12 left-0 right-0 text-center flex flex-col items-center animate-slide-up">
              <div className="bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)]/50 px-6 py-2 rounded-full mb-4 backdrop-blur-sm">
                <h2 className="text-3xl font-[Outfit] text-[var(--color-accent-gold)] font-bold tracking-widest uppercase">Hymn {state.hymnNumber}</h2>
              </div>
              <h3 className="text-4xl text-white/90 font-medium drop-shadow-lg">{state.title}</h3>
            </div>
            
            <div className="w-full flex flex-col items-center gap-12 mt-16 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="text-6xl md:text-7xl lg:text-[5.5rem] leading-[1.3] text-center font-bold whitespace-pre-line drop-shadow-2xl text-white">
                {state.content}
              </div>
              {state.subtitle && (
                <div className="text-4xl md:text-5xl lg:text-[4rem] leading-[1.3] text-center font-medium italic whitespace-pre-line drop-shadow-xl text-[var(--color-accent-gold)]/90 mt-4">
                  {state.subtitle}
                </div>
              )}
            </div>
          </div>
        )}

        {state?.type === 'verse' && (
          <div className="w-full h-full max-w-7xl flex flex-col items-center justify-center animate-fade-in relative">
            <div className="absolute top-16 left-0 right-0 text-center animate-slide-up">
              <div className="inline-block bg-[var(--color-accent-teal)]/20 border border-[var(--color-accent-teal)]/50 px-8 py-3 rounded-2xl backdrop-blur-md shadow-[0_0_40px_rgba(20,184,166,0.2)]">
                <h2 className="text-5xl font-[Outfit] text-[var(--color-accent-teal)] font-bold tracking-wider">{state.title}</h2>
              </div>
            </div>
            
            <div className="mt-8 text-6xl md:text-7xl lg:text-[5.5rem] leading-[1.4] text-center font-bold drop-shadow-2xl text-white animate-slide-up" style={{ animationDelay: '100ms' }}>
              <span className="text-[var(--color-accent-teal)]/50 mr-4 font-serif">"</span>
              {state.content}
              <span className="text-[var(--color-accent-teal)]/50 ml-4 font-serif">"</span>
            </div>
          </div>
        )}

        {state?.type === 'announcement' && (
          <div className="w-full max-w-6xl flex flex-col items-center justify-center h-full animate-fade-in p-8">
            <div className="w-full bg-[var(--color-bg-primary)]/80 p-20 rounded-[3rem] border border-[var(--color-accent-gold)]/40 backdrop-blur-2xl shadow-[0_0_80px_rgba(212,168,67,0.15)] relative overflow-hidden animate-slide-up">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[var(--color-accent-gold)] to-transparent opacity-70"></div>
              
              {state.title && (
                <h2 className="text-6xl md:text-7xl font-[Outfit] text-[var(--color-accent-gold)] font-black mb-16 uppercase tracking-[0.2em] text-center drop-shadow-lg">
                  {state.title}
                </h2>
              )}
              
              <div className={`text-5xl md:text-6xl lg:text-[4.5rem] leading-[1.4] text-center font-bold text-white whitespace-pre-line drop-shadow-xl ${!state.title ? 'mt-8' : ''}`}>
                {state.content}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
