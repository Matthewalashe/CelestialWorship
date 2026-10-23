import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, PenLine, Send, Save, Trash2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDraft } from '../hooks/useDraft';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  getArticle, saveArticle, deleteArticle, ARTICLE_KINDS, type ArticleKind, type ArticleReference,
} from '../lib/community';
import { parseReference } from '../utils/parseReference';
import { Markdown } from '../utils/markdown';
import { SignInPrompt } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { confirmDialog } from '../components/Dialog';
import { errorMessage } from '../lib/backend';
import { referenceLabel } from './Articles';

interface ArticleDraft {
  kind: ArticleKind;
  title: string;
  summary: string;
  body: string;
  referenceText: string; // "John 3:16", "Hymn 5", "2026-06-14"
  tags: string;
  language: string;
}

const EMPTY: ArticleDraft = { kind: 'article', title: '', summary: '', body: '', referenceText: '', tags: '', language: 'en' };

const KIND_HINTS: Partial<Record<ArticleKind, string>> = {
  bible_commentary: 'Passage, e.g. John 3:16-21',
  hymn_commentary: 'Hymn number, e.g. 5',
  lesson_commentary: 'Lesson date, e.g. 2026-06-14',
};

/** Turn the free-text "about" field into a structured reference */
function toReference(kind: ArticleKind, text: string): ArticleReference | null {
  const t = text.trim();
  if (!t) return null;
  const hymn = t.match(/^(?:hymn\s*)?#?(\d{1,4})$/i);
  if (kind === 'hymn_commentary' || (hymn && kind !== 'bible_commentary')) {
    return hymn ? { kind: 'hymn', number: Number(hymn[1]) } : null;
  }
  const date = t.match(/^\d{4}-\d{2}-\d{2}$/);
  if (date) return { kind: 'lesson', date: t };
  const ref = parseReference(t);
  return ref ? { kind: 'bible', book: ref.book, chapter: ref.chapter, verseStart: ref.verseStart, verseEnd: ref.verseEnd } : null;
}

function fromReference(r: ArticleReference | null): string {
  if (!r) return '';
  if (r.kind === 'hymn') return String(r.number);
  if (r.kind === 'lesson') return r.date;
  return `${r.book} ${r.chapter}:${r.verseStart}${r.verseEnd > r.verseStart ? `-${r.verseEnd}` : ''}`;
}

export default function ArticleEditor() {
  usePageTitle('article_editor', 'Write');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const id = params.get('id');
  const draft = useDraft<ArticleDraft>(id ? `article:${id}` : 'article:new', {
    ...EMPTY,
    kind: (params.get('kind') as ArticleKind) || EMPTY.kind,
    referenceText: params.get('about') ?? '',
  });
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Editing an existing article: load it unless a newer local draft exists
  useEffect(() => {
    if (!id || draft.hasDraft) return;
    getArticle(id).then(a => {
      if (!a) return;
      setStatus(a.status);
      draft.setValue({
        kind: a.kind, title: a.title, summary: a.summary ?? '', body: a.body, referenceText: fromReference(a.reference),
        tags: a.tags.join(', '), language: a.language,
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!user) {
    return <div className="px-4 py-6 max-w-2xl mx-auto"><SignInPrompt message="Sign in to write articles and commentaries." /></div>;
  }

  const v = draft.value;
  const reference = toReference(v.kind, v.referenceText);
  const referenceInvalid = !!v.referenceText.trim() && !reference;
  const tooShort = v.title.trim().length < 3 || v.body.trim().length < 20;
  const words = v.body.trim() ? v.body.trim().split(/\s+/).length : 0;

  const persist = async (submit: boolean) => {
    if (tooShort || referenceInvalid) return;
    setBusy(true);
    try {
      const savedId = await saveArticle({
        kind: v.kind, title: v.title, summary: v.summary, body: v.body, language: v.language, reference,
        tags: v.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 8),
      }, { id: id ?? undefined, submit });
      draft.clear();
      showToast(submit ? 'Sent for review — you’ll see it published once approved' : 'Draft saved to your account');
      navigate(submit ? '/articles?mine=1' : `/articles/write?id=${savedId}`, { replace: true });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
  const inputStyle = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <Link to="/articles?mine=1" className="text-sm inline-flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
          <ChevronLeft size={16} /> My writing
        </Link>
        <button onClick={() => setPreview(p => !p)} className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}>
          {preview ? <><PenLine size={15} /> Edit</> : <><Eye size={15} /> Preview</>}
        </button>
      </div>

      {status === 'published' && (
        <p className="text-xs mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          This article is published. Changes go back to a moderator before they appear.
        </p>
      )}

      {preview ? (
        <article>
          <p className="text-[11px] uppercase font-bold tracking-widest" style={{ color: 'var(--color-accent-gold)' }}>{ARTICLE_KINDS[v.kind]}</p>
          <h1 className="text-3xl font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-text-primary)' }}>{v.title || 'Untitled'}</h1>
          {reference && <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{referenceLabel(reference)}</p>}
          {v.summary && <p className="text-lg mt-4" style={{ color: 'var(--color-text-secondary)' }}>{v.summary}</p>}
          <div className="mt-5 text-[17px]"><Markdown source={v.body || '*Nothing written yet.*'} /></div>
        </article>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={v.kind} onChange={e => draft.setValue({ kind: e.target.value as ArticleKind })} className={inputClass} style={inputStyle} aria-label="Type">
              {(Object.keys(ARTICLE_KINDS) as ArticleKind[]).map(k => <option key={k} value={k}>{ARTICLE_KINDS[k]}</option>)}
            </select>
            <select value={v.language} onChange={e => draft.setValue({ language: e.target.value })} className={inputClass} style={inputStyle} aria-label="Language">
              <option value="en">English</option>
              <option value="yo">Yorùbá</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <input value={v.title} onChange={e => draft.setValue({ title: e.target.value })} maxLength={160} placeholder="Title"
                 className={`${inputClass} text-lg font-semibold`} style={inputStyle} />
          <div>
            <input value={v.referenceText} onChange={e => draft.setValue({ referenceText: e.target.value })}
                   placeholder={KIND_HINTS[v.kind] ?? 'About (optional): a passage, hymn number or lesson date'}
                   className={inputClass} style={{ ...inputStyle, borderColor: referenceInvalid ? 'var(--color-warning)' : inputStyle.borderColor }} />
            <p className="text-[11px] mt-1" style={{ color: referenceInvalid ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
              {referenceInvalid ? 'Couldn’t read that — try “John 3:16”, “Hymn 5” or “2026-06-14”.'
                : reference ? `Linked to ${referenceLabel(reference)} — it will show there too.` : 'Link it to a passage, hymn or lesson so readers find it there.'}
            </p>
          </div>
          <textarea value={v.summary} onChange={e => draft.setValue({ summary: e.target.value })} rows={2} maxLength={300}
                    placeholder="One or two sentences readers see first (optional)" className={inputClass} style={inputStyle} />
          <textarea value={v.body} onChange={e => draft.setValue({ body: e.target.value })} rows={16}
                    placeholder={'Write here.\n\n## A heading\n**bold**, *italic*, > a quotation, - a list.\nBible references like John 3:16 become links.'}
                    className={`${inputClass} leading-relaxed font-[inherit]`} style={inputStyle} />
          <input value={v.tags} onChange={e => draft.setValue({ tags: e.target.value })} placeholder="Tags, separated by commas (e.g. faith, healing)"
                 className={inputClass} style={inputStyle} />
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {words} words · {draft.savedAt ? 'Draft kept on this device' : 'Your writing is saved on this device as you type'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-6">
        <button onClick={() => persist(true)} disabled={busy || tooShort || referenceInvalid}
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
          <Send size={15} /> Submit for review
        </button>
        <button onClick={() => persist(false)} disabled={busy || tooShort || referenceInvalid}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          <Save size={15} /> Save draft
        </button>
        {id && (
          <button onClick={async () => {
            if (!await confirmDialog({ title: 'Delete this article?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) return;
            try { await deleteArticle(id); draft.clear(); showToast('Deleted'); navigate('/articles?mine=1'); } catch (e) { showToast(errorMessage(e)); }
          }} className="ml-auto px-3 py-2.5 text-sm inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
      {tooShort && (v.title || v.body) && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>Add a title and at least a few sentences to submit.</p>
      )}
    </div>
  );
}
