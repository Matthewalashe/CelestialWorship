// ============================================================
// CelestialWorship: Core Type Definitions
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

/** One quiet tone for every category: the label says what it is */
export const CATEGORY_COLORS: Record<HymnCategory, string> = {
  forgiveness_of_sins: 'var(--color-text-muted)',
  processional_or_opening: 'var(--color-text-muted)',
  lighting_of_candles: 'var(--color-text-muted)',
  sanctification: 'var(--color-text-muted)',
  thanksgiving: 'var(--color-text-muted)',
  praise_or_glory: 'var(--color-text-muted)',
  holy_spirit_or_power: 'var(--color-text-muted)',
  mercy_or_blessing: 'var(--color-text-muted)',
  recessional_or_closing: 'var(--color-text-muted)',
  evangelism: 'var(--color-text-muted)',
  faith_and_trust: 'var(--color-text-muted)',
  healing: 'var(--color-text-muted)',
  christ_the_king: 'var(--color-text-muted)',
};

// ---------- Hymn Stanza (structured) ----------
export type HymnStanzaKind = 'verse' | 'chorus';

export interface HymnVerse {
  kind: HymnStanzaKind;
  /** Verse number as printed in the hymnal; null for a chorus */
  number: number | null;
  englishLines: string[];
  yorubaLines: string[];
  /** True when the hymnal only says "Chorus" here and the text is the repeated chorus */
  repeat?: boolean;
}

/** Section of the printed hymnal, e.g. Easter, Burial & Remembrance */
export interface HymnSection {
  id: string;
  english: string;
  yoruba: string;
}

// ---------- Hymn ----------
export interface Hymn {
  number: number;
  yorubaTitle: string | null;
  englishTitle: string | null;
  section: HymnSection | null;
  yorubaLyrics: string;
  englishLyrics: string;
  solfaNotation: string | null;
  categories: HymnCategory[];
  needsClergyReview: boolean;
  needsVerseSplitReview: boolean;
  verses: HymnVerse[];
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
  textLines: string[];
  type: ServiceStepType;
  hymnSlot: HymnSlot | null;
  scriptureRef: ScriptureReference | null;
  scriptureReferences: ScriptureReference[];
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
export type BibleLanguage = 'en' | 'yo';

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

// ---------- Constitution ----------
export interface ConstitutionSubClause {
  letter: string;
  text: string;
}

export interface ConstitutionClause {
  number: string;
  text: string;
  subClauses: ConstitutionSubClause[];
}

export interface ConstitutionSection {
  id: string;
  title: string;
  icon: string;
  type: 'narrative' | 'clauses';
  content?: string;
  paragraphs?: string[];
  clauses?: ConstitutionClause[];
}

export interface ConstitutionData {
  meta: {
    title: string;
    subtitle: string;
    version: string;
    note: string;
  };
  sections: ConstitutionSection[];
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

// ---------- Navigation ----------
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
