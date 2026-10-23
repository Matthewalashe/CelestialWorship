import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Music, Bird, ChevronRight, Share2, Radio } from 'lucide-react';
import { useLessons } from '../hooks/useLessons';
import { useHymns } from '../hooks/useHymns';
import { useServices } from '../hooks/useServices';
import { useParishes } from '../hooks/useParishes';
import { useReadingProgress } from '../hooks/useProgress';
import { hasOnboarded } from '../hooks/useProfile';
import { usePageView } from '../hooks/useAnalytics';
import { usePageTitle } from '../hooks/usePageTitle';
import { useT, tr } from '../i18n';
import { getServiceScheduleForDate, formatDate, toISODate, formatServiceTime } from '../utils/dateUtils';
import { getLiturgicalExclamation, getLiturgicalSeason } from '../utils/liturgical';
import { churchObservances } from '../utils/churchCalendar';
import { getVerseOfTheDay } from '../data/dailyVerses';
import { getBibleVersion } from '../data/bibleVersions';
import { displayTitle } from '../utils/hymnText';
import { isLiveNow } from '../components/LiveEmbed';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { InstallBanner } from '../components/InstallBanner';
import { listEvents, type ChurchEvent } from '../lib/community';
import type { BibleLesson } from '../types';

const card = { backgroundColor: 'var(--color-bg-card)' };
const slug = (book: string) => book.toLowerCase().replace(/\s+/g, '-');

function SectionTitle({ children, to, more }: { children: React.ReactNode; to?: string; more?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="text-lg font-[Outfit] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{children}</h2>
      {to && <Link to={to} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{more ?? tr('See all')}</Link>}
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
        {l.firstLesson && <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}><span className="text-xs font-bold mr-2" style={{ color: 'var(--color-accent-brand)' }}>{tr('1st')}</span>{l.firstLesson.raw}</p>}
        {l.secondLesson && <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}><span className="text-xs font-bold mr-2" style={{ color: 'var(--color-accent-blue)' }}>{tr('2nd')}</span>{l.secondLesson.raw}</p>}
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

  const verse = useMemo(() => getVerseOfTheDay(new Date(`${todayIso}T12:00:00`)), [todayIso]);
  const exclamation = getLiturgicalExclamation(today);
  const season = getLiturgicalSeason(today);
  const schedule = getServiceScheduleForDate(today);

  const { lessons } = useLessons();
  const { hymns } = useHymns();
  const { services } = useServices();
  const { parishes } = useParishes();
  const progress = useReadingProgress();
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
  const serviceName = (id: string) => services.find(s => s.id === id)?.displayName ?? id.replace(/_/g, ' ');

  if (!hasOnboarded()) return <Navigate to="/welcome" replace />;

  const shareVerse = async () => {
    const text = `“${verse.text}” — ${verse.reference} (KJV)`;
    if (navigator.share) { try { await navigator.share({ title: verse.reference, text, url: `${window.location.origin}${verse.path}` }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  // One thing to pick up again: an unfinished devotion, else the last chapter, else the last hymn
  const resume = devotion
    ? { to: `/devotion?service=${devotion.serviceId}`, icon: <Bird size={18} />, text: `${serviceName(devotion.serviceId)} — step ${devotion.step + 1}` }
    : progress.last
      ? { to: `/bible/${slug(progress.last.book)}/${progress.last.chapter}?lang=${progress.last.versionId}`, icon: <BookOpen size={18} />, text: `${progress.last.book} ${progress.last.chapter} · ${getBibleVersion(progress.last.versionId).abbreviation}` }
      : lastHymn
        ? { to: `/hymns/${lastHymn.number}`, icon: <Music size={18} />, text: `Hymn ${lastHymn.number} · ${displayTitle(lastHymn, 'yo')}` }
        : null;

  return (
    <div className="px-4 py-6 pb-24 space-y-8 max-w-2xl mx-auto">
      {/* Greeting */}
      <header>
        <div className="flex justify-end mb-3"><LanguageSwitch /></div>
        <h1 className="text-2xl font-[Outfit] font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
          <span style={{ color: 'var(--color-accent-gold)' }}>{exclamation}!</span> {greeting}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {formatDate(today)}{season.label ? ` · ${season.label}` : ''}
        </p>
      </header>

      <InstallBanner />

      {/* Verse of the day */}
      <section aria-labelledby="votd">
        <div className="flex items-center justify-between mb-2">
          <h2 id="votd" className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{t('home.verseOfDay')}</h2>
          <button onClick={shareVerse} className="p-1.5 -m-1.5 rounded-lg" aria-label={tr('Share the verse')} style={{ color: 'var(--color-text-muted)' }}><Share2 size={16} /></button>
        </div>
        <Link to={verse.path} className="block">
          <p className="text-lg leading-relaxed" style={{ color: 'var(--color-text-primary)', fontFamily: "Literata, Georgia, serif" }}>“{tr(verse.text)}”</p>
          <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-text-secondary)' }}>{verse.reference}</p>
        </Link>
      </section>

      {liveNow.length > 0 && (
        <Link to="/live" className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ ...card, borderColor: '#EF4444' }}>
          <Radio size={18} style={{ color: '#EF4444' }} />
          <span className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--color-text-primary)' }}><b style={{ color: '#EF4444' }}>{tr('Live')}</b> · {liveNow.map(p => p.name).join(' · ')}</span>
          <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
        </Link>
      )}

      {/* Today: services and devotion */}
      <section>
        <SectionTitle to="/services" more={tr('All services')}>{t('home.todaysServices')}</SectionTitle>
        <div className="rounded-2xl overflow-hidden" style={card}>
          {schedule.map((s, i) => (
            <Link key={s.id} to={`/services/${s.id}`} className="flex items-center gap-3 px-4 py-3" style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{serviceName(s.id)}</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatServiceTime(s.hour, s.minute)}</span>
              <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          ))}
        </div>
        <Link to={resume?.to.startsWith('/devotion') ? resume.to : '/devotion'} className="btn-primary mt-3 w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 font-semibold">
          <Bird size={18} /> {devotion ? tr('Continue devotion') : t('home.startDevotion')}
        </Link>
        {resume && !devotion && (
          <Link to={resume.to} className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={card}>
            <span style={{ color: 'var(--color-text-muted)' }}>{resume.icon}</span>
            <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}><span style={{ color: 'var(--color-text-muted)' }}>{t('home.continue')}: </span>{tr(resume.text)}</span>
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
          </Link>
        )}
      </section>

      {(todayLessons.length > 0 || tomorrowLessons.length > 0) && (
        <section className="space-y-2">
          <SectionTitle to="/lessons" more={tr('Calendar')}>{tr('Bible lessons')}</SectionTitle>
          {todayLessons.length > 0 && <ReadingsCard lessons={todayLessons} title={tr('Today’s readings')} />}
          {tomorrowLessons.length > 0 && <ReadingsCard lessons={tomorrowLessons} title={tr('Prepare for Sunday')} />}
        </section>
      )}

      {events.length > 0 && (
        <section>
          <SectionTitle to="/events">{t('home.upcoming')}</SectionTitle>
          <ul className="rounded-2xl overflow-hidden" style={card}>
            {events.slice(0, 3).map((e, i) => (
              <li key={e.id} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
                <Link to="/events" className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 text-center shrink-0">
                    <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>{new Date(e.starts_at).toLocaleDateString('en-GB', { month: 'short' })}</span>
                    <span className="block text-lg font-bold font-[Outfit] leading-none" style={{ color: 'var(--color-text-primary)' }}>{new Date(e.starts_at).getDate()}</span>
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(e.title)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
