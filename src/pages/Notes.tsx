import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Trash2, Heart, Check, Pin, PinOff, BookOpen, Music, Download, Upload, Cloud, HandHeart, StickyNote,
  Bookmark, Highlighter, FileText,
} from 'lucide-react';
import { useNotes, useSavedPassages, usePrayers, useAllHighlights, exportLibrary, importLibrary, librarySize } from '../hooks/useNotes';
import { useDraft, listDrafts, discardDraft } from '../hooks/useDraft';
import { useCloudBackup } from '../hooks/useCloudBackup';
import { recordActivity } from '../hooks/useProgress';
import { usePageTitle } from '../hooks/usePageTitle';
import { showToast } from '../components/Toast';
import { confirmDialog } from '../components/Dialog';
import { errorMessage } from '../lib/backend';
import {
  NOTE_TAG_COLORS, NOTE_TAG_LABELS, PASSAGE_CATEGORY_LABELS, PASSAGE_CATEGORY_COLORS, PRAYER_CATEGORY_LABELS, HIGHLIGHT_COLORS,
  type Note, type NoteTag, type NoteLink, type PassageCategory, type PrayerCategory,
} from '../types/notes';
import { Sheet } from '../components/Dialog';

type Tab = 'notes' | 'saved' | 'highlights' | 'prayers' | 'drafts' | 'backup';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'notes', label: 'Notes', icon: <StickyNote size={15} /> },
  { id: 'saved', label: 'Saved', icon: <Bookmark size={15} /> },
  { id: 'highlights', label: 'Highlights', icon: <Highlighter size={15} /> },
  { id: 'prayers', label: 'Prayers', icon: <HandHeart size={15} /> },
  { id: 'drafts', label: 'Drafts', icon: <FileText size={15} /> },
  { id: 'backup', label: 'Backup', icon: <Cloud size={15} /> },
];

const slug = (book: string) => book.toLowerCase().replace(/\s+/g, '-');

function linkLabel(link: NoteLink): string {
  switch (link.kind) {
    case 'bible': return `${link.book} ${link.chapter}:${link.verseStart}${link.verseEnd > link.verseStart ? `-${link.verseEnd}` : ''}`;
    case 'hymn': return `Hymn ${link.number}`;
    case 'service': return link.serviceId.replace(/_/g, ' ');
    case 'lesson': return `Lessons for ${link.date}`;
  }
}

