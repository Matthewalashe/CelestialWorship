import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useParishes } from '../hooks/useParishes';
import { getPerson, listRecords, RECORD_KINDS, type PublicPerson, type ChurchRecord, type RecordKind } from '../lib/churchRecords';
import { listArticles, type Article } from '../lib/community';
import { Avatar } from '../components/ProfileMedia';
import { ArticleRow } from '../components/ArticleParts';
import { tr } from '../i18n';

const ORDER: RecordKind[] = ['stewardship', 'rank', 'investiture', 'anointing', 'ordination', 'studentship', 'education', 'certificate', 'travel', 'baptism', 'birth', 'other'];
const year = (d: string | null) => (d ? d.slice(0, 4) : '');

/** A member's public page: rank, office, ministry history and writing */
export default function Person() {
  const { id } = useParams<{ id: string }>();
  const { parishes } = useParishes();
  const [person, setPerson] = useState<PublicPerson | null | undefined>(undefined);
  const [records, setRecords] = useState<ChurchRecord[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  usePageTitle('person', person?.name ?? 'Profile');

  useEffect(() => {
    if (!id) return;
    getPerson(id).then(setPerson).catch(() => setPerson(null));
    listRecords(id).then(r => setRecords((r ?? []).filter(x => x.is_public))).catch(() => {});
    listArticles({ author: id, limit: 10 }).then(setArticles).catch(() => {});
  }, [id]);

  if (person === undefined) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>;
  if (!person) return <p className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>{tr('This profile isn’t available.')}</p>;

  const parish = parishes.find(p => p.id === person.parish_id);
  const authBy = parishes.find(p => p.id === person.authenticated_by);
  const grouped = ORDER.map(k => ({ k, items: records.filter(r => r.kind === k) })).filter(g => g.items.length);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="relative w-full aspect-[3/1] sm:rounded-b-2xl overflow-hidden"
           style={{ background: person.banner_url ? undefined : 'linear-gradient(135deg, var(--color-accent-brand), var(--color-accent-gold))' }}>
        {person.banner_url && <img src={person.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>
      <div className="px-4 -mt-10">
        <div className="rounded-full p-1 inline-block" style={{ backgroundColor: 'var(--color-bg-primary)' }}><Avatar url={person.avatar_url} name={person.name} size={84} /></div>
        <h1 className="text-2xl font-bold font-[Outfit] mt-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
          {person.name} {person.verified && <BadgeCheck size={20} aria-label={tr('Verified')} style={{ color: 'var(--color-accent-brand)' }} />}
        </h1>
        {person.rank && <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{person.rank}</p>}
        {person.office && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{person.office}{person.office_scope ? `, ${person.office_scope}` : ''}</p>}
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {parish ? <Link to={`/directory/${parish.id}`} className="underline">{parish.name}</Link> : person.member_type === 'independent_shepherd' ? tr('Independent shepherd') : null}
          {authBy && <>{' '}{tr('· Authenticated by')}{' '}{authBy.name}</>}
        </p>
        {person.bio && <p className="text-[15px] mt-4 whitespace-pre-line" style={{ color: 'var(--color-text-primary)' }}>{person.bio}</p>}

        {grouped.map(({ k, items }) => (
          <section key={k} className="mt-6">
            <h2 className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr(RECORD_KINDS[k].label)}</h2>
            <ol className="border-l-2 pl-4 space-y-3" style={{ borderColor: 'var(--color-border)' }}>
              {items.map(r => (
                <li key={r.id}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.title || RECORD_KINDS[k].label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {[r.place, r.officiant, [year(r.start_date), year(r.end_date)].filter(Boolean).join('–')].filter(Boolean).join(' · ')}
                  </p>
                  {r.details && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{r.details}</p>}
                </li>
              ))}
            </ol>
          </section>
        ))}

        {articles.length > 0 && (
          <section className="mt-8">
            <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Writing')}</h2>
            <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>{articles.map(a => <li key={a.id} style={{ borderColor: 'var(--color-border)' }}><ArticleRow a={a} /></li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
