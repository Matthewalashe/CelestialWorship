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

/** Keywords extracted from common Bible themes for matching hymns to lessons */
const SCRIPTURE_THEME_KEYWORDS: Record<string, HymnCategory[]> = {
  // Words found in hymn lyrics that map to categories
  'forgive': ['forgiveness_of_sins'],
  'sin': ['forgiveness_of_sins'],
  'mercy': ['mercy_or_blessing', 'forgiveness_of_sins'],
  'pardon': ['forgiveness_of_sins'],
  'repent': ['forgiveness_of_sins'],
  'holy spirit': ['holy_spirit_or_power'],
  'spirit': ['holy_spirit_or_power'],
  'power': ['holy_spirit_or_power'],
  'anoint': ['holy_spirit_or_power'],
  'fire': ['holy_spirit_or_power'],
  'heal': ['healing'],
  'sick': ['healing'],
  'restore': ['healing'],
  'praise': ['praise_or_glory'],
  'glory': ['praise_or_glory', 'christ_the_king'],
  'hallelujah': ['praise_or_glory'],
  'worship': ['praise_or_glory'],
  'king': ['christ_the_king'],
  'throne': ['christ_the_king'],
  'reign': ['christ_the_king'],
  'majesty': ['christ_the_king'],
  'faith': ['faith_and_trust'],
  'trust': ['faith_and_trust'],
  'believe': ['faith_and_trust'],
  'hope': ['faith_and_trust'],
  'thank': ['thanksgiving'],
  'grateful': ['thanksgiving'],
  'bless': ['mercy_or_blessing', 'thanksgiving'],
  'grace': ['mercy_or_blessing'],
  'light': ['lighting_of_candles'],
  'candle': ['lighting_of_candles'],
  'lamp': ['lighting_of_candles'],
  'sanctif': ['sanctification'],
  'holy': ['sanctification'],
  'pure': ['sanctification'],
  'clean': ['sanctification', 'forgiveness_of_sins'],
  'preach': ['evangelism'],
  'gospel': ['evangelism'],
  'salvation': ['evangelism'],
  'save': ['evangelism'],
};

/**
 * Score a hymn's relevance to today's Bible lessons.
 * Scans hymn lyrics for thematic keywords related to the lesson references.
 */
export function scoreLessonRelevance(
  hymn: Hymn,
  lessonRefs: { book: string; chapter: number }[]
): { score: number; reason: string } {
  if (lessonRefs.length === 0) return { score: 0, reason: '' };
  
  const hymnText = `${hymn.englishLyrics || ''} ${hymn.yorubaLyrics || ''} ${hymn.englishTitle || ''}`.toLowerCase();
  let totalScore = 0;
  const reasons: string[] = [];

  // Check for direct book name references in hymn text
  for (const ref of lessonRefs) {
    const bookLower = ref.book.toLowerCase();
    if (hymnText.includes(bookLower)) {
      totalScore += 15;
      reasons.push(`References ${ref.book}`);
    }
  }

  // Check thematic keyword matches
  let keywordMatches = 0;
  for (const [keyword, _categories] of Object.entries(SCRIPTURE_THEME_KEYWORDS)) {
    if (hymnText.includes(keyword)) {
      // Check if any of the hymn's categories match the keyword's expected categories
      const categoryOverlap = _categories.some(c => hymn.categories.includes(c));
      if (categoryOverlap) {
        keywordMatches++;
      }
    }
  }
  
  if (keywordMatches > 0) {
    const keywordScore = Math.min(20, keywordMatches * 5);
    totalScore += keywordScore;
    if (keywordMatches >= 3) {
      reasons.push('Strong thematic match to today\'s readings');
    } else {
      reasons.push('Thematic match to today\'s readings');
    }
  }

  return {
    score: totalScore,
    reason: reasons.join('; '),
  };
}

export function getCandidateHymns(
  slot: HymnSlot,
  allHymns: Hymn[],
  maxResults: number = 10,
  lessonRefs: { book: string; chapter: number }[] = []
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

        // Lesson relevance boost
        const lessonMatch = scoreLessonRelevance(hymn, lessonRefs);
        if (lessonMatch.score > 0) {
          score += lessonMatch.score;
          reason = lessonMatch.reason + ' + ' + reason;
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
  date?: string,
  lessonRefs: { book: string; chapter: number }[] = []
) {
  const slots = extractHymnSlots(service);

  return {
    serviceType: service.id,
    date: date || new Date().toISOString().split('T')[0],
    slots: slots.map(({ stepNumber, slotName, slot }) => ({
      stepNumber,
      slotName,
      category: slot.category || null,
      suggestions: getCandidateHymns(slot, allHymns, 10, lessonRefs),
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
