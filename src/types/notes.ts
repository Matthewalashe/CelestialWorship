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

export interface SavedPassage {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  text: string;
  annotation: string;
  savedAt: string; // ISO date string
}
