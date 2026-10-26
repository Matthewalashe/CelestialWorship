import { useCallback, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Printer, Share2, Bird, ListMusic, ChevronLeft, Music, BookOpen, HandHeart, Sparkles, Mic, HandCoins } from 'lucide-react';
import { useService } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Hymn, HymnCategory, ScriptureReference } from '../types';
import { getCandidateHymns } from '../utils/hymnMatcher';
import { toISODate } from '../utils/dateUtils';
import { showToast } from '../components/Toast';
import { tr } from '../i18n';
import { useHymnContext } from '../hooks/useHymnContext';
import { useDevotionData, type StepKind } from '../lib/devotion';
import { StepBlocks, HymnPanel, PassagePanel } from '../components/DevotionStep';

const KIND: Record<StepKind, { label: string; icon: React.ReactNode; colour: string }> = {
  prayer: { label: 'Prayer', icon: <HandHeart size={15} />, colour: 'var(--color-accent-brand)' },
  act: { label: 'Act of worship', icon: <Sparkles size={15} />, colour: 'var(--color-accent-brand)' },
  blessing: { label: 'Blessing', icon: <Sparkles size={15} />, colour: 'var(--color-accent-gold)' },
  sermon: { label: 'Sermon', icon: <Mic size={15} />, colour: 'var(--color-accent-gold)' },
  reading: { label: 'Bible lesson', icon: <BookOpen size={15} />, colour: 'var(--color-accent-blue)' },
  song: { label: 'Song', icon: <Music size={15} />, colour: 'var(--color-accent-gold)' },
  offering: { label: 'Offering', icon: <HandCoins size={15} />, colour: 'var(--color-accent-gold)' },
  hymn: { label: 'Hymn', icon: <Music size={15} />, colour: 'var(--color-accent-gold)' },
  psalm: { label: 'Psalm', icon: <BookOpen size={15} />, colour: 'var(--color-accent-blue)' },
};

/** The Order of Service on one page: every step in parts — who does what, the words, and how it is done */
export default function ServiceDetail() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { service, loading } = useService(serviceId || '');
  const { services: orders, loading: ordersLoading } = useDevotionData();
  const { hymns } = useHymns();
  const { lessons } = useTodaysLessons();
  const [hymnOpen, setHymnOpen] = useState<{ hymn: Hymn; step: number } | null>(null);
  const [passageOpen, setPassageOpen] = useState<{ ref: ScriptureReference; step: number } | null>(null);

  usePageTitle('service_detail', service ? `${tr(service.displayName)} — CCC Order of Service` : undefined);

  const hymnContext = useHymnContext(toISODate(new Date()), service?.id);
  const suggest = useCallback((category?: HymnCategory) => (category ? getCandidateHymns({ category }, hymns, 8, hymnContext).map(c => c.hymn) : []), [hymns, hymnContext]);

  if (loading || ordersLoading) {
    return <div className="flex items-center justify-center min-h-[60vh] animate-pulse" style={{ color: 'var(--color-text-secondary)' }}>{tr('Loading service...')}</div>;
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <h2 className="text-xl font-[Outfit] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Service not found')}</h2>
        <Link to="/services" className="btn-primary px-6 py-2 rounded-xl text-sm mt-4">{tr('Browse services')}</Link>
      </div>
    );
  }

  const order = orders[service.id];
  const steps = order?.steps ?? [];

  const share = async () => {
    const url = `${window.location.origin}/services/${service.id}`;
    if (navigator.share) { try { await navigator.share({ title: service.displayName, text: `Order of Service — ${tr(service.displayName)}`, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); showToast(tr('Link copied')); } catch {}
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 animate-fade-in print:pb-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm mb-6 print:hidden" style={{ color: 'var(--color-text-secondary)' }}>
        <ChevronLeft size={18} />{' '}{tr('Back')}</button>

      <header className="mb-8 space-y-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr('Order of Service')}</p>
        <h1 className="text-3xl font-[Outfit] font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{tr(service.displayName)}</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr(service.day)}{service.time ? ` · ${tr(service.time)}` : ''} · {steps.length}{' '}{tr('steps')}</p>
        <div className="flex flex-wrap gap-2 pt-1 print:hidden">
          <Link to={`/devotion?service=${service.id}`} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"><Bird size={15} />{' '}{tr('Start this service')}</Link>
          <Link to={`/suggestions?service=${service.id}`} className="px-4 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><ListMusic size={15} />{' '}{tr('Plan hymns')}</Link>
          <button onClick={() => window.print()} className="p-2.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} aria-label={tr('Print')}><Printer size={16} /></button>
          <button onClick={share} className="p-2.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} aria-label={tr('Share')}><Share2 size={16} /></button>
        </div>
        {order?.intro.length ? (
          <details className="rounded-2xl p-4 print:open" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Before the service — preparation notes')}</summary>
            <div className="mt-3 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {order.intro.map((b, i) => <p key={i}>{'text' in b ? tr(b.text) : null}</p>)}
            </div>
          </details>
        ) : null}
      </header>

      <ol className="space-y-10">
        {steps.map((step, idx) => {
          const k = KIND[step.kind] ?? KIND.act;
          return (
            <li key={idx} className="break-inside-avoid" id={`step-${idx + 1}`}>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: k.colour }}>
                <span className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold" style={{ backgroundColor: `color-mix(in srgb, ${k.colour} 14%, transparent)` }}>{idx + 1}</span>
                {k.icon} {tr(k.label)}
              </p>
              <h2 className="text-xl font-bold font-[Outfit] mb-4" style={{ color: 'var(--color-text-primary)' }}>{tr(step.title)}</h2>
              <StepBlocks step={step} lessons={lessons} isLordsDay={service.id === 'lords_day_service'} suggest={suggest} compact
                          onOpenHymn={n => { const h = hymns.find(x => x.number === n); if (h) setHymnOpen({ hymn: h, step: idx + 1 }); }}
                          onOpenPassage={ref => setPassageOpen({ ref, step: idx + 1 })}
                          onMoreHymns={() => navigate(`/hymns?category=${step.hymnSlot?.category ?? ''}`)} />
            </li>
          );
        })}
      </ol>

      {hymnOpen && <HymnPanel hymn={hymnOpen.hymn} step={hymnOpen.step} onClose={() => setHymnOpen(null)} />}
      {passageOpen && <PassagePanel reference={passageOpen.ref} step={passageOpen.step} onClose={() => setPassageOpen(null)} />}
    </div>
  );
}
