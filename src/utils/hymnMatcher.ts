import { Hymn, HymnCategory, ServiceOrder, HymnSlot } from '../types';

export interface ScoredHymnSuggestion {
  hymnNumber: number;
  hymn: Hymn;
  reason: string;
  score: number;
  matchType: 'exact' | 'category' | 'related' | 'manual';
  isRecentlyUsed?: boolean;
}

export function getRecentlyUsedHymns(): number[] {
  try {
    const data = localStorage.getItem('cw-recent-hymns');
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read recent hymns', e);
  }
  return [];
}

export function recordHymnUsage(hymnNumbers: number[]): void {
  try {
    const recent = getRecentlyUsedHymns();
    // Prepend new ones, keep unique, limit to let's say last 50
    const updated = [...new Set([...hymnNumbers, ...recent])].slice(0, 50);
    localStorage.setItem('cw-recent-hymns', JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent hymns', e);
  }
}

export function extractHymnSlots(service: ServiceOrder): {
  stepNumber: number;
  slotName: string;
  slot: HymnSlot;
}[] {
  return service.steps
    .filter(step => step.hymnSlot !== null)
    .map(step => ({
      stepNumber: step.stepNumber || 0,
      slotName: step.hymnSlot?.category
        ? categoryToSlotName(step.hymnSlot.category)
        : `Hymn ${step.hymnSlot?.fixedHymnNumber}`,
      slot: step.hymnSlot!,
    }));
}

export function getCandidateHymns(
  slot: HymnSlot,
  allHymns: Hymn[],
  maxResults: number = 10
): ScoredHymnSuggestion[] {
  const recentHymns = getRecentlyUsedHymns();

  if (slot.fixedHymnNumber) {
    const hymn = allHymns.find(h => h.number === slot.fixedHymnNumber);
    if (hymn) {
      return [{
        hymnNumber: hymn.number,
        hymn,
        reason: 'Specified in the Order of Service',
        score: 100,
        matchType: 'exact',
        isRecentlyUsed: recentHymns.includes(hymn.number),
      }];
    }
    return [];
  }

  if (slot.category) {
    const matches: ScoredHymnSuggestion[] = [];

    allHymns.forEach(hymn => {
      if (hymn.categories.includes(slot.category!)) {
        let score = 80; // Base score for category match
        let reason = `Matches ${categoryToSlotName(slot.category!)}`;

        // Multi-category bonus
        const extraCategories = hymn.categories.length - 1;
        if (extraCategories > 0) {
          score += Math.min(15, extraCategories * 5);
          reason = `Strong match: ${categoryToSlotName(slot.category!)} + ${extraCategories} other tags`;
        }

        const isRecentlyUsed = recentHymns.includes(hymn.number);
        if (isRecentlyUsed) {
          score -= 30; // Penalize recently used
        }

        matches.push({
          hymnNumber: hymn.number,
          hymn,
          reason,
          score,
          matchType: 'category',
          isRecentlyUsed,
        });
      }
    });

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  return [];
}

export function generateHymnPlan(
  service: ServiceOrder,
  allHymns: Hymn[],
  date?: string
) {
  const slots = extractHymnSlots(service);

  return {
    serviceType: service.id,
    date: date || new Date().toISOString().split('T')[0],
    slots: slots.map(({ stepNumber, slotName, slot }) => ({
      stepNumber,
      slotName,
      category: slot.category || null,
      suggestions: getCandidateHymns(slot, allHymns),
    })),
  };
}

export function categoryToSlotName(category: HymnCategory): string {
  const names: Record<HymnCategory, string> = {
    forgiveness_of_sins: 'Forgiveness of Sins',
    processional_or_opening: 'Processional / Opening',
    lighting_of_candles: 'Lighting of Candles',
    sanctification: 'Sanctification',
    thanksgiving: 'Thanksgiving',
    praise_or_glory: 'Praise & Glory',
    holy_spirit_or_power: 'Holy Spirit / Spiritual Power',
    mercy_or_blessing: 'Mercy & Blessing',
    recessional_or_closing: 'Recessional / Closing',
    evangelism: 'Evangelism',
    faith_and_trust: 'Faith & Trust',
    healing: 'Healing',
    christ_the_king: 'Christ the King',
  };
  return names[category] || category;
}
