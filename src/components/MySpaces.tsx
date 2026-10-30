import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, ChevronRight, Clock } from 'lucide-react';
import { mySpaces, myInvites, myWaitingRequests, acceptInvite, joinListed, myRequest, requestToJoin, type MySpace } from '../lib/parishSpace';
import { promptDialog } from './Dialog';
import { useAuth } from '../hooks/useAuth';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

const ROLE: Record<string, string> = {
  shepherd: 'Shepherd', admin: 'Administrator', parochial_committee: 'Parochial committee', media: 'Media', choir: 'Choir', editor: 'Editor', minister: 'Minister', member: 'Member',
};

/** On the profile: every parish space this member belongs to, and invitations waiting for an answer */
export function MySpaces() {
  const [spaces, setSpaces] = useState<MySpace[]>([]);
  const [invites, setInvites] = useState<Awaited<ReturnType<typeof myInvites>>>([]);
  const [waiting, setWaiting] = useState<{ parish_id: string; name: string }[]>([]);
  const load = useCallback(() => { mySpaces().then(setSpaces).catch(() => setSpaces([])); myInvites().then(setInvites); myWaitingRequests().then(setWaiting).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const card = { backgroundColor: 'var(--color-bg-card)' };
  return (
    <section className="space-y-2" aria-labelledby="my-spaces">
      <h2 id="my-spaces" className="text-[11px] uppercase tracking-widest font-semibold px-1" style={{ color: 'var(--color-text-muted)' }}>{tr('My parish spaces')}</h2>
      {invites.map(i => (
        <div key={i.token} className="rounded-2xl p-4 flex flex-wrap items-center gap-3 border" style={{ ...card, borderColor: 'var(--color-accent-brand)' }}>
          <span className="flex-1 min-w-[10rem] text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Invitation to')} <b>{i.parish_name}</b></span>
          <button onClick={async () => { try { await acceptInvite(i.token); showToast(tr('Welcome to the parish space')); load(); } catch (e) { showToast(errorMessage(e)); } }}
                  className="btn-primary px-3 py-1.5 rounded-lg text-sm font-semibold">{tr('Accept')}</button>
        </div>
      ))}
      {waiting.map(w => (
        <Link key={w.parish_id} to={`/directory/${w.parish_id}`} className="flex items-center gap-3 rounded-2xl p-4 text-sm" style={{ ...card, color: 'var(--color-text-secondary)' }}>
          <Clock size={18} aria-hidden style={{ color: 'var(--color-accent-gold)' }} />
          <span className="flex-1"><b style={{ color: 'var(--color-text-primary)' }}>{w.name}</b>: {tr('your request is with the parish. There is no need to ask again.')}</span>
        </Link>
      ))}
      {spaces.length === 0 && invites.length === 0 && waiting.length === 0 ? (
        <Link to="/directory" className="flex items-center gap-3 rounded-2xl p-4 text-sm" style={{ ...card, color: 'var(--color-text-secondary)' }}>
          <MessagesSquare size={18} style={{ color: 'var(--color-accent-brand)' }} />
          <span className="flex-1">{tr('Not in a parish space yet. Find your parish and ask to join.')}</span>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <ul className="rounded-2xl overflow-hidden" style={card}>
          {spaces.map((s, i) => (
            <li key={s.parish_id} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
              <Link to={`/space?parish=${s.parish_id}`} className="flex items-center gap-3 px-4 py-3">
                {s.logo_url ? <img src={s.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover" /> : <span className="w-9 h-9 rounded-xl grid place-items-center" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-accent-brand)' }}><MessagesSquare size={16} /></span>}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
                  <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr(ROLE[s.role] ?? s.role)}{s.city ? ` · ${s.city}` : ''}{s.status === 'pending' ? ` · ${tr('waiting to be listed')}` : ''}</span>
                </span>
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** On a parish's page: ask to join its space, see that the request is waiting, or open the space */
export function JoinSpaceButton({ parishId, listed = false }: { parishId: string; listed?: boolean }) {
  const [realId, setRealId] = useState(parishId);
  const { user, loading } = useAuth();
  const [state, setState] = useState<'loading' | 'member' | 'pending' | 'declined' | 'none' | 'signed-out'>('loading');
  useEffect(() => {
    if (loading) return;
    if (!user) { setState('signed-out'); return; }
    let live = true;
    (async () => {
      const spaces = await mySpaces().catch(() => []);
      if (!live) return;
      if (spaces.some(s => s.parish_id === parishId)) { setState('member'); return; }
      if (listed) { setState('none'); return; }
      const r = await myRequest(parishId).catch(() => null);
      if (live) setState(r ?? 'none');
    })();
    return () => { live = false; };
  }, [parishId, listed, user, loading]);

  const style = { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
  const cls = 'px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5';
  if (state === 'loading') return null;
  if (state === 'member') return <Link to={`/space?parish=${realId}`} className={cls} style={style}><MessagesSquare size={15} /> {tr('Parish space')}</Link>;
  if (state === 'pending') return <span className={cls} style={{ ...style, color: 'var(--color-text-muted)' }}><MessagesSquare size={15} /> {tr('Asked to join')}</span>;
  if (state === 'signed-out') return <Link to={`/signin?returnTo=${encodeURIComponent(window.location.pathname)}`} className={cls} style={style}><MessagesSquare size={15} /> {tr('Join the parish space')}</Link>;
  return (
    <button className={cls} style={style} onClick={async () => {
      if (listed) {
        try {
          const r = await joinListed(parishId);
          setRealId(r.parishId);
          setState(r.state);
          showToast(r.state === 'member' ? tr('You are in the parish space') : tr('Asked, the parish will let you in'));
        } catch (e) { showToast(errorMessage(e)); }
        return;
      }
      const note = await promptDialog({ title: tr('Ask to join the parish space'), message: tr('The parish will admit you. Say who you are if they may not know you (optional).'), label: tr('A note to the parish'), confirmLabel: tr('Ask to join') });
      if (note === null) return;
      try {
        const joined = await requestToJoin(parishId, note) === 'member';
        setState(joined ? 'member' : 'pending');
        showToast(joined ? tr('You are in the parish space') : tr('Asked, the parish will let you in'));
      } catch (e) { showToast(errorMessage(e)); }
    }}><MessagesSquare size={15} /> {tr('Ask to join the parish space')}</button>
  );
}
