import { useEffect, useState } from 'react';
import logoUrl from '../assets/logo.png';
import { tr } from '../i18n';

/**
 * The opening of onboarding: light rising behind the emblem, the name, “Halleluyah!”.
 * Moves on by itself after a moment; a tap skips it. Motion is skipped for people who prefer less.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = setTimeout(() => setLeaving(true), reduce ? 600 : 2600);
    const t2 = setTimeout(onDone, reduce ? 700 : 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <button onClick={onDone} aria-label={tr('Continue')} className={`splash fixed inset-0 z-[90] w-full h-full flex flex-col items-center justify-center overflow-hidden text-white ${leaving ? 'splash-leave' : ''}`}
            style={{ background: 'radial-gradient(ellipse at 50% 38%, #2D4BD8 0%, #13265C 55%, #0A1628 100%)' }}>
      {/* rays of light */}
      <span aria-hidden className="splash-rays absolute w-[160vmax] h-[160vmax]" />
      {/* soft glow */}
      <span aria-hidden className="splash-glow absolute w-64 h-64 rounded-full" />
      <img src={logoUrl} alt="" width={112} height={112} className="splash-logo relative w-28 h-28 rounded-[28px] shadow-2xl" />
      <span className="splash-title relative mt-6 text-3xl font-bold font-[Outfit] tracking-wide">{tr('CelestialWorship')}</span>
      <span className="splash-sub relative mt-2 text-sm tracking-[0.35em] uppercase" style={{ color: '#E8C36A' }}>{tr('Halleluyah!')}</span>
    </button>
  );
}
