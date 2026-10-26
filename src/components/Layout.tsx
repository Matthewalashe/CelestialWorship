import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useT, type StringKey, tr } from '../i18n';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { Avatar } from './ProfileMedia';
import {
  Home, Church, Music, BookOpen, StickyNote, Bird, ListMusic, MonitorPlay, Moon, Sun,
  HandHeart, CalendarDays, MapPin, Menu, HandCoins, Radio, GraduationCap, User, Gavel, Download, MessagesSquare,
  Baby, Calendar, Map as MapIcon, Landmark, Network, ScrollText, ChevronRight, PenLine,
} from 'lucide-react';
import logoUrl from '../assets/logo.png';
import type { ReactNode } from 'react';
import { Sheet } from './Dialog';
import { LanguageSwitch } from './LanguageSwitch';
import { MovedNotice } from './MovedNotice';
import { sendWaitingParishLeads } from '../lib/parishLeads';

interface NavItem {
  path: string;
  label: StringKey;
  icon: ReactNode;
}

/** What people come for: today, the service, devotion, hymns and the Bible (then the Menu) */
const NavItems: NavItem[] = [
  { path: '/', label: 'nav.home', icon: <Home size={20} /> },
  { path: '/services', label: 'nav.services', icon: <Church size={20} /> },
  { path: '/devotion', label: 'nav.devotion', icon: <Bird size={20} /> },
  { path: '/hymns', label: 'nav.hymns', icon: <Music size={20} /> },
  { path: '/bible', label: 'nav.bible', icon: <BookOpen size={20} /> },
];

const LearnItem: NavItem = { path: '/learn', label: 'nav.learn', icon: <GraduationCap size={20} /> };

/** Everything else, in the Menu */
const MoreGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Learn',
    items: [
      LearnItem,
      { path: '/stories', label: 'nav.stories', icon: <Baby size={20} /> },
      { path: '/lessons', label: 'nav.lessons', icon: <Calendar size={20} /> },
      { path: '/quiz', label: 'nav.quiz', icon: <GraduationCap size={20} /> },
      { path: '/maps', label: 'nav.maps', icon: <MapIcon size={20} /> },
      { path: '/library', label: 'nav.articles', icon: <PenLine size={20} /> },
      { path: '/our-church', label: 'nav.history', icon: <Landmark size={20} /> },
      { path: '/structure', label: 'nav.structure', icon: <Network size={20} /> },
      { path: '/constitution', label: 'nav.constitution', icon: <ScrollText size={20} /> },
    ],
  },
  {
    title: 'Worship',
    items: [
      { path: '/live', label: 'nav.live', icon: <Radio size={20} /> },
      { path: '/suggestions', label: 'nav.selector', icon: <ListMusic size={20} /> },
      { path: '/control', label: 'nav.operator', icon: <MonitorPlay size={20} /> },
    ],
  },
  {
    title: 'Church',
    items: [
      { path: '/events', label: 'nav.events', icon: <CalendarDays size={20} /> },
      { path: '/prayer-requests', label: 'nav.prayer', icon: <HandHeart size={20} /> },
      { path: '/directory', label: 'nav.directory', icon: <MapPin size={20} /> },
      { path: '/space', label: 'nav.space', icon: <MessagesSquare size={20} /> },
      { path: '/give', label: 'nav.give', icon: <HandCoins size={20} /> },
    ],
  },
  {
    title: 'Me',
    items: [
      { path: '/notes', label: 'nav.library', icon: <StickyNote size={20} /> },
      { path: '/install', label: 'nav.install', icon: <Download size={20} /> },
    ],
  },
];


/** Pages reached from Learn keep the Learn tab lit */
const LEARN_PATHS = ['/learn', '/stories', '/lessons', '/articles', '/library', '/structure', '/people', '/our-church', '/constitution', '/quiz', '/maps'];
/** On a computer: Studio first, then the same places as on a phone */
const DesktopItems: NavItem[] = [
  { path: '/', label: 'nav.studio', icon: <MonitorPlay size={20} /> },
  { path: '/today', label: 'nav.home', icon: <Home size={20} /> },
  ...NavItems.slice(1),
  LearnItem,
  { path: '/live', label: 'nav.live', icon: <Radio size={20} /> },
];

