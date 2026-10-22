import { useState, useEffect, useCallback } from 'react';
import { openDB, IDBPDatabase } from 'idb';
import type {
  Note, NoteTag, NoteLink, SavedPassage, PassageCategory, PrayerRequest, PrayerCategory, Highlight, HighlightColor,
} from '../types/notes';

/**
 * The personal library: notes, saved passages, highlights and the prayer journal.
 * Everything is stored on this device (IndexedDB). Nothing leaves the device unless
 * the user exports it or backs it up to their own account (see useCloudBackup).
 */

const DB_NAME = 'celestialworship-notes';
const DB_VERSION = 3;
const CHANGE_EVENT = 'cw-library-changed';

type StoreName = 'notes' | 'savedPassages' | 'prayers' | 'highlights';

let dbPromise: Promise<IDBPDatabase<any>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('savedPassages')) {
          const passagesStore = db.createObjectStore('savedPassages', { keyPath: 'id' });
          passagesStore.createIndex('savedAt', 'savedAt');
          passagesStore.createIndex('reference', ['book', 'chapter', 'verseStart', 'verseEnd']);
        }
        if (!db.objectStoreNames.contains('prayers')) {
          const prayerStore = db.createObjectStore('prayers', { keyPath: 'id' });
          prayerStore.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('highlights')) {
          const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
          highlightStore.createIndex('chapter', ['book', 'chapter']);
          highlightStore.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

/** Tell every mounted hook that a store changed, so lists stay in sync across pages */
function notifyChange(store: StoreName) {
  window.dispatchEvent(new CustomEvent<StoreName>(CHANGE_EVENT, { detail: store }));
}

function useStoreSubscription(store: StoreName, refresh: () => void) {
  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent<StoreName>).detail === store) refresh();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [store, refresh]);
}

const now = () => new Date().toISOString();

// ── Notes ────────────────────────────────────────────────────

export const notesApi = {
  async getNotes(): Promise<Note[]> {
    const db = await getDB();
    const notes: Note[] = await db.getAllFromIndex('notes', 'updatedAt');
    // Pinned first, then most recently edited
    return notes.reverse().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  },

  async getNote(id: string): Promise<Note | undefined> {
    const db = await getDB();
    return db.get('notes', id);
  },

  async createNote(title: string, content: string, tags: NoteTag[], link?: NoteLink): Promise<Note> {
    const db = await getDB();
    const timestamp = now();
    const newNote: Note = { id: crypto.randomUUID(), title, content, tags, createdAt: timestamp, updatedAt: timestamp, link };
    await db.put('notes', newNote);
    notifyChange('notes');
    return newNote;
  },

  async updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'pinned' | 'link'>>): Promise<Note> {
    const db = await getDB();
    const tx = db.transaction('notes', 'readwrite');
    const existing = await tx.store.get(id);
    if (!existing) throw new Error(`Note ${id} not found`);
    const updatedNote: Note = { ...existing, ...updates, updatedAt: now() };
    await tx.store.put(updatedNote);
    await tx.done;
    notifyChange('notes');
    return updatedNote;
  },

  async deleteNote(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('notes', id);
    notifyChange('notes');
  },

  async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getNotes();
    const lowerQuery = query.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(lowerQuery) ||
      n.content.toLowerCase().includes(lowerQuery)
    );
  },

  async getNotesFor(link: NoteLink): Promise<Note[]> {
    const notes = await this.getNotes();
    return notes.filter(n => n.link && linkMatches(n.link, link));
  },

  // ── Saved passages ──
  async getSavedPassages(): Promise<SavedPassage[]> {
    const db = await getDB();
    const passages = await db.getAllFromIndex('savedPassages', 'savedAt');
    return passages.reverse();
  },

  async savePassage(book: string, chapter: number, verseStart: number, verseEnd: number, text: string, category?: PassageCategory): Promise<SavedPassage> {
    const db = await getDB();
    const newPassage: SavedPassage = {
      id: crypto.randomUUID(), book, chapter, verseStart, verseEnd, text, annotation: '', category, savedAt: now(),
    };
    await db.put('savedPassages', newPassage);
    notifyChange('savedPassages');
    return newPassage;
  },

  async updatePassage(id: string, updates: Partial<Pick<SavedPassage, 'annotation' | 'category'>>): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('savedPassages', 'readwrite');
    const existing = await tx.store.get(id);
    if (!existing) throw new Error(`Passage ${id} not found`);
    await tx.store.put({ ...existing, ...updates });
    await tx.done;
    notifyChange('savedPassages');
  },

  async updatePassageAnnotation(id: string, annotation: string): Promise<void> {
    return this.updatePassage(id, { annotation });
  },

  async deletePassage(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('savedPassages', id);
    notifyChange('savedPassages');
  },

  async isPassageSaved(book: string, chapter: number, verseStart: number, verseEnd: number): Promise<boolean> {
    const db = await getDB();
    const index = db.transaction('savedPassages').store.index('reference');
    const matches = await index.getAll([book, chapter, verseStart, verseEnd]);
    return matches.length > 0;
  },
};

