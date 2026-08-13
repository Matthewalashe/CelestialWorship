import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTodaysLessons } from '../hooks/useLessons';
import { getServiceTypesForDate, formatDate, getUpcomingServiceDays, getDayName } from '../utils/dateUtils';

/**
 * Compute Easter Sunday for a given year using the Anonymous Gregorian algorithm.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getLiturgicalExclamation(date: Date): string {
  const year = date.getFullYear();
  const easter = getEasterDate(year);

  // Palm Sunday = Easter − 7 days
  const palmSunday = new Date(easter);
  palmSunday.setDate(easter.getDate() - 7);

  // Easter week = Easter Sunday through the following Saturday (7 days)
  const easterWeekEnd = new Date(easter);
  easterWeekEnd.setDate(easter.getDate() + 6);

  // Compare dates (ignore time)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const palm = new Date(palmSunday.getFullYear(), palmSunday.getMonth(), palmSunday.getDate());
  const eStart = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate());
  const eEnd = new Date(easterWeekEnd.getFullYear(), easterWeekEnd.getMonth(), easterWeekEnd.getDate());

  if (d.getTime() === palm.getTime()) return 'Hossanah';
  // Easter week Mon–Sat only (Easter Sunday itself stays Halleluyah)
  if (d > eStart && d <= eEnd) return 'Hallelujah';
  return 'Halleluyah';
}

export default function Home() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  
  const today = new Date();
  const todayFormatted = formatDate(today);
  const serviceTypes = getServiceTypesForDate(today);
  const { lessons: todayLessons } = useTodaysLessons();
  const upcomingServiceDays = getUpcomingServiceDays(today, 4);
  const exclamation = getLiturgicalExclamation(today);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const getServiceDetails = (type: string) => {
    switch (type) {
      case 'lords_day_service':
        return { name: "Lord's Day Service", time: "10:00 AM", icon: "✝️" };
      case 'evening_service_lords_day':
        return { name: "Evening Service", time: "6:00 PM", icon: "🌅" };
      case 'morning_service':
        return { name: "Morning Service", time: "6:00 AM", icon: "☀️" };
      case 'seekers_service':
        return { name: "Seekers Service", time: "9:00 AM", icon: "🕯️" };
      case 'mercy_day_service':
        return { name: "Mercy Day Service", time: "6:00 PM", icon: "🙏" };
      case 'power_day_service':
        return { name: "Power Day Service", time: "6:00 PM", icon: "⚡" };
      case 'prophets_prophetess_dreamers':
        return { name: "Prophets & Prophetesses", time: "Evening", icon: "⭐" };
      default:
        return { name: "Service", time: "Scheduled", icon: "⛪" };
    }
  };

  return (
    <div className="px-4 py-6 pb-24 animate-fade-in">
      {/* Hero Section */}
      <header className="mb-8 relative">
        <div className="absolute top-0 right-0 opacity-15 pointer-events-none">
          <div className="w-28 h-28 rounded-full blur-[60px]"
               style={{ backgroundColor: 'var(--color-accent-teal)' }} />
        </div>
        
        <h1 className="text-3xl font-[Outfit] font-bold mb-1 tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}>
          {greeting}, <span style={{ color: 'var(--color-accent-gold)' }}>{exclamation}!</span>
        </h1>
        <p className="text-sm mb-3 font-medium"
           style={{ color: 'var(--color-text-secondary)' }}>
          {todayFormatted}
        </p>
        <p className="text-xs font-semibold tracking-widest uppercase"
           style={{ color: 'var(--color-accent-teal)' }}>
          Celestial Worship Companion
        </p>
      </header>

      <div className="space-y-6">
        {/* Today's Services */}
        <section>
          <h2 className="text-lg font-[Outfit] font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}>
            Today's Services
          </h2>
          <div className="card p-4 space-y-3">
            {serviceTypes.map(type => {
              const details = getServiceDetails(type);
              return (
                <Link 
                  key={type}
                  to={`/services/${type}`}
                  className="flex items-center p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-primary)' }}
                >
                  <div className="text-2xl mr-3 flex-shrink-0">{details.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {details.name}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {details.time}
                    </p>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)' }}>›</span>
                </Link>
              );
            })}

            <button 
              onClick={() => navigate('/devotion')}
              className="btn-primary w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <span>Start Devotion</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* Today's Readings */}
        {todayLessons.length > 0 && (
          <section>
            <h2 className="text-lg font-[Outfit] font-semibold mb-3"
                style={{ color: 'var(--color-text-primary)' }}>
              Bible Lessons
            </h2>
            <div 
              className="card p-4 cursor-pointer"
              onClick={() => navigate(`/lessons/${todayLessons[0].date}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Today's Reading
                  </h3>
                  {todayLessons[0].occasion && (
                    <span className="badge mt-1"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 15%, transparent)', color: 'var(--color-accent-gold)' }}>
                      ✦ {todayLessons[0].occasion}
                    </span>
                  )}
                </div>
                <span className="text-2xl opacity-60">📖</span>
              </div>
              
              <div className="space-y-2 mt-3">
                {todayLessons[0].firstLesson && (
                  <div className="flex items-center gap-2 p-2 rounded-lg"
                       style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-teal) 15%, transparent)', color: 'var(--color-accent-teal)' }}>
                      1st
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {todayLessons[0].firstLesson.raw}
                    </span>
                  </div>
                )}
                {todayLessons[0].secondLesson && (
                  <div className="flex items-center gap-2 p-2 rounded-lg"
                       style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 15%, transparent)', color: 'var(--color-accent-blue)' }}>
                      2nd
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {todayLessons[0].secondLesson.raw}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-[Outfit] font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Hymnal', icon: '🎵', path: '/hymns', desc: '486 hymns' },
              { label: 'Order of Service', icon: '📜', path: '/services', desc: '21 liturgies' },
              { label: 'Bible Lessons', icon: '📅', path: '/lessons', desc: '2026 calendar' },
              { label: 'Live Display', icon: '📺', path: '/control', desc: 'Projector mode' },
              { label: 'My Notes', icon: '📝', path: '/notes', desc: 'Notes & passages' },
              { label: 'Hymn Selector', icon: '🎶', path: '/suggestions', desc: 'Plan hymns' },
            ].map((action) => (
              <Link 
                key={action.path}
                to={action.path}
                className="card p-4 flex flex-col items-center justify-center text-center group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {action.label}
                </span>
                <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {action.desc}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Upcoming */}
        <section>
          <h2 className="text-lg font-[Outfit] font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}>
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcomingServiceDays.map((date, idx) => {
              if (date.toDateString() === today.toDateString()) return null;
              const dateTypes = getServiceTypesForDate(date);
              const isoDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
              return (
                <Link 
                  key={idx}
                  to={`/lessons/${isoDate}`}
                  className="card p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {getDayName(date)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(date)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {dateTypes.map(type => (
                      <span key={type} className="text-lg" title={getServiceDetails(type).name}>
                        {getServiceDetails(type).icon}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
