import { useParams, useNavigate, Link } from 'react-router-dom';
import { useService } from '../hooks/useServices';
import { CATEGORY_LABELS } from '../types';
import type { HymnSlot, ScriptureReference, HymnCategory } from '../types';
import { parseStepContent, getStepAccentColor, type ContentSegment } from '../utils/contentParser';

function formatHymnSlot(slot: HymnSlot): string {
  if (slot.fixedHymnNumber) return `Hymn ${slot.fixedHymnNumber}`;
  if (slot.category) return CATEGORY_LABELS[slot.category as HymnCategory] || slot.category;
  return 'Hymn';
}

function hymnSlotLink(slot: HymnSlot): string {
  if (slot.fixedHymnNumber) return `/hymns/${slot.fixedHymnNumber}`;
  if (slot.category) return `/hymns?category=${slot.category}`;
  return '/hymns';
}

function formatScriptureRef(ref: ScriptureReference): string {
  return ref.raw || `${ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`;
}

function scriptureRefLink(ref: ScriptureReference): string {
  const bookSlug = ref.book.toLowerCase().replace(/\s+/g, '-');
  return `/bible/${bookSlug}/${ref.chapter}`;
}

export default function ServiceDetail() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { service, loading } = useService(serviceId || '');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse" style={{ color: 'var(--color-text-secondary)' }}>Loading service...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="text-4xl mb-4">⛪</div>
        <h2 className="text-xl font-[Outfit] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Service not found
        </h2>
        <Link to="/services" className="btn-primary px-6 py-2 rounded-xl text-sm mt-4">
          Browse Services
        </Link>
      </div>
    );
  }

  const headerStep = service.steps.find(s => s.isHeader);
  const steps = service.steps.filter(s => !s.isHeader);

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24 animate-fade-in">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg> Back
      </button>

      {/* Service Header */}
      <div className="card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-4 right-4 text-5xl opacity-10">⛪</div>
        <h1 className="text-2xl font-[Outfit] font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {service.displayName}
        </h1>
        <div className="flex gap-3 text-sm font-medium mb-3" style={{ color: 'var(--color-accent-teal)' }}>
          <span>{service.day}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>•</span>
          <span>{service.time}</span>
        </div>
        {headerStep && (
          <div className="text-sm italic pl-3" 
             style={{ color: 'var(--color-text-secondary)', borderLeft: '2px solid var(--color-accent-gold)' }}>
            {headerStep.textLines && headerStep.textLines.length > 0 ? (
              headerStep.textLines.map((line: string, i: number) => (
                <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
              ))
            ) : (
              <p>{headerStep.text}</p>
            )}
          </div>
        )}
      </div>

      {/* Steps Timeline */}
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isRubric = step.type === 'rubric';
          const isHymn = step.type === 'hymn';
          const isScripture = step.type === 'scripture';
          const isPrayer = step.type === 'prayer';
          const accentColor = getStepAccentColor(step.type);
          const segments = parseStepContent(step.text, step.textLines, step.type);
          
          return (
            <div key={idx} className="flex gap-3 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
              {/* Step number */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                     style={{
                       backgroundColor: isHymn ? 'var(--color-accent-gold)' : isScripture ? 'var(--color-accent-blue)' : isPrayer ? 'var(--color-accent-teal)' : 'var(--color-bg-card)',
                       color: isHymn || isScripture || isPrayer ? 'var(--color-text-on-accent)' : 'var(--color-accent-teal)',
                       border: isHymn || isScripture || isPrayer ? 'none' : '2px solid var(--color-border)',
                     }}>
                  {isHymn ? '🎵' : isScripture ? '📖' : isPrayer ? '🙏' : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ backgroundColor: 'var(--color-border)' }} />
                )}
              </div>

              {/* Step content — structured rendering */}
              <div className="p-4 flex-1 mb-1 rounded-xl" style={{ borderLeftWidth: '3px', borderLeftColor: accentColor, backgroundColor: 'var(--color-bg-card)' }}>
                {/* Type badge */}
                {step.type !== 'instruction' && (
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mb-2"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                          color: accentColor,
                        }}>
                    {step.type}
                  </span>
                )}

                {/* Render structured segments */}
                {segments.map((segment, sIdx) => {
                  switch (segment.type) {
                    case 'hymn':
                      return (
                        <div key={sIdx} className="space-y-1">
                          {segment.title && (
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-accent-gold)' }}>
                              {segment.title}
                            </p>
                          )}
                          <div className="pl-3 space-y-0.5" style={{ borderLeft: `2px solid color-mix(in srgb, var(--color-accent-gold) 30%, transparent)` }}>
                            {segment.lines.map((line: string, li: number) => (
                              <p key={li} className="text-sm italic leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    case 'scripture':
                      return (
                        <div key={sIdx} className="space-y-1">
                          {segment.reference && (
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-accent-blue)' }}>
                              📖 {segment.reference}
                            </p>
                          )}
                          <div className="pl-3 space-y-0.5">
                            {segment.verses.map((v, vi: number) => (
                              <p key={vi} className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                <sup className="text-[10px] font-bold mr-1" style={{ color: 'var(--color-accent-blue)' }}>
                                  {v.number}
                                </sup>
                                {v.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    case 'instruction':
                    default:
                      return (
                        <div key={sIdx} className={`text-sm ${isRubric ? 'italic' : 'font-medium'} space-y-2`}
                             style={{ color: isRubric ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                          {segment.text.split('\n').filter(l => l.trim()).map((line: string, li: number) => (
                            <p key={li}>{isRubric && li === 0 ? '✦ ' : ''}{line}</p>
                          ))}
                        </div>
                      );
                  }
                })}

                {/* Hymn slot button */}
                {step.hymnSlot && (
                  <Link
                    to={hymnSlotLink(step.hymnSlot)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mt-2 transition-colors"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 15%, transparent)',
                      color: 'var(--color-accent-gold)',
                      border: '1px solid color-mix(in srgb, var(--color-accent-gold) 25%, transparent)',
                    }}
                  >
                    🎵 {formatHymnSlot(step.hymnSlot)}
                  </Link>
                )}

                {/* Scripture reference buttons */}
                {step.scriptureReferences && step.scriptureReferences.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2 ml-2">
                    {step.scriptureReferences.map((ref: ScriptureReference, i: number) => (
                      <Link
                        key={i}
                        to={scriptureRefLink(ref)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
                          color: 'var(--color-accent-blue)',
                          border: '1px solid color-mix(in srgb, var(--color-accent-blue) 25%, transparent)',
                        }}
                      >
                        📖 {formatScriptureRef(ref)}
                      </Link>
                    ))}
                  </div>
                ) : step.scriptureRef && (
                  <Link
                    to={scriptureRefLink(step.scriptureRef)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold mt-2 ml-2 transition-colors"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)',
                      color: 'var(--color-accent-blue)',
                      border: '1px solid color-mix(in srgb, var(--color-accent-blue) 25%, transparent)',
                    }}
                  >
                    📖 {formatScriptureRef(step.scriptureRef)}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Devotion CTA */}
      <div className="mt-10 text-center">
        <button 
          onClick={() => navigate(`/devotion?service=${serviceId}`)}
          className="btn-primary px-8 py-3 rounded-xl text-sm"
        >
          Start This Service →
        </button>
      </div>
    </div>
  );
}
