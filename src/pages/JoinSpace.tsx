import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { inviteDetails, acceptInvite, type InviteDetails } from '../lib/parishSpace';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

/**
 * An invitation to a parish space. Only registered members can join: someone without an account
 * signs up (or signs in) and comes straight back here to accept.
 */
export default function JoinSpace() {
  usePageTitle('join', 'Join a parish space');
  const { token = '' } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteDetails | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => { inviteDetails(token).then(setInvite).catch(() => setInvite(null)); }, [token]);

  const here = `/join/${token}`;
  const accept = async () => {
    setBusy(true);
    try {
      const parishId = await acceptInvite(token);
      showToast(tr('Welcome to the parish space'));
      navigate(`/space?parish=${parishId}`, { replace: true });
    } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); }
  };

  const text = { color: 'var(--color-text-primary)' };
  const muted = { color: 'var(--color-text-muted)' };

  return (
    <div className="max-w-md mx-auto px-4 pt-12 pb-24 text-center space-y-5">
      {invite === undefined ? <p className="text-sm animate-pulse" style={muted}>{tr('Loading…')}</p>
        : !invite || !invite.valid ? (
          <>
            <Users size={36} className="mx-auto" style={muted} />
            <h1 className="text-xl font-bold font-[Outfit]" style={text}>{tr('This invitation is no longer valid')}</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Ask the parish for a new link, or ask to join from its page in Parishes.')}</p>
            <Link to="/directory" className="btn-primary inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">{tr('Parishes')}</Link>
          </>
        ) : (
          <>
            {invite.logo_url ? <img src={invite.logo_url} alt="" className="w-20 h-20 rounded-2xl mx-auto object-cover" />
              : <span className="w-20 h-20 rounded-2xl mx-auto grid place-items-center" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-accent-brand)' }}><Users size={32} /></span>}
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr('You are invited to')}</p>
              <h1 className="text-2xl font-bold font-[Outfit]" style={text}>{invite.parish_name}</h1>
              {invite.city && <p className="text-sm" style={muted}>{invite.city}</p>}
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {invite.invited_by ? `${invite.invited_by} ${tr('invites you to join the parish space as a')} ` : `${tr('Join the parish space as a')} `}
              <b>{tr(invite.role === 'minister' ? 'minister' : invite.role === 'member' ? 'member' : invite.role)}</b>.
              {' '}{tr('There you will see its news, rosters and people.')}
            </p>
            {loading ? null : user ? (
              <button onClick={accept} disabled={busy} className="btn-primary w-full py-3 rounded-2xl font-semibold disabled:opacity-50">{tr('Accept and join')}</button>
            ) : (
              <div className="space-y-2">
                <Link to={`/signin?mode=signup&returnTo=${encodeURIComponent(here)}`} className="btn-primary block w-full py-3 rounded-2xl font-semibold">{tr('Create an account to join')}</Link>
                <Link to={`/signin?returnTo=${encodeURIComponent(here)}`} className="block w-full py-3 rounded-2xl font-semibold border" style={{ borderColor: 'var(--color-border)', ...text }}>{tr('I already have an account')}</Link>
                <p className="text-xs" style={muted}>{tr('Only CelestialWorship members can join a parish space.')}</p>
              </div>
            )}
            {invite.for_email && <p className="text-xs" style={muted}>{tr('This invitation is for one email address: use that address to join.')}</p>}
          </>
        )}
    </div>
  );
}
