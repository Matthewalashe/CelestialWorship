// ============================================================
// CCC Live — Core Type Definitions
// ============================================================

// ---------- Hymn Category Taxonomy ----------
export type HymnCategory =
  | 'forgiveness_of_sins'
  | 'processional_or_opening'
  | 'lighting_of_candles'
  | 'sanctification'
  | 'thanksgiving'
  | 'praise_or_glory'
  | 'holy_spirit_or_power'
  | 'mercy_or_blessing'
  | 'recessional_or_closing'
  | 'evangelism'
  | 'faith_and_trust'
  | 'healing'
  | 'christ_the_king';

export const CATEGORY_LABELS: Record<HymnCategory, string> = {
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

export const CATEGORY_COLORS: Record<HymnCategory, string> = {
  forgiveness_of_sins: '#8B5CF6',      // Purple
  processional_or_opening: '#D4A843',  // Gold
  lighting_of_candles: '#F59E0B',      // Amber
  sanctification: '#10B981',           // Emerald
  thanksgiving: '#06B6D4',             // Cyan
  praise_or_glory: '#F97316',          // Orange
  holy_spirit_or_power: '#EF4444',     // Red
  mercy_or_blessing: '#3B82F6',        // Blue
  recessional_or_closing: '#6366F1',   // Indigo
  evangelism: '#EC4899',               // Pink
  faith_and_trust: '#14B8A6',          // Teal
  healing: '#22C55E',                  // Green
  christ_the_king: '#D4A843',          // Gold
};

// ---------- Hymn ----------
export interface Hymn {
  number: number;
  yorubaTitle: string | null;
  englishTitle: string | null;
  yorubaLyrics: string;
  englishLyrics: string;
  solfaNotation: string | null;
  categories: HymnCategory[];
  needsClergyReview: boolean;
}

// ---------- Scripture Reference ----------
export interface ScriptureReference {
  raw: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

// ---------- Service Order ----------
export type ServiceStepType = 'instruction' | 'hymn' | 'prayer' | 'scripture' | 'rubric';

export interface HymnSlot {
  category?: HymnCategory;
  fixedHymnNumber?: number;
}

export interface ServiceStep {
  stepNumber: number | null;
  text: string;
  type: ServiceStepType;
  hymnSlot: HymnSlot | null;
  scriptureRef: ScriptureReference | null;
  isHeader?: boolean;
}

export interface ServiceOrder {
  id: string;
  displayName: string;
  day: string;
  time: string;
  description: string;
  steps: ServiceStep[];
}

// ---------- Bible Lesson ----------
export interface BibleLesson {
  date: string;
  day: string;
  time: string;
  occasion: string | null;
  firstLesson: ScriptureReference | null;
  secondLesson: ScriptureReference | null;
}

// ---------- Bible ----------
export interface BibleBook {
  name: string;
  abbreviation: string;
  chapters: number;
  testament: 'OT' | 'NT';
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: Record<string, string>;
}

// ---------- Live Display ----------
export type DisplayContentType = 'hymn' | 'verse' | 'announcement' | 'blank' | 'logo';

export interface DisplayState {
  type: DisplayContentType;
  title?: string;
  content: string;
  subtitle?: string;
  hymnNumber?: number;
  verseIndex?: number;
  totalVerses?: number;
}

// ---------- Hymn Suggestion ----------
export interface HymnSuggestion {
  hymnNumber: number;
  hymn: Hymn;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  isAiRefined?: boolean;
}

export interface HymnPlan {
  serviceType: string;
  date: string;
  slots: {
    slotName: string;
    category: HymnCategory;
    stepNumber: number;
    suggestions: HymnSuggestion[];
    selectedHymn: Hymn | null;
  }[];
}

// ---------- Topical Breakdown ----------
export interface TopicalBreakdown {
  date: string;
  serviceType: string;
  firstLessonSummary: string;
  secondLessonSummary: string | null;
  connectionTheme: string;
  keyThemes: string[];
  isAiGenerated: boolean;
  reviewStatus: 'draft' | 'approved' | 'rejected';
}

// ---------- Navigation ----------
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
