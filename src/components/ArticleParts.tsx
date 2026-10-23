import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Music, Calendar, BadgeCheck } from 'lucide-react';
import { listArticles, ARTICLE_KINDS, type Article, type ArticleReference } from '../lib/community';
import { markdownExcerpt } from '../utils/markdown';
import type { MemberProfile } from '../hooks/useProfile';

/**
 * Articles are long-form writing by shepherds (in a parish or independent), read like a book.
 * Shared pieces for the list, the article page and the editor.
 */

/** Only shepherds write articles; the database checks the same (PRINCIPLES §3) */
export function isShepherd(profile: Pick<MemberProfile, 'memberType'>): boolean {
  return profile.memberType === 'shepherd' || profile.memberType === 'independent_shepherd';
}

export function readingMinutes(markdown: string): number {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 220));
}

export function referenceLabel(r: ArticleReference): string {
  if (r.kind === 'bible') return `${r.book} ${r.chapter}:${r.verseStart}${r.verseEnd > r.verseStart ? `-${r.verseEnd}` : ''}`;
  if (r.kind === 'hymn') return `Hymn ${r.number}`;
  return `Lessons for ${new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function ReferenceIcon({ r }: { r: ArticleReference }) {
  return r.kind === 'bible' ? <BookOpen size={12} /> : r.kind === 'hymn' ? <Music size={12} /> : <Calendar size={12} />;
}

export const SERIF_STACK = "Literata, Georgia, 'Times New Roman', serif";

const dateLabel = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** One article in a list, Medium-style: author, title, subtitle, date and reading time */
export function ArticleRow({ a, status }: { a: Article; status?: string }) {
  const to = status && a.status !== 'published' ? `/articles/write?id=${a.id}` : `/articles/${a.id}`;
  return (
    <Link to={to} className="block py-5">
      <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
          {a.author_name.replace(/^(Rev(\.|erend)?|Pastor|Shepherd|Very|Most)\s+/gi, '')[0] ?? '·'}
        </span>
        {a.author_name}
        {status && <span className="ml-auto" style={{ color: a.status === 'rejected' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{status}</span>}
      </p>
      <h2 className="text-xl font-bold leading-snug mt-2" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>{a.title}</h2>
      <p className="text-[15px] mt-1 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{a.summary || markdownExcerpt(a.body)}</p>
      <p className="text-xs mt-2.5 flex flex-wrap items-center gap-x-2" style={{ color: 'var(--color-text-muted)' }}>
        <span>{dateLabel(a.published_at ?? a.updated_at)}</span>
        <span aria-hidden>·</span>
        <span>{readingMinutes(a.body)} min read</span>
        <span aria-hidden>·</span>
        <span>{a.reference ? referenceLabel(a.reference) : ARTICLE_KINDS[a.kind]}</span>
      </p>
    </Link>
  );
}

export function ShepherdBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return <BadgeCheck size={15} aria-label="Verified shepherd" style={{ color: 'var(--color-accent-brand)' }} />;
}

/** "Commentaries on this passage / hymn": shown under the text when shepherds have written about it */
export function RelatedArticles({ reference, title }: { reference: ArticleReference; title: string }) {
  const [items, setItems] = useState<Article[]>([]);
  const key = JSON.stringify(reference);
  useEffect(() => {
    let cancelled = false;
    listArticles({ reference: JSON.parse(key), limit: 3 }).then(a => { if (!cancelled) setItems(a); }).catch(() => {});
    return () => { cancelled = true; };
  }, [key]);
  if (!items.length) return null;
  return (
    <section className="mt-8 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>{title}</h2>
      <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {items.map(a => (
          <li key={a.id} style={{ borderColor: 'var(--color-border)' }}>
            <Link to={`/articles/${a.id}`} className="block py-3">
              <span className="block font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: SERIF_STACK }}>{a.title}</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.author_name} · {readingMinutes(a.body)} min read</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
