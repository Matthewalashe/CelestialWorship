import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useStoryCollections, readStories } from '../lib/stories';
import { tr } from '../i18n';

export default function Stories() {
  usePageTitle('stories', 'Bible stories for children');
  const { data: collections, loading, error } = useStoryCollections();
  const [params, setParams] = useSearchParams();
  const active = collections.find(c => c.id === params.get('c')) ?? collections[0];
  const read = useMemo(() => new Set(readStories()), []);

  if (loading) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>;
  if (error || !active) return <p className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>{error ?? tr('No stories yet.')}</p>;

  const parts = (['Old Testament', 'New Testament'] as const).map(p => ({ part: p, items: active.stories.filter(s => s.part === p) }));

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24">
      <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Bible stories')}</h1>
      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('To read with your children — every story has questions and the passage to read together.')}</p>

      <div className="flex gap-1 mt-4 border-b" style={{ borderColor: 'var(--color-border)' }} role="tablist">
        {collections.map(c => (
          <button key={c.id} role="tab" aria-selected={c.id === active.id} onClick={() => setParams({ c: c.id }, { replace: true })}
                  className="px-3 py-2 text-sm font-semibold -mb-px border-b-2"
                  style={c.id === active.id ? { borderColor: 'var(--color-text-primary)', color: 'var(--color-text-primary)' } : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>
            {tr(c.title)}
          </button>
        ))}
      </div>
      <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>{active.about}</p>

      {parts.filter(p => p.items.length).map(({ part, items }) => (
        <section key={part} className="mt-6">
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>{part}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map(s => (
              <li key={s.id}>
                <Link to={`/stories/${s.id}`} className="block rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                  <div className="relative aspect-[4/3] bg-[var(--color-bg-secondary)]">
                    {s.image && <img src={s.image} alt="" loading="lazy" decoding="async" width={320} height={240} className="absolute inset-0 w-full h-full object-cover" />}
                    {read.has(s.id) && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-success)', color: '#fff' }} aria-label={tr('Read')}><Check size={14} /></span>}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{tr('Story')}{' '}{s.number}</p>
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{tr(s.title)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-[11px] mt-8" style={{ color: 'var(--color-text-muted)' }}>{active.credit}</p>
    </div>
  );
}
