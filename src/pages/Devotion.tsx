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
import { getServiceTypesForDate, formatDate, toISODate } from '../utils/dateUtils';
import type { Hymn, HymnCategory, ScriptureReference } from '../types';
import { CATEGORY_LABELS } from '../types';
import { Bird, ChevronDown, Check, ListOrdered, Music, BookOpen, HandHeart, Users, Sparkles, Mic, HandCoins } from 'lucide-react';
import { useWakeLock } from '../hooks/useWakeLock';
import { recordActivity, recordDevotionPosition, useStreak } from '../hooks/useProgress';
import { getCandidateHymns } from '../utils/hymnMatcher';
import { tr } from '../i18n';
import { useHymnContext } from '../hooks/useHymnContext';
import { useDevotionData, type DevotionStep, type StepKind } from '../lib/devotion';
import { StepBlocks, HymnPanel, PassagePanel } from '../components/DevotionStep';

const STORAGE_KEY = 'cw-devotion-state';

interface DevotionState {
  currentStep: number;
  selectedServiceId: string | null;
  isStarted: boolean;
  savedAt: number; // timestamp for resume prompt staleness
}

function saveDevotionState(state: Omit<DevotionState, 'savedAt'>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() })); } catch {}
}

function loadDevotionState(): DevotionState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Expire after 24 hours
      if (parsed.savedAt && Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) return parsed;
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return null;
}

function clearDevotionState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

const KIND: Record<StepKind, { label: string; icon: React.ReactNode; colour: string }> = {
  prayer: { label: 'Prayer', icon: <HandHeart size={14} />, colour: 'var(--color-accent-brand)' },
  act: { label: 'Act of worship', icon: <Sparkles size={14} />, colour: 'var(--color-accent-brand)' },
  blessing: { label: 'Blessing', icon: <Sparkles size={14} />, colour: 'var(--color-accent-gold)' },
  sermon: { label: 'Sermon', icon: <Mic size={14} />, colour: 'var(--color-accent-gold)' },
  reading: { label: 'Bible lesson', icon: <BookOpen size={14} />, colour: 'var(--color-accent-blue)' },
  song: { label: 'Song', icon: <Music size={14} />, colour: 'var(--color-accent-gold)' },
  offering: { label: 'Offering', icon: <HandCoins size={14} />, colour: 'var(--color-accent-gold)' },
  hymn: { label: 'Hymn', icon: <Music size={14} />, colour: 'var(--color-accent-gold)' },
  psalm: { label: 'Psalm', icon: <BookOpen size={14} />, colour: 'var(--color-accent-blue)' },
};

