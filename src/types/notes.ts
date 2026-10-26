export interface Note {
  id: string;
  title: string;
  content: string;
  tags: NoteTag[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  pinned?: boolean;
  /** What the note is about, e.g. a Bible passage or a hymn, so it can be shown there */
  link?: NoteLink;
}

export type NoteLink =
  | { kind: 'bible'; book: string; chapter: number; verseStart: number; verseEnd: number }
  | { kind: 'hymn'; number: number }
  | { kind: 'service'; serviceId: string }
  | { kind: 'lesson'; date: string };

export type NoteTag = 'service' | 'study' | 'personal' | 'prayer' | 'sermon';

export const NOTE_TAG_LABELS: Record<NoteTag, string> = {
  service: 'Service',
  study: 'Bible Study',
  personal: 'Personal',
  prayer: 'Prayer',
  sermon: 'Sermon',
};

export const NOTE_TAG_COLORS: Record<NoteTag, string> = {
  service: '#D4A843',
  study: '#14B8A6',
  personal: '#8B5CF6',
  prayer: '#3B82F6',
  sermon: '#F97316',
};

export type PassageCategory = 'favorite' | 'study' | 'memorize' | 'share';

export const PASSAGE_CATEGORY_LABELS: Record<PassageCategory, string> = {
  favorite: 'Favorites',
  study: 'Bible Study',
  memorize: 'Memorize',
  share: 'Share',
};

export const PASSAGE_CATEGORY_COLORS: Record<PassageCategory, string> = {
  favorite: '#F59E0B',
  study: '#14B8A6',
  memorize: '#8B5CF6',
  share: '#3B82F6',
};

export interface SavedPassage {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  annotation: string;
  category?: PassageCategory; // optional, existing passages won't have it
  savedAt: string; // ISO date string
}

export type HighlightColor = 'gold' | 'green' | 'blue' | 'pink' | 'purple';

export const HIGHLIGHT_COLORS: Record<HighlightColor, { label: string; swatch: string; background: string }> = {
  gold: { label: 'Gold', swatch: '#F5C542', background: 'rgba(245, 197, 66, 0.30)' },
  green: { label: 'Green', swatch: '#4ADE80', background: 'rgba(74, 222, 128, 0.25)' },
  blue: { label: 'Blue', swatch: '#60A5FA', background: 'rgba(96, 165, 250, 0.25)' },
  pink: { label: 'Pink', swatch: '#F472B6', background: 'rgba(244, 114, 182, 0.25)' },
  purple: { label: 'Purple', swatch: '#A78BFA', background: 'rgba(167, 139, 250, 0.25)' },
};

/** A highlighted Bible verse (one record per verse) */
export interface Highlight {
  id: string; // `${book}|${chapter}|${verse}`
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  createdAt: string;
}

export type PrayerCategory = 'personal' | 'family' | 'health' | 'work' | 'church' | 'thanksgiving' | 'other';

export const PRAYER_CATEGORY_LABELS: Record<PrayerCategory, string> = {
  personal: 'Personal',
  family: 'Family',
  health: 'Health',
  work: 'Work & finances',
  church: 'Church',
  thanksgiving: 'Thanksgiving',
  other: 'Other',
};

export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  isAnswered: boolean;
  answeredAt?: string; // ISO date string
  /** How the prayer was answered, a testimony to look back on */
  answeredNote?: string;
  category?: PrayerCategory;
  /** Times the user has prayed for this (tapped "I prayed") */
  prayedCount?: number;
  lastPrayedAt?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
