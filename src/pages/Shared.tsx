import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { sharedRoster, sharedPost } from '../lib/parishSpace';
import { usePageTitle } from '../hooks/usePageTitle';
import { tr } from '../i18n';

/** What a parish shares by link — a roster or a post — readable without an account */

const card = { backgroundColor: 'var(--color-bg-card)' };
const muted = { color: 'var(--color-text-muted)' };
const text = { color: 'var(--color-text-primary)' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-xl mx-auto px-4 pt-8 pb-24 space-y-6">
      {children}
      <p className="text-xs text-center" style={muted}>{tr('Shared from CelestialWorship')} · <Link to="/install" className="underline">{tr('Get the app')}</Link></p>
    </div>
  );
}

export function SharedRoster() {
  usePageTitle('roster', 'Roster');
  const { token = '' } = useParams();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof sharedRoster>> | null>(null);
  useEffect(() => { sharedRoster(token).then(setRows).catch(() => setRows([])); }, [token]);
  if (rows === null) return <Shell><p className="text-sm animate-pulse" style={muted}>{tr('Loading…')}</p></Shell>;
  if (!rows.length) return <Shell><p className="text-sm text-center" style={muted}>{tr('This roster isn’t available. It may have been withdrawn.')}</p></Shell>;
  const r = rows[0];
  return (
    <Shell>
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{r.parish_name}</p>
        <h1 className="text-2xl font-bold font-[Outfit]" style={text}>{tr(r.title)}</h1>
        <p className="text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}><CalendarDays size={15} /> {new Date(`${r.service_date}T12:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </header>
      <ul className="rounded-2xl overflow-hidden" style={card}>
        {rows.filter(x => x.duty).map((x, i) => (
          <li key={i} className="flex items-baseline gap-3 px-4 py-3" style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
            <span className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr(x.duty!)}</span>
            <span className="text-sm font-semibold text-right" style={text}>{x.person || '—'}</span>
          </li>
        ))}
      </ul>
      {r.notes && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{r.notes}</p>}
    </Shell>
  );
}

export function SharedPost() {
  usePageTitle('shared', 'Shared');
  const { token = '' } = useParams();
  const [p, setP] = useState<Awaited<ReturnType<typeof sharedPost>> | null | undefined>(undefined);
  useEffect(() => { sharedPost(token).then(setP).catch(() => setP(null)); }, [token]);
  if (p === undefined) return <Shell><p className="text-sm animate-pulse" style={muted}>{tr('Loading…')}</p></Shell>;
  if (!p) return <Shell><p className="text-sm text-center" style={muted}>{tr('This post isn’t available. It may have been withdrawn.')}</p></Shell>;
  return (
    <Shell>
      <article className="rounded-2xl p-5 space-y-3" style={card}>
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}><Link to={`/directory/${p.parish_id}`}>{p.parish_name}</Link></p>
        <p className="leading-relaxed whitespace-pre-wrap" style={text}>{p.body}</p>
        <p className="text-xs" style={muted}>{[p.author_title, p.author_name].filter(Boolean).join(' ')} · {new Date(p.created_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </article>
    </Shell>
  );
}
