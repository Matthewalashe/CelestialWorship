import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PenLine, Search, BookOpen, Music, Calendar, Clock, CircleAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { listArticles, ARTICLE_KINDS, type Article, type ArticleKind, type ArticleReference } from '../lib/community';
import { markdownExcerpt } from '../utils/markdown';
import { ErrorState, SignInPrompt, type Loadable } from '../components/CommunityStates';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

export function referenceLabel(r: ArticleReference): string {
  if (r.kind === 'bible') return `${r.book} ${r.chapter}:${r.verseStart}${r.verseEnd > r.verseStart ? `-${r.verseEnd}` : ''}`;
  if (r.kind === 'hymn') return `Hymn ${r.number}`;
  return `Lessons for ${new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function ReferenceIcon({ r }: { r: ArticleReference }) {
  return r.kind === 'bible' ? <BookOpen size={12} /> : r.kind === 'hymn' ? <Music size={12} /> : <Calendar size={12} />;
}

const STATUS_LABEL: Record<Article['status'], string> = {
  draft: 'Draft', submitted: 'Waiting for review', published: 'Published', rejected: 'Not approved', archived: 'Archived',
};

export function ArticleCard({ a, showStatus }: { a: Article; showStatus?: boolean }) {
  const to = showStatus && a.status !== 'published' ? `/articles/write?id=${a.id}` : `/articles/${a.id}`;
  return (
    <Link to={to} className="block rounded-2xl border p-4" style={card}>
      <div className="flex flex-wrap items-center gap-2 mb-1.5 text-[10px] uppercase font-bold tracking-wider">
        <span style={{ color: 'var(--color-accent-gold)' }}>{ARTICLE_KINDS[a.kind]}</span>
        {a.reference && (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}>
            <ReferenceIcon r={a.reference} /> {referenceLabel(a.reference)}
          </span>
        )}
        {showStatus && (
          <span className="inline-flex items-center gap-1 ml-auto" style={{ color: a.status === 'rejected' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
            {a.status === 'submitted' ? <Clock size={11} /> : a.status === 'rejected' ? <CircleAlert size={11} /> : null}
            {STATUS_LABEL[a.status]}
          </span>
        )}
      </div>
      <p className="font-bold font-[Outfit] text-lg leading-snug" style={{ color: 'var(--color-text-primary)' }}>{a.title}</p>
      <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{a.summary || markdownExcerpt(a.body)}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
        {a.author_name}{a.published_at ? ` · ${new Date(a.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
      </p>
    </Link>
  );
}

export default function Articles() {
  usePageTitle('articles', 'Articles & commentaries');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') as ArticleKind | null) || undefined;
  const mine = params.get('mine') === '1';
  const [search, setSearch] = useState('');
  const [state, setState] = useState<Loadable<Article[]>>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await listArticles({ kind, mine, search }) });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [kind, mine, search]);

  useEffect(() => {
    if (mine && !user) { setState({ status: 'ready', data: [] }); return; }
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, mine, user, search]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>Articles</h1>
        {user && (
          <Link to="/articles/write" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
            <PenLine size={16} /> Write
          </Link>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        Commentaries on the Bible, the weekly lessons and the hymns, devotionals and testimonies from Celestians.
      </p>

      {!user && <div className="mb-4"><SignInPrompt message="Sign in to write and share your own commentaries and articles." /></div>}

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles"
               className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm border outline-none"
               style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5">
        {user && (
          <button onClick={() => setParam('mine', mine ? null : '1')} aria-pressed={mine}
                  className="px-3 h-8 rounded-full text-xs font-semibold border whitespace-nowrap"
                  style={mine ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                              : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>My writing</button>
        )}
        {(Object.keys(ARTICLE_KINDS) as ArticleKind[]).map(k => (
          <button key={k} onClick={() => setParam('kind', kind === k ? null : k)} aria-pressed={kind === k}
                  className="px-3 h-8 rounded-full text-xs font-semibold border whitespace-nowrap"
                  style={kind === k ? { backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                                    : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{ARTICLE_KINDS[k]}</button>
        ))}
      </div>

      {state.status === 'loading' && <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}
      {state.status === 'ready' && (state.data.length === 0 ? (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {mine ? 'You haven’t written anything yet.' : 'Nothing here yet — be the first to write.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {state.data.map(a => <li key={a.id}><ArticleCard a={a} showStatus={mine} /></li>)}
        </ul>
      ))}
    </div>
  );
}
