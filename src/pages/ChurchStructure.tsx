import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { MEN_RANKS, WOMEN_RANKS, HIERARCHY, ASSETS, type Rank } from '../data/ranks';
import { tr } from '../i18n';

/** A small robe in the rank's colours: robe, cross-bar strands and loins */
function Robe({ r }: { r: Rank }) {
  const loin = /blue/i.test(r.loins ?? '') ? '#2563EB' : /yellow/i.test(r.loins ?? '') ? '#EAB308' : /purple/i.test(r.loins ?? '') ? '#7E22CE' : r.loins ? '#F8FAFC' : null;
  const strand = /purple/i.test(r.strands ?? '') ? '#7E22CE' : /yellow/i.test(r.strands ?? '') ? '#EAB308' : /white/i.test(r.strands ?? '') ? '#F8FAFC' : null;
  const crosses = r.crosses ? Number(r.crosses[0]) || 0 : 0;
  return (
    <svg viewBox="0 0 40 56" width="34" height="48" aria-hidden className="shrink-0">
      {/* sutana */}
      <path d="M14 4 h12 l8 10 -4 4 v34 h-20 v-34 l-4 -4z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
      {/* robe / cape colour */}
      {r.robe && r.robe !== '#FFFFFF' && <path d="M14 4 h12 l8 10 -4 4 v34 h-6 v-34 h-8 v34 h-6 v-34 l-4 -4z" fill={r.robe} opacity="0.85" />}
      {/* cross-bar with strands */}
      {strand && <rect x="11" y="22" width="18" height="3" fill={strand} stroke="#94A3B8" strokeWidth="0.5" />}
      {/* loins */}
      {loin && <rect x="11" y="30" width="18" height="5" fill={loin} stroke="#94A3B8" strokeWidth="0.5" />}
      {Array.from({ length: Math.min(crosses, 3) }, (_, i) => (
        <path key={i} d={`M${16 + i * 4} 31.2 v2.6 M${14.8 + i * 4} 32.5 h2.4`} stroke={loin === '#F8FAFC' ? '#2563EB' : '#FFFFFF'} strokeWidth="0.9" />
      ))}
    </svg>
  );
}

function Ladder({ title, ranks }: { title: string; ranks: Rank[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
      <ol className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        {ranks.map((r, i) => (
          <li key={r.name} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full flex items-center gap-3 px-3 py-2 text-left">
              <span className="w-6 text-right text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{r.order}</span>
              <Robe r={r} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.name}</span>
                <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {r.line === 'prophet' ? tr('Prophet line') : r.line === 'leader' ? tr('Leader line') : tr('Both lines')}{r.note ? ` · ${r.note}` : ''}
                </span>
              </span>
              <ChevronDown size={16} className={`shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
            </button>
            {open === i && (
              <dl className="px-4 pb-3 pl-[4.75rem] text-xs grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <dt className="font-semibold">{tr('Garment')}</dt><dd>{r.garment}</dd>
                {r.loins && <><dt className="font-semibold">{tr('Loins')}</dt><dd>{r.loins}</dd></>}
                {r.crosses && <><dt className="font-semibold">{tr('Crosses')}</dt><dd>{r.crosses}</dd></>}
                {r.strands && <><dt className="font-semibold">{tr('Strands')}</dt><dd>{r.strands}</dd></>}
              </dl>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ChurchStructure() {
  usePageTitle('structure', 'Ranks, structure and symbols');
  const [tab, setTab] = useState<'ranks' | 'structure' | 'symbols'>('ranks');
  const tabs = [['ranks', 'Ranks'], ['structure', 'Structure'], ['symbols', 'Symbols & practice']] as const;

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24">
      <Link to="/learn" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('‹ Learn')}</Link>
      <h1 className="text-2xl font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-text-primary)' }}>Ranks, structure & symbols</h1>
      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('How the Celestial Church of Christ is ordered, governed and worships.')}</p>

      <div className="flex gap-1 mt-4 border-b" style={{ borderColor: 'var(--color-border)' }} role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="px-3 py-2 text-sm font-semibold -mb-px border-b-2"
                  style={tab === id ? { borderColor: 'var(--color-text-primary)', color: 'var(--color-text-primary)' } : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>{label}</button>
        ))}
      </div>

      {tab === 'ranks' && (
        <div className="mt-5 space-y-6">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Ranks are distinguished by the robes worn. Members rise by promotion up to Superior Senior Leader, Superior Senior Woleader and Superior Senior Elder; from Assistant Evangelist upward promotion is by the Pastor, not automatic. Tap a rank for its garment.')}</p>
          <div className="grid md:grid-cols-2 gap-6">
            <Ladder title={tr('Men — from the most senior')} ranks={MEN_RANKS} />
            <Ladder title={tr('Women — from the most senior')} ranks={WOMEN_RANKS} />
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Order and garments as published by Celestial Church of Christ Worldwide (“Spiritual Ranks”). The Constitution (1980, cl. 185) names the Church’s publication')}{' '}<em>{tr('Order of Seniority and Promotion and Dressing Rank by Rank')}</em>{' '}{tr('as the authority; orders can differ slightly between dioceses and editions.')}</p>
        </div>
      )}

      {tab === 'structure' && (
        <div className="mt-5">
          <ol className="relative space-y-3">
            {HIERARCHY.map((h, i) => (
              <li key={h.level} className="relative pl-10">
                <span className="absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}>{i + 1}</span>
                {i < HIERARCHY.length - 1 && <span className="absolute left-[13px] top-9 bottom-[-12px] w-0.5" style={{ backgroundColor: 'var(--color-border)' }} aria-hidden />}
                <div className="rounded-2xl p-3.5" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{h.level}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{h.who}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{h.detail} <span className="whitespace-nowrap">({h.source})</span></p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs mt-5" style={{ color: 'var(--color-text-muted)' }}>{tr('The Church today has more than one headquarters recognising different leaders; this outline follows the 1980 Constitution and is shared by all. See')}{' '}<Link to="/our-church" className="underline">{tr('Our Church')}</Link>.
          </p>
        </div>
      )}

      {tab === 'symbols' && (
        <ul className="mt-5 grid sm:grid-cols-2 gap-3">
          {ASSETS.map(a => (
            <li key={a.title} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(a.title)}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr(a.text)}</p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Source:')}{' '}{a.source}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
