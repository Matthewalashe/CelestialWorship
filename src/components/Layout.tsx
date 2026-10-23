import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useT, type StringKey } from '../i18n';
import {
  Home, Church, Music, BookOpen, Calendar, StickyNote, ScrollText, Bird, ListMusic, MonitorPlay, Moon, Sun, LayoutGrid,
  HandHeart, PenLine, CalendarDays, MapPin, HandCoins, Radio, GraduationCap, Landmark, User, Gavel,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';
import type { ReactNode } from 'react';
import { Sheet } from './Dialog';

interface NavItem {
  path: string;
  label: StringKey;
  icon: ReactNode;
}

const NavItems: NavItem[] = [
  { path: '/', label: 'nav.home', icon: <Home size={20} /> },
  { path: '/services', label: 'nav.services', icon: <Church size={20} /> },
  { path: '/hymns', label: 'nav.hymns', icon: <Music size={20} /> },
  { path: '/bible', label: 'nav.bible', icon: <BookOpen size={20} /> },
];

const MoreGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Worship',
    items: [
      { path: '/devotion', label: 'nav.devotion', icon: <Bird size={20} /> },
      { path: '/lessons', label: 'nav.lessons', icon: <Calendar size={20} /> },
      { path: '/live', label: 'nav.live', icon: <Radio size={20} /> },
      { path: '/suggestions', label: 'nav.selector', icon: <ListMusic size={20} /> },
      { path: '/control', label: 'nav.operator', icon: <MonitorPlay size={20} /> },
    ],
  },
  {
    title: 'Learn',
    items: [
      { path: '/quiz', label: 'nav.quiz', icon: <GraduationCap size={20} /> },
      { path: '/articles', label: 'nav.articles', icon: <PenLine size={20} /> },
      { path: '/our-church', label: 'nav.history', icon: <Landmark size={20} /> },
      { path: '/constitution', label: 'nav.constitution', icon: <ScrollText size={20} /> },
    ],
  },
  {
    title: 'Church',
    items: [
      { path: '/events', label: 'nav.events', icon: <CalendarDays size={20} /> },
      { path: '/prayer-requests', label: 'nav.prayer', icon: <HandHeart size={20} /> },
      { path: '/directory', label: 'nav.directory', icon: <MapPin size={20} /> },
      { path: '/give', label: 'nav.give', icon: <HandCoins size={20} /> },
    ],
  },
  {
    title: 'Me',
    items: [
      { path: '/notes', label: 'nav.library', icon: <StickyNote size={20} /> },
      { path: '/profile', label: 'nav.profile', icon: <User size={20} /> },
    ],
  },
];

const MobilePrimaryPaths = NavItems.map(i => i.path);
const allMoreItems = MoreGroups.flatMap(g => g.items);

const isActivePath = (pathname: string, path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useT();
  const { canModerate } = useAuth();
  const { profile } = useProfile();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const isMoreActive = allMoreItems.some(item => isActivePath(location.pathname, item.path));
  const groups: { title: string; items: NavItem[] }[] = canModerate
    ? [...MoreGroups.slice(0, 3), { title: 'Me', items: [...MoreGroups[3].items, { path: '/moderate', label: 'nav.moderate' as StringKey, icon: <Gavel size={20} /> }] }]
    : MoreGroups;
  const label = (item: NavItem) => t(item.label);
  const initial = profile.displayName.trim()[0]?.toUpperCase();

  return (
    <div className="flex flex-col md:flex-row min-h-screen"
         style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-sidebar fixed top-0 left-0 h-screen z-10 p-5">
        <Link to="/" className="flex items-center gap-3 mb-6">
          <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover shadow-md" />
          <div>
            <p className="text-lg font-[Outfit] font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>CelestialWorship</p>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Celestial Worship Companion</p>
          </div>
        </Link>

        <nav aria-label="Main navigation" className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 -mx-1 px-1 custom-scrollbar">
          {NavItems.map(item => (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium"
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-accent-brand)' : 'transparent',
                color: isActive ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
              })}
            >
              {item.icon}
              <span>{t(item.label)}</span>
            </NavLink>
          ))}

          {groups.map(group => (
            <div key={group.title} className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-[10px] uppercase tracking-wider px-4 mb-1" style={{ color: 'var(--color-text-muted)' }}>{group.title}</p>
              {group.items.map(item => (
                <NavLink
                  prefetch="intent"
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm"
                  style={({ isActive }) => ({ color: isActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)', fontWeight: isActive ? 600 : 400 })}
                >
                  {item.icon}
                  <span>{label(item)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full transition-colors text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 flex flex-col min-h-screen relative md:ml-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass-nav z-10 sticky top-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            <span className="text-base font-[Outfit] font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>CelestialWorship</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <Link to="/profile" aria-label={t('nav.profile')}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}>
              {initial ?? <User size={18} />}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <Sheet label="More pages" title="More" onClose={() => setMoreOpen(false)}>
          <div>
            {groups.map(group => (
              <div key={group.title} className="mb-3">
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{group.title}</p>
                <div className="grid grid-cols-4 gap-2">
                  {group.items.map(item => {
                    const active = isActivePath(location.pathname, item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-[11px] font-medium text-center leading-tight"
                        style={{
                          backgroundColor: active ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
                          color: active ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)',
                        }}
                      >
                        {item.icon}
                        <span>{label(item)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {/* Mobile Bottom Nav */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 glass-nav z-30 flex items-center justify-around px-2 py-1 pb-safe"
           style={{ height: '68px' }}>
        {NavItems.filter(item => MobilePrimaryPaths.includes(item.path)).map(item => {
          const isActive = !moreOpen && isActivePath(location.pathname, item.path);
          return (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200"
              style={{ color: isActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}
            >
              <span className={`mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className="text-[10px] font-medium">{t(item.label)}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200"
          style={{ color: moreOpen || isMoreActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}
          aria-expanded={moreOpen}
          aria-label="More pages"
        >
          <span className={`mb-0.5 transition-transform duration-200 ${moreOpen || isMoreActive ? 'scale-110' : ''}`}><LayoutGrid size={20} /></span>
          <span className="text-[10px] font-medium">{t('nav.more')}</span>
        </button>
      </nav>
    </div>
  );
}
