import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HandHeart, Plus, Check, Clock, Trash2, Flag, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDraft } from '../hooks/useDraft';
import { recordActivity } from '../hooks/useProgress';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  listPrayerRequests, submitPrayerRequest, prayForRequest, markRequestAnswered, deletePrayerRequest, reportContent,
  type SharedPrayerRequest, type PrayerVisibility,
} from '../lib/community';
import { PRAYER_CATEGORY_LABELS, type PrayerCategory } from '../types/notes';
import { SignInPrompt, ErrorState, type Loadable } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const PRAYED_KEY = 'cw-prayed-requests';

const timeAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

interface RequestDraft { title: string; body: string; category: PrayerCategory | ''; isAnonymous: boolean; visibility: PrayerVisibility }

export default function PrayerRequests() {
  usePageTitle('prayer_requests', 'Prayer requests');
  const { user } = useAuth();
  const { profile } = useProfile();
  const [tab, setTab] = useState<'wall' | 'mine'>('wall');
  const [state, setState] = useState<Loadable<SharedPrayerRequest[]>>({ status: 'loading' });
  const [composing, setComposing] = useState(false);
  const [answering, setAnswering] = useState<string | null>(null);
  const [testimony, setTestimony] = useState('');
  const [prayed, setPrayed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PRAYED_KEY) || '[]'); } catch { return []; }
  });
  const draft = useDraft<RequestDraft>('prayer-request:new', { title: '', body: '', category: '', isAnonymous: false, visibility: 'church' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await listPrayerRequests({ mine: tab === 'mine' }) });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'mine' && !user) { setState({ status: 'ready', data: [] }); return; }
    load();
  }, [load, tab, user]);

  const submit = async () => {
    const v = draft.value;
    if (v.title.trim().length < 3) return;
    try {
      await submitPrayerRequest({
        title: v.title, body: v.body, category: v.category || undefined, isAnonymous: v.isAnonymous,
        visibility: v.visibility, parishId: profile.parishId,
      });
      draft.clear();
      setComposing(false);
      showToast('Sent — it will appear once a moderator has seen it');
      if (tab === 'mine') load();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const pray = async (r: SharedPrayerRequest) => {
    if (!user) { showToast('Sign in to let them know you prayed'); return; }
    try {
      await prayForRequest(r.id);
      const next = [...new Set([...prayed, r.id])];
      setPrayed(next);
      try { localStorage.setItem(PRAYED_KEY, JSON.stringify(next)); } catch {}
      recordActivity('prayer');
      if (state.status === 'ready' && !prayed.includes(r.id)) {
        setState({ status: 'ready', data: state.data.map(x => (x.id === r.id ? { ...x, prayer_count: x.prayer_count + 1 } : x)) });
      }
      showToast('Amen');
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const report = async (r: SharedPrayerRequest) => {
    const reason = prompt('What is wrong with this request?');
    if (!reason?.trim()) return;
    try { await reportContent('prayer_request', r.id, reason.trim()); showToast('Thank you — a moderator will look at it'); }
    catch (e) { showToast(errorMessage(e)); }
  };

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>Prayer requests</h1>
        {user && (
          <button onClick={() => setComposing(c => !c)} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
            <Plus size={16} /> Request
          </button>
        )}
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
        “Pray one for another” — James 5:16. For a private record, use your{' '}
        <Link to="/notes?tab=prayers" className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>prayer journal</Link>.
      </p>

      {!user && <div className="mb-5"><SignInPrompt message="Sign in to ask the church to pray with you, or to tell others you prayed." /></div>}

      {composing && user && (
        <div className="rounded-2xl border p-4 mb-5 space-y-3" style={card}>
          <input value={draft.value.title} onChange={e => draft.setValue({ title: e.target.value })} maxLength={140}
                 placeholder="What should we pray for?" className={inputClass} style={inputStyle} />
          <textarea value={draft.value.body} onChange={e => draft.setValue({ body: e.target.value })} rows={4} maxLength={2000}
                    placeholder="Share as much or as little as you like" className={inputClass} style={inputStyle} />
          <div className="grid grid-cols-2 gap-2">
            <select value={draft.value.category} onChange={e => draft.setValue({ category: e.target.value as PrayerCategory | '' })}
                    className={inputClass} style={inputStyle} aria-label="Category">
              <option value="">Category</option>
              {(Object.keys(PRAYER_CATEGORY_LABELS) as PrayerCategory[]).map(c => <option key={c} value={c}>{PRAYER_CATEGORY_LABELS[c]}</option>)}
            </select>
            <select value={draft.value.visibility} onChange={e => draft.setValue({ visibility: e.target.value as PrayerVisibility })}
                    className={inputClass} style={inputStyle} aria-label="Who can see it">
              <option value="church">Everyone in the app</option>
              <option value="parish" disabled={!profile.parishId}>My parish only</option>
              <option value="shepherd" disabled={!profile.parishId}>My shepherd only</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={draft.value.isAnonymous} onChange={e => draft.setValue({ isAnonymous: e.target.checked })} />
            Don’t show my name
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setComposing(false)} className="px-4 py-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Later</button>
            <button onClick={submit} disabled={draft.value.title.trim().length < 3} className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Send</button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Requests are checked by a moderator before others see them. Your draft is kept on this device.</p>
        </div>
      )}

      <div className="flex rounded-xl p-0.5 border mb-4 w-fit" style={card}>
        {(['wall', 'mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                  style={tab === t ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
            {t === 'wall' ? 'Pray for others' : 'My requests'}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={load} />}
      {state.status === 'ready' && state.data.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          <HandHeart size={28} className="mx-auto mb-3 opacity-60" />
          <p className="text-sm">{tab === 'mine' ? 'You haven’t shared a request yet.' : 'No requests right now.'}</p>
        </div>
      )}
      {state.status === 'ready' && state.data.length > 0 && (
        <ul className="space-y-3">
          {state.data.map(r => {
            const mine = r.user_id === user?.id;
            const hasPrayed = prayed.includes(r.id);
            return (
              <li key={r.id} className="rounded-2xl border p-4" style={card}>
                {r.status === 'answered' && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold mb-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' }}>
                    <Sparkles size={11} /> Answered
                  </span>
                )}
                {mine && r.status === 'pending' && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock size={11} /> Waiting for a moderator
                  </span>
                )}
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.title}</p>
                {r.body && <p className="text-sm mt-1 whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{r.body}</p>}
                {r.testimony && (
                  <p className="text-sm mt-2 p-3 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 10%, transparent)', color: 'var(--color-text-primary)' }}>
                    <span className="font-semibold">Testimony: </span>{r.testimony}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{r.is_anonymous ? 'A Celestian' : r.display_name ?? 'A Celestian'} · {timeAgo(r.created_at)}</span>
                  {r.category && <span>{PRAYER_CATEGORY_LABELS[r.category as PrayerCategory] ?? r.category}</span>}
                  {r.visibility !== 'church' && <span>{r.visibility === 'parish' ? 'Parish' : 'Shepherd'}</span>}
                  <span className="ml-auto flex items-center gap-3">
                    {r.status !== 'pending' && (
                      <button onClick={() => pray(r)} className="inline-flex items-center gap-1 font-semibold px-3 py-1.5 rounded-lg"
                              style={hasPrayed
                                ? { backgroundColor: 'color-mix(in srgb, var(--color-accent-brand) 15%, transparent)', color: 'var(--color-accent-brand)' }
                                : { backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                        <HandHeart size={14} /> {hasPrayed ? 'Prayed' : 'I prayed'} · {r.prayer_count}
                      </button>
                    )}
                    {!mine && user && <button onClick={() => report(r)} aria-label="Report"><Flag size={13} /></button>}
                  </span>
                </div>
                {mine && (
                  <div className="flex gap-3 mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--color-border)' }}>
                    {r.status !== 'answered' && (
                      answering === r.id ? (
                        <div className="flex-1 space-y-2">
                          <textarea value={testimony} onChange={e => setTestimony(e.target.value)} rows={2} className={inputClass} style={inputStyle}
                                    placeholder="Share how God answered (optional)" />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setAnswering(null)} className="px-3" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
                            <button onClick={async () => {
                              try { await markRequestAnswered(r.id, testimony); setAnswering(null); showToast('Praise God!'); load(); }
                              catch (e) { showToast(errorMessage(e)); }
                            }} className="btn-primary px-3 py-1.5 rounded-lg font-semibold">Mark answered</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setAnswering(r.id); setTestimony(''); }} className="inline-flex items-center gap-1 font-semibold"
                                style={{ color: 'var(--color-success)' }}><Check size={13} /> It was answered</button>
                      )
                    )}
                    {answering !== r.id && (
                      <button onClick={async () => {
                        if (!confirm('Delete this request?')) return;
                        try { await deletePrayerRequest(r.id); load(); } catch (e) { showToast(errorMessage(e)); }
                      }} className="inline-flex items-center gap-1 ml-auto" style={{ color: 'var(--color-text-muted)' }}><Trash2 size={13} /> Delete</button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
