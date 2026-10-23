import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, LogOut, Church, Gavel, Save, Settings } from 'lucide-react';
import { useProfile, MEMBER_TYPES, CHURCH_TITLE_SUGGESTIONS, MINISTRY_SUGGESTIONS, type MemberType, type MemberProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useParishes } from '../hooks/useParishes';
import { useStreak } from '../hooks/useProgress';
import { useT, setUILanguage } from '../i18n';
import { usePageTitle } from '../hooks/usePageTitle';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { AppSettings } from '../components/AppSettings';
import { ProfileMedia } from '../components/ProfileMedia';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="block text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>}
    </label>
  );
}

export default function Profile() {
  usePageTitle('profile', 'My profile');
  const navigate = useNavigate();
  const { user, signOut, canModerate } = useAuth();
  const { profile, save, syncing, requestVerification } = useProfile();
  const { parishes } = useParishes();
  const streak = useStreak();
  const { lang } = useT();

  const [draft, setDraft] = useState<MemberProfile>(profile);
  const [verifyDetails, setVerifyDetails] = useState('');
  useEffect(() => { setDraft(profile); }, [profile]);

  const update = (u: Partial<MemberProfile>) => setDraft(d => ({ ...d, ...u }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const needsVerification = MEMBER_TYPES[draft.memberType].needsVerification;

  const onSave = async () => {
    await save(draft);
    showToast(user ? 'Profile saved' : 'Saved on this device');
  };

  const onRequestVerification = async () => {
    try {
      await requestVerification(draft.memberType, verifyDetails);
      showToast('Request sent — the church will confirm your role');
      setVerifyDetails('');
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  const status = profile.verificationStatus;

  return (
    <div className="px-4 py-6 max-w-xl mx-auto pb-24 space-y-5">
      <ProfileMedia />
      <header className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-[Outfit] truncate" style={{ color: 'var(--color-text-primary)' }}>
            {[profile.churchTitle, profile.displayName].filter(Boolean).join(' ') || 'Your profile'}
          </h1>
          <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {MEMBER_TYPES[profile.memberType].label}{profile.parishName ? ` · ${profile.parishName}` : ''}
          </p>
          {user && <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border p-4" style={card}>
          <p className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>{streak.current}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>day streak</p>
        </div>
        <div className="rounded-2xl border p-4" style={card}>
          <p className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-accent-brand)' }}>{streak.best}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>best streak</p>
        </div>
      </div>

      {!user && (
        <div className="rounded-2xl border p-4" style={card}>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Your details are saved on this device. Create an account to back them up, join your parish, and share prayer requests and articles.
          </p>
          <div className="flex gap-2">
            <Link to="/signin?returnTo=/profile&mode=signup" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">Create account</Link>
            <Link to="/signin?returnTo=/profile" className="px-4 py-2 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>Sign in</Link>
          </div>
        </div>
      )}

      <section className="rounded-2xl border p-4 space-y-4" style={card}>
        <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Details</h2>
        <Field label="Name"><input value={draft.displayName} onChange={e => update({ displayName: e.target.value })} className={inputClass} style={inputStyle} autoComplete="name" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title in church">
            <input value={draft.churchTitle} onChange={e => update({ churchTitle: e.target.value })} list="titles" className={inputClass} style={inputStyle} />
            <datalist id="titles">{CHURCH_TITLE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Ministry">
            <input value={draft.ministry} onChange={e => update({ ministry: e.target.value })} list="ministry-list" className={inputClass} style={inputStyle} />
            <datalist id="ministry-list">{MINISTRY_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
          </Field>
        </div>
        <Field label="I serve as">
          <select value={draft.memberType} onChange={e => update({ memberType: e.target.value as MemberType })} className={inputClass} style={inputStyle}>
            {(Object.keys(MEMBER_TYPES) as MemberType[]).map(t => <option key={t} value={t}>{MEMBER_TYPES[t].label}</option>)}
          </select>
        </Field>
        <Field label="Parish">
          <select value={draft.parishId ?? ''} onChange={e => {
            const p = parishes.find(x => x.id === e.target.value);
            update({ parishId: p && !p.seed ? p.id : null, parishName: p?.name ?? draft.parishName, country: p?.country ?? draft.country });
          }} className={inputClass} style={inputStyle}>
            <option value="">{draft.parishName && !draft.parishId ? `${draft.parishName} (not in directory)` : 'Choose your parish'}</option>
            {parishes.filter(p => !p.seed).map(p => <option key={p.id} value={p.id}>{p.name}{p.city ? `, ${p.city}` : ''}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country"><input value={draft.country} onChange={e => update({ country: e.target.value })} className={inputClass} style={inputStyle} /></Field>
          <Field label="State / region"><input value={draft.stateRegion} onChange={e => update({ stateRegion: e.target.value })} className={inputClass} style={inputStyle} /></Field>
        </div>
        <Field label="Phone (optional)" hint="Only your parish admins see it, unless you choose to share it.">
          <input type="tel" value={draft.phone} onChange={e => update({ phone: e.target.value })} className={inputClass} style={inputStyle} autoComplete="tel" />
        </Field>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={draft.phonePublic} onChange={e => update({ phonePublic: e.target.checked })} />
          Show my phone number to other members
        </label>
        <Field label="Birthday (optional)"><input type="date" value={draft.birthday} onChange={e => update({ birthday: e.target.value })} className={inputClass} style={inputStyle} /></Field>
        <Field label="App language">
          <select value={lang} onChange={e => { setUILanguage(e.target.value as 'en' | 'yo'); update({ preferredLanguage: e.target.value as 'en' | 'yo' }); }}
                  className={inputClass} style={inputStyle}>
            <option value="en">English</option>
            <option value="yo">Yorùbá</option>
          </select>
        </Field>
        <button onClick={onSave} disabled={!dirty || syncing} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={16} /> {syncing ? 'Saving…' : 'Save changes'}
        </button>
      </section>

      {(needsVerification || profile.memberType === 'church_worker') && (
        <section className="rounded-2xl border p-4 space-y-3" style={card}>
          <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-accent-gold)' }} /> Confirm your role
          </h2>
          {status === 'verified' ? (
            <p className="text-sm" style={{ color: 'var(--color-success)' }}>Your role as {MEMBER_TYPES[profile.memberType].label.toLowerCase()} is confirmed.</p>
          ) : status === 'pending' && !dirty ? (
            <p className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
              <Clock size={15} /> Waiting for the church to confirm your role.
            </p>
          ) : !user ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Sign in, then ask the church to confirm your role.</p>
          ) : (
            <>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Tell the moderators how they can confirm you — e.g. your parish, your shepherd, the year you were anointed.
                {status === 'rejected' && ' Your last request was not approved; you can send more details.'}
              </p>
              <textarea value={verifyDetails} onChange={e => setVerifyDetails(e.target.value)} rows={3} className={inputClass} style={inputStyle}
                        placeholder="Details for the moderators" />
              <button onClick={onRequestVerification} disabled={verifyDetails.trim().length < 10}
                      className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Send request</button>
            </>
          )}
        </section>
      )}

      <AppSettings />

      <section className="rounded-2xl border p-4 space-y-2" style={card}>
        {profile.memberType === 'independent_shepherd' ? (
          <Link to="/directory?submit=1&kind=ministry" className="flex items-center gap-3 py-2" style={{ color: 'var(--color-text-primary)' }}>
            <Church size={18} style={{ color: 'var(--color-accent-brand)' }} />
            <span className="flex-1">
              <span className="block font-semibold text-sm">Register your ministry</span>
              <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>A page for your articles, livestreams, prayer requests and giving</span>
            </span>
          </Link>
        ) : (
          <Link to="/directory?submit=1" className="flex items-center gap-3 py-2" style={{ color: 'var(--color-text-primary)' }}>
            <Church size={18} style={{ color: 'var(--color-accent-brand)' }} />
            <span className="flex-1">
              <span className="block font-semibold text-sm">Register a parish</span>
              <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>Add your church to the directory</span>
            </span>
          </Link>
        )}
        <Link to="/parish-admin" className="flex items-center gap-3 py-2" style={{ color: 'var(--color-text-primary)' }}>
          <Settings size={18} style={{ color: 'var(--color-accent-brand)' }} />
          <span className="flex-1">
            <span className="block font-semibold text-sm">Manage my parish or ministry</span>
            <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>Events, prayer requests, giving, appointments, livestream</span>
          </span>
        </Link>
        {canModerate && (
          <Link to="/moderate" className="flex items-center gap-3 py-2" style={{ color: 'var(--color-text-primary)' }}>
            <Gavel size={18} style={{ color: 'var(--color-accent-gold)' }} />
            <span className="flex-1 font-semibold text-sm">Moderation queue</span>
          </Link>
        )}
        {user && (
          <button onClick={async () => { await signOut(); showToast('Signed out'); navigate('/'); }}
                  className="flex items-center gap-3 py-2 w-full text-left" style={{ color: 'var(--color-text-secondary)' }}>
            <LogOut size={18} /> <span className="font-semibold text-sm">Sign out</span>
          </button>
        )}
      </section>
    </div>
  );
}
