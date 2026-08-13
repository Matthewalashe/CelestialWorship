import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { getServiceTypesForDate, formatDate } from '../utils/dateUtils';
import { referenceToPath } from '../utils/parseReference';
import type { ServiceOrder, Hymn, HymnCategory } from '../types';
import { CATEGORY_LABELS } from '../types';

export default function Devotion() {
  const { services, loading: servicesLoading } = useServices();
  const { hymns } = useHymns();
  const { lessons: todaysLessons } = useTodaysLessons();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [showHymnPicker, setShowHymnPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<HymnCategory | null>(null);

  // Auto-detect today's primary service
  const todayServiceIds = useMemo(() => getServiceTypesForDate(new Date()), []);

  // Selected service
  const selectedService = useMemo(
    () => services.find(s => s.id === (selectedServiceId || todayServiceIds[0])) || null,
    [services, selectedServiceId, todayServiceIds]
  );

  const steps = selectedService?.steps.filter(s => !s.isHeader) || [];
  const currentStepData = steps[currentStep];

  // Get matching hymns for a category
  const getHymnsForCategory = (category: HymnCategory): Hymn[] => {
    return hymns.filter(h => h.categories.includes(category)).slice(0, 8);
  };

  if (servicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Preparing your devotion...</div>
      </div>
    );
  }

  // Pre-devotion selection screen
  if (!isStarted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🕊️</div>
          <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">
            Private Devotion
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            A quiet, step-by-step guide for personal worship
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {formatDate(new Date())}
          </p>
        </div>

        {/* Service Selection */}
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Choose your service
          </h2>
          <div className="space-y-2">
            {/* Today's recommended services first */}
            {todayServiceIds.map(id => {
              const svc = services.find(s => s.id === id);
              if (!svc) return null;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedServiceId(id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    (selectedServiceId || todayServiceIds[0]) === id
                      ? 'bg-[var(--color-accent-gold)]/10 border-[var(--color-accent-gold)]/50'
                      : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-accent-gold)]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[var(--color-text-primary)] font-medium">
                        {svc.displayName}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]">
                        Today
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {svc.steps.filter(s => !s.isHeader).length} steps
                    </span>
                  </div>
                </button>
              );
            })}
            {/* Show other services in a collapsible */}
            <details className="mt-2">
              <summary className="text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-accent-gold)]">
                Other services...
              </summary>
              <div className="space-y-2 mt-2">
                {services
                  .filter(s => !todayServiceIds.includes(s.id))
                  .map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedServiceId(svc.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${
                        selectedServiceId === svc.id
                          ? 'bg-[var(--color-accent-gold)]/10 border-[var(--color-accent-gold)]/50'
                          : 'bg-[var(--color-bg-card)] border-[var(--color-border)]'
                      }`}
                    >
                      <span className="text-[var(--color-text-primary)]">{svc.displayName}</span>
                    </button>
                  ))}
              </div>
            </details>
          </div>
        </div>

        {/* Today's Readings Preview */}
        {todaysLessons.length > 0 && (
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-4 mb-6">
            <h3 className="text-sm text-[var(--color-text-muted)] mb-2">Today's Readings</h3>
            {todaysLessons.map((l, i) => (
              <div key={i} className="text-sm text-[var(--color-text-primary)] py-1">
                {l.firstLesson && <span>📖 {l.firstLesson.raw}</span>}
                {l.secondLesson && <span className="ml-3">📖 {l.secondLesson.raw}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={() => setIsStarted(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4A843] to-[#E8C36A] text-[#0A1628] font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-[#D4A843]/20"
        >
          Begin Devotion 🙏
        </button>
      </div>
    );
  }

  // Active devotion — step-by-step view
  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
          <span>{selectedService?.displayName}</span>
          <span>Step {currentStep + 1} of {steps.length}</span>
        </div>
        <div className="h-1.5 bg-[var(--color-bg-card)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D4A843] to-[#E8C36A] rounded-full transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      {currentStepData && (
        <div className="flex-1 flex flex-col items-center justify-center animate-[fadeIn_0.4s_ease-out]" key={currentStep}>
          {/* Step number */}
          {currentStepData.stepNumber && (
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent-gold)]/20 border border-[var(--color-accent-gold)]/40 flex items-center justify-center mb-6">
              <span className="text-[var(--color-accent-gold)] font-bold text-lg">
                {currentStepData.stepNumber}
              </span>
            </div>
          )}

          {/* Step content */}
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-6 w-full">
            <p className="text-lg text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
              {currentStepData.text}
            </p>

            {/* Hymn slot */}
            {currentStepData.hymnSlot && (
              <div className="mt-4 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-accent-gold)]/20">
                <div className="text-sm text-[var(--color-accent-gold)] font-medium mb-2">
                  🎵 {currentStepData.hymnSlot.category
                    ? `Hymn: ${CATEGORY_LABELS[currentStepData.hymnSlot.category] || currentStepData.hymnSlot.category}`
                    : `Hymn ${currentStepData.hymnSlot.fixedHymnNumber}`}
                </div>
                {currentStepData.hymnSlot.category && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {getHymnsForCategory(currentStepData.hymnSlot.category).slice(0, 4).map(h => (
                        <Link
                          key={h.number}
                          to={`/hymns/${h.number}`}
                          className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-card)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
                        >
                          #{h.number} {h.englishTitle || h.yorubaTitle || ''}
                        </Link>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setPickerCategory(currentStepData.hymnSlot!.category || null);
                        setShowHymnPicker(true);
                      }}
                      className="mt-2 text-xs text-[var(--color-accent-gold)] hover:underline"
                    >
                      See all matching hymns →
                    </button>
                  </>
                )}
                {currentStepData.hymnSlot.fixedHymnNumber && (
                  <Link
                    to={`/hymns/${currentStepData.hymnSlot.fixedHymnNumber}`}
                    className="text-sm text-[var(--color-accent-gold)] hover:underline"
                  >
                    Open Hymn #{currentStepData.hymnSlot.fixedHymnNumber} →
                  </Link>
                )}
              </div>
            )}

            {/* Scripture reference */}
            {currentStepData.scriptureRef && (
              <Link
                to={referenceToPath(currentStepData.scriptureRef)}
                className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
              >
                <span>📖</span>
                <span className="text-[var(--color-text-primary)] font-medium">
                  {currentStepData.scriptureRef.raw}
                </span>
                <span className="ml-auto text-[var(--color-accent-gold)]">Read →</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="flex-1 py-3 rounded-xl bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-border)] disabled:opacity-30 hover:bg-[var(--color-bg-card-hover)] transition-all"
        >
          ← Previous
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D4A843] to-[#E8C36A] text-[#0A1628] font-semibold hover:opacity-90 transition-opacity"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => {
              setIsStarted(false);
              setCurrentStep(0);
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            ✓ Complete
          </button>
        )}
      </div>

      {/* Exit */}
      <button
        onClick={() => {
          setIsStarted(false);
          setCurrentStep(0);
        }}
        className="mt-3 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-center"
      >
        Exit Devotion
      </button>

      {/* Hymn Picker Modal */}
      {showHymnPicker && pickerCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                {CATEGORY_LABELS[pickerCategory]}
              </h3>
              <button
                onClick={() => setShowHymnPicker(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {getHymnsForCategory(pickerCategory).map(h => (
                <Link
                  key={h.number}
                  to={`/hymns/${h.number}`}
                  onClick={() => setShowHymnPicker(false)}
                  className="block p-3 rounded-lg bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
                >
                  <span className="text-[var(--color-accent-gold)] font-semibold">#{h.number}</span>
                  <span className="text-[var(--color-text-primary)] ml-2">
                    {h.englishTitle || h.yorubaTitle || 'Untitled'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
