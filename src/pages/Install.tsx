import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Share, PlusSquare, MoreVertical, Download, Check, Copy, Smartphone, WifiOff, RefreshCw, ExternalLink } from 'lucide-react';
import { usePWAInstall, type Device } from '../hooks/usePWAInstall';
import { usePageTitle } from '../hooks/usePageTitle';
import { showToast } from '../components/Toast';
import { tr } from '../i18n';

/**
 * Get the app on a phone. CelestialWorship installs from the browser (no app store): one tap on
 * Android, "Add to Home Screen" in Safari on iPhone and iPad. Each phone has its own link to send
 * (/install?device=android, /install?device=ios) and a QR code for notices and screens.
 */

const SITE = 'https://celestialworship.vercel.app';
const LINKS: Record<'android' | 'ios', string> = { android: `${SITE}/install?device=android`, ios: `${SITE}/install?device=ios` };

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };
const text = { color: 'var(--color-text-primary)' };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="w-7 h-7 shrink-0 rounded-full grid place-items-center text-sm font-bold" style={{ backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}>{n}</span>
      <span className="text-sm leading-relaxed pt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{children}</span>
    </li>
  );
}

/** A key word in the phone's own menu, shown the way the phone shows it */
const Key = ({ children }: { children: React.ReactNode }) => (
  <b className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[13px] align-middle" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>{children}</b>
);

async function copy(link: string) {
  try { await navigator.clipboard.writeText(link); showToast(tr('Link copied')); } catch { showToast(tr('Couldn\'t copy')); }
}

async function share(link: string, device: 'android' | 'ios') {
  const data = { title: 'CelestialWorship', text: device === 'ios' ? tr('Get CelestialWorship on your iPhone') : tr('Get CelestialWorship on your Android phone'), url: link };
  if (navigator.share) { try { await navigator.share(data); return; } catch { return; } }
  copy(link);
}

function AndroidSteps() {
  const { canPrompt, install, inApp, isAndroid } = usePWAInstall();
  // Chrome opens the same page from an in-app viewer (WhatsApp, Facebook, Instagram…)
  const inChrome = `intent://${SITE.replace(/^https:\/\//, '')}/install?device=android#Intent;scheme=https;package=com.android.chrome;end`;
  return (
    <div className="space-y-4">
      {canPrompt ? (
        <button onClick={async () => { if (await install()) showToast(tr('Installed — find it on your home screen')); }}
                className="btn-primary w-full py-3.5 rounded-2xl text-base font-semibold inline-flex items-center justify-center gap-2">
          <Download size={20} /> {tr('Install the app')}
        </button>
      ) : isAndroid && inApp ? (
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)' }}>
          <p className="text-sm" style={text}>{tr('This page is open inside another app, which can’t install apps. Open it in Chrome:')}</p>
          <a href={inChrome} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"><ExternalLink size={16} /> {tr('Open in Chrome')}</a>
        </div>
      ) : null}
      <ol className="space-y-3">
        <Step n={1}>{tr('Open this page in')} <Key>{tr('Chrome')}</Key> {tr('(or Samsung Internet).')}</Step>
        <Step n={2}>{tr('Tap the menu')} <Key><MoreVertical size={14} /></Key> {tr('at the top right.')}</Step>
        <Step n={3}>{tr('Tap')} <Key>{tr('Install app')}</Key> {tr('or')} <Key>{tr('Add to Home screen')}</Key>.</Step>
        <Step n={4}>{tr('Tap')} <Key>{tr('Install')}</Key>. {tr('CelestialWorship appears with your other apps.')}</Step>
      </ol>
    </div>
  );
}

function IOSSteps() {
  const { isIOS, isSafari, inApp } = usePWAInstall();
  return (
    <div className="space-y-4">
      {isIOS && !isSafari && (
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 12%, transparent)' }}>
          <p className="text-sm" style={text}>
            {inApp ? tr('This page is open inside another app. Tap its menu (••• or the compass) and choose “Open in Safari”, or copy the link into Safari.')
                   : tr('On iPhone and iPad the app is added from Safari. Copy the link and open it in Safari.')}
          </p>
          <button onClick={() => copy(LINKS.ios)} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"><Copy size={16} /> {tr('Copy the link')}</button>
        </div>
      )}
      <ol className="space-y-3">
        <Step n={1}>{tr('Open this page in')} <Key>{tr('Safari')}</Key>.</Step>
        <Step n={2}>{tr('Tap the Share button')} <Key><Share size={14} /></Key> {tr('— at the bottom of the screen (top right on iPad).')}</Step>
        <Step n={3}>{tr('Scroll down and tap')} <Key><PlusSquare size={14} /> {tr('Add to Home Screen')}</Key>.</Step>
        <Step n={4}>{tr('Tap')} <Key>{tr('Add')}</Key>. {tr('Open CelestialWorship from your home screen.')}</Step>
      </ol>
    </div>
  );
}

