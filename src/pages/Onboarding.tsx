import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Music, BookOpen, Bird, WifiOff, Search, Check, Bell, ChevronLeft, ShieldCheck } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { useT, setUILanguage, contentDefaults, UI_LANGUAGES, type UILanguage, tr } from '../i18n';
import { useProfile, MEMBER_TYPES, CHURCH_TITLE_SUGGESTIONS, MINISTRY_SUGGESTIONS, type MemberType, type MemberProfile } from '../hooks/useProfile';
import { useParishes, parishLabel } from '../hooks/useParishes';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import { BIBLE_VERSIONS } from '../data/bibleVersions';

const STEPS = ['welcome', 'language', 'about', 'parish', 'reminders', 'account'] as const;
type Step = typeof STEPS[number];

const inputClass = 'w-full rounded-xl px-3 py-3 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

function Choice({ selected, onClick, title, subtitle }: { selected: boolean; onClick: () => void; title: string; subtitle?: string }) {
  return (
    <button onClick={onClick} aria-pressed={selected}
            className="w-full text-left p-4 rounded-2xl border-2 transition-colors flex items-center gap-3"
            style={{
              backgroundColor: selected ? 'color-mix(in srgb, var(--color-accent-brand) 10%, transparent)' : 'var(--color-bg-card)',
              borderColor: selected ? 'var(--color-accent-brand)' : 'var(--color-border)',
            }}>
      <span className="flex-1">
        <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
        {subtitle && <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{subtitle}</span>}
      </span>
      {selected && <Check size={18} style={{ color: 'var(--color-accent-brand)' }} />}
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t, lang } = useT();
  const { profile, save } = useProfile();
  const { user } = useAuth();
  const { parishes } = useParishes();
  const notifications = useNotifications();

  const [step, setStep] = useState<Step>(() => (STEPS.includes(params.get('step') as Step) ? params.get('step') as Step : 'welcome'));
  const [draft, setDraft] = useState<MemberProfile>(profile);
  const [parishQuery, setParishQuery] = useState('');
  const [hymnView, setHymnView] = useState<'yo' | 'both' | 'en'>(() => {
    try { return (localStorage.getItem('cw-hymn-view') as 'yo' | 'both' | 'en') || contentDefaults().hymnView; } catch { return 'yo'; }
  });
  const [bibleVersion, setBibleVersion] = useState(() => {
    try { return localStorage.getItem('cw-bible-version') || contentDefaults().bibleVersion; } catch { return 'en'; }
  });

  const index = STEPS.indexOf(step);
  const update = (u: Partial<MemberProfile>) => setDraft(d => ({ ...d, ...u }));

  const matchingParishes = useMemo(() => {
    const q = parishQuery.trim().toLowerCase();
    if (!q) return parishes.slice(0, 8);
    return parishes.filter(p => parishLabel(p).toLowerCase().includes(q)).slice(0, 12);
  }, [parishes, parishQuery]);

  const next = async () => {
    if (step === 'language') {
      try {
        localStorage.setItem('cw-hymn-view', hymnView);
        localStorage.setItem('cw-bible-version', bibleVersion);
      } catch {}
    }
    if (index < STEPS.length - 1) {
      await save({ ...draft });
      setStep(STEPS[index + 1]);
      window.scrollTo(0, 0);
    } else {
      await finish();
    }
  };

  const finish = async () => {
    await save({ ...draft, onboardedAt: new Date().toISOString() });
    // Shepherds and administrators go straight on to claim their parish
    const leads = draft.memberType === 'shepherd' || draft.memberType === 'church_admin';
    navigate(params.get('next') || (leads && draft.parishName ? '/profile?claim=1' : '/'), { replace: true });
  };

  const chooseLanguage = (l: UILanguage) => {
    setUILanguage(l);
    update({ preferredLanguage: l });
    // Hymns and the Bible start in the same language; they can be changed on their own
    setHymnView(contentDefaults(l).hymnView);
    setBibleVersion(contentDefaults(l).bibleVersion);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Progress */}
      {step !== 'welcome' && (
        <div className="flex items-center gap-3 px-4 pt-4">
          <button onClick={() => setStep(STEPS[index - 1])} aria-label={t('common.back')} className="p-1" style={{ color: 'var(--color-text-secondary)' }}>
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(index / (STEPS.length - 1)) * 100}%`, backgroundColor: 'var(--color-accent-brand)' }} />
          </div>
          <button onClick={finish} className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>{t('common.skip')}</button>
        </div>
      )}

      <div className="flex-1 w-full max-w-md mx-auto px-5 py-6 flex flex-col">
        {step === 'welcome' && (
          <div className="flex-1 flex flex-col justify-center text-center animate-fade-in">
            <img src={logoUrl} alt="" className="w-24 h-24 mx-auto rounded-3xl shadow-lg mb-6" />
            <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: 'var(--color-accent-gold)' }}>{tr('Halleluyah!')}</p>
            <h1 className="text-3xl font-bold font-[Outfit] mt-2" style={{ color: 'var(--color-text-primary)' }}>{t('onboarding.welcomeTitle')}</h1>
            <p className="mt-3 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{t('onboarding.welcomeBody')}</p>
            <div className="grid grid-cols-2 gap-3 mt-8 text-left">
              {[
                { icon: <Music size={20} />, label: 'The CCC Hymnal' },
                { icon: <BookOpen size={20} />, label: 'KJV, Bibeli Mimọ and Louis Segond' },
                { icon: <Bird size={20} />, label: 'Daily devotion' },
                { icon: <WifiOff size={20} />, label: 'Works offline' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-2xl flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
                  <span style={{ color: 'var(--color-accent-brand)' }}>{f.icon}</span>{tr(f.label)}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {UI_LANGUAGES.map(({ id: l, name }) => (
                <button key={l} onClick={() => chooseLanguage(l)} aria-pressed={lang === l}
                        className="px-4 py-1.5 rounded-full text-sm font-semibold border"
                        style={lang === l ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                                          : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'language' && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{t('onboarding.languageTitle')}</h1>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('App language')}</p>
              <div className="grid grid-cols-2 gap-2">
                {UI_LANGUAGES.map(l => (
                  <Choice key={l.id} selected={lang === l.id} onClick={() => chooseLanguage(l.id)} title={l.name} subtitle={l.beta ? tr('Being translated — English fills the gaps') : l.english} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Hymn lyrics')}</p>
              <div className="space-y-2">
                <Choice selected={hymnView === 'yo'} onClick={() => setHymnView('yo')} title={tr('Yorùbá')} subtitle={tr('As sung in the hymnal')} />
                <Choice selected={hymnView === 'both'} onClick={() => setHymnView('both')} title={tr('Yorùbá and English')} subtitle={tr('Side by side')} />
                <Choice selected={hymnView === 'en'} onClick={() => setHymnView('en')} title={tr('English')} subtitle={tr('The hymnal\'s English translation')} />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Bible')}</p>
              <div className="space-y-2">
                {BIBLE_VERSIONS.map(v => (
                  <Choice key={v.id} selected={bibleVersion === v.id} onClick={() => setBibleVersion(v.id)}
                          title={`${v.abbreviation}${v.id === 'en' ? ' (recommended)' : ''}`} subtitle={v.preview ? `${v.name} — preview, part of the Bible` : v.name} />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'about' && (
          <div className="space-y-5 animate-fade-in">
            <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{t('onboarding.aboutTitle')}</h1>
            <label className="block">
              <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{tr('Your name')}</span>
              <input value={draft.displayName} onChange={e => update({ displayName: e.target.value })} placeholder={tr('e.g. Sister Funke Adeyemi')}
                     className={`${inputClass} mt-1`} style={inputStyle} autoComplete="name" />
            </label>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{tr('How do you serve?')}</span>
              <div className="space-y-2 mt-1">
                {(Object.keys(MEMBER_TYPES) as MemberType[]).map(type => (
                  <Choice key={type} selected={draft.memberType === type} onClick={() => update({ memberType: type })}
                          title={lang === 'yo' ? `${MEMBER_TYPES[type].yoruba} · ${MEMBER_TYPES[type].label}` : MEMBER_TYPES[type].label}
                          subtitle={MEMBER_TYPES[type].description} />
                ))}
              </div>
              {MEMBER_TYPES[draft.memberType].needsVerification && (
                <p className="text-xs mt-2 flex gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
                  <ShieldCheck size={16} className="shrink-0" style={{ color: 'var(--color-accent-gold)' }} />{tr('After you create an account, the church confirms this role before parish tools (events, giving details, prayer requests for your parish) unlock.')}</p>
              )}
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{tr('Title in church (optional)')}</span>
              <input value={draft.churchTitle} onChange={e => update({ churchTitle: e.target.value })} list="church-titles"
                     placeholder={tr('e.g. Brother, Sister, Leader, Senior Elder')} className={`${inputClass} mt-1`} style={inputStyle} />
              <datalist id="church-titles">{CHURCH_TITLE_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
            </label>
            {draft.memberType !== 'laity' && (
              <label className="block">
                <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{tr('Ministry or department (optional)')}</span>
                <input value={draft.ministry} onChange={e => update({ ministry: e.target.value })} list="ministries"
                       placeholder={tr('e.g. Choir, Ushering, Prayer band')} className={`${inputClass} mt-1`} style={inputStyle} />
                <datalist id="ministries">{MINISTRY_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
              </label>
            )}
            <label className="block">
              <span className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{tr('Birthday (optional)')}</span>
              <input type="date" value={draft.birthday} onChange={e => update({ birthday: e.target.value })}
                     className={`${inputClass} mt-1`} style={inputStyle} />
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('For a birthday blessing and the birthday thanksgiving service.')}</span>
            </label>
          </div>
        )}

        {step === 'parish' && (
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{t('onboarding.parishTitle')}</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Choose your parish to see its events and service times. You can change this any time.')}</p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input value={parishQuery} onChange={e => setParishQuery(e.target.value)} placeholder={tr('Search by parish, town or country')}
                     className={`${inputClass} pl-9`} style={inputStyle} />
            </div>
            <div className="space-y-2">
              {matchingParishes.map(p => (
                <Choice key={p.id} selected={draft.parishId === p.id}
                        onClick={() => update({ parishId: p.seed ? null : p.id, parishName: p.name, country: p.country, stateRegion: p.state_region ?? '' })}
                        title={p.name} subtitle={[p.city, p.state_region, p.country].filter(Boolean).join(', ')} />
              ))}
            </div>
            <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Parish not listed?')}</p>
              <input value={draft.parishId ? '' : draft.parishName} onChange={e => update({ parishId: null, parishName: e.target.value })}
                     placeholder={tr('Type your parish name')} className={inputClass} style={inputStyle} />
              <div className="grid grid-cols-2 gap-2">
                <input value={draft.country} onChange={e => update({ country: e.target.value })} placeholder={tr('Country')} className={inputClass} style={inputStyle} autoComplete="country-name" />
                <input value={draft.stateRegion} onChange={e => update({ stateRegion: e.target.value })} placeholder={tr('State / region')} className={inputClass} style={inputStyle} />
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Shepherds and church admins can add their parish to the directory from')}{' '}<span className="font-semibold">{tr('Parishes → Add a parish')}</span>.
              </p>
            </div>
          </div>
        )}

        {step === 'reminders' && (
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{t('onboarding.remindersTitle')}</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Get a gentle reminder before services and a morning call to devotion.')}</p>
            {notifications.isSupported ? (
              notifications.permission === 'granted' ? (
                <div className="space-y-2">
                  <Choice selected={notifications.prefs.serviceReminders} onClick={notifications.toggleServiceReminders} title={tr('Service reminders')} subtitle={tr('30 and 10 minutes before each service')} />
                  <Choice selected={notifications.prefs.devotionReminders} onClick={notifications.toggleDevotionReminders} title={tr('Morning devotion')} subtitle={tr('Every day at 7:00 AM')} />
                </div>
              ) : notifications.permission === 'denied' ? (
                <p className="text-sm p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>{tr('Notifications are blocked for this site. You can allow them later in your browser settings.')}</p>
              ) : (
                <button onClick={notifications.requestPermission} className="btn-primary w-full py-3 rounded-2xl font-semibold inline-flex items-center justify-center gap-2">
                  <Bell size={18} />{' '}{tr('Turn on reminders')}</button>
              )
            ) : (
              <p className="text-sm p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>{tr('This browser can’t show reminders. Installing the app to your home screen usually enables them.')}</p>
            )}
          </div>
        )}

        {step === 'account' && (
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{t('onboarding.accountTitle')}</h1>
            {user ? (
              <p className="text-sm p-4 rounded-2xl flex gap-2" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
                <Check size={18} style={{ color: 'var(--color-success)' }} />{' '}{tr('Signed in as')}{' '}{user.email}{tr('. Your details are saved to your account.')}</p>
            ) : (
              <>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr('An account is optional. It lets you back up your notes and prayers, share prayer requests and articles, join your parish\'s events, and confirm a shepherd or church admin role.')}</p>
                <Link to="/signin?returnTo=/welcome?step=account&mode=signup" className="btn-primary w-full py-3 rounded-2xl font-semibold text-center block">{tr('Create an account')}</Link>
                <Link to="/signin?returnTo=/welcome?step=account" className="w-full py-3 rounded-2xl font-semibold text-center block border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('I already have one')}</Link>
                <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>{tr('Without an account, everything stays on this device.')}</p>
              </>
            )}
          </div>
        )}

        <div className="mt-auto pt-8">
          <button onClick={next} className="btn-primary w-full py-3.5 rounded-2xl text-base font-bold">
            {step === 'welcome' ? t('onboarding.getStarted') : step === 'account' ? t('onboarding.finish') : t('common.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