function linkPath(link: NoteLink): string {
  switch (link.kind) {
    case 'bible': return `/bible/${slug(link.book)}/${link.chapter}?v=${link.verseStart}-${link.verseEnd}`;
    case 'hymn': return `/hymns/${link.number}`;
    case 'service': return `/services/${link.serviceId}`;
    case 'lesson': return `/lessons/${link.date}`;
  }
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

// ── Note editor (autosaves a draft while typing) ─────────────

interface NoteDraft { title: string; content: string; tags: NoteTag[] }

function NoteEditor({ note, link, onClose }: { note: Note | null; link?: NoteLink; onClose: () => void }) {
  const { createNote, updateNote } = useNotes();
  const empty: NoteDraft = note ? { title: note.title, content: note.content, tags: note.tags } : { title: '', content: '', tags: [] };
  const draftKey = note ? `note:${note.id}` : `note:new${link ? `:${linkLabel(link)}` : ''}`;
  const draft = useDraft<NoteDraft>(draftKey, empty);
  const effectiveLink = note?.link ?? link;
  const { title, content, tags } = draft.value;

  const save = async () => {
    if (!title.trim() && !content.trim()) { onClose(); return; }
    if (note) await updateNote(note.id, { title, content, tags });
    else await createNote(title.trim() || (effectiveLink ? linkLabel(effectiveLink) : 'Untitled'), content, tags, effectiveLink);
    draft.clear();
    showToast('Note saved');
    onClose();
  };

  return (
    <Sheet label={note ? 'Edit note' : 'New note'} onClose={onClose}>
      <div>
        {effectiveLink && (
          <Link to={linkPath(effectiveLink)} className="inline-flex items-center gap-1 text-xs font-semibold mb-3 px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-accent-brand)' }}>
            {effectiveLink.kind === 'hymn' ? <Music size={12} /> : <BookOpen size={12} />} {linkLabel(effectiveLink)}
          </Link>
        )}
        <input value={title} onChange={e => draft.setValue({ title: e.target.value })} placeholder="Title"
               className={`${inputClass} mb-2 font-semibold`} style={inputStyle} />
        <textarea value={content} onChange={e => draft.setValue({ content: e.target.value })} rows={9}
                  placeholder="Write your thoughts, sermon points, or what God is saying to you…"
                  className={`${inputClass} mb-3 resize-y leading-relaxed`} style={inputStyle} />
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(NOTE_TAG_LABELS) as NoteTag[]).map(tag => {
            const on = tags.includes(tag);
            return (
              <button key={tag} onClick={() => draft.setValue({ tags: on ? tags.filter(t => t !== tag) : [...tags, tag] })}
                      aria-pressed={on} className="px-3 py-1 rounded-full text-xs font-semibold border"
                      style={on ? { backgroundColor: `${NOTE_TAG_COLORS[tag]}22`, borderColor: NOTE_TAG_COLORS[tag], color: NOTE_TAG_COLORS[tag] }
                                : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                {NOTE_TAG_LABELS[tag]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {draft.savedAt ? 'Draft saved on this device' : ''}
          </span>
          <div className="flex gap-2">
            {draft.hasDraft && !note && (
              <button onClick={() => { draft.clear(); onClose(); }} className="px-4 py-2 rounded-xl text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}>Discard</button>
            )}
            <button onClick={save} className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold">Save</button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ── Tabs ─────────────────────────────────────────────────────

function NotesTab({ openId, startNew, newLink, onEditorClosed }: {
  openId: string | null; startNew: boolean; newLink: NoteLink | null; onEditorClosed: () => void;
}) {
  const { notes, loading, updateNote, deleteNote } = useNotes();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<NoteTag | null>(null);
  const [editing, setEditing] = useState<Note | null | 'new'>(startNew ? 'new' : null);

  useEffect(() => {
    if (openId) {
      const n = notes.find(x => x.id === openId);
      if (n) setEditing(n);
    }
  }, [openId, notes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return notes.filter(n =>
      (!tagFilter || n.tags.includes(tagFilter)) &&
      (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)));
  }, [notes, query, tagFilter]);

  const close = () => { setEditing(null); onEditorClosed(); };

  return (
    <>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes"
                 className={`${inputClass} pl-9`} style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} />
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
          <Plus size={16} /> New
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
        {(Object.keys(NOTE_TAG_LABELS) as NoteTag[]).map(tag => (
          <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} aria-pressed={tagFilter === tag}
                  className="px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
                  style={tagFilter === tag
                    ? { backgroundColor: `${NOTE_TAG_COLORS[tag]}22`, borderColor: NOTE_TAG_COLORS[tag], color: NOTE_TAG_COLORS[tag] }
                    : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {NOTE_TAG_LABELS[tag]}
          </button>
        ))}
      </div>

      {loading ? null : filtered.length === 0 ? (
        <Empty icon={<StickyNote size={28} />} text={notes.length ? 'No notes match.' : 'Write down sermon points, Bible study thoughts or anything on your heart. Tap a Bible verse and choose “Note” to attach a note to it.'} />
      ) : (
        <ul className="space-y-2">
          {filtered.map(n => (
            <li key={n.id} className="rounded-2xl border p-4" style={card}>
              <div className="flex items-start gap-2">
                <button onClick={() => setEditing(n)} className="flex-1 min-w-0 text-left">
                  <span className="block font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{n.title || 'Untitled'}</span>
                  <span className="block text-sm line-clamp-2 mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{n.content}</span>
                </button>
                <button onClick={() => updateNote(n.id, { pinned: !n.pinned })} aria-label={n.pinned ? 'Unpin' : 'Pin'} className="p-1"
                        style={{ color: n.pinned ? 'var(--color-accent-gold)' : 'var(--color-text-muted)' }}>
                  {n.pinned ? <Pin size={16} fill="currentColor" /> : <PinOff size={16} />}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                <span>{formatWhen(n.updatedAt)}</span>
                {n.link && <Link to={linkPath(n.link)} className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{linkLabel(n.link)}</Link>}
                {n.tags.map(t => <span key={t} style={{ color: NOTE_TAG_COLORS[t] }}>#{NOTE_TAG_LABELS[t]}</span>)}
                <button onClick={async () => { if (await confirmDialog({ title: 'Delete this note?', confirmLabel: 'Delete', danger: true })) { await deleteNote(n.id); showToast('Note deleted'); } }}
                        className="ml-auto p-1" aria-label="Delete note"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <NoteEditor note={editing === 'new' ? null : editing} link={editing === 'new' ? newLink ?? undefined : undefined} onClose={close} />}
    </>
  );
}

function SavedTab() {
  const { passages, updatePassage, deletePassage } = useSavedPassages();
  const [category, setCategory] = useState<PassageCategory | null>(null);
  const [annotating, setAnnotating] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState('');
  const shown = category ? passages.filter(p => p.category === category) : passages;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
        {(Object.keys(PASSAGE_CATEGORY_LABELS) as PassageCategory[]).map(c => (
          <button key={c} onClick={() => setCategory(category === c ? null : c)} aria-pressed={category === c}
                  className="px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap"
                  style={category === c
                    ? { backgroundColor: `${PASSAGE_CATEGORY_COLORS[c]}22`, borderColor: PASSAGE_CATEGORY_COLORS[c], color: PASSAGE_CATEGORY_COLORS[c] }
                    : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {PASSAGE_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty icon={<Bookmark size={28} />} text="Tap verses in the Bible and choose “Save” to keep them here." />
      ) : (
        <ul className="space-y-2">
          {shown.map(p => {
            const ref = `${p.book} ${p.chapter}:${p.verseStart}${p.verseEnd > p.verseStart ? `-${p.verseEnd}` : ''}`;
            return (
              <li key={p.id} className="rounded-2xl border p-4" style={card}>
                <Link to={`/bible/${slug(p.book)}/${p.chapter}?v=${p.verseStart}-${p.verseEnd}`} className="block">
                  <span className="text-sm font-bold" style={{ color: 'var(--color-accent-brand)' }}>{ref}</span>
                  <span className="block text-sm mt-1 italic leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>“{p.text}”</span>
                </Link>
                {annotating === p.id ? (
                  <div className="mt-2">
                    <textarea value={annotation} onChange={e => setAnnotation(e.target.value)} rows={3} className={inputClass} style={inputStyle}
                              placeholder="What does this passage mean to you?" />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setAnnotating(null)} className="text-sm px-3 py-1" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                      <button onClick={async () => { await updatePassage(p.id, { annotation }); setAnnotating(null); }}
                              className="btn-primary text-sm px-4 py-1.5 rounded-lg">Save</button>
                    </div>
                  </div>
                ) : p.annotation ? (
                  <p className="text-sm mt-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}>{p.annotation}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <select value={p.category ?? ''} onChange={e => updatePassage(p.id, { category: (e.target.value || undefined) as PassageCategory | undefined })}
                          className="text-xs rounded-lg px-2 py-1 border" style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} aria-label="Category">
                    <option value="">No category</option>
                    {(Object.keys(PASSAGE_CATEGORY_LABELS) as PassageCategory[]).map(c => <option key={c} value={c}>{PASSAGE_CATEGORY_LABELS[c]}</option>)}
                  </select>
                  <button onClick={() => { setAnnotating(p.id); setAnnotation(p.annotation); }} className="text-xs font-semibold"
                          style={{ color: 'var(--color-accent-brand)' }}>{p.annotation ? 'Edit reflection' : 'Add reflection'}</button>
                  <button onClick={() => deletePassage(p.id)} className="ml-auto p-1" aria-label="Remove" style={{ color: 'var(--color-text-muted)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function HighlightsTab() {
  const highlights = useAllHighlights();
  // Group consecutive verses of the same chapter and colour
  const groups = useMemo(() => {
    const map = new Map<string, { book: string; chapter: number; color: keyof typeof HIGHLIGHT_COLORS; verses: number[]; at: string }>();
    for (const h of highlights) {
      const key = `${h.book}|${h.chapter}|${h.color}`;
      const g = map.get(key);
      if (g) g.verses.push(h.verse);
      else map.set(key, { book: h.book, chapter: h.chapter, color: h.color, verses: [h.verse], at: h.createdAt });
    }
    return [...map.values()].map(g => ({ ...g, verses: g.verses.sort((a, b) => a - b) }));
  }, [highlights]);

  if (groups.length === 0) return <Empty icon={<Highlighter size={28} />} text="Tap verses in the Bible and choose “Highlight” to colour them." />;
  return (
    <ul className="space-y-2">
      {groups.map(g => (
        <li key={`${g.book}${g.chapter}${g.color}`}>
          <Link to={`/bible/${slug(g.book)}/${g.chapter}?v=${g.verses[0]}-${g.verses[g.verses.length - 1]}`}
                className="flex items-center gap-3 rounded-2xl border p-4" style={card}>
            <span className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: HIGHLIGHT_COLORS[g.color].swatch }} />
            <span className="flex-1">
              <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{g.book} {g.chapter}</span>
              <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Verse{g.verses.length > 1 ? 's' : ''} {g.verses.join(', ')} · {HIGHLIGHT_COLORS[g.color].label}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface PrayerDraft { title: string; description: string; category: PrayerCategory | '' }

function PrayersTab() {
  const { prayers, createPrayer, toggleAnswered, markPrayed, deletePrayer } = usePrayers();
  const draft = useDraft<PrayerDraft>('prayer:new', { title: '', description: '', category: '' });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'open' | 'answered'>('open');
  const [answering, setAnswering] = useState<string | null>(null);
  const [testimony, setTestimony] = useState('');

  const shown = prayers.filter(p => (filter === 'answered' ? p.isAnswered : !p.isAnswered));
  const answeredCount = prayers.filter(p => p.isAnswered).length;

  const add = async () => {
    if (!draft.value.title.trim()) return;
    await createPrayer(draft.value.title.trim(), draft.value.description, draft.value.category || undefined);
    draft.clear();
    setAdding(false);
    recordActivity('prayer');
    showToast('Added to your prayer journal');
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex rounded-xl p-0.5 border" style={card}>
          {(['open', 'answered'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={filter === f ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
              {f === 'open' ? 'Praying for' : `Answered (${answeredCount})`}
            </button>
          ))}
        </div>
        <button onClick={() => setAdding(a => !a)} className="ml-auto btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
          <Plus size={16} /> Prayer
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        Your journal stays on this device. To ask the church to pray with you, use{' '}
        <Link to="/prayer-requests" className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Prayer requests</Link>.
      </p>

      {(adding || draft.hasDraft) && (
        <div className="rounded-2xl border p-4 mb-4 space-y-2" style={card}>
          <input value={draft.value.title} onChange={e => draft.setValue({ title: e.target.value })} placeholder="What are you praying for?"
                 className={inputClass} style={inputStyle} />
          <textarea value={draft.value.description} onChange={e => draft.setValue({ description: e.target.value })} rows={3}
                    placeholder="Details (optional)" className={inputClass} style={inputStyle} />
          <div className="flex gap-2">
            <select value={draft.value.category} onChange={e => draft.setValue({ category: e.target.value as PrayerCategory | '' })}
                    className="flex-1 rounded-xl px-3 py-2 text-sm border" style={inputStyle} aria-label="Category">
              <option value="">Category</option>
              {(Object.keys(PRAYER_CATEGORY_LABELS) as PrayerCategory[]).map(c => <option key={c} value={c}>{PRAYER_CATEGORY_LABELS[c]}</option>)}
            </select>
            <button onClick={() => { draft.clear(); setAdding(false); }} className="px-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
            <button onClick={add} className="btn-primary px-4 rounded-xl text-sm font-semibold">Save</button>
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <Empty icon={<HandHeart size={28} />} text={filter === 'open' ? 'Keep a record of what you bring before God, and mark each one as answered.' : 'Answered prayers become your testimonies — they will appear here.'} />
      ) : (
        <ul className="space-y-2">
          {shown.map(p => (
            <li key={p.id} className="rounded-2xl border p-4" style={card}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.title}</span>
                  {p.description && <span className="block text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{p.description}</span>}
                  {p.isAnswered && p.answeredNote && (
                    <span className="block text-sm mt-2 p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-text-primary)' }}>
                      {p.answeredNote}
                    </span>
                  )}
                </div>
                {p.category && <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>{PRAYER_CATEGORY_LABELS[p.category]}</span>}
              </div>
              {answering === p.id ? (
                <div className="mt-2">
                  <textarea value={testimony} onChange={e => setTestimony(e.target.value)} rows={2} className={inputClass} style={inputStyle}
                            placeholder="How did God answer? (optional)" />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setAnswering(null)} className="text-sm px-3" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                    <button onClick={async () => { await toggleAnswered(p.id, testimony.trim() || undefined); setAnswering(null); showToast('Praise God! Marked as answered'); }}
                            className="btn-primary text-sm px-4 py-1.5 rounded-lg">Mark answered</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{p.isAnswered && p.answeredAt ? `Answered ${formatWhen(p.answeredAt)}` : `Since ${formatWhen(p.createdAt)}`}</span>
                  {!p.isAnswered && (
                    <button onClick={async () => { await markPrayed(p.id); recordActivity('prayer'); showToast('Amen'); }}
                            className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
                      <Heart size={13} /> I prayed{p.prayedCount ? ` · ${p.prayedCount}` : ''}
                    </button>
                  )}
                  <button onClick={() => (p.isAnswered ? toggleAnswered(p.id) : (setAnswering(p.id), setTestimony('')))}
                          className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--color-success)' }}>
                    <Check size={13} /> {p.isAnswered ? 'Not answered yet' : 'Answered'}
                  </button>
                  <button onClick={async () => { if (await confirmDialog({ title: 'Delete this prayer?', confirmLabel: 'Delete', danger: true })) deletePrayer(p.id); }} className="ml-auto p-1" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DraftsTab() {
  const [drafts, setDrafts] = useState(listDrafts);
  const describe = (key: string) => {
    if (key.startsWith('note:new')) return { label: 'New note', to: '/notes?new=1' };
    if (key.startsWith('note:')) return { label: 'Edited note', to: `/notes?open=${key.slice(5)}` };
    if (key.startsWith('prayer:')) return { label: 'Prayer', to: '/notes?tab=prayers' };
    if (key.startsWith('prayer-request:')) return { label: 'Prayer request', to: '/prayer-requests' };
    if (key.startsWith('article:')) return { label: 'Article', to: `/articles/write${key === 'article:new' ? '' : `?id=${key.slice(8)}`}` };
    if (key.startsWith('event:')) return { label: 'Event submission', to: '/events?submit=1' };
    if (key.startsWith('parish:')) return { label: 'Parish listing', to: '/directory?submit=1' };
    return { label: key, to: '/' };
  };
  if (drafts.length === 0) return <Empty icon={<FileText size={28} />} text="Anything you start writing and don’t finish is kept here automatically." />;
  return (
    <ul className="space-y-2">
      {drafts.map(d => {
        const { label, to } = describe(d.key);
        const v = d.value as Record<string, unknown>;
        const preview = String(v.title || v.content || v.description || v.body || '').slice(0, 120);
        return (
          <li key={d.key} className="flex items-center gap-3 rounded-2xl border p-4" style={card}>
            <Link to={to} className="flex-1 min-w-0">
              <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>{label}</span>
              <span className="block text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{preview || 'Untitled'}</span>
              {d.savedAt && <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{formatWhen(d.savedAt)}</span>}
            </Link>
            <button onClick={() => { discardDraft(d.key); setDrafts(listDrafts()); }} aria-label="Discard draft" className="p-1" style={{ color: 'var(--color-text-muted)' }}>
              <Trash2 size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BackupTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const cloud = useCloudBackup();
  const { fetchLastBackup } = cloud;

  useEffect(() => { librarySize().then(setCount); fetchLastBackup(); }, [fetchLastBackup]);

  const download = async () => {
    const data = await exportLibrary();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `celestialworship-backup-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    showToast('Backup file downloaded');
  };

  const upload = async (file: File) => {
    try {
      const result = await importLibrary(JSON.parse(await file.text()));
      showToast(`Restored: ${result.added} new, ${result.updated} updated`);
      setCount(await librarySize());
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4" style={card}>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>On this device</h3>
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {count === null ? '…' : `${count} item${count === 1 ? '' : 's'}`} — notes, saved passages, highlights and prayers.
          They stay private on this phone or computer.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
            <Download size={15} /> Download backup file
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <Upload size={15} /> Restore from file
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                 onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="rounded-2xl border p-4" style={card}>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Your account</h3>
        {cloud.signedIn ? (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Keep a copy in your account to move to a new phone. Only you can read it.
              {cloud.lastBackup && <> Last backup: {formatWhen(cloud.lastBackup)}.</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <button disabled={cloud.busy} onClick={async () => { try { await cloud.backUp(); showToast('Backed up to your account'); } catch (e) { showToast(errorMessage(e)); } }}
                      className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-60">
                <Cloud size={15} /> Back up now
              </button>
              <button disabled={cloud.busy} onClick={async () => { try { const r = await cloud.restore(); showToast(`Restored: ${r.added} new, ${r.updated} updated`); setCount(await librarySize()); } catch (e) { showToast(errorMessage(e)); } }}
                      className="px-4 py-2 rounded-xl text-sm font-semibold border disabled:opacity-60"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                Restore from account
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Link to="/signin?returnTo=/notes?tab=backup" className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Sign in</Link>{' '}
            to back up your library to your account and restore it on another device.
          </p>
        )}
      </div>
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12 px-6" style={{ color: 'var(--color-text-muted)' }}>
      <div className="inline-flex mb-3 opacity-60">{icon}</div>
      <p className="text-sm max-w-sm mx-auto">{text}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function Notes() {
  usePageTitle('notes');
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'notes') as Tab;

  // Deep links: /notes?new=1&book=John&chapter=3&from=16&to=16  or  /notes?new=1&hymn=5  or /notes?open=<id>
  const newLink = useMemo<NoteLink | null>(() => {
    if (params.get('new') !== '1') return null;
    if (params.get('book')) {
      return {
        kind: 'bible', book: params.get('book')!, chapter: Number(params.get('chapter')) || 1,
        verseStart: Number(params.get('from')) || 1, verseEnd: Number(params.get('to') || params.get('from')) || 1,
      };
    }
    if (params.get('hymn')) return { kind: 'hymn', number: Number(params.get('hymn')) };
    if (params.get('service')) return { kind: 'service', serviceId: params.get('service')! };
    return null;
  }, [params]);
  const wantsNew = params.get('new') === '1';

  const setTab = (t: Tab) => setParams(t === 'notes' ? {} : { tab: t }, { replace: true });
  const clearDeepLink = () => {
    if (params.has('new') || params.has('open')) setParams(tab === 'notes' ? {} : { tab }, { replace: true });
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <h1 className="text-2xl font-bold font-[Outfit] mb-1" style={{ color: 'var(--color-text-primary)' }}>My Library</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Notes, saved verses, highlights and your prayer journal</p>

      <div className="flex gap-1 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
                  style={tab === t.id
                    ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }
                    : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'notes' && (
        <NotesTab key={wantsNew ? `new-${params.toString()}` : 'list'} openId={params.get('open')}
                  startNew={wantsNew} newLink={newLink} onEditorClosed={clearDeepLink} />
      )}
      {tab === 'saved' && <SavedTab />}
      {tab === 'highlights' && <HighlightsTab />}
      {tab === 'prayers' && <PrayersTab />}
      {tab === 'drafts' && <DraftsTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  );
}
