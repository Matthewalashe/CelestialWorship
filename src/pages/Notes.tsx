import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNotes, useSavedPassages } from '../hooks/useNotes';
import { Note, NoteTag, NOTE_TAG_COLORS, NOTE_TAG_LABELS, SavedPassage } from '../types/notes';

// Simple Icons as SVGs for brevity
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString();
}

export default function Notes() {
  const [activeTab, setActiveTab] = useState<'notes' | 'passages'>('notes');
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote, searchNotes } = useNotes();
  const { passages, loading: passagesLoading, deletePassage, updateAnnotation } = useSavedPassages();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<NoteTag | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<NoteTag[]>([]);

  // Annotation Modal State
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [editingPassage, setEditingPassage] = useState<SavedPassage | null>(null);
  const [passageAnnotation, setPassageAnnotation] = useState('');

  const filteredNotes = useMemo(() => {
    let filtered = notes;
    if (selectedTag !== 'all') {
      filtered = filtered.filter(n => n.tags.includes(selectedTag));
    }
    return filtered;
  }, [notes, selectedTag]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchNotes(query);
  };

  const openNoteModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
      setNoteTags(note.tags);
    } else {
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
      setNoteTags([]);
    }
    setIsModalOpen(true);
  };

  const closeNoteModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
  };

  const saveNote = async () => {
    if (!noteTitle.trim()) return;
    if (editingNote) {
      await updateNote(editingNote.id, { title: noteTitle, content: noteContent, tags: noteTags });
    } else {
      await createNote(noteTitle, noteContent, noteTags);
    }
    closeNoteModal();
  };

  const toggleTag = (tag: NoteTag) => {
    if (noteTags.includes(tag)) {
      setNoteTags(noteTags.filter(t => t !== tag));
    } else {
      setNoteTags([...noteTags, tag]);
    }
  };

  const openAnnotationModal = (passage: SavedPassage) => {
    setEditingPassage(passage);
    setPassageAnnotation(passage.annotation || '');
    setIsAnnotationModalOpen(true);
  };

  const saveAnnotation = async () => {
    if (editingPassage) {
      await updateAnnotation(editingPassage.id, passageAnnotation);
    }
    setIsAnnotationModalOpen(false);
  };

  const passagesByBook = useMemo(() => {
    const grouped: Record<string, SavedPassage[]> = {};
    passages.forEach(p => {
      if (!grouped[p.book]) grouped[p.book] = [];
      grouped[p.book].push(p);
    });
    return grouped;
  }, [passages]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pb-24 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-[Outfit] font-bold">My Journal</h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 bg-[var(--color-bg-secondary)] p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'notes' 
                ? 'bg-[var(--color-accent-teal)] text-white shadow-lg' 
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)]'
            }`}
          >
            My Notes
          </button>
          <button
            onClick={() => setActiveTab('passages')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'passages' 
                ? 'bg-[var(--color-accent-gold)] text-white shadow-lg' 
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)]'
            }`}
          >
            Saved Passages
          </button>
        </div>

        {/* Tab Content: Notes */}
        {activeTab === 'notes' && (
          <div className="animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-accent-teal)] focus:ring-1 focus:ring-[var(--color-accent-teal)] transition-all placeholder:text-[var(--color-text-muted)]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTag === 'all' 
                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' 
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  All
                </button>
                {(Object.entries(NOTE_TAG_LABELS) as [NoteTag, string][]).map(([tag, label]) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    style={{
                      backgroundColor: selectedTag === tag ? NOTE_TAG_COLORS[tag] : 'var(--color-bg-card)',
                      color: selectedTag === tag ? '#fff' : 'var(--color-text-secondary)',
                      borderColor: selectedTag === tag ? NOTE_TAG_COLORS[tag] : 'var(--color-border)',
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors hover:opacity-80`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {notesLoading ? (
              <div className="text-center py-12 text-[var(--color-text-muted)]">Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-20 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)]">
                <div className="text-[var(--color-accent-teal)] opacity-50 mb-4 flex justify-center">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h3 className="text-2xl font-[Outfit] font-semibold mb-2">No notes found</h3>
                <p className="text-[var(--color-text-secondary)] mb-6">Capture your thoughts, sermons, and prayers.</p>
                <button
                  onClick={() => openNoteModal()}
                  className="px-6 py-3 bg-[var(--color-accent-teal)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  <PlusIcon /> Create your first note
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNotes.map(note => (
                  <div key={note.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-border-hover)] transition-all group flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-[Outfit] text-xl font-bold line-clamp-1">{note.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openNoteModal(note)} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent-teal)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                          <EditIcon />
                        </button>
                        <button onClick={() => deleteNote(note.id)} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm line-clamp-3 mb-4 flex-1">
                      {note.content || <span className="italic opacity-50">No content...</span>}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--color-border)]">
                      <div className="flex flex-wrap gap-1.5">
                        {note.tags.map(tag => (
                          <span 
                            key={tag}
                            style={{ backgroundColor: `${NOTE_TAG_COLORS[tag]}20`, color: NOTE_TAG_COLORS[tag] }} 
                            className="px-2 py-0.5 rounded text-xs font-medium"
                          >
                            {NOTE_TAG_LABELS[tag]}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {formatRelativeTime(note.updatedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* FAB for new note */}
            <button
              onClick={() => openNoteModal()}
              className="fixed bottom-24 right-6 w-14 h-14 bg-[var(--color-accent-teal)] text-white rounded-full shadow-[0_8px_30px_rgb(20,184,166,0.3)] flex items-center justify-center hover:scale-105 transition-transform z-10"
              aria-label="Create new note"
            >
              <PlusIcon />
            </button>
          </div>
        )}

        {/* Tab Content: Saved Passages */}
        {activeTab === 'passages' && (
          <div className="animate-slide-up">
            {passagesLoading ? (
              <div className="text-center py-12 text-[var(--color-text-muted)]">Loading passages...</div>
            ) : passages.length === 0 ? (
              <div className="text-center py-20 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)]">
                <div className="text-[var(--color-accent-gold)] opacity-50 mb-4 flex justify-center">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-2xl font-[Outfit] font-semibold mb-2">No saved passages</h3>
                <p className="text-[var(--color-text-secondary)] mb-6">Open the Bible and save your favorite verses to see them here.</p>
                <Link to="/bible" className="px-6 py-3 bg-[var(--color-accent-gold)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  Open Bible
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(passagesByBook).map(([book, bookPassages]) => (
                  <div key={book} className="space-y-4">
                    <h2 className="text-xl font-[Outfit] font-bold text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-2">{book}</h2>
                    <div className="grid grid-cols-1 gap-4">
                      {bookPassages.map(passage => (
                        <div key={passage.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-border-hover)] transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <Link 
                              to={`/bible/${passage.book.toLowerCase().replace(/\s+/g, '')}/${passage.chapter}`}
                              className="text-lg font-bold text-[var(--color-accent-gold)] hover:underline flex items-center gap-1"
                            >
                              {passage.book} {passage.chapter}:{passage.verseStart}{passage.verseStart !== passage.verseEnd ? `-${passage.verseEnd}` : ''}
                              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </Link>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => openAnnotationModal(passage)}
                                className="text-xs px-3 py-1.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg transition-colors font-medium"
                              >
                                {passage.annotation ? 'Edit Note' : 'Add Note'}
                              </button>
                              <button 
                                onClick={() => deletePassage(passage.id)}
                                className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-[var(--color-text-primary)] text-lg font-serif leading-relaxed mb-4">
                            "{passage.text}"
                          </p>
                          
                          {passage.annotation && (
                            <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-xl border-l-2 border-[var(--color-accent-teal)]">
                              <p className="text-[var(--color-text-secondary)] italic text-sm">
                                {passage.annotation}
                              </p>
                            </div>
                          )}
                          
                          <div className="mt-4 flex justify-end">
                            <span className="text-xs text-[var(--color-text-muted)]">Saved {formatRelativeTime(passage.savedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Note Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-bg-primary)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 className="text-xl font-[Outfit] font-bold">{editingNote ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={closeNoteModal} className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-full transition-colors">
                <CloseIcon />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              <input
                type="text"
                placeholder="Note Title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full bg-transparent text-3xl font-[Outfit] font-bold border-none focus:outline-none focus:ring-0 placeholder:text-[var(--color-text-muted)]"
              />
              
              <div className="flex flex-wrap gap-2">
                {(Object.entries(NOTE_TAG_LABELS) as [NoteTag, string][]).map(([tag, label]) => {
                  const isSelected = noteTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        backgroundColor: isSelected ? NOTE_TAG_COLORS[tag] : 'var(--color-bg-secondary)',
                        color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              
              <textarea
                placeholder="Start writing..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full flex-1 min-h-[300px] bg-transparent resize-none border-none focus:outline-none focus:ring-0 text-[var(--color-text-primary)] leading-relaxed placeholder:text-[var(--color-text-muted)]"
              />
            </div>
            
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex justify-between items-center">
              <div>
                {editingNote && (
                  <button 
                    onClick={() => {
                      deleteNote(editingNote.id);
                      closeNoteModal();
                    }}
                    className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={closeNoteModal} className="px-5 py-2 font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={saveNote}
                  disabled={!noteTitle.trim()}
                  className="px-6 py-2 bg-[var(--color-accent-teal)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Modal */}
      {isAnnotationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-bg-primary)] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-[Outfit] font-bold">Add Note to Passage</h2>
              <button onClick={() => setIsAnnotationModalOpen(false)} className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-full transition-colors">
                <CloseIcon />
              </button>
            </div>
            
            <div className="p-6">
              {editingPassage && (
                <div className="mb-4 text-sm font-serif text-[var(--color-text-secondary)] p-3 bg-[var(--color-bg-secondary)] rounded-xl border-l-2 border-[var(--color-accent-gold)]">
                  "{editingPassage.text}"
                </div>
              )}
              <textarea
                placeholder="Write your thoughts on this verse..."
                value={passageAnnotation}
                onChange={(e) => setPassageAnnotation(e.target.value)}
                className="w-full h-32 p-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:border-[var(--color-accent-gold)] resize-none"
              />
            </div>
            
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex justify-end gap-3">
              <button 
                onClick={() => setIsAnnotationModalOpen(false)} 
                className="px-5 py-2 font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveAnnotation}
                className="px-6 py-2 bg-[var(--color-accent-gold)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
