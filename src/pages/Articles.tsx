import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PenLine, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { usePageTitle } from '../hooks/usePageTitle';
import { listArticles, getAuthor, ARTICLE_KINDS, type Article, type ArticleKind, type ArticleAuthor } from '../lib/community';
import { ArticleRow, ShepherdBadge, isShepherd } from '../components/ArticleParts';
import { ErrorState, type Loadable } from '../components/CommunityStates';

const STATUS_LABEL: Record<Article['status'], string> = {
  draft: 'Draft', submitted: 'Waiting for review', published: 'Published', rejected: 'Not approved', archived: 'Archived',
};

export default function Articles() {
  usePageTitle('articles', 'Articles');
  const { user } = useAuth();
  const { profile } = useProfile();
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') as ArticleKind | null) || undefined;
  const mine = params.get('mine') === '1';
  const authorId = params.get('author') || undefined;
  const [search, setSearch] = useState('');
  const [author, setAuthor] = useState<ArticleAuthor | null>(null);
  const [state, setState] = useState<Loadable<Article[]>>({ status: 'loading' });
  const writer = !!user && isShepherd(profile);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await listArticles({ kind, mine, search, author: authorId }) });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [kind, mine, search, authorId]);

  useEffect(() => {
    if (mine && !user) { setState({ status: 'ready', data: [] }); return; }
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, mine, user, search]);

  useEffect(() => {
    if (!authorId) { setAuthor(null); return; }
    getAuthor(authorId).then(setAuthor).catch(() => setAuthor(null));
  }, [authorId]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const chip = (active: boolean) => (active
    ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }
    : { color: 'var(--color-text-secondary)' });

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between gap-3">
        {authorId ? (
          <div>
            <Link to="/articles" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ Articles</Link>
            <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-1.5 mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {author?.name ?? 'Shepherd'} {author && <ShepherdBadge verified={author.verified} />}
            </h1>
            {author?.parishName && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{author.parishName}</p>}
          </div>
        ) : (
          <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{mine ? 'My writing' : 'Articles'}</h1>
        )}
        {writer && !authorId && (
          <Link to="/articles/write" className="px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <PenLine size={15} /> Write
          </Link>
        )}
      </div>
      {!authorId && !mine && (
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Teaching, commentaries and devotionals by shepherds of the Church.
        </p>
      )}

      {!authorId && (
        <div className="mt-5 flex items-center gap-1 overflow-x-auto hide-scrollbar border-b" style={{ borderColor: 'var(--color-border)' }}>
          {writer && (
            <button onClick={() => setParam('mine', mine ? null : '1')} aria-pressed={mine} className="px-3 py-1.5 mb-2 rounded-full text-sm whitespace-nowrap" style={chip(mine)}>Mine</button>
          )}
          <button onClick={() => setParam('kind', null)} aria-pressed={!kind} className="px-3 py-1.5 mb-2 rounded-full text-sm whitespace-nowrap" style={chip(!kind && !mine)}>All</button>
          {(Object.keys(ARTICLE_KINDS) as ArticleKind[]).map(k => (
            <button key={k} onClick={() => setParam('kind', kind === k ? null : k)} aria-pressed={kind === k}
                    className="px-3 py-1.5 mb-2 rounded-full text-sm whitespace-nowrap" style={chip(kind === k)}>{ARTICLE_KINDS[k]}</button>
          ))}
        </div>
      )}

      <label className="relative block mt-3">
        <span className="sr-only">Search articles</span>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles"
               className="w-full rounded-full pl-9 pr-3 py-2 text-sm outline-none"
               style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }} />
      </label>

      {state.status === 'loading' && <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}
      {state.status === 'ready' && (state.data.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {mine ? 'You haven’t written anything yet.' : 'No articles here yet.'}
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {state.data.map(a => <li key={a.id} style={{ borderColor: 'var(--color-border)' }}><ArticleRow a={a} status={mine ? STATUS_LABEL[a.status] : undefined} /></li>)}
        </ul>
      ))}
    </div>
  );
}
