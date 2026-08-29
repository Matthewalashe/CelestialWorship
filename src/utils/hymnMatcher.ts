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

/**
 * Extract selectable hymn slots from a service.
 * - Fixed hymns (e.g. #674, #731) are constant ceremonial songs — excluded from selection.
 * - Duplicate categories are deduplicated (keep first occurrence).
 * - Capped at 7 selectable slots per CCC liturgy (max 7 service hymns).
 */
export function extractHymnSlots(service: ServiceOrder): {
  stepNumber: number;
  slotName: string;
  slot: HymnSlot;
}[] {
  const rawSlots = service.steps
    .filter(step => step.hymnSlot !== null)
    .map(step => ({
      stepNumber: step.stepNumber || 0,
      slotName: step.hymnSlot?.category
        ? categoryToSlotName(step.hymnSlot.category)
        : `Hymn ${step.hymnSlot?.fixedHymnNumber}`,
      slot: step.hymnSlot!,
    }));

  // Fixed hymns are constant ceremonial songs — not user-selectable
  const selectableSlots = rawSlots.filter(({ slot }) => !slot.fixedHymnNumber);

  // Deduplicate by category — keep only the first occurrence of each category
  const seenCategories = new Set<string>();
  const deduped = selectableSlots.filter(({ slot }) => {
    if (!slot.category) return true;
    if (seenCategories.has(slot.category)) return false;
    seenCategories.add(slot.category);
    return true;
  });

  // Cap at 7 selectable slots per CCC liturgy rules
  return deduped.slice(0, 7);
}

/** Keywords extracted from common Bible themes for matching hymns to lessons */
const SCRIPTURE_THEME_KEYWORDS: Record<string, HymnCategory[]> = {
  // === ENGLISH KEYWORDS ===
  'forgive': ['forgiveness_of_sins'],
  'sin': ['forgiveness_of_sins'],
  'mercy': ['mercy_or_blessing', 'forgiveness_of_sins'],
  'pardon': ['forgiveness_of_sins'],
  'repent': ['forgiveness_of_sins'],
  'transgression': ['forgiveness_of_sins'],
  'iniquity': ['forgiveness_of_sins'],
  'cleanse': ['forgiveness_of_sins', 'sanctification'],
  'holy spirit': ['holy_spirit_or_power'],
  'spirit': ['holy_spirit_or_power'],
  'power': ['holy_spirit_or_power'],
  'anoint': ['holy_spirit_or_power'],
  'fire': ['holy_spirit_or_power'],
  'comforter': ['holy_spirit_or_power'],
  'pentecost': ['holy_spirit_or_power'],
  'tongues': ['holy_spirit_or_power'],
  'heal': ['healing'],
  'sick': ['healing'],
  'restore': ['healing'],
  'physician': ['healing'],
  'disease': ['healing'],
  'praise': ['praise_or_glory'],
  'glory': ['praise_or_glory', 'christ_the_king'],
  'hallelujah': ['praise_or_glory'],
  'worship': ['praise_or_glory'],
  'magnify': ['praise_or_glory'],
  'exalt': ['praise_or_glory'],
  'king': ['christ_the_king'],
  'throne': ['christ_the_king'],
  'reign': ['christ_the_king'],
  'majesty': ['christ_the_king'],
  'crown': ['christ_the_king'],
  'sovereign': ['christ_the_king'],
  'faith': ['faith_and_trust'],
  'trust': ['faith_and_trust'],
  'believe': ['faith_and_trust'],
  'hope': ['faith_and_trust'],
  'courage': ['faith_and_trust'],
  'strength': ['faith_and_trust'],
  'thank': ['thanksgiving'],
  'grateful': ['thanksgiving'],
  'bless': ['mercy_or_blessing', 'thanksgiving'],
  'grace': ['mercy_or_blessing'],
  'favour': ['mercy_or_blessing'],
  'compassion': ['mercy_or_blessing'],
  'light': ['lighting_of_candles'],
  'candle': ['lighting_of_candles'],
  'lamp': ['lighting_of_candles'],
  'sanctif': ['sanctification'],
  'holy': ['sanctification'],
  'pure': ['sanctification'],
  'clean': ['sanctification', 'forgiveness_of_sins'],
  'righteous': ['sanctification'],
  'preach': ['evangelism'],
  'gospel': ['evangelism'],
  'salvation': ['evangelism'],
  'save': ['evangelism'],
  'witness': ['evangelism'],
  'mission': ['evangelism'],
  'proclaim': ['evangelism'],
  'cross': ['evangelism', 'forgiveness_of_sins'],
  'calvary': ['evangelism', 'forgiveness_of_sins'],
  'redeem': ['evangelism', 'forgiveness_of_sins'],
  'blood': ['forgiveness_of_sins'],
  'lamb': ['forgiveness_of_sins', 'praise_or_glory'],
  'shepherd': ['faith_and_trust'],
  'refuge': ['faith_and_trust'],
  'rock': ['faith_and_trust'],
  'fortress': ['faith_and_trust'],

  // === YORUBA KEYWORDS ===
  'ẹṣẹ': ['forgiveness_of_sins'],
  'ese': ['forgiveness_of_sins'],
  'idariji': ['forgiveness_of_sins'],
  'aanu': ['mercy_or_blessing', 'forgiveness_of_sins'],
  'emi mimo': ['holy_spirit_or_power'],
  'agbara': ['holy_spirit_or_power'],
  'iwosan': ['healing'],
  'aisan': ['healing'],
  'iyin': ['praise_or_glory'],
  'ogo': ['praise_or_glory'],
  'oba': ['christ_the_king'],
  'igbagbo': ['faith_and_trust'],
  'ireti': ['faith_and_trust'],
  'ope': ['thanksgiving'],
  'idupe': ['thanksgiving'],
  'ibukun': ['mercy_or_blessing'],
  'oore': ['mercy_or_blessing'],
  'mimo': ['sanctification'],
  'ihinrere': ['evangelism'],
  'igbala': ['evangelism'],
  'ina': ['lighting_of_candles', 'holy_spirit_or_power'],
  'imole': ['lighting_of_candles'],
  'agutan': ['forgiveness_of_sins', 'praise_or_glory'],
  'oluwa': ['praise_or_glory', 'faith_and_trust'],
  'olorun': ['praise_or_glory'],
  'olugbala': ['evangelism'],
  'adura': ['holy_spirit_or_power'],
  'ironupiwada': ['forgiveness_of_sins'],
};

