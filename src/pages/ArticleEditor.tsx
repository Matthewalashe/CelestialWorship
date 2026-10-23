import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, PenLine, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDraft } from '../hooks/useDraft';
import { usePageTitle } from '../hooks/usePageTitle';
import { getArticle, saveArticle, deleteArticle, ARTICLE_KINDS, type ArticleKind, type ArticleReference } from '../lib/community';
import { parseReference } from '../utils/parseReference';
import { Markdown } from '../utils/markdown';
import { SignInPrompt } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { confirmDialog } from '../components/Dialog';
import { errorMessage } from '../lib/backend';
import { referenceLabel, readingMinutes, isShepherd, SERIF_STACK } from '../components/ArticleParts';
import { myAdminParishes } from '../lib/parishAdmin';
import { hasPlan } from '../lib/plan';
import type { Parish } from '../hooks/useParishes';
import { tr } from '../i18n';

interface ArticleDraft {
  kind: ArticleKind;
  title: string;
  summary: string;
  body: string;
  referenceText: string; // "John 3:16", "Hymn 5", "2026-06-14"
  tags: string;
  language: string;
  supportParishId: string;
}

const EMPTY: ArticleDraft = { kind: 'article', title: '', summary: '', body: '', referenceText: '', tags: '', language: 'en', supportParishId: '' };

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

/** A textarea that grows with its text, like a page */
function Grow(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} className={`w-full resize-none bg-transparent outline-none overflow-hidden ${props.className ?? ''}`} />;
}

