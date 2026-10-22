import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Share2, Flag, MessageCircle, Heart, PenLine } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  getArticle, listComments, addComment, reactionCounts, toggleAmen, reportContent, ARTICLE_KINDS,
  type Article, type ArticleComment,
} from '../lib/community';
import { Markdown } from '../utils/markdown';
import { referenceLabel, ReferenceIcon } from './Articles';
import { ErrorState, type Loadable } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { referenceToPath } from '../utils/parseReference';

function referencePath(a: Article): string | null {
  const r = a.reference;
  if (!r) return null;
  if (r.kind === 'bible') return referenceToPath({ raw: '', book: r.book, chapter: r.chapter, verseStart: r.verseStart, verseEnd: r.verseEnd });
  if (r.kind === 'hymn') return `/hymns/${r.number}`;
  return `/lessons/${r.date}`;
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<Loadable<Article | null>>({ status: 'loading' });
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [amen, setAmen] = useState({ amen: 0, mine: false });
  const [comment, setComment] = useState('');

  const article = state.status === 'ready' ? state.data : null;
  usePageTitle('article', article?.title);

  const load = useCallback(async () => {
    if (!id) return;
    setState({ status: 'loading' });
    try {
      const a = await getArticle(id);
      setState({ status: 'ready', data: a });
      if (a?.status === 'published') {
        setComments(await listComments(id).catch(() => []));
        setAmen(await reactionCounts(id));
      }
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state.status === 'loading') return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={load} />;
  if (!article) {
    return (
      <div className="text-center py-16 px-4">
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>This article isn’t available.</p>
        <Link to="/articles" className="btn-primary px-5 py-2 rounded-xl text-sm">All articles</Link>
      </div>
    );
  }

  const share = async () => {
    const url = `${window.location.origin}/articles/${article.id}`;
    if (navigator.share) { try { await navigator.share({ title: article.title, text: article.summary ?? '', url }); return; } catch {} }
    try { await navigator.clipboard.writeText(url); showToast('Link copied'); } catch {}
  };

  const onAmen = async () => {
    if (!user) { showToast('Sign in to respond'); return; }
    const next = !amen.mine;
    setAmen(a => ({ amen: a.amen + (next ? 1 : -1), mine: next }));
    try { await toggleAmen(article.id, next); } catch (e) { showToast(errorMessage(e)); load(); }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    try {
      await addComment(article.id, comment);
      setComment('');
      setComments(await listComments(article.id));
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const report = async () => {
    const reason = prompt('What is wrong with this article?');
    if (!reason?.trim()) return;
    try { await reportContent('article', article.id, reason.trim()); showToast('Thank you — a moderator will look at it'); }
    catch (e) { showToast(errorMessage(e)); }
  };

  const refPath = referencePath(article);

  return (
    <article className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <Link to="/articles" className="text-sm inline-flex items-center gap-1 mb-5" style={{ color: 'var(--color-text-secondary)' }}>
        <ChevronLeft size={16} /> Articles
      </Link>

      {article.status !== 'published' && (
        <p className="text-xs mb-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          Preview — this article is {article.status === 'submitted' ? 'waiting for review' : article.status}.
          {article.moderation_note && <> Moderator’s note: {article.moderation_note}</>}
        </p>
      )}

      <p className="text-[11px] uppercase font-bold tracking-widest" style={{ color: 'var(--color-accent-gold)' }}>{ARTICLE_KINDS[article.kind]}</p>
      <h1 className="text-3xl font-bold font-[Outfit] leading-tight mt-1" style={{ color: 'var(--color-text-primary)' }}>{article.title}</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
        {article.author_name}
        {article.published_at && ` · ${new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      </p>
      {article.reference && refPath && (
        <Link to={refPath} className="inline-flex items-center gap-1 text-xs font-semibold mt-3 px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-accent-brand)' }}>
          <ReferenceIcon r={article.reference} /> {referenceLabel(article.reference)}
        </Link>
      )}
      {article.summary && <p className="text-lg mt-5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{article.summary}</p>}

      <div className="mt-6 text-[17px]"><Markdown source={article.body} /></div>

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {article.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>#{t}</span>)}
        </div>
      )}

      <div className="flex items-center gap-2 mt-8 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {article.status === 'published' && (
          <button onClick={onAmen} aria-pressed={amen.mine} className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                  style={amen.mine ? { backgroundColor: 'color-mix(in srgb, #EF4444 15%, transparent)', color: '#EF4444' } : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
            <Heart size={15} fill={amen.mine ? 'currentColor' : 'none'} /> Amen · {amen.amen}
          </button>
        )}
        <button onClick={share} className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
          <Share2 size={15} /> Share
        </button>
        {user?.id === article.author_id ? (
          <Link to={`/articles/write?id=${article.id}`} className="ml-auto text-sm font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}>
            <PenLine size={15} /> Edit
          </Link>
        ) : user && (
          <button onClick={report} className="ml-auto p-2" aria-label="Report" style={{ color: 'var(--color-text-muted)' }}><Flag size={15} /></button>
        )}
      </div>

      {article.status === 'published' && (
        <section className="mt-8">
          <h2 className="font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--color-text-primary)' }}>
            <MessageCircle size={18} /> Comments ({comments.length})
          </h2>
          <ul className="space-y-3 mb-4">
            {comments.map(c => (
              <li key={c.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {c.author_name} · {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-sm mt-1 whitespace-pre-line" style={{ color: 'var(--color-text-primary)' }}>{c.body}</p>
              </li>
            ))}
          </ul>
          {user ? (
            <div className="flex gap-2">
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={2000} placeholder="Add a comment"
                        className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none"
                        style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <button onClick={postComment} disabled={!comment.trim()} className="btn-primary px-4 rounded-xl text-sm font-semibold disabled:opacity-50">Post</button>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <Link to={`/signin?returnTo=/articles/${article.id}`} className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Sign in</Link> to comment.
            </p>
          )}
        </section>
      )}
    </article>
  );
}
