import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, Flag, MessageCircle, PenLine } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  getArticle, getAuthor, listArticles, listComments, addComment, reactionCounts, toggleAmen, reportContent, ARTICLE_KINDS,
  type Article, type ArticleComment, type ArticleAuthor,
} from '../lib/community';
import { Markdown } from '../utils/markdown';
import { referenceLabel, ReferenceIcon, readingMinutes, ShepherdBadge, ArticleRow, SERIF_STACK } from '../components/ArticleParts';
import { useReadingStyle } from '../components/Reader';
import { Avatar } from '../components/ProfileMedia';
import { ErrorState, type Loadable } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { promptDialog } from '../components/Dialog';
import { errorMessage } from '../lib/backend';
import { parishCanReceive } from '../lib/payments';
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
  const readingStyle = useReadingStyle();
  const [state, setState] = useState<Loadable<Article | null>>({ status: 'loading' });
  const [author, setAuthor] = useState<ArticleAuthor | null>(null);
  const [more, setMore] = useState<Article[]>([]);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [amen, setAmen] = useState({ amen: 0, mine: false });
  const [comment, setComment] = useState('');
  const [canSupport, setCanSupport] = useState(false);

  const article = state.status === 'ready' ? state.data : null;
  usePageTitle('article', article?.title);

  const load = useCallback(async () => {
    if (!id) return;
    setState({ status: 'loading' });
    try {
      const a = await getArticle(id);
      setState({ status: 'ready', data: a });
      if (!a) return;
      getAuthor(a.author_id).then(setAuthor).catch(() => {});
      if (a.support_parish_id) parishCanReceive(a.support_parish_id).then(setCanSupport);
      if (a.status === 'published') {
        setComments(await listComments(id).catch(() => []));
        setAmen(await reactionCounts(id));
        listArticles({ author: a.author_id, limit: 4 }).then(list => setMore(list.filter(x => x.id !== a.id).slice(0, 3))).catch(() => {});
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
    if (!user) { showToast('Sign in to say Amen'); return; }
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
    const reason = await promptDialog({ title: 'Report this article', label: 'What is wrong with it?' });
    if (!reason?.trim()) return;
    try { await reportContent('article', article.id, reason.trim()); showToast('Thank you — a moderator will look at it'); }
    catch (e) { showToast(errorMessage(e)); }
  };

  const refPath = referencePath(article);
  const published = article.status === 'published';
  const date = article.published_at ? new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const authorName = author?.name ?? article.author_name;
  const actionBtn = 'h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-sm';
  const muted = { color: 'var(--color-text-muted)' };

  const actions = (
    <div className="flex items-center gap-1 py-2 border-y" style={{ borderColor: 'var(--color-border)' }}>
      {published && (
        <button onClick={onAmen} aria-pressed={amen.mine} className={actionBtn}
                style={{ color: amen.mine ? 'var(--color-accent-brand)' : 'var(--color-text-secondary)', fontWeight: amen.mine ? 600 : 400 }}>
          🙏 Amen{amen.amen ? ` · ${amen.amen}` : ''}
        </button>
      )}
      {published && <a href="#responses" className={actionBtn} style={{ color: 'var(--color-text-secondary)' }}><MessageCircle size={16} /> {comments.length}</a>}
      <button onClick={share} className={`${actionBtn} ml-auto`} aria-label="Share" style={{ color: 'var(--color-text-secondary)' }}><Share2 size={16} /></button>
      {user?.id === article.author_id ? (
        <Link to={`/articles/write?id=${article.id}`} className={actionBtn} style={{ color: 'var(--color-text-secondary)' }}><PenLine size={16} /> Edit</Link>
      ) : user && published && (
        <button onClick={report} className={actionBtn} aria-label="Report" style={muted}><Flag size={15} /></button>
      )}
    </div>
  );

  return (
    <article className="px-5 py-6 max-w-[680px] mx-auto pb-24">
      <Link to="/articles" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ Articles</Link>

      {!published && (
        <p className="text-xs mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          Preview — this article is {article.status === 'submitted' ? 'waiting for review' : article.status}.
          {article.moderation_note && <> Moderator’s note: {article.moderation_note}</>}
        </p>
      )}

      <h1 className="text-[2rem] sm:text-[2.6rem] font-bold leading-[1.15] mt-6" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>{article.title}</h1>
      {article.summary && <p className="text-xl mt-3 leading-snug" style={{ color: 'var(--color-text-muted)', fontFamily: SERIF_STACK }}>{article.summary}</p>}

      {/* Byline */}
      <div className="flex items-center gap-3 mt-6 mb-5">
        <Link to={`/articles?author=${article.author_id}`} aria-hidden tabIndex={-1}>
          <Avatar url={author?.avatarUrl} name={authorName} size={44} />
        </Link>
        <div className="min-w-0">
          <Link to={`/articles?author=${article.author_id}`} className="font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
            {authorName} {author && <ShepherdBadge verified={author.verified} />}
          </Link>
          <p className="text-sm" style={muted}>
            {[author?.parishName ?? (author?.memberType === 'independent_shepherd' ? 'Independent shepherd' : null), `${readingMinutes(article.body)} min read`, date].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {actions}

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="uppercase tracking-widest font-semibold" style={muted}>{ARTICLE_KINDS[article.kind]}</span>
        {article.reference && refPath && (
          <Link to={refPath} className="inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
            <ReferenceIcon r={article.reference} /> {referenceLabel(article.reference)}
          </Link>
        )}
      </div>

      <div className="mt-6 article-body" style={{ ...readingStyle, color: 'var(--color-text-primary)' }}><Markdown source={article.body} /></div>

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-8">
          {article.tags.map(t => <span key={t} className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>{t}</span>)}
        </div>
      )}

      {published && canSupport && (
        <div className="mt-10 rounded-2xl p-5 text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>Blessed by this teaching?</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Support {authorName}’s ministry.</p>
          <Link to={`/give?parish=${article.support_parish_id}&purpose=support&source=article&id=${article.id}`}
                className="btn-primary inline-block mt-3 px-6 py-2.5 rounded-full text-sm font-semibold">Support</Link>
        </div>
      )}

      <div className="mt-8">{actions}</div>

      {/* More from the author */}
      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>More from {authorName}</h2>
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {more.map(a => <li key={a.id} style={{ borderColor: 'var(--color-border)' }}><ArticleRow a={a} /></li>)}
          </ul>
          <Link to={`/articles?author=${article.author_id}`} className="text-sm font-semibold" style={{ color: 'var(--color-accent-brand)' }}>See all</Link>
        </section>
      )}

      {published && (
        <section id="responses" className="mt-10">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Responses ({comments.length})</h2>
          {user ? (
            <div className="mb-5">
              <label className="sr-only" htmlFor="response">Your response</label>
              <textarea id="response" value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={2000} placeholder="What are your thoughts?"
                        className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                        style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <div className="flex justify-end mt-2">
                <button onClick={postComment} disabled={!comment.trim()} className="btn-primary px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50">Respond</button>
              </div>
            </div>
          ) : (
            <p className="text-sm mb-5" style={muted}>
              <Link to={`/signin?returnTo=/articles/${article.id}`} className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Sign in</Link> to respond.
            </p>
          )}
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {comments.map(c => (
              <li key={c.id} className="py-4" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.author_name}</p>
                <p className="text-xs" style={muted}>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-[15px] mt-2 whitespace-pre-line" style={{ color: 'var(--color-text-primary)' }}>{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
