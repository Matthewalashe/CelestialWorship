import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { useReaderMode } from '../hooks/useReaderMode';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSwipe } from '../hooks/useSwipe';
import { getServiceTypesForDate, formatDate } from '../utils/dateUtils';
import { referenceToPath } from '../utils/parseReference';
import { parseStepContent, getStepAccentColor, type ContentSegment } from '../utils/contentParser';
import type { Hymn, HymnCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import { Bird, Music, BookOpen, Moon, Sun, X, ChevronLeft, ChevronRight, ChevronDown, MonitorSmartphone } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';

const STORAGE_KEY = 'cw-devotion-state';

interface DevotionState {
  currentStep: number;
  selectedServiceId: string | null;
  isStarted: boolean;
  savedAt: number; // timestamp for resume prompt staleness
}

function saveDevotionState(state: Omit<DevotionState, 'savedAt'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
}

function loadDevotionState(): DevotionState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Expire after 24 hours
      if (parsed.savedAt && Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
        return parsed;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return null;
}

function clearDevotionState() {
  localStorage.removeItem(STORAGE_KEY);
}

function SegmentRenderer({ segment, isReader }: { segment: ContentSegment; isReader: boolean }) {
  switch (segment.type) {
    case 'hymn':
      return (
        <div className="mt-4">
          {segment.title && (
            <p className={`text-sm font-semibold mb-2 ${isReader ? '' : 'text-[var(--color-accent-gold)]'}`}>
              {segment.title}
            </p>
          )}
          <div className={`pl-4 ${isReader ? 'opacity-30' : ''}`}>
            {segment.lines.map((line, i) => (
              <p key={i} className={`leading-relaxed italic ${isReader ? 'text-lg' : 'text-base'}`}>
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
            <p className={`text-sm font-semibold mb-2 ${isReader ? '' : 'text-[var(--color-accent-blue)]'}`}>
              {segment.reference}
            </p>
          )}
          <div className="pl-3 space-y-1">
            {segment.verses.map((v, i) => (
              <p key={i} className={`leading-relaxed ${isReader ? 'text-lg' : 'text-base'}`}>
                <sup className={`text-xs font-bold mr-1 ${isReader ? 'opacity-40' : 'text-[var(--color-accent-blue)]'}`}>{v.number}</sup>
                {v.text}
              </p>
            ))}
          </div>
        </div>
      );
    case 'instruction':
    default:
      return (
        <p className={`leading-relaxed whitespace-pre-line ${isReader ? 'text-lg' : 'text-base'}`}>
          {segment.text}
        </p>
      );
  }
}

export default function Devotion() {
  usePageTitle('devotion');
  const { services, loading: servicesLoading } = useServices();
  const { hymns } = useHymns();
  const { lessons: todaysLessons } = useTodaysLessons();
  const { readerMode, setReaderMode, cycleReaderMode, isReaderActive } = useReaderMode();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (servicesLoading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [servicesLoading]);

  const savedState = useMemo(() => loadDevotionState(), []);
  const [currentStep, setCurrentStep] = useState(savedState?.isStarted ? savedState.currentStep : 0);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(savedState?.selectedServiceId ?? null);
  const [isStarted, setIsStarted] = useState(false); // always false initially
  const [showHymnPicker, setShowHymnPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<HymnCategory | null>(null);
  
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showStepPicker, setShowStepPicker] = useState(false);

  useEffect(() => {
    if (savedState?.isStarted && !isStarted) {
      setShowResumePrompt(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only persist state once devotion is actually started
  useEffect(() => {
    if (isStarted) {
      saveDevotionState({ currentStep, selectedServiceId, isStarted });
    }
  }, [currentStep, selectedServiceId, isStarted]);

  const todayServiceIds = useMemo(() => getServiceTypesForDate(new Date()), []);

  const selectedService = useMemo(
    () => services.find(s => s.id === (selectedServiceId || todayServiceIds[0])) || null,
    [services, selectedServiceId, todayServiceIds]
  );

  const steps = selectedService?.steps.filter(s => !s.isHeader) || [];
  const currentStepData = steps[currentStep];

  const getHymnsForCategory = (category: HymnCategory): Hymn[] => {
    return hymns.filter(h => h.categories.includes(category)).slice(0, 8);
  };

  const handleExit = useCallback(() => {
    setIsStarted(false);
    setCurrentStep(0);
    clearDevotionState();
  }, []);

  // Touch/swipe navigation for reader mode (must be before early returns — Rules of Hooks)
  const goPrev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), []);
  const goNext = useCallback(() => setCurrentStep(s => Math.min(steps.length - 1, s + 1)), [steps.length]);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  if (servicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-[var(--color-text-secondary)]">
            {loadingTimeout ? 'Taking longer than expected...' : 'Preparing your devotion...'}
          </div>
          {loadingTimeout && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}
            >Tap to retry</button>
          )}
        </div>
      </div>
    );
  }

  // ── Pre-devotion screen ──
  if (!isStarted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <div className="mb-4" style={{ color: 'var(--color-accent-brand)' }}><Bird size={48} /></div>
          <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">Private Devotion</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">A quiet, step-by-step guide for personal worship</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDate(new Date())}</p>
        </div>
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Choose your service</h2>
          <div className="space-y-2">
            {todayServiceIds.map(id => {
              const svc = services.find(s => s.id === id);
              if (!svc) return null;
              return (
                <button key={id} onClick={() => setSelectedServiceId(id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    (selectedServiceId || todayServiceIds[0]) === id ? 'bg-[var(--color-accent-brand)]/10' : 'bg-[var(--color-bg-card)]'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[var(--color-text-primary)] font-medium">{svc.displayName}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-brand)]/15 text-[var(--color-accent-brand)]">Today</span>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{svc.steps.filter(s => !s.isHeader).length} steps</span>
                  </div>
                </button>
              );
            })}
            <details className="mt-2">
              <summary className="text-sm text-[var(--color-text-muted)] cursor-pointer">Other services...</summary>
              <div className="space-y-2 mt-2">
                {services.filter(s => !todayServiceIds.includes(s.id)).map(svc => (
                  <button key={svc.id} onClick={() => setSelectedServiceId(svc.id)}
                    className={`w-full text-left p-3 rounded-xl text-sm ${
                      selectedServiceId === svc.id ? 'bg-[var(--color-accent-brand)]/10' : 'bg-[var(--color-bg-card)]'
                    }`}>
                    <span className="text-[var(--color-text-primary)]">{svc.displayName}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
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
        {showResumePrompt && savedState && (
          <div className="mb-4 p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-accent-brand)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Resume where you left off?</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Step {(savedState.currentStep || 0) + 1}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setIsStarted(true); setShowResumePrompt(false); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}
              >Resume</button>
              <button
                onClick={() => { clearDevotionState(); setCurrentStep(0); setShowResumePrompt(false); }}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
              >Start Over</button>
            </div>
          </div>
        )}
        <button onClick={() => setIsStarted(true)}
          className="w-full py-4 rounded-2xl text-[var(--color-text-on-accent)] font-bold text-lg"
          style={{ backgroundColor: 'var(--color-accent-brand)' }}>
          Begin Devotion
        </button>
      </div>
    );
  }

  const segments = currentStepData
    ? parseStepContent(currentStepData.text, currentStepData.textLines, currentStepData.type)
    : [];
  const stepType = currentStepData?.type || 'instruction';

  const accentColor = isReaderActive ? 'currentColor' : getStepAccentColor(stepType);

  // ══════════════════════════════════════════════════════════
  // READER MODE — Kindle-style, fully scrollable
  // ══════════════════════════════════════════════════════════
  if (isReaderActive) {
    const isDark = readerMode === 'paper-dark';
    const bg = isDark ? '#E8E8E8' : '#FAFAFA';
    const fg = isDark ? '#1A1A1A' : '#000000';
    const muted = isDark ? '#666' : '#999';
    const borderClr = isDark ? '#AAA' : '#DDD';

    return (
      <div data-reader={readerMode}
        className="fixed inset-0 z-40 flex flex-col"
        style={{ backgroundColor: bg, color: fg, fontFamily: "'Noto Sans', 'Inter', sans-serif" }}
        {...swipeHandlers}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
             style={{ borderBottom: `1px solid ${borderClr}` }}>
          <span className="text-xs uppercase tracking-widest" style={{ color: muted }}>
            {currentStepData?.stepNumber && `${currentStepData.stepNumber}.`} {stepType}
          </span>
          <span className="text-xs" style={{ color: muted }}>
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 shrink-0" style={{ backgroundColor: borderClr }}>
          <div className="h-full" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: fg }} />
        </div>

        {/* Scrollable reading area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-lg mx-auto">
            {segments.map((segment, i) => (
              <SegmentRenderer key={i} segment={segment} isReader={true} />
            ))}

            {currentStepData?.hymnSlot && (
              <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${borderClr}` }}>
                <p className="text-sm" style={{ color: muted }}>
                  Hymn: {currentStepData.hymnSlot.category
                    ? CATEGORY_LABELS[currentStepData.hymnSlot.category] || currentStepData.hymnSlot.category
                    : `#${currentStepData.hymnSlot.fixedHymnNumber}`}
                </p>
                {currentStepData.hymnSlot.category && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {getHymnsForCategory(currentStepData.hymnSlot.category).slice(0, 4).map(h => (
                      <Link key={h.number} to={`/hymns/${h.number}`} className="text-sm underline" style={{ color: fg }}>#{h.number}</Link>
                    ))}
                  </div>
                )}
                {currentStepData.hymnSlot.fixedHymnNumber && (
                  <Link to={`/hymns/${currentStepData.hymnSlot.fixedHymnNumber}`} className="text-sm underline mt-1 inline-block" style={{ color: fg }}>
                    Open Hymn #{currentStepData.hymnSlot.fixedHymnNumber}
                  </Link>
                )}
              </div>
            )}

            {currentStepData?.scriptureRef && (
              <div className="mt-6">
                <Link to={referenceToPath(currentStepData.scriptureRef)} className="text-sm underline" style={{ color: fg }}>
                  Read: {currentStepData.scriptureRef.raw}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Bottom control bar — always visible */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3"
             style={{ borderTop: `1px solid ${borderClr}`, backgroundColor: bg }}>
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0} className="px-4 py-2 text-sm disabled:opacity-20" style={{ color: fg }}>
            ‹ Prev
          </button>
          <div className="flex items-center gap-2">
            <button onClick={cycleReaderMode} className="text-xs px-3 py-1.5 rounded"
              style={{ border: `1px solid ${borderClr}`, color: fg }}>
              {readerMode === 'paper' ? <><Moon size={14} className="inline mr-1" /> Dim</> : <><Sun size={14} className="inline mr-1" /> Light</>}
            </button>
            <button onClick={() => setReaderMode('off')} className="text-xs px-3 py-1.5 rounded"
              style={{ border: `1px solid ${borderClr}`, color: fg }}>
              <X size={14} className="inline mr-1" /> Exit
            </button>
          </div>
          {currentStep < steps.length - 1 ? (
            <button onClick={() => setCurrentStep(s => s + 1)} className="px-4 py-2 text-sm font-medium" style={{ color: fg }}>
              Next ›
            </button>
          ) : (
            <button onClick={handleExit} className="px-4 py-2 text-sm font-medium" style={{ color: fg }}>
              Done ✓
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // NORMAL MODE
  // ══════════════════════════════════════════════════════════
  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--color-text-muted)]">{selectedService?.displayName}</span>
        <div className="flex gap-2">
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${wakeLockActive ? 'text-[var(--color-accent-gold)]' : ''}`}
              style={{ backgroundColor: 'var(--color-bg-card)', color: wakeLockActive ? 'var(--color-accent-gold)' : 'var(--color-text-secondary)' }}
              aria-label={wakeLockActive ? 'Allow screen to sleep' : 'Keep screen on'}
              aria-pressed={wakeLockActive}
            >
              <MonitorSmartphone size={16} className="inline mr-1" />
              {wakeLockActive ? 'Screen On' : 'Keep On'}
            </button>
          )}
          <button onClick={cycleReaderMode} className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            <BookOpen size={16} className="inline mr-1" /> Reader
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
          <span className="capitalize text-xs">{stepType}</span>
          <span>Step {currentStep + 1} of {steps.length}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="h-full rounded-full" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: accentColor }} />
        </div>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowStepPicker(!showStepPicker)}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
          aria-label="Jump to a specific step"
        >
          Jump to step <ChevronDown size={14} />
        </button>
        {showStepPicker && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-xl p-2 space-y-1" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            {steps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentStep(idx); setShowStepPicker(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${idx === currentStep ? 'font-semibold' : ''}`}
                style={{
                  backgroundColor: idx === currentStep ? 'var(--color-accent-brand)' : 'transparent',
                  color: idx === currentStep ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)',
                }}
              >
                <span className="text-xs opacity-60 mr-2">{step.stepNumber || idx + 1}.</span>
                <span className="capitalize">{step.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {currentStepData && (
        <div className="flex-1 flex flex-col" key={currentStep}>
          <div className="flex-1 py-6 px-2">
            {segments.map((segment, i) => (
              <SegmentRenderer key={i} segment={segment} isReader={false} />
            ))}
            {currentStepData.hymnSlot && (
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-sm text-[var(--color-accent-gold)] font-medium mb-2">
                  <Music size={16} className="inline mr-1" /> {currentStepData.hymnSlot.category
                    ? `Hymn: ${CATEGORY_LABELS[currentStepData.hymnSlot.category] || currentStepData.hymnSlot.category}`
                    : `Hymn ${currentStepData.hymnSlot.fixedHymnNumber}`}
                </div>
                {currentStepData.hymnSlot.category && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {getHymnsForCategory(currentStepData.hymnSlot.category).slice(0, 4).map(h => (
                        <Link key={h.number} to={`/hymns/${h.number}`}
                          className="px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-primary)]"
                          style={{ backgroundColor: 'var(--color-bg-card)' }}>
                          #{h.number} {h.englishTitle || h.yorubaTitle || ''}
                        </Link>
                      ))}
                    </div>
                    <button onClick={() => { setPickerCategory(currentStepData.hymnSlot!.category || null); setShowHymnPicker(true); }}
                      className="mt-2 text-xs text-[var(--color-accent-gold)] hover:underline">
                      See all matching hymns →
                    </button>
                  </>
                )}
                {currentStepData.hymnSlot.fixedHymnNumber && (
                  <Link to={`/hymns/${currentStepData.hymnSlot.fixedHymnNumber}`} className="text-sm text-[var(--color-accent-gold)] hover:underline">
                    Open Hymn #{currentStepData.hymnSlot.fixedHymnNumber} →
                  </Link>
                )}
              </div>
            )}
            {currentStepData.scriptureRef && (
              <Link to={referenceToPath(currentStepData.scriptureRef)} className="mt-4 flex items-center gap-2 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <span className="text-[var(--color-text-primary)] font-medium">{currentStepData.scriptureRef.raw}</span>
                <span className="ml-auto text-[var(--color-accent-brand)]">Read →</span>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0}
          className="flex-1 py-3 rounded-xl text-[var(--color-text-primary)] disabled:opacity-30"
          style={{ backgroundColor: 'var(--color-bg-card)' }}>
          ‹ Previous
        </button>
        {currentStep < steps.length - 1 ? (
          <button onClick={() => setCurrentStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl font-semibold text-[var(--color-text-on-accent)]"
            style={{ backgroundColor: 'var(--color-accent-brand)' }}>
            Next ›
          </button>
        ) : (
          <button onClick={handleExit} className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-600">
            ✓ Complete
          </button>
        )}
      </div>

      <button onClick={handleExit} className="mt-3 text-sm text-[var(--color-text-muted)] text-center">Exit Devotion</button>

      {showHymnPicker && pickerCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col">
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="font-semibold text-[var(--color-text-primary)]">{CATEGORY_LABELS[pickerCategory]}</h3>
              <button onClick={() => setShowHymnPicker(false)} className="text-[var(--color-text-muted)]" aria-label="Close hymn picker"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {getHymnsForCategory(pickerCategory).map(h => (
                <Link key={h.number} to={`/hymns/${h.number}`} onClick={() => setShowHymnPicker(false)}
                  className="block p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                  <span className="text-[var(--color-accent-gold)] font-semibold">#{h.number}</span>
                  <span className="text-[var(--color-text-primary)] ml-2">{h.englishTitle || h.yorubaTitle || 'Untitled'}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
