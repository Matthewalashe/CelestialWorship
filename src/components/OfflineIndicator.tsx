import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => { setIsOffline(false); setDismissed(false); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg animate-slide-up"
      style={{
        backgroundColor: 'var(--color-warning, #F59E0B)',
        color: '#1A1A1A',
        fontSize: '0.8125rem',
        fontWeight: 600,
      }}
      role="status"
      aria-live="polite"
    >
      <WifiOff size={16} />
      <span>You're offline — cached content available</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 opacity-70 hover:opacity-100"
        aria-label="Dismiss offline notice"
      >
        ✕
      </button>
    </div>
  );
}
