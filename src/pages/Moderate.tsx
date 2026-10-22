import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { moderationQueue, moderate, ARTICLE_KINDS } from '../lib/community';
import { ErrorState } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';

type Queue = Awaited<ReturnType<typeof moderationQueue>>;
type Section = keyof Queue;

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'verifications', label: 'Role verifications' },
  { id: 'parishes', label: 'Parishes & ministries' },
  { id: 'prayers', label: 'Prayer requests' },
  { id: 'articles', label: 'Articles' },
  { id: 'events', label: 'Events' },
  { id: 'reports', label: 'Reports' },
  { id: 'translations', label: 'Hymn translations' },
];

const TABLE: Record<Section, string> = {
  verifications: 'verification_requests', parishes: 'parishes', prayers: 'prayer_requests', articles: 'articles',
  events: 'events', reports: 'content_reports', translations: 'hymn_translations',
};

const APPROVE: Record<Section, Record<string, string>> = {
  verifications: { status: 'approved' }, parishes: { status: 'published' }, prayers: { status: 'published' },
  articles: { status: 'published' }, events: { status: 'published' }, reports: { status: 'resolved' }, translations: { status: 'published' },
};
const REJECT: Record<Section, Record<string, string>> = {
  verifications: { status: 'rejected' }, parishes: { status: 'rejected' }, prayers: { status: 'hidden' },
  articles: { status: 'rejected' }, events: { status: 'rejected' }, reports: { status: 'dismissed' }, translations: { status: 'rejected' },
};

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

function summary(section: Section, item: any): { title: string; body?: string; meta?: string; link?: string } {
  switch (section) {
    case 'verifications': return { title: `Wants to be confirmed as ${String(item.member_type).replace(/_/g, ' ')}`, body: item.details, meta: `User ${String(item.user_id).slice(0, 8)}…` };
    case 'parishes': return { title: `${item.name}${item.kind === 'ministry' ? ' (ministry)' : ''}`, body: [item.address, item.city, item.state_region, item.country].filter(Boolean).join(', '), meta: item.shepherd_name ? `Shepherd: ${item.shepherd_name}. Approving also makes the person who registered it its administrator.` : 'Approving also makes the person who registered it its administrator.' };
    case 'prayers': return { title: item.title, body: item.body, meta: `${item.is_anonymous ? 'Anonymous' : item.display_name ?? ''} · ${item.visibility}` };
    case 'articles': return { title: item.title, body: item.summary ?? String(item.body).slice(0, 300), meta: `${ARTICLE_KINDS[item.kind as keyof typeof ARTICLE_KINDS] ?? item.kind} by ${item.author_name}`, link: `/articles/${item.id}` };
    case 'events': return { title: item.title, body: item.description, meta: `${new Date(item.starts_at).toLocaleString('en-GB')} · ${item.location ?? ''}` };
    case 'reports': return { title: `Report on ${item.target_kind}`, body: item.reason, meta: `Item ${item.target_id}`, link: item.target_kind === 'article' ? `/articles/${item.target_id}` : undefined };
    case 'translations': return { title: `Hymn ${item.hymn_number} in ${item.language === 'fr' ? 'French' : 'Egun'}`, body: (item.stanzas ?? []).map((s: any) => (s.lines ?? []).join('\n')).join('\n\n').slice(0, 600), meta: item.source ? `Source: ${item.source}` : 'No source given' };
  }
}

export default function Moderate() {
  usePageTitle('moderate', 'Moderation');
  const { canModerate, loading } = useAuth();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [section, setSection] = useState<Section>('verifications');

  const load = useCallback(() => moderationQueue().then(setQueue).catch(setError), []);
  useEffect(() => { if (canModerate) load(); }, [canModerate, load]);

  if (loading) return null;
  if (!canModerate) return <p className="text-center py-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>This page is for moderators.</p>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!queue) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>;

  const decide = async (item: any, approve: boolean) => {
    let update = approve ? APPROVE[section] : REJECT[section];
    if (!approve && section === 'articles') {
      const note = prompt('Note to the author (why it was not approved)');
      if (note === null) return;
      update = { ...update, moderation_note: note };
    }
    try {
      await moderate(TABLE[section], item.id, update);
      showToast(approve ? 'Approved' : 'Declined');
      load();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const items = queue[section] as any[];

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <h1 className="text-2xl font-bold font-[Outfit] mb-4" style={{ color: 'var(--color-text-primary)' }}>Moderation</h1>
      <div className="flex gap-1 overflow-x-auto hide-scrollbar mb-5" role="tablist">
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" aria-selected={section === s.id} onClick={() => setSection(s.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={section === s.id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            {s.label} ({(queue[s.id] as any[]).length})
          </button>
        ))}
      </div>
      {items.length === 0 ? <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>Nothing waiting.</p> : (
        <ul className="space-y-3">
          {items.map(item => {
            const s = summary(section, item);
            return (
              <li key={item.id} className="rounded-2xl border p-4" style={card}>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.title}</p>
                {s.body && <p className="text-sm mt-1 whitespace-pre-line line-clamp-6" style={{ color: 'var(--color-text-secondary)' }}>{s.body}</p>}
                {s.meta && <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{s.meta}</p>}
                <div className="flex items-center gap-4 mt-3 text-sm font-semibold">
                  <button onClick={() => decide(item, true)} className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}><Check size={16} /> {section === 'reports' ? 'Resolved' : 'Approve'}</button>
                  <button onClick={() => decide(item, false)} className="inline-flex items-center gap-1" style={{ color: 'var(--color-warning)' }}><X size={16} /> {section === 'reports' ? 'Dismiss' : 'Decline'}</button>
                  {s.link && <Link to={s.link} className="ml-auto inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-accent-brand)' }}>Open <ExternalLink size={12} /></Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