function linkMatches(a: NoteLink, b: NoteLink): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'bible': {
      const o = b as typeof a;
      // Overlapping verse ranges in the same chapter
      return a.book === o.book && a.chapter === o.chapter && a.verseStart <= o.verseEnd && o.verseStart <= a.verseEnd;
    }
    case 'hymn': return a.number === (b as typeof a).number;
    case 'service': return a.serviceId === (b as typeof a).serviceId;
    case 'lesson': return a.date === (b as typeof a).date;
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      setNotes(await notesApi.getNotes());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useStoreSubscription('notes', fetchNotes);

  const searchNotes = async (query: string) => {
    if (!query.trim()) return fetchNotes();
    setNotes(await notesApi.searchNotes(query));
  };

  return {
    notes,
    loading,
    createNote: (title: string, content: string, tags: NoteTag[], link?: NoteLink) => notesApi.createNote(title, content, tags, link),
    updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags' | 'pinned' | 'link'>>) => notesApi.updateNote(id, updates),
    deleteNote: (id: string) => notesApi.deleteNote(id),
    searchNotes,
    refresh: fetchNotes,
  };
}

export function useSavedPassages() {
  const [passages, setPassages] = useState<SavedPassage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPassages = useCallback(async () => {
    try {
      setPassages(await notesApi.getSavedPassages());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPassages(); }, [fetchPassages]);
  useStoreSubscription('savedPassages', fetchPassages);

  return {
    passages,
    loading,
    savePassage: (book: string, chapter: number, verseStart: number, verseEnd: number, text: string, category?: PassageCategory) =>
      notesApi.savePassage(book, chapter, verseStart, verseEnd, text, category),
    updatePassage: (id: string, updates: Partial<Pick<SavedPassage, 'annotation' | 'category'>>) => notesApi.updatePassage(id, updates),
    updateAnnotation: (id: string, annotation: string) => notesApi.updatePassageAnnotation(id, annotation),
    deletePassage: (id: string) => notesApi.deletePassage(id),
    isPassageSaved: (book: string, chapter: number, verseStart: number, verseEnd: number) =>
      notesApi.isPassageSaved(book, chapter, verseStart, verseEnd),
    refresh: fetchPassages,
  };
}

// ── Highlights ───────────────────────────────────────────────

const highlightId = (book: string, chapter: number, verse: number) => `${book}|${chapter}|${verse}`;

export const highlightsApi = {
  async forChapter(book: string, chapter: number): Promise<Highlight[]> {
    const db = await getDB();
    return db.getAllFromIndex('highlights', 'chapter', [book, chapter]);
  },

  async all(): Promise<Highlight[]> {
    const db = await getDB();
    const items: Highlight[] = await db.getAllFromIndex('highlights', 'createdAt');
    return items.reverse();
  },

  /** Highlight verses with a colour; passing null removes the highlight */
  async set(book: string, chapter: number, verses: number[], color: HighlightColor | null): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('highlights', 'readwrite');
    for (const verse of verses) {
      const id = highlightId(book, chapter, verse);
      if (color) await tx.store.put({ id, book, chapter, verse, color, createdAt: now() } satisfies Highlight);
      else await tx.store.delete(id);
    }
    await tx.done;
    notifyChange('highlights');
  },
};

export function useChapterHighlights(book: string | undefined, chapter: number) {
  const [highlights, setHighlights] = useState<Map<number, HighlightColor>>(new Map());

  const refresh = useCallback(async () => {
    if (!book) return;
    const items = await highlightsApi.forChapter(book, chapter);
    setHighlights(new Map(items.map(h => [h.verse, h.color])));
  }, [book, chapter]);

  useEffect(() => { refresh(); }, [refresh]);
  useStoreSubscription('highlights', refresh);

  return { highlights, setHighlight: (verses: number[], color: HighlightColor | null) => book ? highlightsApi.set(book, chapter, verses, color) : Promise.resolve() };
}

export function useAllHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const refresh = useCallback(async () => setHighlights(await highlightsApi.all()), []);
  useEffect(() => { refresh(); }, [refresh]);
  useStoreSubscription('highlights', refresh);
  return highlights;
}

// ── Prayer journal ───────────────────────────────────────────

