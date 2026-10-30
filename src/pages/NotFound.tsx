import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { tr } from '../i18n';

export default function NotFound() {
  usePageTitle('not_found', 'Page not found');

  // The saved copy of the app may simply be older than the page: fetch the new one and try once more
  useEffect(() => {
    const key = `cw-404-retry:${window.location.pathname}`;
    const sw = navigator.serviceWorker;
    try { if (!sw || sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { return; }
    const reload = () => window.location.reload();
    sw.addEventListener('controllerchange', reload);
    void sw.getRegistration().then(r => r?.update()).catch(() => {});
    return () => sw.removeEventListener('controllerchange', reload);
  }, []);

  return (
    <div className="px-4 py-16 max-w-md mx-auto text-center">
      <p className="text-5xl font-black font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>404</p>
      <p className="mt-3" style={{ color: 'var(--color-text-secondary)' }}>{tr('We couldn’t find that page.')}</p>
      <div className="flex justify-center gap-2 mt-6">
        <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">{tr('Home')}</Link>
        <Link to="/hymns" className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Hymnal')}</Link>
      </div>
    </div>
  );
}
