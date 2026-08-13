import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { useHymns } from '../hooks/useHymns';
import { useTodaysLessons } from '../hooks/useLessons';
import { extractHymnSlots, getCandidateHymns, ScoredHymnSuggestion, recordHymnUsage } from '../utils/hymnMatcher';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import type { ServiceOrder, Hymn, HymnCategory } from '../types';
import { getServiceTypesForDate, formatDate } from '../utils/dateUtils';

interface SlotSelection {
  stepNumber: number;
  slotName: string;
  category: HymnCategory | null;
  candidates: ScoredHymnSuggestion[];
  selectedHymn: Hymn | null;
}

interface SavedPlan {
  id: string;
  date: string;
  serviceId: string;
  serviceName: string;
  slots: {
    stepNumber: number;
    slotName: string;
    hymnNumber: number | null;
    hymnTitle: string | null;
  }[];
}

export default function Suggestions() {
  const { services, loading: servicesLoading } = useServices();
  const { hymns, loading: hymnsLoading } = useHymns();
  const { lessons: todaysLessons } = useTodaysLessons();

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [slotSelections, setSlotSelections] = useState<SlotSelection[]>([]);
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);
  const [lockedSlots, setLockedSlots] = useState<Set<number>>(new Set());
  const [showExport, setShowExport] = useState(false);
  const [manualSearches, setManualSearches] = useState<Record<number, string>>({});
  const [pastPlans, setPastPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    try {
      const plans = localStorage.getItem('cw-hymn-plans');
      if (plans) setPastPlans(JSON.parse(plans));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const selectedService = useMemo(
    () => services.find(s => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const todayServiceTypes = useMemo(() => getServiceTypesForDate(new Date()), []);

  const handleSelectService = (service: ServiceOrder) => {
    setSelectedServiceId(service.id);

    const slots = extractHymnSlots(service);
    const selections: SlotSelection[] = slots.map(({ stepNumber, slotName, slot }) => {
      const candidates = getCandidateHymns(slot, hymns, 15);
      return {
        stepNumber,
        slotName,
        category: slot.category || null,
        candidates,
        selectedHymn: candidates.length > 0 ? candidates[0].hymn : null,
      };
    });

    setSlotSelections(selections);
    setExpandedSlot(null);
    setLockedSlots(new Set());
  };

  const loadPastPlan = (plan: SavedPlan) => {
    const service = services.find(s => s.id === plan.serviceId);
    if (!service) return;

    setSelectedServiceId(service.id);
    const slots = extractHymnSlots(service);
    const selections: SlotSelection[] = slots.map(({ stepNumber, slotName, slot }) => {
      const candidates = getCandidateHymns(slot, hymns, 15);
      const planSlot = plan.slots.find(ps => ps.stepNumber === stepNumber);
      let selectedHymn = null;
      if (planSlot?.hymnNumber) {
        selectedHymn = hymns.find(h => h.number === planSlot.hymnNumber) || null;
      }

      return {
        stepNumber,
        slotName,
        category: slot.category || null,
        candidates,
        selectedHymn,
      };
    });

    setSlotSelections(selections);
    setExpandedSlot(null);
    setLockedSlots(new Set(selections.map((_, i) => i)));
  };

  const handleSelectHymn = (slotIndex: number, hymn: Hymn) => {
    if (lockedSlots.has(slotIndex)) return;
    setSlotSelections(prev =>
      prev.map((s, i) => (i === slotIndex ? { ...s, selectedHymn: hymn } : s))
    );
    // Auto collapse after selection if not manual searching
    if (!manualSearches[slotIndex]) {
      setExpandedSlot(null);
    }
  };

  const toggleLock = (e: React.MouseEvent, slotIndex: number) => {
    e.stopPropagation();
    const newLocks = new Set(lockedSlots);
    if (newLocks.has(slotIndex)) {
      newLocks.delete(slotIndex);
    } else {
      newLocks.add(slotIndex);
    }
    setLockedSlots(newLocks);
  };

  const getFilteredCandidates = (slotIndex: number) => {
    const search = manualSearches[slotIndex] || '';
    const slot = slotSelections[slotIndex];
    if (!search.trim()) return slot.candidates;

    const q = search.toLowerCase();
    const allMatches = hymns.filter(h => {
      const searchable = `${h.number} ${h.englishTitle || ''} ${h.yorubaTitle || ''} ${h.englishLyrics} ${h.yorubaLyrics}`.toLowerCase();
      return searchable.includes(q);
    });

    return allMatches.slice(0, 15).map(h => ({
      hymnNumber: h.number,
      hymn: h,
      reason: 'Manual search result',
      score: 100,
      matchType: 'manual' as const,
    }));
  };

  const getDuplicateSlots = (hymnNumber: number, currentIndex: number) => {
    return slotSelections
      .map((s, idx) => ({ step: s.stepNumber, isMatch: idx !== currentIndex && s.selectedHymn?.number === hymnNumber }))
      .filter(s => s.isMatch)
      .map(s => s.step);
  };

  const exportPlan = () => {
    if (!selectedService) return '';
    const lines = [
      `CCC Hymn Plan — ${selectedService.displayName}`,
      `Date: ${formatDate(new Date())}`,
      '',
      ...slotSelections.map(s => {
        const hymn = s.selectedHymn;
        return `Step ${s.stepNumber}: ${s.slotName}\n  → Hymn #${hymn?.number || '?'} — ${hymn?.englishTitle || hymn?.yorubaTitle || 'None selected'}`;
      }),
    ];
    return lines.join('\n');
  };

  const savePlan = () => {
    if (!selectedService) return;
    const plan: SavedPlan = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      serviceId: selectedService.id,
      serviceName: selectedService.displayName,
      slots: slotSelections.map(s => ({
        stepNumber: s.stepNumber,
        slotName: s.slotName,
        hymnNumber: s.selectedHymn?.number || null,
        hymnTitle: s.selectedHymn ? (s.selectedHymn.englishTitle || s.selectedHymn.yorubaTitle) : null,
      })),
    };
    
    const newPlans = [plan, ...pastPlans].slice(0, 10);
    setPastPlans(newPlans);
    localStorage.setItem('cw-hymn-plans', JSON.stringify(newPlans));

    // Record usage
    const usedHymns = slotSelections.map(s => s.selectedHymn?.number).filter((n): n is number => n !== undefined);
    recordHymnUsage(usedHymns);

    alert('Plan saved to history!');
  };

  const sendToOperator = () => {
    if (!selectedService) return;
    const items = slotSelections.map(s => ({
      type: 'hymn',
      hymnNumber: s.selectedHymn?.number || 0,
    })).filter(item => item.hymnNumber > 0);
    localStorage.setItem('cw-queue', JSON.stringify(items));
    alert('Sent to Operator Queue!');
  };

  const deletePlan = (id: string) => {
    const updated = pastPlans.filter(p => p.id !== id);
    setPastPlans(updated);
    localStorage.setItem('cw-hymn-plans', JSON.stringify(updated));
  };

  if (servicesLoading || hymnsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  const filledCount = slotSelections.filter(s => s.selectedHymn).length;
  const progressPercent = slotSelections.length > 0 ? (filledCount / slotSelections.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[Outfit] text-[var(--color-text-primary)]">
          🎵 Hymn Selector
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Plan hymns for your service. AI-matched suggestions you can accept, swap, or override.
        </p>
      </div>

      {/* Service Selector */}
      {!selectedServiceId ? (
        <div>
          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Today's Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {services.filter(s => todayServiceTypes.includes(s.id)).map(svc => {
              const slotCount = svc.steps.filter(s => s.hymnSlot).length;
              if (slotCount === 0) return null;
              return (
                <button
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className="text-left p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-accent-gold)] shadow-[0_0_15px_rgba(212,168,67,0.15)] hover:shadow-[0_0_20px_rgba(212,168,67,0.3)] transition-all group relative"
                >
                  <span className="absolute top-3 right-3 text-[10px] uppercase font-bold text-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 px-2 py-0.5 rounded-full">
                    Today
                  </span>
                  <div className="font-medium text-[var(--color-text-primary)] font-[Outfit] group-hover:text-[var(--color-accent-gold)] transition-colors pr-12">
                    {svc.displayName}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    {svc.time && `${svc.time} • `} {slotCount} hymn slots
                  </div>
                </button>
              );
            })}
          </div>

          <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Other Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {services.filter(s => !todayServiceTypes.includes(s.id)).map(svc => {
              const slotCount = svc.steps.filter(s => s.hymnSlot).length;
              if (slotCount === 0) return null;
              return (
                <button
                  key={svc.id}
                  onClick={() => handleSelectService(svc)}
                  className="text-left p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent-gold)]/50 transition-all group"
                >
                  <div className="font-medium text-[var(--color-text-primary)] font-[Outfit] group-hover:text-[var(--color-accent-gold)] transition-colors">
                    {svc.displayName}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">
                    {svc.day} {svc.time && `• ${svc.time}`} • {slotCount} hymn{slotCount !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Past Plans Section */}
          {pastPlans.length > 0 && (
            <div>
              <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                Recent Plans
              </h2>
              <div className="space-y-2">
                {pastPlans.map(plan => (
                  <div key={plan.id} className="flex gap-2">
                    <button
                      onClick={() => loadPastPlan(plan)}
                      className="flex-1 text-left p-3 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)] border border-[var(--color-border)] transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)]">
                          {plan.serviceName}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {new Date(plan.date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)]">Load ↻</span>
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="px-4 py-2 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-400 hover:border-red-400/30 transition-all"
                      title="Delete plan"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Service header */}
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-accent-gold)] font-[Outfit]">
                  {selectedService?.displayName}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {slotSelections.length} hymn slots • {filledCount} filled
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedServiceId(null);
                  setSlotSelections([]);
                }}
                className="px-3 py-1.5 rounded-lg text-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-all"
              >
                Change Service
              </button>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--color-accent-gold)] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Today's Readings Context */}
          {todaysLessons.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent-teal)]"></div>
              <div className="text-xs uppercase font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-2">
                📖 Today's Readings
              </div>
              <div className="space-y-1">
                {todaysLessons.map((l, i) => (
                  <div key={i} className="text-sm text-[var(--color-text-primary)]">
                    {l.firstLesson?.raw}
                    {l.secondLesson && <span className="mx-2 text-[var(--color-text-muted)]">•</span>}
                    {l.secondLesson?.raw}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hymn Slots */}
          <div className="space-y-3">
            {slotSelections.map((slot, idx) => {
              const isLocked = lockedSlots.has(idx);
              const isExpanded = expandedSlot === idx;
              
              return (
                <div
                  key={idx}
                  className={`bg-[var(--color-bg-card)] rounded-2xl border transition-all ${
                    isExpanded 
                      ? 'border-[var(--color-accent-gold)] shadow-md' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  {/* Slot header */}
                  <div 
                    onClick={() => !isLocked && setExpandedSlot(isExpanded ? null : idx)}
                    className={`w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!isLocked ? 'cursor-pointer hover:bg-[var(--color-bg-card-hover)]' : ''} rounded-2xl transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                        slot.selectedHymn 
                          ? 'bg-[var(--color-accent-gold)] text-[#0A1628]' 
                          : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                      }`}>
                        {slot.stepNumber}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                          {slot.slotName}
                          {isLocked && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Locked</span>}
                        </div>
                        {slot.category && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full inline-block mt-1"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[slot.category]}15`,
                              color: CATEGORY_COLORS[slot.category],
                              border: `1px solid ${CATEGORY_COLORS[slot.category]}30`
                            }}
                          >
                            {CATEGORY_LABELS[slot.category]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0">
                      {slot.selectedHymn ? (
                        <div className="flex-1 sm:flex-none text-right">
                          <div className="text-sm font-semibold text-[var(--color-accent-gold)]">
                            Hymn {slot.selectedHymn.number}
                          </div>
                          <div className="text-xs text-[var(--color-text-secondary)] line-clamp-1 max-w-[200px]">
                            {slot.selectedHymn.englishTitle || slot.selectedHymn.yorubaTitle}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-[var(--color-text-muted)] italic">
                          Select a hymn...
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-4">
                        <button
                          onClick={(e) => toggleLock(e, idx)}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                          title={isLocked ? "Unlock slot" : "Lock slot"}
                        >
                          {isLocked ? '🔒' : '🔓'}
                        </button>
                        <div className="text-[var(--color-text-muted)] w-4 text-center">
                          {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: candidate list */}
                  {isExpanded && !isLocked && (
                    <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]/30 rounded-b-2xl animate-[fadeIn_0.2s_ease-out]">
                      {/* Manual search */}
                      <input
                        type="text"
                        placeholder="Search by number, title, or lyrics..."
                        value={manualSearches[idx] || ''}
                        onChange={e =>
                          setManualSearches(prev => ({ ...prev, [idx]: e.target.value }))
                        }
                        className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-xl px-4 py-2.5 text-sm border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-accent-gold)] mb-3 shadow-inner"
                      />

                      {/* Candidates */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[var(--color-border)] [&::-webkit-scrollbar-thumb]:rounded-full">
                        {getFilteredCandidates(idx).map((suggestion) => {
                          const { hymn, reason, score } = suggestion;
                          const isRecentlyUsed = 'isRecentlyUsed' in suggestion ? suggestion.isRecentlyUsed : false;
                          const isSelected = slot.selectedHymn?.number === hymn.number;
                          const duplicates = getDuplicateSlots(hymn.number, idx);
                          
                          return (
                            <button
                              key={hymn.number}
                              onClick={() => handleSelectHymn(idx, hymn)}
                              className={`w-full text-left p-3 rounded-xl transition-all relative overflow-hidden ${
                                isSelected
                                  ? 'bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/50'
                                  : 'bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border)]'
                              }`}
                            >
                              {/* Score Indicator Bar */}
                              {!manualSearches[idx] && (
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--color-accent-gold)] to-[var(--color-accent-teal)] opacity-50" />
                              )}
                              
                              <div className="pl-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-[var(--color-accent-gold)] font-bold text-sm">
                                      #{hymn.number}
                                    </span>
                                    <span className="text-[var(--color-text-primary)] ml-2 text-sm font-medium">
                                      {hymn.englishTitle || hymn.yorubaTitle || 'Untitled'}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[var(--color-accent-gold)] text-lg">✓</span>
                                  )}
                                </div>
                                
                                <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1 italic">
                                  {(hymn.englishLyrics || hymn.yorubaLyrics || '').substring(0, 80)}...
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                                    {reason}
                                  </span>
                                  {isRecentlyUsed && (
                                    <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                      🕒 Recently Used
                                    </span>
                                  )}
                                  {duplicates.length > 0 && (
                                    <span className="text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                                      ⚠️ Used in Step {duplicates.join(', ')}
                                    </span>
                                  )}
                                  {!manualSearches[idx] && score >= 90 && (
                                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                      ⭐ Top Match
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* View details link */}
                      {slot.selectedHymn && (
                        <div className="mt-3 text-right">
                          <Link
                            to={`/hymns/${slot.selectedHymn.number}`}
                            className="inline-block px-4 py-2 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:text-[var(--color-accent-gold)] hover:border-[var(--color-accent-gold)]/50 transition-colors"
                          >
                            View Hymn Details ↗
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          {slotSelections.length > 0 && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportPlan());
                  setShowExport(true);
                  setTimeout(() => setShowExport(false), 2000);
                }}
                className="py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium hover:border-[var(--color-accent-gold)]/50 transition-all"
              >
                {showExport ? '✓ Copied' : '📋 Copy Text'}
              </button>
              
              <button
                onClick={() => window.print()}
                className="py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium hover:border-[var(--color-accent-gold)]/50 transition-all"
              >
                🖨️ Print
              </button>

              <button
                onClick={savePlan}
                className="py-2.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-accent-teal)] text-sm font-medium hover:bg-[var(--color-accent-teal)]/10 transition-all"
              >
                💾 Save Plan
              </button>
              
              <button
                onClick={sendToOperator}
                className="py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-accent-gold)] to-[#E8C36A] text-[#0A1628] text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
              >
                ▶️ Send to Operator
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
