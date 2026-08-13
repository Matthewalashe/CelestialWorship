import { useParams, useNavigate, Link } from 'react-router-dom';
import { useService } from '../hooks/useServices';
import { CATEGORY_LABELS } from '../types';
import type { HymnSlot, ScriptureReference, HymnCategory } from '../types';

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
        ← Back
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
          <p className="text-sm italic pl-3" 
             style={{ color: 'var(--color-text-secondary)', borderLeft: '2px solid var(--color-accent-gold)' }}>
            {headerStep.text}
          </p>
        )}
      </div>

      {/* Steps Timeline */}
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isRubric = step.type === 'rubric';
          const isHymn = step.type === 'hymn';
          const isScripture = step.type === 'scripture';
          
          return (
            <div key={idx} className="flex gap-3 animate-slide-up" style={{ animationDelay: `${idx * 40}ms` }}>
              {/* Step number */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                     style={{
                       backgroundColor: isHymn ? 'var(--color-accent-gold)' : isScripture ? 'var(--color-accent-blue)' : 'var(--color-bg-card)',
                       color: isHymn || isScripture ? 'var(--color-text-on-accent)' : 'var(--color-accent-teal)',
                       border: isHymn || isScripture ? 'none' : '2px solid var(--color-border)',
                     }}>
                  {isHymn ? '🎵' : isScripture ? '📖' : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ backgroundColor: 'var(--color-border)' }} />
                )}
              </div>

              {/* Step content */}
              <div className="card p-4 flex-1 mb-1">
                {isRubric ? (
                  <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                    ✦ {step.text}
                  </p>
                ) : (
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {step.text}
                  </p>
                )}

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

                {/* Scripture reference button */}
                {step.scriptureRef && (
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
