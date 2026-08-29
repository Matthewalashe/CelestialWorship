import { useState, useEffect, useCallback } from 'react';
import { openDB, IDBPDatabase } from 'idb';
import { Note, NoteTag, SavedPassage, PassageCategory } from '../types/notes';
import { backupNoteToSupabase, deleteNoteFromSupabase } from './useNotesSync';

const DB_NAME = 'celestialworship-notes';
const DB_VERSION = 1;

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
      },
    });
  }
  return dbPromise;
}

export const notesApi = {
  async getNotes(): Promise<Note[]> {
    const db = await getDB();
    const notes = await db.getAllFromIndex('notes', 'updatedAt');
    return notes.reverse(); // Descending order
  },
  
  async getNote(id: string): Promise<Note | undefined> {
    const db = await getDB();
    return db.get('notes', id);
  },
  
  async createNote(title: string, content: string, tags: NoteTag[]): Promise<Note> {
    const db = await getDB();
    const now = new Date().toISOString();
    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('notes', newNote);
    backupNoteToSupabase(newNote);
    return newNote;
  },
  
  async updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags'>>): Promise<Note> {
    const db = await getDB();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const existing = await store.get(id);
    if (!existing) throw new Error(`Note ${id} not found`);
    
    const updatedNote: Note = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await store.put(updatedNote);
    await tx.done;
    backupNoteToSupabase(updatedNote);
    return updatedNote;
  },
  
  async deleteNote(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('notes', id);
    deleteNoteFromSupabase(id);
  },
  
  async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getNotes();
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQuery) || 
      n.content.toLowerCase().includes(lowerQuery)
    );
  },
  
  async getSavedPassages(): Promise<SavedPassage[]> {
    const db = await getDB();
    const passages = await db.getAllFromIndex('savedPassages', 'savedAt');
    return passages.reverse();
  },
  
  async savePassage(book: string, chapter: number, verseStart: number, verseEnd: number, text: string, category?: PassageCategory): Promise<SavedPassage> {
    const db = await getDB();
    const newPassage: SavedPassage = {
      id: crypto.randomUUID(),
      book,
      chapter,
      verseStart,
      verseEnd,
      text,
      annotation: '',
      category,
      savedAt: new Date().toISOString(),
    };
    await db.put('savedPassages', newPassage);
    backupNoteToSupabase({
      id: newPassage.id,
      title: `${book} ${chapter}:${verseStart}${verseEnd > verseStart ? '-' + verseEnd : ''}`,
      content: text,
      tags: ['bible'],
      createdAt: newPassage.savedAt,
      updatedAt: newPassage.savedAt
    });
    return newPassage;
  },
  
  async updatePassageAnnotation(id: string, annotation: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('savedPassages', 'readwrite');
    const store = tx.objectStore('savedPassages');
    const existing = await store.get(id);
    if (!existing) throw new Error(`Passage ${id} not found`);
    
    existing.annotation = annotation;
    await store.put(existing);
    await tx.done;
  },
  
  async deletePassage(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('savedPassages', id);
  },
  
  async isPassageSaved(book: string, chapter: number, verseStart: number, verseEnd: number): Promise<boolean> {
    const db = await getDB();
    const index = db.transaction('savedPassages').store.index('reference');
    const matches = await index.getAll([book, chapter, verseStart, verseEnd]);
    return matches.length > 0;
  }
};

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notesApi.getNotes();
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (title: string, content: string, tags: NoteTag[]) => {
    const newNote = await notesApi.createNote(title, content, tags);
    await fetchNotes();
    return newNote;
  };

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
    const updated = await notesApi.updateNote(id, updates);
    await fetchNotes();
    return updated;
  };

  const deleteNote = async (id: string) => {
    await notesApi.deleteNote(id);
    await fetchNotes();
  };

  const searchNotes = async (query: string) => {
    setLoading(true);
    try {
      if (!query.trim()) {
        await fetchNotes();
      } else {
        const results = await notesApi.searchNotes(query);
        setNotes(results);
      }
    } finally {
      setLoading(false);
    }
  };

  return { notes, loading, createNote, updateNote, deleteNote, searchNotes, refresh: fetchNotes };
}

export function useSavedPassages() {
  const [passages, setPassages] = useState<SavedPassage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPassages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notesApi.getSavedPassages();
      setPassages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPassages();
  }, [fetchPassages]);

  const savePassage = async (book: string, chapter: number, verseStart: number, verseEnd: number, text: string, category?: PassageCategory) => {
    const newPassage = await notesApi.savePassage(book, chapter, verseStart, verseEnd, text, category);
    await fetchPassages();
    return newPassage;
  };

  const updateAnnotation = async (id: string, annotation: string) => {
    await notesApi.updatePassageAnnotation(id, annotation);
    await fetchPassages();
  };

  const deletePassage = async (id: string) => {
    await notesApi.deletePassage(id);
    await fetchPassages();
  };

  const isPassageSaved = async (book: string, chapter: number, verseStart: number, verseEnd: number) => {
    return await notesApi.isPassageSaved(book, chapter, verseStart, verseEnd);
  };

  return { passages, loading, savePassage, updateAnnotation, deletePassage, isPassageSaved, refresh: fetchPassages };
}
