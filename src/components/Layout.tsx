import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Home, Church, Music, BookOpen, Calendar, StickyNote, ScrollText, Bird, ListMusic, MonitorPlay, Moon, Sun, LayoutGrid, X } from 'lucide-react';
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

// Mobile bottom bar keeps four core destinations; everything else lives in the "More" sheet
const MobilePrimaryPaths = ['/', '/services', '/hymns', '/bible'];
const MobileMoreItems: NavItem[] = [
  ...NavItems.filter(item => !MobilePrimaryPaths.includes(item.path)),
  ...MoreItems,
];

export default function Layout() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  const isMoreActive = MobileMoreItems.some(item => location.pathname.startsWith(item.path));

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

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-black/50 animate-fade-in" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-label="More pages"
            className="absolute left-0 right-0 bottom-[68px] rounded-t-2xl p-4 pb-5 animate-slide-up"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderTop: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>More</p>
              <button onClick={() => setMoreOpen(false)} className="p-1" style={{ color: 'var(--color-text-muted)' }} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MobileMoreItems.map(item => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-xs font-medium"
                    style={{
                      backgroundColor: isActive ? 'var(--color-accent-brand)' : 'var(--color-bg-card)',
                      color: isActive ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 glass-nav z-30 flex items-center justify-around px-2 py-1 pb-safe"
           style={{ height: '68px' }}>
        {NavItems.filter(item => MobilePrimaryPaths.includes(item.path)).map((item) => {
          const isActive = !moreOpen && (item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              prefetch="intent"
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200"
              style={{ color: isActive ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}
            >
              <span className={`mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
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
          <span className={`mb-0.5 transition-transform duration-200 ${moreOpen || isMoreActive ? 'scale-110' : ''}`}>
            <LayoutGrid size={20} />
          </span>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}
