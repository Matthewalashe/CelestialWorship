import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Home, Church, Music, BookOpen, Calendar, StickyNote, ScrollText, Bird, ListMusic, MonitorPlay, Moon, Sun } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import type { ReactNode } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

const NavItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <Home size={20} /> },
  { path: '/services', label: 'Services', icon: <Church size={20} /> },
  { path: '/hymns', label: 'Hymnal', icon: <Music size={20} /> },
  { path: '/bible', label: 'Bible', icon: <BookOpen size={20} /> },
  { path: '/lessons', label: 'Lessons', icon: <Calendar size={20} /> },
];

const MoreItems: NavItem[] = [
  { path: '/notes', label: 'Notes', icon: <StickyNote size={20} /> },
  { path: '/constitution', label: 'Constitution', icon: <ScrollText size={20} /> },
  { path: '/devotion', label: 'Devotion', icon: <Bird size={20} /> },
  { path: '/suggestions', label: 'Hymn Selector', icon: <ListMusic size={20} /> },
  { path: '/control', label: 'Operator', icon: <MonitorPlay size={20} /> },
];

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col md:flex-row min-h-screen"
         style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-sidebar fixed top-0 left-0 h-screen z-10 p-6">
        <div className="flex items-center gap-3 mb-8">
          <img 
            src={logoUrl}
            alt="CelestialWorship Logo" 
            className="w-10 h-10 rounded-xl object-cover shadow-md"
          />
          <div>
            <h1 className="text-lg font-[Outfit] font-bold tracking-wide"
                style={{ color: 'var(--color-text-primary)' }}>
              CelestialWorship
            </h1>
            <p className="text-[9px] uppercase tracking-widest"
               style={{ color: 'var(--color-text-muted)' }}>
              Celestial Worship Companion
            </p>
          </div>
        </div>
        
        <nav aria-label="Main navigation" className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
          {NavItems.map((item) => (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                  isActive 
                    ? 'shadow-sm' 
                    : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-accent-brand)' : 'transparent',
                color: isActive ? 'var(--color-text-on-accent)' : 'var(--color-text-secondary)',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-[10px] uppercase tracking-wider px-4 mb-2"
               style={{ color: 'var(--color-text-muted)' }}>More</p>
            {MoreItems.map((item) => (
              <NavLink
                prefetch="intent"
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)',
                })}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {/* Theme Toggle & User Section */}
          <div className="mt-auto pt-4 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full transition-colors text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Toggle theme"
            >
              <span className="text-lg">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</span>
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 flex flex-col min-h-screen relative md:ml-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass-nav z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <img 
              src={logoUrl}
              alt="CelestialWorship" 
              className="w-8 h-8 rounded-lg object-cover shadow-sm"
            />
            <h1 className="text-base font-[Outfit] font-bold tracking-wide"
                style={{ color: 'var(--color-text-primary)' }}>
              CelestialWorship
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav aria-label="Main navigation" className="md:hidden fixed bottom-0 left-0 right-0 glass-nav z-20 flex items-center justify-around px-2 py-1 pb-safe"
           style={{ height: '68px' }}>
        {NavItems.map((item) => {
          const isActive = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);
          
          return (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200"
            >
              <span className={`mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium"
                    style={{ color: isActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