export const prayersApi = {
  async getPrayers(): Promise<PrayerRequest[]> {
    const db = await getDB();
    const prayers = await db.getAllFromIndex('prayers', 'createdAt');
    return prayers.reverse();
  },

  async createPrayer(title: string, description: string, category?: PrayerCategory): Promise<PrayerRequest> {
    const db = await getDB();
    const timestamp = now();
    const prayer: PrayerRequest = {
      id: crypto.randomUUID(), title, description, category, isAnswered: false, prayedCount: 0,
      createdAt: timestamp, updatedAt: timestamp,
    };
    await db.put('prayers', prayer);
    notifyChange('prayers');
    return prayer;
  },

  async update(id: string, change: (p: PrayerRequest) => PrayerRequest): Promise<PrayerRequest> {
    const db = await getDB();
    const tx = db.transaction('prayers', 'readwrite');
    const prayer = await tx.store.get(id);
    if (!prayer) throw new Error('Prayer not found');
    const updated = { ...change(prayer), updatedAt: now() };
    await tx.store.put(updated);
    await tx.done;
    notifyChange('prayers');
    return updated;
  },

  toggleAnswered(id: string, answeredNote?: string) {
    return this.update(id, p => ({
      ...p,
      isAnswered: !p.isAnswered,
      answeredAt: !p.isAnswered ? now() : undefined,
      answeredNote: !p.isAnswered ? answeredNote ?? p.answeredNote : p.answeredNote,
    }));
  },

  markPrayed(id: string) {
    return this.update(id, p => ({ ...p, prayedCount: (p.prayedCount ?? 0) + 1, lastPrayedAt: now() }));
  },

  async deletePrayer(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('prayers', id);
    notifyChange('prayers');
  },
};

export function usePrayers() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setPrayers(await prayersApi.getPrayers());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useStoreSubscription('prayers', refresh);

  return {
    prayers,
    loading,
    createPrayer: (title: string, description: string, category?: PrayerCategory) => prayersApi.createPrayer(title, description, category),
    toggleAnswered: (id: string, answeredNote?: string) => prayersApi.toggleAnswered(id, answeredNote),
    markPrayed: (id: string) => prayersApi.markPrayed(id),
    deletePrayer: (id: string) => prayersApi.deletePrayer(id),
  };
}

// ── Export / import ──────────────────────────────────────────

export interface LibraryExport {
  app: 'CelestialWorship';
  version: 1;
  exportedAt: string;
  notes: Note[];
  savedPassages: SavedPassage[];
  highlights: Highlight[];
  prayers: PrayerRequest[];
  /** Small preferences kept in localStorage (favourites, plans, streaks…) */
  preferences: Record<string, string>;
}

/** localStorage keys worth carrying to a new device */
const PORTABLE_PREFERENCE_KEYS = [
  'cw-favorite-hymns', 'cw-hymn-plans', 'cw-recent-hymns', 'cw-streak', 'cw-reading-progress',
  'cw-quiz-progress', 'cw-hymn-view', 'cw-hymn-font', 'cw-bible-font', 'cw-bible-version', 'ccc-theme',
];

export async function exportLibrary(): Promise<LibraryExport> {
  const db = await getDB();
  const preferences: Record<string, string> = {};
  for (const key of PORTABLE_PREFERENCE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) preferences[key] = value;
    } catch {}
  }
  return {
    app: 'CelestialWorship',
    version: 1,
    exportedAt: now(),
    notes: await db.getAll('notes'),
    savedPassages: await db.getAll('savedPassages'),
    highlights: await db.getAll('highlights'),
    prayers: await db.getAll('prayers'),
    preferences,
  };
}

/**
 * Merge an export into this device. Items are matched by id; the newer copy wins,
 * so importing the same file twice is harmless.
 */
export async function importLibrary(data: unknown): Promise<{ added: number; updated: number }> {
  const lib = data as Partial<LibraryExport>;
  if (!lib || lib.app !== 'CelestialWorship') throw new Error('This file is not a CelestialWorship backup');

  const db = await getDB();
  let added = 0;
  let updated = 0;
  const stamp = (item: any) => item.updatedAt ?? item.savedAt ?? item.createdAt ?? '';

  const stores: [StoreName, any[] | undefined][] = [
    ['notes', lib.notes], ['savedPassages', lib.savedPassages], ['highlights', lib.highlights], ['prayers', lib.prayers],
  ];
  for (const [store, items] of stores) {
    if (!Array.isArray(items)) continue;
    const tx = db.transaction(store, 'readwrite');
    for (const item of items) {
      if (!item || typeof item.id !== 'string') continue;
      const existing = await tx.store.get(item.id);
      if (!existing) { await tx.store.put(item); added++; }
      else if (stamp(item) > stamp(existing)) { await tx.store.put(item); updated++; }
    }
    await tx.done;
    notifyChange(store);
  }

  for (const [key, value] of Object.entries(lib.preferences ?? {})) {
    if (PORTABLE_PREFERENCE_KEYS.includes(key) && typeof value === 'string') {
      try { localStorage.setItem(key, value); } catch {}
    }
  }
  return { added, updated };
}

/** Number of items in the library, for the backup screen */
export async function librarySize(): Promise<number> {
  const db = await getDB();
  const counts = await Promise.all((['notes', 'savedPassages', 'highlights', 'prayers'] as StoreName[]).map(s => db.count(s)));
  return counts.reduce((a, b) => a + b, 0);
}
