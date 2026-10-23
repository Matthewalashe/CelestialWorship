import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Music, BookOpen, Printer, Share2, Bird, ListMusic, ChevronLeft } from 'lucide-react';
import { useService } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { usePageTitle } from '../hooks/usePageTitle';
import { CATEGORY_LABELS } from '../types';
import type { HymnSlot, Hymn, ServiceStep } from '../types';
import { parseStepContent, getStepAccentColor } from '../utils/contentParser';
import { planHymns } from '../utils/hymnMatcher';
import { displayTitle } from '../utils/hymnText';
import { toISODate } from '../utils/dateUtils';
import { PassageText } from '../components/PassageText';
import { MemberInPrayer } from '../components/icons/celestial-icons';
import { showToast } from '../components/Toast';
import { tr } from '../i18n';
import { useHymnContext } from '../hooks/useHymnContext';

function HymnSlotBlock({ slot, hymns, suggestion }: { slot: HymnSlot; hymns: Hymn[]; suggestion?: Hymn | null }) {
  const chip = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold';
  const gold = {
    backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 12%, transparent)',
    color: 'var(--color-accent-gold)',
    border: '1px solid color-mix(in srgb, var(--color-accent-gold) 25%, transparent)',
  };
  if (slot.fixedHymnNumber) {
    const hymn = hymns.find(h => h.number === slot.fixedHymnNumber);
    return hymn ? (
      <Link to={`/hymns/${hymn.number}`} className={chip} style={gold}>
        <Music size={14} />{' '}{tr('Hymn')}{' '}{hymn.number} · {displayTitle(hymn, 'yo')}
      </Link>
    ) : (
      <span className={chip} style={gold}><Music size={14} />{' '}{tr('Hymn')}{' '}{slot.fixedHymnNumber}{' '}{tr('· not in this hymnal edition')}</span>
    );
  }
  if (slot.category) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {suggestion && (
          <Link to={`/hymns/${suggestion.number}`} className={chip} style={gold}>
            <Music size={14} />{' '}{tr('Suggested:')}{' '}{suggestion.number} · {displayTitle(suggestion, 'yo')}
          </Link>
        )}
        <Link to={`/hymns?category=${slot.category}`} className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{tr('More')}{' '}{CATEGORY_LABELS[slot.category] ?? slot.category}{' '}{tr('hymns →')}</Link>
      </div>
    );
  }
  return null;
}