const isActivePath = (pathname: string, path: string) =>
  path === '/' ? pathname === '/'
    : path === '/learn' ? LEARN_PATHS.some(p => pathname.startsWith(p))
      : pathname.startsWith(path);

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useT();
  const { canModerate } = useAuth();
  const { profile } = useProfile();
  const [moreOpen, setMoreOpen] = useState(false);
  const desktop = useIsDesktop();
  const studio = desktop && (location.pathname === '/' || location.pathname === '/studio');

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);
  // A parish described while offline goes once the app is open again
  useEffect(() => { sendWaitingParishLeads(); }, []);

  const groups: { title: string; items: NavItem[] }[] = canModerate
    ? MoreGroups.map(g => (g.title === 'Me' ? { ...g, items: [...g.items, { path: '/moderate', label: 'nav.moderate' as StringKey, icon: <Gavel size={20} /> }] } : g))
    : MoreGroups;
  // On a computer, items already in the main list aren't repeated in the groups
  const sidebarGroups = desktop
    ? groups.map(g => ({ ...g, items: g.items.filter(i => !DesktopItems.some(d => d.path === i.path)) })).filter(g => g.items.length)
    : groups;
  const label = (item: NavItem) => t(item.label);
  const initial = profile.displayName.trim()[0]?.toUpperCase();
  // The Menu tab is lit on the pages it leads to
  const inMenu = !NavItems.some(i => isActivePath(location.pathname, i.path)) && location.pathname !== '/';
  const me = (
    <Link to="/profile" className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      {profile.avatarUrl || initial
        ? <Avatar url={profile.avatarUrl} name={profile.displayName} size={40} />
        : <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}><User size={20} /></span>}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{profile.displayName.trim() || tr('Your profile')}</span>
        <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('nav.profile')}</span>
      </span>
      <ChevronRight size={16} aria-hidden style={{ color: 'var(--color-text-muted)' }} />
    </Link>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen"
         style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <a href="#main-content" className="skip-to-content">{tr('Skip to content')}</a>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-sidebar fixed top-0 left-0 h-screen z-10 p-5">
        <Link to="/" className="flex items-center gap-3 mb-6">
          <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover shadow-md" />
          <div>
            <p className="text-lg font-[Outfit] font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>{tr('CelestialWorship')}</p>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{tr('Celestial Worship Companion')}</p>
          </div>
        </Link>

        <nav aria-label={tr('Main navigation')} className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 -mx-1 px-1 custom-scrollbar">
          {(desktop ? DesktopItems : NavItems).map(item => (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium"
              style={() => {
                const isActive = isActivePath(location.pathname, item.path);
                return {
                  backgroundColor: isActive ? 'var(--color-accent-brand)' : 'transparent',
                  color: isActive ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
                };
              }}
            >
              {item.icon}
              <span>{t(item.label)}</span>
            </NavLink>
          ))}

          {sidebarGroups.map(group => (
            <div key={group.title} className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-[10px] uppercase tracking-wider px-4 mb-1" style={{ color: 'var(--color-text-muted)' }}>{tr(group.title)}</p>
              {group.items.map(item => (
                <NavLink
                  prefetch="intent"
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm"
                  style={({ isActive }) => ({ backgroundColor: isActive ? 'var(--color-accent-brand)' : 'transparent', color: isActive ? 'var(--color-text-on-accent)' : 'var(--color-text-muted)', fontWeight: isActive ? 600 : 400 })}
                >
                  {item.icon}
                  <span>{label(item)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="pt-3 mt-3 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
          {me}
          <LanguageSwitch />
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full transition-colors text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label={tr('Toggle theme')}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? tr('Dark Mode') : tr('Light Mode')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 flex flex-col min-h-screen relative md:ml-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass-nav z-10 sticky top-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
            <span className="text-base font-[Outfit] font-bold tracking-wide" style={{ color: 'var(--color-text-primary)' }}>{tr('CelestialWorship')}</span>
          </Link>
        </header>

        <MovedNotice />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          <div className={studio ? '' : 'max-w-5xl mx-auto animate-fade-in'}>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Menu: everything beyond the five tabs */}
      {moreOpen && (
        <Sheet label={t('nav.more')} onClose={() => setMoreOpen(false)}>
          <nav aria-label={tr('Menu')} className="space-y-4">
            <div className="space-y-1">
              {me}
              <LanguageSwitch />
              <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm" style={{ color: 'var(--color-text-primary)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</span>
                <span className="flex-1 text-left">{theme === 'light' ? tr('Dark mode') : tr('Light mode')}</span>
              </button>
            </div>
            {groups.map(group => (
              <div key={group.title}>
                <p className="text-[11px] uppercase tracking-wider font-semibold mb-1 px-1" style={{ color: 'var(--color-text-muted)' }}>{tr(group.title)}</p>
                <ul className="grid grid-cols-2 gap-1">
                  {group.items.map(item => {
                    const active = isActivePath(location.pathname, item.path);
                    return (
                      <li key={item.path}>
                        <NavLink to={item.path} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                                 style={{ backgroundColor: active ? 'var(--color-accent-brand)' : 'transparent', color: active ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)', fontWeight: active ? 600 : 400 }}>
                          <span style={{ color: active ? 'inherit' : 'var(--color-text-muted)' }}>{item.icon}</span>
                          <span className="leading-tight">{label(item)}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </Sheet>
      )}

      {/* Mobile Bottom Nav */}
      <nav aria-label={tr('Mobile navigation')} className="md:hidden fixed bottom-0 left-0 right-0 glass-nav z-30 flex items-center justify-around px-2 py-1 pb-safe"
           style={{ height: '68px' }}>
        {NavItems.map(item => {
          const isActive = isActivePath(location.pathname, item.path);
          return (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-col items-center justify-center flex-1 h-14 rounded-xl"
              style={{ color: isActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}
            >
              {/* Active: a solid pill behind the icon */}
              <span className="mb-0.5 h-7 w-12 grid place-items-center rounded-full transition-colors"
                    style={isActive ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : undefined}>
                {item.icon}
              </span>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(item.label)}</span>
            </NavLink>
          );
        })}
        <button onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} aria-current={inMenu ? 'page' : undefined}
                className="flex flex-col items-center justify-center flex-1 h-14 rounded-xl"
                style={{ color: inMenu ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}>
          <span className="mb-0.5 h-7 w-12 grid place-items-center rounded-full transition-colors"
                style={inMenu ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : undefined}>
            <Menu size={20} />
          </span>
          <span className={`text-[10px] ${inMenu ? 'font-semibold' : 'font-medium'}`}>{t('nav.more')}</span>
        </button>
      </nav>
    </div>
  );
}