/** Common stop words to exclude from text comparison */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'they', 'them', 'their', 'who', 'whom',
  'which', 'what', 'when', 'where', 'how', 'why', 'not', 'no', 'nor',
  'so', 'if', 'then', 'than', 'too', 'very', 'just', 'also', 'all',
  'from', 'into', 'up', 'out', 'as', 'about', 'each', 'unto', 'upon',
  'ye', 'thee', 'thy', 'thou', 'hath', 'doth', 'art', 'o',
  // Yoruba common words
  'ni', 'ti', 'si', 'ati', 'ki', 'pe', 'fun', 'wa', 'mi', 're', 'lo',
]);

/** Extract significant words from text (skip stop words, min 3 chars) */
function extractKeyWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-zA-ZàáèéẹìíòóọùúṣẸỌ\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  );
}

/**
 * Score a hymn's relevance to today's Bible lessons.
 * Uses three layers:
 *   1. Direct book name match (+15 each)
 *   2. Thematic keyword overlap (+5 per keyword, max +20)
 *   3. Lesson text word match (+2 per shared word, max +30)
 */
export function scoreLessonRelevance(
  hymn: Hymn,
  lessonRefs: { book: string; chapter: number }[],
  lessonText: string = ''
): { score: number; reason: string } {
  if (lessonRefs.length === 0 && !lessonText) return { score: 0, reason: '' };
  
  const hymnText = `${hymn.englishLyrics || ''} ${hymn.yorubaLyrics || ''} ${hymn.englishTitle || ''} ${hymn.yorubaTitle || ''}`.toLowerCase();
  let totalScore = 0;
  const reasons: string[] = [];

  // Layer 1: Direct book name references in hymn text
  for (const ref of lessonRefs) {
    const bookLower = ref.book.toLowerCase();
    if (hymnText.includes(bookLower)) {
      totalScore += 15;
      reasons.push(`References ${ref.book}`);
    }
  }

  // Layer 2: Thematic keyword matches (English + Yoruba)
  let keywordMatches = 0;
  for (const [keyword, _categories] of Object.entries(SCRIPTURE_THEME_KEYWORDS)) {
    if (hymnText.includes(keyword)) {
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

  // Layer 3: Direct lesson text ↔ hymn lyrics word comparison
  if (lessonText) {
    const lessonWords = extractKeyWords(lessonText);
    const hymnWords = extractKeyWords(hymnText);
    let sharedWords = 0;
    for (const word of lessonWords) {
      if (hymnWords.has(word)) sharedWords++;
    }
    if (sharedWords > 0) {
      const textScore = Math.min(30, sharedWords * 2);
      totalScore += textScore;
      if (sharedWords >= 8) {
        reasons.push(`Very strong text match (${sharedWords} shared words with lesson)`);
      } else if (sharedWords >= 4) {
        reasons.push(`Good text match (${sharedWords} shared words with lesson)`);
      } else {
        reasons.push(`Text match (${sharedWords} words)`);
      }
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
  lessonRefs: { book: string; chapter: number }[] = [],
  lessonText: string = ''
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
          score -= 40; // Stronger recency penalty for variety
        }

        // Lesson relevance boost (3 layers)
        const lessonMatch = scoreLessonRelevance(hymn, lessonRefs, lessonText);
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
  lessonRefs: { book: string; chapter: number }[] = [],
  lessonText: string = ''
) {
  const slots = extractHymnSlots(service);

  return {
    serviceType: service.id,
    date: date || new Date().toISOString().split('T')[0],
    slots: slots.map(({ stepNumber, slotName, slot }) => ({
      stepNumber,
      slotName,
      category: slot.category || null,
      suggestions: getCandidateHymns(slot, allHymns, 10, lessonRefs, lessonText),
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