function StepBody({ step }: { step: ServiceStep }) {
  const isRubric = step.type === 'rubric';
  const segments = parseStepContent(step.text, step.textLines, step.type);
  return (
    <>
      {segments.map((segment, i) => {
        switch (segment.type) {
          case 'hymn':
            return (
              <div key={i} className="space-y-1">
                {segment.title && <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-accent-gold)' }}>{tr(segment.title)}</p>}
                <div className="pl-3 space-y-0.5 border-l-2" style={{ borderColor: 'color-mix(in srgb, var(--color-accent-gold) 30%, transparent)' }}>
                  {segment.lines.map((line, li) => <p key={li} className="text-sm italic leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{line}</p>)}
                </div>
              </div>
            );
          case 'scripture':
            return (
              <div key={i} className="space-y-1">
                {segment.reference && <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-accent-blue)' }}>{segment.reference}</p>}
                <div className="pl-3 space-y-0.5">
                  {segment.verses.map((v, vi) => (
                    <p key={vi} className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      <sup className="text-[10px] font-bold mr-1" style={{ color: 'var(--color-accent-blue)' }}>{v.number}</sup>{tr(v.text)}
                    </p>
                  ))}
                </div>
              </div>
            );
          default:
            return (
              <div key={i} className={`text-sm ${isRubric ? 'italic' : 'font-medium'} space-y-2`}
                   style={{ color: isRubric ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                {segment.text.split('\n').filter(l => l.trim()).map((line, li) => <p key={li}>{isRubric && li === 0 ? '✦ ' : ''}{line}</p>)}
              </div>
            );
        }
      })}
    </>
  );
}

export default function ServiceDetail() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { service, loading } = useService(serviceId || '');
  const { hymns } = useHymns();

  usePageTitle('service_detail', service ? `${service.displayName} — CCC Order of Service` : undefined);

  // Today's suggested hymn for each open slot (same logic as the Hymn Selector)
  const hymnContext = useHymnContext(toISODate(new Date()), service?.id);
  const suggestions = useMemo(() => {
    if (!service || !hymns.length) return new Map<number, Hymn | null>();
    const plan = planHymns(service, hymns, hymnContext);
    return new Map(plan.map(p => [p.stepNumber, p.selected?.hymn ?? null]));
  }, [service, hymns, hymnContext]);

  if (loading) {
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

  const headerStep = service.steps.find(s => s.isHeader);
  const steps = service.steps.filter(s => !s.isHeader);

  const share = async () => {
    const url = `${window.location.origin}/services/${service.id}`;
    if (navigator.share) { try { await navigator.share({ title: service.displayName, text: `Order of Service — ${service.displayName}`, url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); showToast(tr('Link copied')); } catch {}
  };

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24 animate-fade-in print:pb-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm mb-5 print:hidden" style={{ color: 'var(--color-text-secondary)' }}>
        <ChevronLeft size={18} />{' '}{tr('Back')}</button>

      <div className="card p-6 mb-6">
        <h1 className="text-2xl font-[Outfit] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{service.displayName}</h1>
        <div className="flex gap-3 text-sm font-medium mb-3" style={{ color: 'var(--color-accent-brand)' }}>
          <span>{service.day}</span>
          {service.time && <><span style={{ color: 'var(--color-text-muted)' }}>•</span><span>{service.time}</span></>}
        </div>
        {headerStep && (() => {
          // The title line ("ORDER OF SERVICE ON LORD'S DAY…") is shown as is; the preparation notes after it fold away
          const text = headerStep.text.trim();
          const split = text.search(/\b(Note|Important|N\.B)\b/i);
          const title = split > 0 ? text.slice(0, split).trim() : text.length > 140 ? '' : text;
          const notes = split > 0 ? text.slice(split).trim() : text.length > 140 ? text : '';
          return (
            <div className="text-sm pl-3 border-l-2 space-y-2" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-accent-gold)' }}>
              {title && <p className="italic">{title}</p>}
              {notes && (
                <details className="print:open">
                  <summary className="cursor-pointer font-semibold not-italic" style={{ color: 'var(--color-accent-brand)' }}>{tr('Before the service — preparation notes')}</summary>
                  <p className="mt-2 leading-relaxed whitespace-pre-line">{notes}</p>
                </details>
              )}
            </div>
          );
        })()}
        <div className="flex flex-wrap gap-2 mt-4 print:hidden">
          <Link to={`/devotion?service=${service.id}`} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"><Bird size={15} />{' '}{tr('Start this service')}</Link>
          <Link to={`/suggestions?service=${service.id}`} className="px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><ListMusic size={15} />{' '}{tr('Plan hymns')}</Link>
          <button onClick={() => window.print()} className="p-2 rounded-xl border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} aria-label={tr('Print')}><Printer size={16} /></button>
          <button onClick={share} className="p-2 rounded-xl border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} aria-label={tr('Share')}><Share2 size={16} /></button>
        </div>
      </div>

      <ol className="space-y-4">
        {steps.map((step, idx) => {
          const isHymn = step.type === 'hymn';
          const isScripture = step.type === 'scripture';
          const isPrayer = step.type === 'prayer';
          const accentColor = getStepAccentColor(step.type);
          return (
            <li key={idx} className="flex gap-3 break-inside-avoid">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                     style={{
                       backgroundColor: isHymn ? 'var(--color-accent-gold)' : isScripture ? 'var(--color-accent-blue)' : isPrayer ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
                       color: isHymn || isScripture || isPrayer ? 'var(--color-text-on-accent)' : 'var(--color-accent-brand)',
                       border: isHymn || isScripture || isPrayer ? 'none' : '2px solid var(--color-border)',
                     }}
                     role="img" aria-label={`Step ${idx + 1}${step.type !== 'instruction' ? `, ${step.type}` : ''}`}>
                  {isHymn ? <Music size={14} /> : isScripture ? <BookOpen size={14} /> : isPrayer ? <MemberInPrayer size={14} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && <div className="w-px flex-1 my-1" style={{ backgroundColor: 'var(--color-border)' }} />}
              </div>

              <div className="p-4 flex-1 mb-1 rounded-xl space-y-2" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                {step.type !== 'instruction' && (
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor }}>
                    {step.type}
                  </span>
                )}
                <StepBody step={step} />
                {step.hymnSlot && <HymnSlotBlock slot={step.hymnSlot} hymns={hymns} suggestion={suggestions.get(step.stepNumber ?? 0)} />}
                {step.scriptureReferences?.map((ref, i) => <PassageText key={i} reference={ref} compact />)}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
