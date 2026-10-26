import { useCallback, useEffect, useState } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
import { pendingClaims, evidenceLinks, approveClaim, rejectClaim, CLAIM_ROLES, type ParishClaim } from '../lib/claims';
import { pendingLibrary, setLibraryStatus, LIBRARY_KINDS, type LibraryItem } from '../lib/library';
import { promptDialog } from './Dialog';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

/** Parish claims with private evidence, and library submissions, for moderators */
export function ModerationExtras() {
  const [claims, setClaims] = useState<ParishClaim[]>([]);
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [items, setItems] = useState<LibraryItem[]>([]);

  const load = useCallback(() => {
    pendingClaims().then(setClaims).catch(e => showToast(errorMessage(e)));
    pendingLibrary().then(setItems).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<void>, done: string) => { try { await fn(); showToast(done); load(); } catch (e) { showToast(errorMessage(e)); } };

  if (!claims.length && !items.length) return null;
  return (
    <div className="space-y-6 mb-8">
      {claims.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Parish claims (')}{claims.length})</h2>
          <ul className="space-y-2">
            {claims.map(c => (
              <li key={c.id} className="rounded-2xl border p-4 space-y-2" style={card}>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.details.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {tr(CLAIM_ROLES[c.role])}{c.office ? ` · ${c.office}` : ''} · {[c.details.address, c.details.city, c.details.country].filter(Boolean).join(', ')}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{[c.details.shepherd_name, c.details.phone, c.details.email].filter(Boolean).join(' · ')}</p>
                {c.note && <p className="text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>“{c.note}”</p>}
                <div className="flex flex-wrap gap-2">
                  {links[c.id]
                    ? links[c.id].map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold inline-flex items-center gap-1 underline" style={{ color: 'var(--color-accent-brand)' }}>{tr('Evidence')}{' '}{i + 1} <ExternalLink size={11} /></a>)
                    : <button onClick={async () => setLinks({ ...links, [c.id]: await evidenceLinks(c.evidence_paths) })} className="text-xs font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{tr('View')}{' '}{c.evidence_paths.length}{' '}{tr('evidence file')}{c.evidence_paths.length > 1 ? 's' : ''}</button>}
                </div>
                <div className="flex gap-4 text-sm font-semibold pt-1">
                  <button onClick={() => act(() => approveClaim(c.id), 'Approved, the parish is theirs to run')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}><Check size={16} />{' '}{tr('Approve')}</button>
                  <button onClick={async () => { const note = await promptDialog({ title: tr('Reject the claim'), label: tr('Reason (shown to the person)') }); if (note) act(() => rejectClaim(c.id, note), 'Rejected'); }}
                          className="inline-flex items-center gap-1" style={{ color: 'var(--color-warning)' }}><X size={16} />{' '}{tr('Reject')}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Library submissions (')}{items.length})</h2>
          <ul className="space-y-2">
            {items.map(i => (
              <li key={i.id} className="rounded-2xl border p-4 space-y-1" style={card}>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(i.title)}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tr(LIBRARY_KINDS[i.kind])} · {i.author_name}</p>
                <a href={i.url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs underline" style={{ color: 'var(--color-accent-brand)' }}>{tr('Open')}</a>
                <div className="flex gap-4 text-sm font-semibold pt-1">
                  <button onClick={() => act(() => setLibraryStatus(i.id, 'published'), 'Published')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}><Check size={16} />{' '}{tr('Publish')}</button>
                  <button onClick={() => act(() => setLibraryStatus(i.id, 'hidden'), 'Hidden')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-warning)' }}><X size={16} />{' '}{tr('Hide')}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
