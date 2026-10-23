import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { useReader } from '../hooks/useReader';
import { ReaderButtons, ReaderFrame, useReadingStyle } from '../components/Reader';
import { Sheet } from '../components/Dialog';
import { MusicButton, NowPlaying } from '../components/Music';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSwipe } from '../hooks/useSwipe';
import { getServiceTypesForDate, formatDate } from '../utils/dateUtils';
import { parseStepContent, getStepAccentColor, type ContentSegment } from '../utils/contentParser';
import type { Hymn, HymnCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import { Bird, Music, ChevronDown } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';
import { recordActivity, recordDevotionPosition, useStreak } from '../hooks/useProgress';
import { getCandidateHymns } from '../utils/hymnMatcher';
import { toISODate } from '../utils/dateUtils';
import { PassageText } from '../components/PassageText';
import { tr } from '../i18n';
import { useHymnContext } from '../hooks/useHymnContext';

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

/** One block of a step. Sizes are relative so the reader's text size applies; colours come from the theme. */
function SegmentRenderer({ segment }: { segment: ContentSegment }) {
  switch (segment.type) {
    case 'hymn':
      return (
        <div className="mt-4">
          {segment.title && <p className="text-[0.8em] font-semibold mb-2" style={{ color: 'var(--color-accent-gold)' }}>{tr(segment.title)}</p>}
          <div className="pl-4">
            {segment.lines.map((line, i) => <p key={i} className="italic">{line}</p>)}
          </div>
        </div>
      );
    case 'scripture':
      return (
        <div className="mt-4">
          {segment.reference && <p className="text-[0.8em] font-semibold mb-2" style={{ color: 'var(--color-accent-blue)' }}>{segment.reference}</p>}
          <div className="pl-3 space-y-1">
            {segment.verses.map((v, i) => (
              <p key={i}><sup className="text-[0.6em] font-bold mr-1" style={{ color: 'var(--color-accent-blue)' }}>{v.number}</sup>{tr(v.text)}</p>
            ))}
          </div>
        </div>
      );
    case 'instruction':
    default:
      return <p className="whitespace-pre-line">{tr(segment.text)}</p>;
  }
}

export default function Devotion() {
  usePageTitle('devotion');
  const { services, loading: servicesLoading } = useServices();
  const { hymns } = useHymns();
  const { lessons: todaysLessons } = useTodaysLessons();
  const { reading } = useReader();
  const readingStyle = useReadingStyle();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (servicesLoading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [servicesLoading]);

  const [searchParams] = useSearchParams();
  const requestedServiceId = searchParams.get('service');

  // A saved session only applies if it matches the service being requested (if any)
  const savedState = useMemo(() => {
    const state = loadDevotionState();
    if (state && requestedServiceId && state.selectedServiceId !== requestedServiceId) return null;
    return state;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [currentStep, setCurrentStep] = useState(savedState?.isStarted ? savedState.currentStep : 0);
  const [selectedServiceId, setSelectedServiceIdState] = useState<string | null>(
    requestedServiceId ?? savedState?.selectedServiceId ?? null
  );

  // Switching service always starts from its first step
  const setSelectedServiceId = (id: string) => {
    if (id !== selectedServiceId) setCurrentStep(0);
    setSelectedServiceIdState(id);
    setShowResumePrompt(false);
  };
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

  const hymnContext = useHymnContext(toISODate(new Date()), selectedService?.id);
  const steps = selectedService?.steps.filter(s => !s.isHeader) || [];
  const currentStepData = steps[currentStep];

  const getHymnsForCategory = (category: HymnCategory): Hymn[] =>
    getCandidateHymns({ category }, hymns, 8, hymnContext).map(c => c.hymn);

  const [completed, setCompleted] = useState(false);
  const streak = useStreak();

  const handleExit = useCallback(() => {
    setIsStarted(false);
    setCurrentStep(0);
    clearDevotionState();
  }, []);

  const handleComplete = useCallback(() => {
    recordActivity('devotion');
    clearDevotionState();
    setIsStarted(false);
    setCurrentStep(0);
    setCompleted(true);
  }, []);

  // Keep the screen on while a devotion is running
  useEffect(() => {
    if (isStarted && wakeLockSupported && !wakeLockActive) toggleWakeLock();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted]);

  // Remember the position for "Continue" on Home
  useEffect(() => {
    if (isStarted && selectedService) recordDevotionPosition(selectedService.id, currentStep);
  }, [isStarted, selectedService, currentStep]);

  // Touch/swipe navigation for reader mode (must be before early returns — Rules of Hooks)
  const goPrev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), []);
  const goNext = useCallback(() => setCurrentStep(s => Math.min(steps.length - 1, s + 1)), [steps.length]);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  // Guard against a resumed step index that is out of range for the selected service
  useEffect(() => {
    if (steps.length > 0 && currentStep >= steps.length) setCurrentStep(0);
  }, [steps.length, currentStep]);

  if (servicesLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[var(--color-text-secondary)]">
            {loadingTimeout ? tr('Taking longer than expected...') : tr('Preparing your devotion...')}
          </div>
          {loadingTimeout && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}
            >{tr('Tap to retry')}</button>
          )}
        </div>
      </div>
    );
  }

  // ── Completed ──
  if (completed && !isStarted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl"
             style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}>🕊️</div>
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Amen.')}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr('You have completed')}{' '}{selectedService?.displayName ?? tr('your devotion')}{tr('. “The LORD bless thee, and keep thee.” — Numbers 6:24')}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-accent-gold)' }}>
          🔥 {streak.current}{' '}{tr('day')}{streak.current === 1 ? '' : 's'}{' '}{tr('in a row')}{streak.best > streak.current ? ` · best ${streak.best}` : ''}
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Link to="/notes?new=1" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">{tr('Write a reflection')}</Link>
          <Link to="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Home')}</Link>
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
          <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">{tr('Private Devotion')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">{tr('A quiet, step-by-step guide for personal worship')}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{formatDate(new Date())}</p>
        </div>
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">{tr('Choose your service')}</h2>
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
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-brand)]/15 text-[var(--color-accent-brand)]">{tr('Today')}</span>
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">{svc.steps.filter(s => !s.isHeader).length}{' '}{tr('steps')}</span>
                  </div>
                </button>
              );
            })}
            <details className="mt-2" open={!!selectedServiceId && !todayServiceIds.includes(selectedServiceId)}>
              <summary className="text-sm text-[var(--color-text-muted)] cursor-pointer">{tr('Other services...')}</summary>
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
            <h3 className="text-sm text-[var(--color-text-muted)] mb-2">{tr('Today\'s Readings')}</h3>
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
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{tr('Resume where you left off?')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{tr('Step')}{' '}{(savedState.currentStep || 0) + 1}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setIsStarted(true); setShowResumePrompt(false); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}
              >{tr('Resume')}</button>
              <button
                onClick={() => { clearDevotionState(); setCurrentStep(0); setShowResumePrompt(false); }}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
              >{tr('Start Over')}</button>
            </div>
          </div>
        )}
        <button onClick={() => setIsStarted(true)}
          className="w-full py-4 rounded-2xl text-[var(--color-text-on-accent)] font-bold text-lg"
          style={{ backgroundColor: 'var(--color-accent-brand)' }}>{tr('Begin Devotion')}</button>
      </div>
    );
  }

  const segments = currentStepData
    ? parseStepContent(currentStepData.text, currentStepData.textLines, currentStepData.type)
    : [];
  const stepType = currentStepData?.type || 'instruction';

  const accentColor = getStepAccentColor(stepType);
  const stepTitle = stepType.charAt(0).toUpperCase() + stepType.slice(1);

  // ══════════════════════════════════════════════════════════
  // NORMAL MODE
  // ══════════════════════════════════════════════════════════
  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-4 min-h-[calc(100dvh-140px)] md:min-h-dvh flex flex-col" {...swipeHandlers}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--color-text-muted)]">{selectedService?.displayName}</span>
        <div className="flex gap-1.5">
          <MusicButton />
          <ReaderButtons wakeLock={{ supported: wakeLockSupported, active: wakeLockActive, toggle: toggleWakeLock }} />
        </div>
      </div>

      <NowPlaying />
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] mb-2">
          <span className="capitalize text-xs">{stepType}</span>
          <button onClick={() => setShowStepPicker(!showStepPicker)} aria-expanded={showStepPicker} className="inline-flex items-center gap-1" aria-label={tr('Choose a step')}>{tr('Step')}{' '}{currentStep + 1}{' '}{tr('of')}{' '}{steps.length} <ChevronDown size={14} />
          </button>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <div className="h-full rounded-full" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: accentColor }} />
        </div>
      </div>

      <div className="mb-4">
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
          <div className="flex-1 py-6 px-2" style={readingStyle}>
            {segments.map((segment, i) => (
              <SegmentRenderer key={i} segment={segment} />
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
                      className="mt-2 text-xs text-[var(--color-accent-gold)] hover:underline">{tr('See all matching hymns →')}</button>
                  </>
                )}
                {currentStepData.hymnSlot.fixedHymnNumber && (
                  <Link to={`/hymns/${currentStepData.hymnSlot.fixedHymnNumber}`} className="text-sm text-[var(--color-accent-gold)] hover:underline">{tr('Open Hymn #')}{currentStepData.hymnSlot.fixedHymnNumber} →
                  </Link>
                )}
              </div>
            )}
            {(currentStepData.scriptureReferences?.length ? currentStepData.scriptureReferences : currentStepData.scriptureRef ? [currentStepData.scriptureRef] : [])
              .map((ref, i) => <div key={i} className="mt-4"><PassageText reference={ref} defaultOpen /></div>)}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0}
          className="flex-1 py-3 rounded-xl text-[var(--color-text-primary)] disabled:opacity-30"
          style={{ backgroundColor: 'var(--color-bg-card)' }}>{tr('‹ Previous')}</button>
        {currentStep < steps.length - 1 ? (
          <button onClick={() => setCurrentStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl font-semibold text-[var(--color-text-on-accent)]"
            style={{ backgroundColor: 'var(--color-accent-brand)' }}>{tr('Next ›')}</button>
        ) : (
          <button onClick={handleComplete} className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-600">{tr('✓ Complete')}</button>
        )}
      </div>

      <button onClick={handleExit} className="mt-3 text-sm text-[var(--color-text-muted)] text-center">{tr('Exit Devotion')}</button>

      {showHymnPicker && pickerCategory && (
        <Sheet label={CATEGORY_LABELS[pickerCategory]} onClose={() => setShowHymnPicker(false)}>
          <div className="space-y-2">
            {getHymnsForCategory(pickerCategory).map(h => (
              <Link key={h.number} to={`/hymns/${h.number}`} onClick={() => setShowHymnPicker(false)}
                className="block p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <span className="text-[var(--color-accent-gold)] font-semibold">#{h.number}</span>
                <span className="text-[var(--color-text-primary)] ml-2">{h.englishTitle || h.yorubaTitle || tr('Untitled')}</span>
              </Link>
            ))}
          </div>
        </Sheet>
      )}

      {reading && currentStepData && (
        <ReaderFrame
          title={stepTitle}
          pageKey={currentStep}
          place={`${selectedService?.displayName ?? 'Devotion'} · Step ${currentStep + 1} of ${steps.length}`}
          prev={currentStep > 0 ? { label: 'Previous step', go: goPrev } : undefined}
          next={currentStep < steps.length - 1 ? { label: 'Next step', go: goNext } : { label: 'Complete', go: handleComplete }}
          wakeLock={{ supported: wakeLockSupported, active: wakeLockActive, toggle: toggleWakeLock }}
          actions={<MusicButton />}
        >
          {segments.map((segment, i) => <SegmentRenderer key={i} segment={segment} />)}
          {currentStepData.hymnSlot?.fixedHymnNumber && (
            <p className="mt-6"><Link to={`/hymns/${currentStepData.hymnSlot.fixedHymnNumber}`} className="underline">{tr('Hymn')}{' '}{currentStepData.hymnSlot.fixedHymnNumber}</Link></p>
          )}
          {currentStepData.hymnSlot?.category && (
            <p className="mt-6">{tr('Hymn:')}{' '}{getHymnsForCategory(currentStepData.hymnSlot.category).slice(0, 4).map(h => (
              <Link key={h.number} to={`/hymns/${h.number}`} className="underline mr-3">{h.number}</Link>
            ))}</p>
          )}
          {(currentStepData.scriptureReferences?.length ? currentStepData.scriptureReferences : currentStepData.scriptureRef ? [currentStepData.scriptureRef] : [])
            .map((ref, i) => <div key={i} className="mt-6"><PassageText reference={ref} defaultOpen /></div>)}
        </ReaderFrame>
      )}
    </div>
  );
}