export default function Devotion() {
  usePageTitle('devotion');
  const { services, loading: servicesLoading } = useServices();
  const { services: orders, loading: ordersLoading } = useDevotionData();
  const { hymns } = useHymns();
  const { lessons: todaysLessons } = useTodaysLessons();
  const { reading } = useReader();
  const readingStyle = useReadingStyle();
  const { isActive: wakeLockActive, isSupported: wakeLockSupported, toggle: toggleWakeLock } = useWakeLock();

  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const loading = servicesLoading || ordersLoading;
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

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
  const [selectedServiceId, setSelectedServiceIdState] = useState<string | null>(requestedServiceId ?? savedState?.selectedServiceId ?? null);
  const [isStarted, setIsStarted] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(() => !!savedState?.isStarted);
  const [showStepPicker, setShowStepPicker] = useState(false);
  const [showOthers, setShowOthers] = useState(() => !!requestedServiceId);
  // What is open over the step: a hymn, a passage, or the full hymn list for this point
  const [hymnOpen, setHymnOpen] = useState<Hymn | null>(null);
  const [passageOpen, setPassageOpen] = useState<ScriptureReference | null>(null);
  const [pickerCategory, setPickerCategory] = useState<HymnCategory | null>(null);

  // Switching service always starts from its first step
  const setSelectedServiceId = (id: string) => {
    if (id !== selectedServiceId) setCurrentStep(0);
    setSelectedServiceIdState(id);
    setShowResumePrompt(false);
  };

  useEffect(() => {
    if (isStarted) saveDevotionState({ currentStep, selectedServiceId, isStarted });
  }, [currentStep, selectedServiceId, isStarted]);

  // The hourly prayer is offered every day, after the services held today
  const todayServiceIds = useMemo(() => [...getServiceTypesForDate(new Date()), 'hourly_prayer'], []);
  const activeId = selectedServiceId || todayServiceIds[0];
  const selectedService = useMemo(() => services.find(s => s.id === activeId) || null, [services, activeId]);
  const order = selectedService ? orders[selectedService.id] : undefined;
  const steps: DevotionStep[] = order?.steps ?? [];
  const step = steps[currentStep];

  const hymnContext = useHymnContext(toISODate(new Date()), selectedService?.id);
  const suggest = useCallback((category?: HymnCategory) => (category ? getCandidateHymns({ category }, hymns, 12, hymnContext).map(c => c.hymn) : []), [hymns, hymnContext]);
  const openHymn = useCallback((n: number) => setHymnOpen(hymns.find(h => h.number === n) ?? null), [hymns]);

  const [completed, setCompleted] = useState(false);
  const streak = useStreak();

  const handleExit = useCallback(() => { setIsStarted(false); setCurrentStep(0); clearDevotionState(); }, []);
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

  useEffect(() => {
    if (isStarted && selectedService) recordDevotionPosition(selectedService.id, currentStep);
  }, [isStarted, selectedService, currentStep]);

  // A new step starts at the top of the page
  useEffect(() => { if (isStarted) window.scrollTo({ top: 0 }); document.getElementById('devotion-step')?.scrollIntoView?.({ block: 'start' }); }, [currentStep, isStarted]);

  const goPrev = useCallback(() => setCurrentStep(s => Math.max(0, s - 1)), []);
  const goNext = useCallback(() => setCurrentStep(s => Math.min(steps.length - 1, s + 1)), [steps.length]);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev });

  useEffect(() => {
    if (steps.length > 0 && currentStep >= steps.length) setCurrentStep(0);
  }, [steps.length, currentStep]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div style={{ color: 'var(--color-text-secondary)' }}>{loadingTimeout ? tr('Taking longer than expected...') : tr('Preparing your devotion...')}</div>
          {loadingTimeout && <button onClick={() => window.location.reload()} className="btn-primary mt-4 px-4 py-2 rounded-xl text-sm">{tr('Tap to retry')}</button>}
        </div>
      </div>
    );
  }

  // ── Completed ──
  if (completed && !isStarted) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}>🕊️</div>
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Amen.')}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr('You have completed')}{' '}{tr(selectedService?.displayName) ?? tr('your devotion')}{tr('. “The LORD bless thee, and keep thee.” Numbers 6:24')}</p>
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

  // ── Choosing the service ──
  if (!isStarted) {
    const row = (id: string, today: boolean) => {
      const svc = services.find(s => s.id === id);
      if (!svc) return null;
      const chosen = activeId === id;
      const count = orders[id]?.steps.length ?? svc.steps.filter(s => !s.isHeader).length;
      return (
        <button key={id} onClick={() => setSelectedServiceId(id)} aria-pressed={chosen}
                className="w-full text-left p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors"
                style={{ backgroundColor: 'var(--color-bg-card)', borderColor: chosen ? 'var(--color-accent-brand)' : 'transparent' }}>
          <span className="w-5 h-5 rounded-full border-2 grid place-items-center shrink-0" style={{ borderColor: chosen ? 'var(--color-accent-brand)' : 'var(--color-border)', backgroundColor: chosen ? 'var(--color-accent-brand)' : 'transparent' }}>
            {chosen && <Check size={12} color="white" strokeWidth={3} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(svc.displayName)}</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{svc.time ? `${tr(svc.time)} · ` : ''}{count}{' '}{tr('steps')}</span>
          </span>
          {today && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: 'var(--color-accent-brand)', backgroundColor: 'color-mix(in srgb, var(--color-accent-brand) 12%, transparent)' }}>{tr('Today')}</span>}
        </button>
      );
    };
    const intro = order?.intro ?? [];
    return (
      <div className="max-w-xl mx-auto px-4 pt-8 pb-40">
        <header className="text-center mb-8">
          <div className="inline-flex mb-3" style={{ color: 'var(--color-accent-brand)' }}><Bird size={40} /></div>
          <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Private Devotion')}</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>{tr('A quiet, step-by-step guide for personal worship')}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{formatDate(new Date())}</p>
        </header>

        {showResumePrompt && savedState && (
          <div className="mb-6 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-accent-brand)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Resume where you left off?')}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{tr(services.find(s => s.id === savedState.selectedServiceId)?.displayName)} · {tr('Step')}{' '}{(savedState.currentStep || 0) + 1}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setIsStarted(true); setShowResumePrompt(false); }} className="btn-primary flex-1 py-2 rounded-xl text-sm font-semibold">{tr('Resume')}</button>
              <button onClick={() => { clearDevotionState(); setCurrentStep(0); setShowResumePrompt(false); }} className="flex-1 py-2 rounded-xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Start Over')}</button>
            </div>
          </div>
        )}

        <section className="space-y-2.5" aria-labelledby="choose-service">
          <h2 id="choose-service" className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>{tr('Choose your service')}</h2>
          {todayServiceIds.map(id => row(id, true))}
          <button onClick={() => setShowOthers(o => !o)} aria-expanded={showOthers} className="w-full flex items-center justify-between px-1 py-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {tr('Other services')} <ChevronDown size={16} className={showOthers ? 'rotate-180' : ''} />
          </button>
          {showOthers && <div className="space-y-2.5">{services.filter(s => !todayServiceIds.includes(s.id)).map(s => row(s.id, false))}</div>}
        </section>

        <div className="mt-6 rounded-2xl p-4 flex gap-3 text-sm" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
          <Users size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent-brand)' }} />
          <p>{tr('Worshipping alone? Take every part yourself, the service conductor’s words and the congregation’s answers. Each step shows who does what, and how it is done.')}</p>
        </div>

        {intro.length > 0 && (
          <details className="mt-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <summary className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{tr('Before you begin')}</summary>
            <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{intro.map((b, i) => <p key={i}>{'text' in b ? tr(b.text) : null}</p>)}</div>
          </details>
        )}

        {todaysLessons.length > 0 && (
          <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <h3 className="text-[11px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Today’s readings')}</h3>
            {todaysLessons.map((l, i) => (
              <p key={i} className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {l.firstLesson?.raw}{l.secondLesson ? ` · ${l.secondLesson.raw}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Always in reach: no scrolling back up after choosing */}
        <div className="fixed left-0 right-0 bottom-16 md:bottom-0 md:left-64 z-30 px-4 pb-3 pt-3" style={{ background: 'linear-gradient(to top, var(--color-bg-primary) 70%, transparent)' }}>
          <div className="max-w-xl mx-auto">
            <button onClick={() => { setShowResumePrompt(false); setIsStarted(true); }} disabled={!selectedService || !steps.length}
                    className="btn-primary w-full py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-50">
              {tr('Begin')}{' '}{selectedService?.displayName ?? tr('Devotion')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!step) return null;
  const kind = KIND[step.kind] ?? KIND.act;
  const isLordsDay = selectedService?.id === 'lords_day_service';
  const blocks = (
    <StepBlocks step={step} lessons={todaysLessons} isLordsDay={isLordsDay} suggest={suggest}
                onOpenHymn={openHymn} onOpenPassage={setPassageOpen} onMoreHymns={() => setPickerCategory(step.hymnSlot?.category ?? null)} />
  );

  return (
    <div className="max-w-xl mx-auto px-4 pt-5 pb-36" {...swipeHandlers}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button onClick={() => setShowStepPicker(true)} className="text-sm inline-flex items-center gap-1.5 min-w-0" style={{ color: 'var(--color-text-secondary)' }} aria-label={tr('Choose a step')}>
          <ListOrdered size={16} className="shrink-0" /> <span className="truncate">{tr(selectedService?.displayName)}</span>
        </button>
        <div className="flex gap-1.5 shrink-0">
          <MusicButton />
          <ReaderButtons wakeLock={{ supported: wakeLockSupported, active: wakeLockActive, toggle: toggleWakeLock }} />
        </div>
      </div>
      <NowPlaying />

      <div className="h-1 rounded-full overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, backgroundColor: kind.colour }} />
      </div>

      <article id="devotion-step" key={currentStep} className="animate-fade-in" style={readingStyle}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: kind.colour }}>
          {kind.icon} {tr(kind.label)} · {tr('Step')} {currentStep + 1} {tr('of')} {steps.length}
        </p>
        <h1 className="text-2xl font-bold font-[Outfit] mb-6 leading-tight" style={{ color: 'var(--color-text-primary)' }}>{tr(step.title)}</h1>
        {blocks}
      </article>

      {/* Navigation stays in reach */}
      <div className="fixed left-0 right-0 bottom-16 md:bottom-0 md:left-64 z-30 px-4 pb-3 pt-3" style={{ background: 'linear-gradient(to top, var(--color-bg-primary) 70%, transparent)' }}>
        <div className="max-w-xl mx-auto flex gap-3">
          <button onClick={goPrev} disabled={currentStep === 0} className="flex-1 py-3.5 rounded-2xl font-semibold disabled:opacity-30" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>{tr('‹ Previous')}</button>
          {currentStep < steps.length - 1
            ? <button onClick={goNext} className="btn-primary flex-[2] py-3.5 rounded-2xl font-semibold">{tr('Next ›')}</button>
            : <button onClick={handleComplete} className="flex-[2] py-3.5 rounded-2xl font-semibold text-white" style={{ backgroundColor: 'var(--color-success)' }}>{tr('✓ Complete')}</button>}
        </div>
      </div>

      <button onClick={handleExit} className="mt-10 w-full text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>{tr('Exit Devotion')}</button>

      {showStepPicker && (
        <Sheet label={tr('Choose a step')} onClose={() => setShowStepPicker(false)}>
          <ol className="space-y-1">
            {steps.map((s, idx) => {
              const k = KIND[s.kind] ?? KIND.act;
              return (
                <li key={idx}>
                  <button onClick={() => { setCurrentStep(idx); setShowStepPicker(false); }} aria-current={idx === currentStep ? 'step' : undefined}
                          className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3"
                          style={{ backgroundColor: idx === currentStep ? 'var(--color-accent-brand)' : 'transparent', color: idx === currentStep ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)' }}>
                    <span className="w-6 text-right text-xs tabular-nums opacity-70">{idx + 1}</span>
                    <span style={{ color: idx === currentStep ? 'inherit' : k.colour }}>{k.icon}</span>
                    <span className="flex-1 truncate text-sm">{tr(s.title)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Sheet>
      )}

      {hymnOpen && <HymnPanel hymn={hymnOpen} step={currentStep + 1} onClose={() => setHymnOpen(null)} />}
      {passageOpen && <PassagePanel reference={passageOpen} step={currentStep + 1} onClose={() => setPassageOpen(null)} />}
      {pickerCategory && (
        <Sheet label={CATEGORY_LABELS[pickerCategory]} onClose={() => setPickerCategory(null)}>
          <ul className="space-y-1.5">
            {suggest(pickerCategory).map(h => (
              <li key={h.number}>
                <button onClick={() => { setPickerCategory(null); setHymnOpen(h); }} className="w-full text-left p-3 rounded-xl flex gap-3" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                  <span className="font-bold tabular-nums" style={{ color: 'var(--color-accent-gold)' }}>{h.number}</span>
                  <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{h.englishTitle || h.yorubaTitle || tr('Untitled')}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {reading && (
        <ReaderFrame
          title={tr(step.title)}
          pageKey={currentStep}
          place={`${selectedService?.displayName ?? 'Devotion'} · ${tr('Step')} ${currentStep + 1} ${tr('of')} ${steps.length}`}
          prev={currentStep > 0 ? { label: tr('Previous step'), go: goPrev } : undefined}
          next={currentStep < steps.length - 1 ? { label: tr('Next step'), go: goNext } : { label: tr('Complete'), go: handleComplete }}
          wakeLock={{ supported: wakeLockSupported, active: wakeLockActive, toggle: toggleWakeLock }}
          actions={<MusicButton />}
        >
          {blocks}
        </ReaderFrame>
      )}
    </div>
  );
}
