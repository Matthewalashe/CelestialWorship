export interface Note {
  id: string;
  title: string;
  content: string;
  tags: NoteTag[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

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
  category?: PassageCategory; // optional — existing passages won't have it
  savedAt: string; // ISO date string
}
