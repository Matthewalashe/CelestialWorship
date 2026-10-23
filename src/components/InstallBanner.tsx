import { Link } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { tr } from '../i18n';

/** On a phone's browser: the app is one tap (Android) or a short guide (iPhone) away. Dismissed for good. */
export function InstallBanner() {
  const { showBanner, canPrompt, install, dismiss, device } = usePWAInstall();
  if (!showBanner || device === 'desktop') return null;
  return (
    <div className="rounded-2xl border p-3 flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <img src="/pwa-192x192.png" alt="" width={40} height={40} className="w-10 h-10 rounded-xl shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Install the app')}</span>
        <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Works offline, opens like any app')}</span>
      </span>
      {canPrompt ? (
        <button onClick={() => install()} className="btn-primary px-3.5 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1"><Download size={15} /> {tr('Install')}</button>
      ) : (
        <Link to={`/install?device=${device}`} className="btn-primary px-3.5 py-2 rounded-xl text-sm font-semibold">{tr('How')}</Link>
      )}
      <button onClick={dismiss} aria-label={tr('Dismiss')} className="p-1" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
    </div>
  );
}
