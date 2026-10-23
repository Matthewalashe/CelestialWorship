import { Link, useLocation } from 'react-router-dom';
import { CloudOff, LogIn } from 'lucide-react';
import { BackendError } from '../lib/backend';
import { tr } from '../i18n';

export function SignInPrompt({ message }: { message: string }) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);
  return (
    <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <LogIn size={20} style={{ color: 'var(--color-accent-brand)' }} className="shrink-0" />
      <p className="flex-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
      <Link to={`/signin?returnTo=${returnTo}`} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold shrink-0">{tr('Sign in')}</Link>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const notSetUp = error instanceof BackendError && error.notSetUp;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="text-center py-10 px-6" style={{ color: 'var(--color-text-secondary)' }}>
      <CloudOff size={28} className="mx-auto mb-3 opacity-60" />
      <p className="text-sm max-w-sm mx-auto">{notSetUp ? tr('This part of the app is coming soon.') : message}</p>
      {!notSetUp && onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Try again')}</button>
      )}
    </div>
  );
}

/** Small async-state helper for community pages */
export type Loadable<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: unknown };
