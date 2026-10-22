import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen, Music, ScrollText, Calendar, MonitorPlay, StickyNote, ListMusic, Bird, Bell, Download, Flame, ChevronRight,
  Share2, Image as ImageIcon, Radio, GraduationCap, HandHeart, CalendarDays, Heart,
} from 'lucide-react';
import { useLessons } from '../hooks/useLessons';
import { useHymns } from '../hooks/useHymns';
import { useServices } from '../hooks/useServices';
import { useParishes } from '../hooks/useParishes';
import { useFavoriteHymns } from '../hooks/useFavorites';
import { useReadingProgress, useStreak } from '../hooks/useProgress';
import { hasOnboarded } from '../hooks/useProfile';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useNotifications } from '../hooks/useNotifications';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { useT } from '../i18n';
import { getServiceScheduleForDate, formatDate, toISODate, formatServiceTime } from '../utils/dateUtils';
import { getLiturgicalExclamation, getLiturgicalSeason } from '../utils/liturgical';
import { churchObservances } from '../utils/churchCalendar';
import { getVerseOfTheDay } from '../data/dailyVerses';
import { getBibleVersion } from '../data/bibleVersions';
import { displayTitle } from '../utils/hymnText';
import { shareCard } from '../utils/shareCard';
import { isLiveNow } from '../components/LiveEmbed';
import { listEvents, type ChurchEvent } from '../lib/community';
import { showToast } from '../components/Toast';
import type { BibleLesson } from '../types';

const card = { backgroundColor: 'var(--color-bg-card)' };
const slug = (book: string) => book.toLowerCase().replace(/\s+/g, '-');

function SectionTitle({ children, to, more }: { children: React.ReactNode; to?: string; more?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="text-lg font-[Outfit] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{children}</h2>
      {to && <Link to={to} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{more ?? 'See all'}</Link>}
    </div>
  );
}

function ReadingsCard({ lessons, title }: { lessons: BibleLesson[]; title: string }) {
  const l = lessons[0];
  return (
    <Link to={`/lessons/${l.date}`} className="block p-4 rounded-2xl" style={card}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
        {l.occasion && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 15%, transparent)', color: 'var(--color-accent-gold)' }}>
            {l.occasion}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {l.firstLesson && <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}><span className="text-xs font-bold mr-2" style={{ color: 'var(--color-accent-brand)' }}>1st</span>{l.firstLesson.raw}</p>}
        {l.secondLesson && <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}><span className="text-xs font-bold mr-2" style={{ color: 'var(--color-accent-blue)' }}>2nd</span>{l.secondLesson.raw}</p>}
      </div>
    </Link>
  );
}

