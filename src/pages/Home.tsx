import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookOpen, Music, Bird, ChevronRight, Share2, Radio, Clock } from 'lucide-react';
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
import { myDuties, type MyDuty } from '../lib/parishSpace';
import { useAuth } from '../hooks/useAuth';

const slug = (book: string) => book.toLowerCase().replace(/\s+/g, '-');
const muted = { color: 'var(--color-text-muted)' };
const label = 'text-[11px] uppercase tracking-widest font-semibold';

/**
 * Today, quietly: a greeting, the one thing to do (the next service, devotion), the verse of the day,
 * today's readings and what is coming. Everything else is a tab away.
 */
export default function Home() {
  usePageView('home');
  usePageTitle('home');
  const { t, lang } = useT();
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
  const { user } = useAuth();
  const [duties, setDuties] = useState<MyDuty[]>([]);
  useEffect(() => { if (user) myDuties().then(setDuties); }, [user]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cw-devotion-state') || 'null');
      if (saved?.isStarted && Date.now() - saved.savedAt < 24 * 3_600_000) setDevotion({ serviceId: saved.selectedServiceId, step: saved.currentStep });
    } catch {}
  }, []);

  // What is coming: the Church's observances plus published parish events
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
  // On Saturdays, Sunday's readings, to prepare
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const sundayLessons = today.getDay() === 6 ? lessons.filter(l => l.date === toISODate(tomorrow)) : [];
  const readings = todayLessons.length ? todayLessons : sundayLessons;

  const liveNow = parishes.filter(p => p.live_url && isLiveNow(p.live_now, p.live_updated_at));
  const lastHymn = hymns.find(h => h.number === Number(JSON.parse((() => { try { return localStorage.getItem('cw-recent-viewed-hymns') || '[]'; } catch { return '[]'; } })())[0]));
  const serviceName = (id: string) => services.find(s => s.id === id)?.displayName ?? id.replace(/_/g, ' ');

  // The next service today (or the first, once they have all begun)
  const minutesNow = hour * 60 + today.getMinutes();
  const next = schedule.find(s => s.hour * 60 + s.minute >= minutesNow - 30) ?? schedule[0];

  if (!hasOnboarded()) return <Navigate to="/welcome" replace />;

  const shareVerse = async () => {
    const text = `“${verse.text}” — ${verse.reference} (KJV)`;
    if (navigator.share) { try { await navigator.share({ title: verse.reference, text, url: `${window.location.origin}${verse.path}` }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  // Something to pick up again, when there is no devotion in progress
  const resume = progress.last
    ? { to: `/bible/${slug(progress.last.book)}/${progress.last.chapter}?lang=${progress.last.versionId}`, icon: <BookOpen size={16} />, text: `${progress.last.book} ${progress.last.chapter} · ${getBibleVersion(progress.last.versionId).abbreviation}` }
    : lastHymn
      ? { to: `/hymns/${lastHymn.number}`, icon: <Music size={16} />, text: `${tr('Hymn')} ${lastHymn.number} · ${displayTitle(lastHymn, lang === 'yo' ? 'yo' : 'en')}` }
      : null;

  return (
    <div className="px-5 pt-6 pb-28 max-w-xl mx-auto space-y-12">
      {/* Greeting */}
      <header className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={muted}>{formatDate(today)}{season.label ? ` · ${tr(season.label)}` : ''}</p>
          <LanguageSwitch />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide" style={{ color: 'var(--color-accent-gold)' }}>{exclamation}!</p>
          <h1 className="text-[2rem] leading-tight font-[Outfit] font-bold tracking-tight mt-1" style={{ color: 'var(--color-text-primary)' }}>{greeting}</h1>
        </div>
      </header>

      {/* The one thing to do */}
      <section className="space-y-3">
        {liveNow.length > 0 && (
          <Link to="/live" className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#DC2626' }}>
            <Radio size={16} /> {tr('Live')} · <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{liveNow.map(p => p.name).join(' · ')}</span>
          </Link>
        )}
        <div className="rounded-3xl p-6 space-y-5 text-white" style={{ background: 'linear-gradient(135deg, var(--color-accent-brand), color-mix(in srgb, var(--color-accent-brand) 70%, #0A1628))' }}>
          {devotion ? (
            <div>
              <p className={`${label} opacity-80`}>{tr('Continue devotion')}</p>
              <p className="text-xl font-bold font-[Outfit] mt-1">{serviceName(devotion.serviceId)}</p>
              <p className="text-sm opacity-80 mt-0.5">{tr('Step')} {devotion.step + 1}</p>
            </div>
          ) : next ? (
            <div>
              <p className={`${label} opacity-80`}>{t('home.todaysServices')}</p>
              <p className="text-xl font-bold font-[Outfit] mt-1">{serviceName(next.id)}</p>
              <p className="text-sm opacity-80 mt-0.5 inline-flex items-center gap-1.5"><Clock size={14} /> {formatServiceTime(next.hour, next.minute)}</p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Link to={devotion ? `/devotion?service=${devotion.serviceId}` : `/devotion${next ? `?service=${next.id}` : ''}`}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-2 bg-white" style={{ color: 'var(--color-accent-brand)' }}>
              <Bird size={18} /> {devotion ? tr('Continue') : t('home.startDevotion')}
            </Link>
            {next && <Link to={`/services/${next.id}`} className="px-4 py-3 rounded-2xl text-sm font-semibold border border-white/40 text-white">{tr('Order of service')}</Link>}
          </div>
        </div>
        {!devotion && resume && (
          <Link to={resume.to} className="flex items-center gap-2 px-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span style={muted}>{resume.icon}</span> <span style={muted}>{t('home.continue')}:</span> <span className="truncate">{tr(resume.text)}</span>
          </Link>
        )}
      </section>

      {/* Ministering soon */}
      {duties.length > 0 && (
        <Link to={`/space?parish=${duties[0].parish_id}&tab=rosters`} className="flex items-center gap-3 rounded-2xl p-4 border" style={{ borderColor: 'var(--color-accent-brand)' }}>
          <span className="flex-1 min-w-0">
            <span className={`block ${label}`} style={{ color: 'var(--color-accent-brand)' }}>{tr('Your next duty')}</span>
            <span className="block text-sm font-semibold mt-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(duties[0].duty)} · {tr(duties[0].title)}</span>
            <span className="block text-xs mt-0.5" style={muted}>{new Date(`${duties[0].service_date}T12:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}{duties[0].status === 'assigned' ? ` · ${tr('Please accept or decline')}` : ''}</span>
          </span>
          <ChevronRight size={16} style={muted} />
        </Link>
      )}

      <InstallBanner />

      {/* Verse of the day */}
      <section aria-labelledby="votd" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="votd" className={label} style={{ color: 'var(--color-accent-gold)' }}>{t('home.verseOfDay')}</h2>
          <button onClick={shareVerse} className="p-2 -m-2 rounded-lg" aria-label={tr('Share the verse')} style={muted}><Share2 size={16} /></button>
        </div>
        <Link to={verse.path} className="block">
          <p className="text-[1.35rem] leading-relaxed" style={{ color: 'var(--color-text-primary)', fontFamily: 'Literata, Georgia, serif' }}>“{tr(verse.text)}”</p>
          <p className="text-sm font-semibold mt-3" style={{ color: 'var(--color-text-secondary)' }}>{verse.reference}</p>
        </Link>
      </section>

      {/* Readings */}
      {readings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={label} style={muted}>{todayLessons.length ? tr('Today’s readings') : tr('Prepare for Sunday')}</h2>
            <Link to={`/lessons/${readings[0].date}`} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Open')}</Link>
          </div>
          {readings[0].occasion && <p className="text-sm font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{readings[0].occasion.replace(/^(Morning|Evening)\s*[-–]\s*/i, '').replace(/\[[^\]]*\]/g, '')}</p>}
          <div className="space-y-2">
            {readings[0].firstLesson && (
              <Link to={`/bible/${slug(readings[0].firstLesson.book)}/${readings[0].firstLesson.chapter}`} className="flex items-baseline gap-3">
                <span className="text-xs font-bold w-8" style={{ color: 'var(--color-accent-brand)' }}>{tr('1st')}</span>
                <span className="text-base" style={{ color: 'var(--color-text-primary)' }}>{readings[0].firstLesson.raw}</span>
              </Link>
            )}
            {readings[0].secondLesson && (
              <Link to={`/bible/${slug(readings[0].secondLesson.book)}/${readings[0].secondLesson.chapter}`} className="flex items-baseline gap-3">
                <span className="text-xs font-bold w-8" style={{ color: 'var(--color-accent-blue)' }}>{tr('2nd')}</span>
                <span className="text-base" style={{ color: 'var(--color-text-primary)' }}>{readings[0].secondLesson.raw}</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Coming up */}
      {events.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className={label} style={muted}>{t('home.upcoming')}</h2>
            <Link to="/events" className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('See all')}</Link>
          </div>
          <ul className="space-y-3">
            {events.slice(0, 2).map(e => (
              <li key={e.id}>
                <Link to="/events" className="flex items-center gap-4">
                  <span className="w-11 text-center shrink-0">
                    <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>{new Date(e.starts_at).toLocaleDateString(lang === 'yo' ? 'yo-NG' : lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short' })}</span>
                    <span className="block text-xl font-bold font-[Outfit] leading-none" style={{ color: 'var(--color-text-primary)' }}>{new Date(e.starts_at).getDate()}</span>
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(e.title)}</span>
                  <ChevronRight size={16} style={muted} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