function LinkCard({ device }: { device: 'android' | 'ios' }) {
  const link = LINKS[device];
  return (
    <div className="rounded-2xl border p-4 flex gap-4 items-center" style={card}>
      <img src={`/qr/install-${device}.svg`} alt={device === 'ios' ? tr('QR code for iPhone and iPad') : tr('QR code for Android')} width={96} height={96} className="w-24 h-24 rounded-lg bg-white p-1 shrink-0" loading="lazy" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold text-sm" style={text}>{device === 'ios' ? tr('iPhone & iPad link') : tr('Android link')}</p>
        <p className="text-xs break-all" style={muted}>{link.replace('https://', '')}</p>
        <div className="flex gap-2">
          <button onClick={() => share(link, device)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', ...text }}><Share size={13} /> {tr('Share')}</button>
          <button onClick={() => copy(link)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', ...text }}><Copy size={13} /> {tr('Copy')}</button>
        </div>
      </div>
    </div>
  );
}

export default function Install() {
  usePageTitle('install', 'Get the app');
  const [params] = useSearchParams();
  const { device: detected, isInstalled } = usePWAInstall();
  const asked = params.get('device');
  const [tab, setTab] = useState<'android' | 'ios'>(() => (asked === 'ios' || asked === 'android' ? asked : detected === 'ios' ? 'ios' : 'android'));
  const onPhone = (detected as Device) !== 'desktop';

  return (
    <div className="px-4 py-6 pb-24 max-w-xl mx-auto space-y-6">
      <header className="text-center space-y-3">
        <img src="/pwa-192x192.png" alt="" width={80} height={80} className="w-20 h-20 mx-auto rounded-[22px] shadow-lg" />
        <h1 className="text-2xl font-bold font-[Outfit]" style={text}>{tr('Get the CelestialWorship app')}</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Hymns, the Bible, the Order of Service and devotion on your phone — free.')}</p>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs" style={muted}>
          <li className="inline-flex items-center gap-1"><Smartphone size={13} /> {tr('About 3 MB')}</li>
          <li className="inline-flex items-center gap-1"><WifiOff size={13} /> {tr('Works offline')}</li>
          <li className="inline-flex items-center gap-1"><RefreshCw size={13} /> {tr('Updates by itself')}</li>
        </ul>
      </header>

      {isInstalled ? (
        <div className="rounded-2xl border p-5 text-center space-y-3" style={card}>
          <p className="font-semibold inline-flex items-center gap-2" style={{ color: 'var(--color-success)' }}><Check size={18} /> {tr('The app is installed on this device')}</p>
          <Link to="/" className="btn-primary inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">{tr('Open the app')}</Link>
        </div>
      ) : (
        <section className="rounded-2xl border p-4 space-y-4" style={card} aria-label={tr('How to install')}>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg-primary)' }} role="tablist">
            {(['android', 'ios'] as const).map(d => (
              <button key={d} role="tab" aria-selected={tab === d} onClick={() => setTab(d)}
                      className="py-2.5 rounded-lg text-sm font-semibold"
                      style={tab === d ? { backgroundColor: 'var(--color-bg-card)', ...text, boxShadow: '0 1px 3px rgb(0 0 0 / 0.12)' } : muted}>
                {d === 'android' ? tr('Android') : tr('iPhone & iPad')}
              </button>
            ))}
          </div>
          {tab === 'android' ? <AndroidSteps /> : <IOSSteps />}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest font-semibold" style={muted}>{onPhone ? tr('Send it to someone') : tr('Scan with your phone')}</h2>
        <LinkCard device="android" />
        <LinkCard device="ios" />
        <p className="text-xs" style={muted}>{tr('The app installs straight from the web, so there is nothing to find in an app store. It is the same app on every phone, and it updates itself.')}</p>
      </section>
    </div>
  );
}