export default function ArticleEditor() {
  usePageTitle('article_editor', 'Write');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
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
  // Pages this shepherd leads, and which of them are on the Partner plan
  const [pages, setPages] = useState<{ parish: Parish; partner: boolean }[]>([]);
  useEffect(() => {
    if (!user) return;
    myAdminParishes().then(async list => {
      const led = list.filter(m => m.role === 'shepherd' || m.role === 'admin');
      setPages(await Promise.all(led.map(async m => ({ parish: m.parish, partner: await hasPlan(m.parish.id) }))));
    }).catch(() => {});
  }, [user]);

  // Editing an existing article: load it unless a newer local draft exists
  useEffect(() => {
    if (!id || draft.hasDraft) return;
    getArticle(id).then(a => {
      if (!a) return;
      setStatus(a.status);
      draft.setValue({
        kind: a.kind, title: a.title, summary: a.summary ?? '', body: a.body, referenceText: fromReference(a.reference),
        tags: a.tags.join(', '), language: a.language, supportParishId: a.support_parish_id ?? '',
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!user) {
    return <div className="px-4 py-6 max-w-2xl mx-auto"><SignInPrompt message={tr('Sign in to write.')} /></div>;
  }
  if (!isShepherd(profile)) {
    return (
      <div className="px-5 py-10 max-w-lg mx-auto text-center space-y-3">
        <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>{tr('Articles are written by shepherds')}</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Shepherds of a parish and independent shepherds can publish teaching and commentaries here. If you are a shepherd, choose it in your profile and it will be verified.')}</p>
        <div className="flex justify-center gap-2 pt-2">
          <Link to="/profile" className="btn-primary px-5 py-2 rounded-full text-sm font-semibold">{tr('Profile')}</Link>
          <Link to="/articles" className="px-5 py-2 rounded-full text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{tr('Read articles')}</Link>
        </div>
      </div>
    );
  }

  const verified = profile.verificationStatus === 'verified';
  const v = draft.value;
  const reference = toReference(v.kind, v.referenceText);
  const referenceInvalid = !!v.referenceText.trim() && !reference;
  const tooShort = v.title.trim().length < 3 || v.body.trim().length < 20;
  const words = v.body.trim() ? v.body.trim().split(/\s+/).length : 0;

  const persist = async (publish: boolean) => {
    if (tooShort || referenceInvalid) return;
    setBusy(true);
    try {
      const savedId = await saveArticle({
        kind: v.kind, title: v.title, summary: v.summary, body: v.body, language: v.language, reference,
        tags: v.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5),
        support_parish_id: v.supportParishId || null,
      }, { id: id ?? undefined, submit: publish });
      draft.clear();
      showToast(publish ? tr('Published') : tr('Draft saved'));
      navigate(publish ? `/articles/${savedId}` : `/articles/write?id=${savedId}`, { replace: true });
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
  const fieldStyle = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
  const canSave = verified && !busy && !tooShort && !referenceInvalid;

  return (
    <div className="px-5 py-4 max-w-[680px] mx-auto pb-24">
      {/* Top bar */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/articles?mine=1" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('‹ My writing')}</Link>
        <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
          {status === 'published' ? tr('Published') : tr('Draft')}{draft.savedAt ? tr(' · saved on this device') : ''}
        </span>
        <button onClick={() => setPreview(p => !p)} className="ml-auto p-2 rounded-full" aria-label={preview ? tr('Edit') : tr('Preview')}
                style={{ color: 'var(--color-text-secondary)' }}>
          {preview ? <PenLine size={18} /> : <Eye size={18} />}
        </button>
        <button onClick={() => persist(true)} disabled={!canSave}
                className="px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}>
          {status === 'published' ? tr('Update') : tr('Publish')}
        </button>
      </div>

      {!verified && (
        <p className="text-xs mb-5 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>{tr('You can publish once your shepherd status is verified. Until then your writing is kept on this device.')}</p>
      )}

      {preview ? (
        <article>
          <h1 className="text-[2rem] font-bold leading-tight" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>{v.title || tr('Untitled')}</h1>
          {v.summary && <p className="text-xl mt-3" style={{ color: 'var(--color-text-muted)', fontFamily: SERIF_STACK }}>{tr(v.summary)}</p>}
          <p className="text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>{readingMinutes(v.body)}{' '}{tr('min read')}{reference ? ` · ${referenceLabel(reference)}` : ''}</p>
          <div className="mt-6 article-body" style={{ fontFamily: SERIF_STACK, fontSize: 19, lineHeight: 1.75 }}><Markdown source={v.body || '*Nothing written yet.*'} /></div>
        </article>
      ) : (
        <>
          <label className="sr-only" htmlFor="a-title">{tr('Title')}</label>
          <Grow id="a-title" value={v.title} onChange={e => draft.setValue({ title: e.target.value.replace(/\n/g, ' ') })} maxLength={160} placeholder={tr('Title')}
                className="text-[2rem] font-bold leading-tight" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }} />
          <label className="sr-only" htmlFor="a-sub">{tr('Subtitle')}</label>
          <Grow id="a-sub" value={v.summary} onChange={e => draft.setValue({ summary: e.target.value.replace(/\n/g, ' ') })} maxLength={300} placeholder={tr('Subtitle (optional)')}
                className="text-xl mt-2" style={{ color: 'var(--color-text-muted)', fontFamily: SERIF_STACK }} />
          <label className="sr-only" htmlFor="a-body">{tr('Your article')}</label>
          <Grow id="a-body" value={v.body} onChange={e => draft.setValue({ body: e.target.value })} placeholder={tr('Tell your story…')}
                className="mt-6 min-h-[40vh]" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK, fontSize: 19, lineHeight: 1.75 }} />
          <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {words} words · ## heading, **bold**, *italic*, &gt; quotation, - list. Bible references like John 3:16 become links.
          </p>

          <details className="mt-8 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <summary className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{tr('Article settings')}</summary>
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Kind')}<select value={v.kind} onChange={e => draft.setValue({ kind: e.target.value as ArticleKind })} className={`${field} mt-1`} style={fieldStyle}>
                    {(Object.keys(ARTICLE_KINDS) as ArticleKind[]).map(k => <option key={k} value={k}>{tr(ARTICLE_KINDS[k])}</option>)}
                  </select>
                </label>
                <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Language')}<select value={v.language} onChange={e => draft.setValue({ language: e.target.value })} className={`${field} mt-1`} style={fieldStyle}>
                    <option value="en">{tr('English')}</option>
                    <option value="yo">{tr('Yorùbá')}</option>
                    <option value="fr">{tr('Français')}</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs" style={{ color: referenceInvalid ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{tr('About (optional)')}<input value={v.referenceText} onChange={e => draft.setValue({ referenceText: e.target.value })}
                       placeholder={KIND_HINTS[v.kind] ?? tr('A passage, hymn number or lesson date')}
                       className={`${field} mt-1`} style={{ ...fieldStyle, borderColor: referenceInvalid ? 'var(--color-warning)' : fieldStyle.borderColor }} />
                <span className="block mt-1">
                  {referenceInvalid ? tr('Couldn’t read that — try “John 3:16”, “Hymn 5” or “2026-06-14”.')
                    : reference ? `Readers of ${referenceLabel(reference)} will see this article there.` : tr('Link it to a passage, hymn or lesson so readers find it there.')}
                </span>
              </label>
              <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Reader support')}<select value={v.supportParishId} onChange={e => draft.setValue({ supportParishId: e.target.value })} className={`${field} mt-1`} style={fieldStyle}>
                  <option value="">{tr('No support button')}</option>
                  {pages.map(pg => <option key={pg.parish.id} value={pg.parish.id} disabled={!pg.partner}>{pg.parish.name}{pg.partner ? '' : tr(' — needs the Partner plan')}</option>)}
                </select>
                <span className="block mt-1">{tr('Readers can give to your parish or ministry from the article. Needs the Partner plan and a payout account.')}</span>
              </label>
              <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Topics (up to 5, separated by commas)')}<input value={v.tags} onChange={e => draft.setValue({ tags: e.target.value })} placeholder={tr('faith, healing')} className={`${field} mt-1`} style={fieldStyle} />
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => persist(false)} disabled={!canSave} className="px-4 py-2 rounded-full text-sm font-semibold border disabled:opacity-40"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Save draft to my account')}</button>
                {id && (
                  <button onClick={async () => {
                    if (!await confirmDialog({ title: tr('Delete this article?'), message: tr('This cannot be undone.'), confirmLabel: tr('Delete'), danger: true })) return;
                    try { await deleteArticle(id); draft.clear(); showToast(tr('Deleted')); navigate('/articles?mine=1'); } catch (e) { showToast(errorMessage(e)); }
                  }} className="ml-auto px-3 py-2 text-sm inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Trash2 size={15} />{' '}{tr('Delete')}</button>
                )}
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
