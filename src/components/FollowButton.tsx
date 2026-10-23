import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isFollowing, setFollowing } from '../lib/live';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';

/** Follow a parish or ministry: its broadcasts come first on Live, and you're told when it goes live */
export function FollowButton({ parishId, name }: { parishId: string; name: string }) {
  const { user } = useAuth();
  const [on, setOn] = useState(false);
  useEffect(() => { if (user) isFollowing(parishId).then(setOn).catch(() => {}); }, [user, parishId]);
  const toggle = async () => {
    if (!user) { showToast('Sign in to follow'); return; }
    try {
      await setFollowing(parishId, !on);
      setOn(!on);
      showToast(on ? `You no longer follow ${name}` : `You’ll be told when ${name} goes live`);
    } catch (e) {
      showToast(errorMessage(e));
    }
  };
  return (
    <button onClick={toggle} aria-pressed={on} className="h-9 px-4 rounded-full text-sm font-semibold inline-flex items-center gap-1.5"
            style={on ? { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' } : { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}>
      {on ? <BellRing size={15} /> : <Bell size={15} />} {on ? 'Following' : 'Follow'}
    </button>
  );
}
