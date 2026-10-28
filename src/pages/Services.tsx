import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Baby, Cake, Heart, Droplets, Sparkles, HandHeart, Footprints, Hammer, Home, Church, Flame, Flower2, Moon, CalendarCheck, Clock } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import { usePageTitle } from '../hooks/usePageTitle';
import { iconSquare } from '../components/Tiles';
import { tr } from '../i18n';

const SERVICE_GROUPS: { title: string; note?: string; ids: string[] }[] = [
  { title: 'Weekly Services', note: 'The services of every week', ids: ['morning_service', 'hourly_prayer', 'seekers_service', 'mercy_day_service', 'power_day_service', 'lords_day_service', 'evening_service_lords_day'] },
  { title: 'Monthly', ids: ['new_moon'] },
  { title: 'Life Events', note: 'For the milestones of a family', ids: ['baby_christening', 'birthday', 'holy_matrimony', 'baptism'] },
  { title: 'Special Occasions', ids: ['prophets_prophetess_dreamers', 'pregnant_women', 'washing_feet_communion', 'laying_foundation_stone', 'private_house_dedication', 'church_dedication'] },
  { title: 'Remembrance', note: 'For those who have gone before', ids: ['christian_wake', 'burial', 'remembrance', 'end_of_year'] },
];

/** A line under each name, so the list says what each service is for */
const BLURBS: Record<string, string> = {
  morning_service: 'Prayer to begin the day',
  hourly_prayer: 'Àdúrà Wákàtí, four short prayers a day',
  seekers_service: 'For those seeking help and healing',
  mercy_day_service: 'Mid-week prayer for mercy',
  power_day_service: 'Prayer for strength and deliverance',
  lords_day_service: 'The main service of the week',
  evening_service_lords_day: 'The close of the Lord’s Day',
  new_moon: 'Thanksgiving at the new month',
  baby_christening: 'Naming a child on the eighth day',
  birthday: 'Thanksgiving for another year',
  holy_matrimony: 'The joining of husband and wife',
  baptism: 'Baptism by immersion',
  prophets_prophetess_dreamers: 'For the prophets and seers',
  pregnant_women: 'Prayer for expectant mothers',
  washing_feet_communion: 'Feet washed, Communion shared',
  laying_foundation_stone: 'Blessing a new building',
  private_house_dedication: 'Blessing a family’s home',
  church_dedication: 'Consecrating a new church',
  christian_wake: 'The night before a burial',
  burial: 'Laying a member to rest',
  remembrance: 'Remembering the departed',
  end_of_year: 'Crossing into the new year in prayer',
};

const ICONS: Record<string, React.ReactNode> = {
  new_moon: <Moon size={20} />, baby_christening: <Baby size={20} />, birthday: <Cake size={20} />, holy_matrimony: <Heart size={20} />,
  baptism: <Droplets size={20} />, prophets_prophetess_dreamers: <Sparkles size={20} />, pregnant_women: <HandHeart size={20} />,
  washing_feet_communion: <Footprints size={20} />, laying_foundation_stone: <Hammer size={20} />, private_house_dedication: <Home size={20} />,
  church_dedication: <Church size={20} />, christian_wake: <Flame size={20} />, burial: <Flower2 size={20} />, remembrance: <Flower2 size={20} />,
  end_of_year: <CalendarCheck size={20} />, hourly_prayer: <Clock size={20} />,
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT: Record<string, string> = { Daily: 'Daily', Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

export default function Services() {
  usePageTitle('services');
  const { services, loading } = useServices();
  const [searchTerm, setSearchTerm] = useState('');
  const today = WEEKDAYS[new Date().getDay()];

  const filteredServices = useMemo(() => {
    if (!services) return [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => [s.displayName, tr(s.displayName), s.description, BLURBS[s.id], BLURBS[s.id] && tr(BLURBS[s.id])]
      .some(t => t && t.toLowerCase().includes(q)));
  }, [services, searchTerm]);

  if (loading) return <div className="p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>{tr('Loading...')}</div>;

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto pb-24 space-y-7">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Service Directory')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('Every order of service, ready to follow.')}</p>
        </div>
        <label className="relative block">
          <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="search" placeholder={tr('Search services...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                 className="w-full rounded-xl py-3 pl-10 pr-4 border text-sm focus:outline-none"
                 style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        </label>
      </header>

      {SERVICE_GROUPS.map(group => {
        const list = group.ids.map(id => filteredServices.find(s => s.id === id)).filter((s): s is NonNullable<typeof s> => !!s);
        if (!list.length) return null;
        return (
          <section key={group.title} className="space-y-2.5">
            <div className="px-0.5">
              <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{tr(group.title)}</h2>
              {group.note && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{tr(group.note)}</p>}
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {list.map(service => {
                const isToday = service.day === today || service.day === 'Daily';
                const short = SHORT[service.day];
                const known = service.time && service.time !== 'varies';
                return (
                  <li key={service.id} className="min-w-0">
                    <Link to={`/services/${service.id}`} className="flex items-center gap-3.5 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]"
                          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: isToday && group.title === 'Weekly Services' ? 'var(--color-accent-brand)' : 'var(--color-border)' }}>
                      <span className="shrink-0 grid place-items-center w-12 h-12 rounded-xl text-center" style={iconSquare} aria-hidden>
                        {ICONS[service.id] && !short
                          ? ICONS[service.id]
                          : <span className="text-[11px] font-bold uppercase tracking-wide leading-none">{tr(short ?? 'Day')}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(service.displayName)}</span>
                          {isToday && group.title === 'Weekly Services' && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: 'var(--color-accent-brand)', backgroundColor: 'color-mix(in srgb, var(--color-accent-brand) 10%, transparent)' }}>{tr('Today')}</span>
                          )}
                        </span>
                        <span className="block text-xs mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                          {[known ? tr(service.time) : null, !short ? tr(service.day) : null, BLURBS[service.id] ? tr(BLURBS[service.id]) : null].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <ChevronRight size={18} aria-hidden style={{ color: 'var(--color-text-muted)' }} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