export default function Home() {
  usePageView('home');
  usePageTitle('home');
  const { t } = useT();
  const today = new Date();
  const todayIso = toISODate(today);

  const verse = useMemo(() => getVerseOfTheDay(today), [todayIso]);
  const exclamation = getLiturgicalExclamation(today);
  const season = getLiturgicalSeason(today);
  const schedule = getServiceScheduleForDate(today);

  const { lessons } = useLessons();
  const { hymns } = useHymns();
  const { services } = useServices();
  const { parishes } = useParishes();
  const { favorites } = useFavoriteHymns();
  const progress = useReadingProgress();
  const streak = useStreak();
  const { canPrompt, isInstalled, isIOS, install } = usePWAInstall();
  const notif = useNotifications();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [devotion, setDevotion] = useState<{ serviceId: string; step: number } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cw-devotion-state') || 'null');
      if (saved?.isStarted && Date.now() - saved.savedAt < 24 * 3_600_000) setDevotion({ serviceId: saved.selectedServiceId, step: saved.currentStep });
    } catch {}
  }, []);

  // Next few events: the Church's observances plus published parish events
  useEffect(() => {
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 60 * 86_400_000);
    const builtIn = [from.getFullYear(), to.getFullYear()].flatMap(y => churchObservances(y))
      .filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i)
      .filter(e => new Date(e.starts_at) >= from && new Date(e.starts_at) <= to);
    setEvents(builtIn);
    listEvents(from, to).then(db => setEvents([...builtIn, ...db].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))).catch(() => {});
  }, []);

  const hour = today.getHours();
  const greeting = hour >= 5 && hour < 12 ? t('home.morning') : hour < 17 && hour >= 12 ? t('home.afternoon') : hour >= 17 && hour < 21 ? t('home.evening') : t('home.night');

  const todayLessons = lessons.filter(l => l.date === todayIso);
  // On Saturdays, show Sunday's readings so people can prepare
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowLessons = today.getDay() === 6 ? lessons.filter(l => l.date === toISODate(tomorrow)) : [];

  const liveNow = parishes.filter(p => p.live_url && isLiveNow(p.live_now, p.live_updated_at));
  const lastHymn = hymns.find(h => h.number === Number(JSON.parse((() => { try { return localStorage.getItem('cw-recent-viewed-hymns') || '[]'; } catch { return '[]'; } })())[0]));
  const favoriteHymns = favorites.map(n => hymns.find(h => h.number === n)).filter(Boolean).slice(0, 6);
  const serviceName = (id: string) => services.find(s => s.id === id)?.displayName ?? id.replace(/_/g, ' ');

  if (!hasOnboarded()) return <Navigate to="/welcome" replace />;

  const shareVerseText = async () => {
    const text = `“${verse.text}” — ${verse.reference} (KJV)`;
    if (navigator.share) { try { await navigator.share({ title: verse.reference, text, url: `${window.location.origin}${verse.path}` }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); showToast('Verse copied'); } catch {}
  };
  const shareVerseImage = async () => {
    try { if ((await shareCard({ text: verse.text, reference: verse.reference, footer: 'KJV' })) === 'downloaded') showToast('Image saved'); }
    catch { showToast("Couldn't create the image"); }
  };

  const quickActions = [
    { label: 'Hymnal', icon: <Music size={22} />, path: '/hymns', desc: hymns.length ? `${hymns.length} hymns` : 'Hymns' },
    { label: 'Order of Service', icon: <ScrollText size={22} />, path: '/services', desc: services.length ? `${services.length} liturgies` : 'Liturgies' },
    { label: 'Devotion', icon: <Bird size={22} />, path: '/devotion', desc: 'Step by step' },
    { label: 'Prayer', icon: <HandHeart size={22} />, path: '/prayer-requests', desc: 'Pray together' },
    { label: 'Events', icon: <CalendarDays size={22} />, path: '/events', desc: 'Church calendar' },
    { label: 'Quizzes', icon: <GraduationCap size={22} />, path: '/quiz', desc: 'Learn & test' },
    { label: 'My Library', icon: <StickyNote size={22} />, path: '/notes', desc: 'Notes & prayers' },
    { label: 'Hymn Selector', icon: <ListMusic size={22} />, path: '/suggestions', desc: 'Plan hymns' },
    { label: 'Lessons', icon: <Calendar size={22} />, path: '/lessons', desc: 'Lectionary' },
    { label: 'Live Display', icon: <MonitorPlay size={22} />, path: '/control', desc: 'Projector' },
  ];

  return (
    <div className="px-4 py-6 pb-24 animate-fade-in space-y-7">
      {/* Greeting + verse */}
      <header className="rounded-2xl overflow-hidden" style={card}>
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-[Outfit] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              <span style={{ color: 'var(--color-accent-gold)' }}>{exclamation}!</span> {greeting}
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {formatDate(today)}{season.label ? ` · ${season.label}` : ''}
            </p>
          </div>
          <Link to="/profile" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 15%, transparent)', color: 'var(--color-accent-gold)' }}
                aria-label={`${streak.current} day streak`}>
            <Flame size={14} /> {streak.current}
          </Link>
        </div>
        <div className="mx-5 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        <Link to={verse.path} className="block px-5 pt-3 pb-2 group">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-accent-gold)' }}>{t('home.verseOfDay')}</p>
          <p className="leading-relaxed italic text-[15px]" style={{ color: 'var(--color-text-primary)' }}>“{verse.text}”</p>
          <p className="text-xs font-bold mt-2 tracking-wide" style={{ color: 'var(--color-accent-brand)' }}>— {verse.reference}</p>
        </Link>
        <div className="flex gap-1 px-4 pb-3">
          <button onClick={shareVerseText} className="p-2 rounded-lg" aria-label="Share verse" style={{ color: 'var(--color-text-muted)' }}><Share2 size={16} /></button>
          <button onClick={shareVerseImage} className="p-2 rounded-lg" aria-label="Share verse as an image" style={{ color: 'var(--color-text-muted)' }}><ImageIcon size={16} /></button>
        </div>
      </header>

      {liveNow.length > 0 && (
        <Link to="/live" className="flex items-center gap-3 p-4 rounded-2xl border-2" style={{ ...card, borderColor: '#EF4444' }}>
          <Radio size={20} style={{ color: '#EF4444' }} />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold" style={{ color: '#EF4444' }}>LIVE NOW</span>
            <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{liveNow.map(p => p.name).join(' · ')}</span>
          </span>
          <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
        </Link>
      )}

      {/* Continue */}
      {(progress.last || devotion || lastHymn) && (
        <section>
          <SectionTitle>{t('home.continue')}</SectionTitle>
          <div className="grid gap-2">
            {devotion && (
              <Link to={`/devotion?service=${devotion.serviceId}`} className="flex items-center gap-3 p-3 rounded-2xl" style={card}>
                <Bird size={20} style={{ color: 'var(--color-accent-brand)' }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{serviceName(devotion.serviceId)} — step {devotion.step + 1}</span>
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            )}
            {progress.last && (
              <Link to={`/bible/${slug(progress.last.book)}/${progress.last.chapter}?lang=${progress.last.versionId}`} className="flex items-center gap-3 p-3 rounded-2xl" style={card}>
                <BookOpen size={20} style={{ color: 'var(--color-accent-brand)' }} />
                <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {progress.last.book} {progress.last.chapter} <span style={{ color: 'var(--color-text-muted)' }}>· {getBibleVersion(progress.last.versionId).abbreviation}</span>
                </span>
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            )}
            {lastHymn && (
              <Link to={`/hymns/${lastHymn.number}`} className="flex items-center gap-3 p-3 rounded-2xl" style={card}>
                <Music size={20} style={{ color: 'var(--color-accent-brand)' }} />
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>Hymn {lastHymn.number} · {displayTitle(lastHymn, 'yo')}</span>
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Today's services */}
      <section>
        <SectionTitle to="/services" more="All services">{t('home.todaysServices')}</SectionTitle>
        <div className="p-3 space-y-2 rounded-2xl" style={card}>
          {schedule.map(s => (
            <Link key={s.id} to={`/services/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
              <span className="text-lg w-7 text-center" aria-hidden>{s.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{serviceName(s.id)}</span>
                <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatServiceTime(s.hour, s.minute)}</span>
              </span>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          ))}
          <Link to="/devotion" className="btn-primary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 font-semibold">
            {t('home.startDevotion')} →
          </Link>
        </div>
      </section>

      {(todayLessons.length > 0 || tomorrowLessons.length > 0) && (
        <section className="space-y-2">
          <SectionTitle to="/lessons" more="Calendar">Bible lessons</SectionTitle>
          {todayLessons.length > 0 && <ReadingsCard lessons={todayLessons} title="Today’s readings" />}
          {tomorrowLessons.length > 0 && <ReadingsCard lessons={tomorrowLessons} title="Prepare for Sunday" />}
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionTitle to="/events">{t('home.upcoming')}</SectionTitle>
          <ul className="space-y-2">
            {events.slice(0, 4).map(e => (
              <li key={e.id}>
                <Link to="/events" className="flex items-center gap-3 p-3 rounded-2xl" style={card}>
                  <span className="w-12 text-center shrink-0">
                    <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>{new Date(e.starts_at).toLocaleDateString('en-GB', { month: 'short' })}</span>
                    <span className="block text-xl font-black font-[Outfit] leading-none" style={{ color: 'var(--color-text-primary)' }}>{new Date(e.starts_at).getDate()}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{e.title}</span>
                    <span className="block text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{e.location ?? (e.builtIn ? 'Whole Church' : '')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {favoriteHymns.length > 0 && (
        <section>
          <SectionTitle to="/hymns?fav=1">Favourite hymns</SectionTitle>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {favoriteHymns.map(h => h && (
              <Link key={h.number} to={`/hymns/${h.number}`} className="shrink-0 w-40 p-3 rounded-2xl" style={card}>
                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-accent-gold)' }}><Heart size={11} fill="currentColor" /> {h.number}</span>
                <span className="block text-sm font-semibold mt-1 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>{displayTitle(h, 'yo')}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {notif.isSupported && notif.permission === 'default' && (
        <div className="p-4 flex items-center justify-between gap-3 rounded-2xl" style={card}>
          <div className="flex items-center gap-3">
            <Bell size={22} style={{ color: 'var(--color-accent-gold)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Service reminders</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Before each service, and a morning call to devotion</p>
            </div>
          </div>
          <button onClick={notif.requestPermission} className="btn-primary px-4 py-2 rounded-lg text-xs font-bold">Turn on</button>
        </div>
      )}

      <section>
        <SectionTitle>{t('home.quickActions')}</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map(a => (
            <Link key={a.path} to={a.path} className="p-4 flex flex-col items-center justify-center text-center group rounded-2xl" style={card}>
              <span className="mb-2 group-hover:scale-110 transition-transform" style={{ color: 'var(--color-accent-brand)' }}>{a.icon}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{a.label}</span>
              <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.desc}</span>
            </Link>
          ))}
          {!isInstalled && (
            <button onClick={canPrompt ? install : undefined} className="p-4 flex flex-col items-center justify-center text-center rounded-2xl" style={card}>
              <span className="mb-2" style={{ color: 'var(--color-accent-brand)' }}><Download size={22} /></span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Install App</span>
              <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {canPrompt ? 'Tap to install' : isIOS ? 'Share → Add to Home Screen' : 'Browser menu → Install'}
              </span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
