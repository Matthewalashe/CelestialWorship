import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { useReaderMode } from '../hooks/useReaderMode';
import { getServiceTypesForDate, formatDate } from '../utils/dateUtils';
import { referenceToPath } from '../utils/parseReference';
import { parseStepContent, getStepIcon, getStepAccentColor, type ContentSegment } from '../utils/contentParser';
import type { Hymn, HymnCategory } from '../types';
import { CATEGORY_LABELS } from '../types';

const SESSION_KEY = 'cw-devotion-state';

interface DevotionState {
  currentStep: number;
  selectedServiceId: string | null;
  isStarted: boolean;
}

function saveDevotionState(state: DevotionState) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function loadDevotionState(): DevotionState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function clearDevotionState() {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Render a content segment with proper visual structure */
function SegmentRenderer({ segment, isReader }: { segment: ContentSegment; isReader: boolean }) {
  switch (segment.type) {
    case 'hymn':
      return (
        <div className="mt-4">
          {segment.title && (
            <p className={`text-sm font-semibold mb-2 ${isReader ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-accent-gold)]'}`}>
              {segment.title}
            </p>
          )}
          <div className={`pl-4 ${isReader ? 'border-l border-[var(--color-text-muted)]' : 'border-l-2 border-[var(--color-accent-gold)]'}`}>
            {segment.lines.map((line, i) => (
              <p key={i} className={`leading-relaxed italic ${isReader ? 'text-lg text-[var(--color-text-primary)]' : 'text-base text-[var(--color-text-primary)]'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      );

    case 'scripture':
      return (
        <div className="mt-4">
          {segment.reference && (
            <p className={`text-sm font-semibold mb-2 ${isReader ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-accent-blue)]'}`}>
              {segment.reference}
            </p>
          )}
          <div className="pl-3 space-y-1">
            {segment.verses.map((v, i) => (
              <p key={i} className={`leading-relaxed ${isReader ? 'text-lg text-[var(--color-text-primary)]' : 'text-base text-[var(--color-text-primary)]'}`}>
                <sup className={`text-xs font-bold mr-1 ${isReader ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-accent-blue)]'}`}>{v.number}</sup>
                {v.text}
              </p>
            ))}
          </div>
        </div>
      );

    case 'instruction':
    default:
      return (
        <p className={`leading-relaxed whitespace-pre-line text-[var(--color-text-primary)] ${isReader ? 'text-lg' : 'text-base'}`}>
          {segment.text}
        </p>
      );
  }
}

export default function Devotion() {
  const { services, loading: servicesLoading } = useServices();
  const { hymns } = useHymns();
  const { lessons: todaysLessons } = useTodaysLessons();
  const { readerMode, cycleReaderMode, isReaderActive } = useReaderMode();

  // Restore state from sessionStorage
  const savedState = useMemo(() => loadDevotionState(), []);

  const [currentStep, setCurrentStep] = useState(savedState?.currentStep ?? 0);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(savedState?.selectedServiceId ?? null);
  const [isStarted, setIsStarted] = useState(savedState?.isStarted ?? false);
  const [showHymnPicker, setShowHymnPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<HymnCategory | null>(null);
  const [showReaderOverlay, setShowReaderOverlay] = useState(false);

  // Persist state changes to sessionStorage
  useEffect(() => {
    saveDevotionState({ currentStep, selectedServiceId, isStarted });
  }, [currentStep, selectedServiceId, isStarted]);

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

  // Handle exit / complete — clear session state
  const handleExit = useCallback(() => {
    setIsStarted(false);
    setCurrentStep(0);
    clearDevotionState();
  }, []);

  // Reader touch handlers
  const handleReaderTouch = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isReaderActive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPercent = x / rect.width;
    const yPercent = y / rect.height;

    // Top 15% = toggle overlay
    if (yPercent < 0.15) {
      setShowReaderOverlay(prev => !prev);
      return;
    }

    // Hide overlay if visible
    if (showReaderOverlay) {
      setShowReaderOverlay(false);
      return;
    }

    // Left 15% = previous step
    if (xPercent < 0.15) {
      setCurrentStep(s => Math.max(0, s - 1));
      return;
    }

    // Remaining 85% = next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    }
  }, [isReaderActive, showReaderOverlay, currentStep, steps.length]);

  if (servicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Preparing your devotion...</div>
      </div>
    );
  }

  // Pre-devotion selection screen (never in reader mode)
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
            {todayServiceIds.map(id => {
              const svc = services.find(s => s.id === id);
              if (!svc) return null;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedServiceId(id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    (selectedServiceId || todayServiceIds[0]) === id
                      ? 'bg-[var(--color-accent-teal)]/10'
                      : 'bg-[var(--color-bg-card)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[var(--color-text-primary)] font-medium">
                        {svc.displayName}
                      </span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-teal)]/15 text-[var(--color-accent-teal)]">
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
            <details className="mt-2">
              <summary className="text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-accent-teal)]">
                Other services...
              </summary>
              <div className="space-y-2 mt-2">
                {services
                  .filter(s => !todayServiceIds.includes(s.id))
                  .map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedServiceId(svc.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all text-sm ${
                        selectedServiceId === svc.id
                          ? 'bg-[var(--color-accent-teal)]/10'
                          : 'bg-[var(--color-bg-card)]'
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
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-4 mb-6">
            <h3 className="text-sm text-[var(--color-text-muted)] mb-2">Today's Readings</h3>
            {todaysLessons.map((l, i) => (
              <div key={i} className="text-sm text-[var(--color-text-primary)] py-1">
                {l.firstLesson && <span>{l.firstLesson.raw}</span>}
                {l.secondLesson && <span className="ml-3">{l.secondLesson.raw}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={() => setIsStarted(true)}
          className="w-full py-4 rounded-2xl text-[var(--color-text-on-accent)] font-bold text-lg"
          style={{ backgroundColor: 'var(--color-accent-teal)' }}
        >
          Begin Devotion
        </button>
      </div>
    );
  }

  // Parse content segments for current step
  const segments = currentStepData
    ? parseStepContent(currentStepData.text, currentStepData.textLines, currentStepData.type)
    : [];

  const stepType = currentStepData?.type || 'instruction';
  const accentColor = isReaderActive ? 'var(--color-text-primary)' : getStepAccentColor(stepType);

  // ══════════════════════════════════════════════════════════
  // READER MODE — Full-screen Kindle-style reading canvas
  // ══════════════════════════════════════════════════════════
  if (isReaderActive) {
    return (
      <div
        data-reader={readerMode}
        className="fixed inset-0 z-40 flex flex-col select-none"
        style={{
          backgroundColor: readerMode === 'paper-dark' ? '#E8E8E8' : '#FAFAFA',
          color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000000',
          fontFamily: "'Noto Sans', 'Inter', sans-serif",
        }}
      >
        {/* Touch zone layer — invisible */}
        <div
          className="absolute inset-0 z-10"
          onClick={handleReaderTouch}
          style={{ cursor: 'default' }}
        />

        {/* Progress overlay — shown on top-15% tap */}
        {showReaderOverlay && (
          <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4"
               style={{
                 backgroundColor: readerMode === 'paper-dark' ? '#D5D5D5' : '#F0F0F0',
                 borderBottom: `1px solid ${readerMode === 'paper-dark' ? '#333' : '#E8E8E8'}`,
               }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000' }}>
                {selectedService?.displayName}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); cycleReaderMode(); }}
                  className="text-xs px-2 py-1"
                  style={{
                    border: `1px solid ${readerMode === 'paper-dark' ? '#333' : '#888'}`,
                    backgroundColor: 'transparent',
                    color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000',
                  }}
                >
                  {readerMode === 'paper' ? 'Dim' : 'Light'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleExit(); }}
                  className="text-xs px-2 py-1"
                  style={{
                    border: `1px solid ${readerMode === 'paper-dark' ? '#333' : '#888'}`,
                    backgroundColor: 'transparent',
                    color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000',
                  }}
                >
                  Exit Devotion
                </button>
              </div>
            </div>
            {/* Step counter */}
            <div className="text-center text-lg font-semibold mb-2">
              Step {currentStep + 1} of {steps.length}
            </div>
            {/* Progress bar — solid black fill */}
            <div className="h-1 w-full" style={{ backgroundColor: readerMode === 'paper-dark' ? '#555' : '#E8E8E8' }}>
              <div
                className="h-full"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                  backgroundColor: readerMode === 'paper-dark' ? '#1A1A1A' : '#000',
                }}
              />
            </div>
          </div>
        )}

        {/* Reading content — fills the screen */}
        <div className="flex-1 flex flex-col justify-center px-8 py-16 overflow-hidden relative z-0">
          {/* Subtle step indicator — top of reading area */}
          <div className="text-center mb-8">
            <span className="text-xs tracking-widest uppercase"
                  style={{ color: readerMode === 'paper-dark' ? '#666' : '#888' }}>
              {currentStepData?.stepNumber && `${currentStepData.stepNumber}.`} {stepType}
            </span>
          </div>

          {/* Step text content — clean, no cards, no borders */}
          <div className="flex-1 flex flex-col justify-start max-w-lg mx-auto w-full">
            {segments.map((segment, i) => (
              <SegmentRenderer key={i} segment={segment} isReader={true} />
            ))}

            {/* Hymn reference — plain text, underlined tap target */}
            {currentStepData?.hymnSlot && (
              <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${readerMode === 'paper-dark' ? '#333' : '#E8E8E8'}` }}>
                <p className="text-sm" style={{ color: readerMode === 'paper-dark' ? '#333' : '#888' }}>
                  Hymn: {currentStepData.hymnSlot.category
                    ? CATEGORY_LABELS[currentStepData.hymnSlot.category] || currentStepData.hymnSlot.category
                    : `#${currentStepData.hymnSlot.fixedHymnNumber}`}
                </p>
                {currentStepData.hymnSlot.category && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {getHymnsForCategory(currentStepData.hymnSlot.category).slice(0, 4).map(h => (
                      <Link key={h.number} to={`/hymns/${h.number}`}
                            className="text-sm underline"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000' }}>
                        #{h.number}
                      </Link>
                    ))}
                  </div>
                )}
                {currentStepData.hymnSlot.fixedHymnNumber && (
                  <Link to={`/hymns/${currentStepData.hymnSlot.fixedHymnNumber}`}
                        className="text-sm underline mt-1 inline-block"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000' }}>
                    Open Hymn #{currentStepData.hymnSlot.fixedHymnNumber}
                  </Link>
                )}
              </div>
            )}

            {/* Scripture reference — plain underlined link */}
            {currentStepData?.scriptureRef && (
              <div className="mt-6">
                <Link to={referenceToPath(currentStepData.scriptureRef)}
                      className="text-sm underline"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: readerMode === 'paper-dark' ? '#1A1A1A' : '#000' }}>
                  Read: {currentStepData.scriptureRef.raw}
                </Link>
              </div>
            )}
          </div>

          {/* Bottom page position — like a book footer */}
          <div className="text-center mt-auto pt-6">
            <span className="text-xs"
                  style={{ color: readerMode === 'paper-dark' ? '#666' : '#888' }}>
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // NORMAL MODE — Standard app UI
  // ══════════════════════════════════════════════════════════
  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--color-text-muted)]">{selectedService?.displayName}</span>
        <button
          onClick={cycleReaderMode}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-secondary)',
          }}
        >
          📖 Reader
        </button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
          <span className="capitalize text-xs">{stepType}</span>
          <span>Step {currentStep + 1} of {steps.length}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div
            className="h-full rounded-full"
            style={{ 
              width: `${((currentStep + 1) / steps.length) * 100}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      </div>

      {/* Current Step */}
      {currentStepData && (
        <div className="flex-1 flex flex-col" key={currentStep}>
          {/* Step content — no card borders */}
          <div className="flex-1 py-6 px-2">
            {segments.map((segment, i) => (
              <SegmentRenderer key={i} segment={segment} isReader={false} />
            ))}

            {/* Hymn slot */}
            {currentStepData.hymnSlot && (
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
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
                          className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-primary)]"
                          style={{ backgroundColor: 'var(--color-bg-card)' }}
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
                className="mt-4 flex items-center gap-2 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <span className="text-[var(--color-text-primary)] font-medium">
                  {currentStepData.scriptureRef.raw}
                </span>
                <span className="ml-auto text-[var(--color-accent-teal)]">Read →</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="flex-1 py-3 rounded-xl text-[var(--color-text-primary)] disabled:opacity-30"
          style={{ backgroundColor: 'var(--color-bg-card)' }}
        >
          ‹ Previous
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl font-semibold text-[var(--color-text-on-accent)]"
            style={{ backgroundColor: 'var(--color-accent-teal)' }}
          >
            Next ›
          </button>
        ) : (
          <button
            onClick={handleExit}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-600"
          >
            ✓ Complete
          </button>
        )}
      </div>

      {/* Exit */}
      <button
        onClick={handleExit}
        className="mt-3 text-sm text-[var(--color-text-muted)] text-center"
      >
        Exit Devotion
      </button>

      {/* Hymn Picker Modal */}
      {showHymnPicker && pickerCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col">
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-[var(--color-text-primary)]">
                {CATEGORY_LABELS[pickerCategory]}
              </h3>
              <button
                onClick={() => setShowHymnPicker(false)}
                className="text-[var(--color-text-muted)]"
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
                  className="block p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--color-bg-card)' }}
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
