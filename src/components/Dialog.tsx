import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Accessible dialog / bottom sheet (PRINCIPLES §4):
 * rendered into <body> so nothing can cover it, labelled for screen readers, closes on Escape
 * or the backdrop (a real button), moves focus inside on open and back to the trigger on close.
 */
export function Sheet({ label, onClose, children, title, wide = false }: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** Visible heading; defaults to the label */
  title?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Callers pass inline closures; keep the latest without re-running the focus effect on every render
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close]), [href], [tabindex]:not([tabindex="-1"])');
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      // Keep Tab inside the dialog
      if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>('input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.hasAttribute('disabled'));
        if (!items.length) return;
        const [firstItem, lastItem] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
        else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <button data-close aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 w-full h-full bg-black/50 cursor-default animate-fade-in" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto outline-none animate-slide-up`}
        style={{ backgroundColor: 'var(--color-bg-secondary)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title ?? label}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 -m-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ── confirm / prompt replacements ────────────────────────────

type Request =
  | { kind: 'confirm'; title: string; message?: string; confirmLabel: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: 'prompt'; title: string; message?: string; label: string; confirmLabel: string; required: boolean; resolve: (v: string | null) => void };

let enqueue: ((r: Request) => void) | null = null;

/** await confirmDialog({ title: 'Delete this note?' }) → true / false */
export function confirmDialog(opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise(resolve => {
    if (!enqueue) return resolve(false);
    enqueue({ kind: 'confirm', title: opts.title, message: opts.message, confirmLabel: opts.confirmLabel ?? 'OK', danger: opts.danger ?? false, resolve });
  });
}

/** await promptDialog({ title: 'Why?', label: 'Reason' }) → text, or null if cancelled */
export function promptDialog(opts: { title: string; message?: string; label: string; confirmLabel?: string; required?: boolean }): Promise<string | null> {
  return new Promise(resolve => {
    if (!enqueue) return resolve(null);
    enqueue({ kind: 'prompt', title: opts.title, message: opts.message, label: opts.label, confirmLabel: opts.confirmLabel ?? 'Send', required: opts.required ?? true, resolve });
  });
}

export function DialogHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    enqueue = r => { setText(''); setRequest(r); };
    return () => { enqueue = null; };
  }, []);

  if (!request) return null;

  const close = (value: boolean | string | null) => {
    if (request.kind === 'confirm') request.resolve(value === true);
    else request.resolve(typeof value === 'string' ? value : null);
    setRequest(null);
  };
  const canSubmit = request.kind === 'confirm' || !request.required || text.trim().length > 0;

  return (
    <Sheet label={request.title} onClose={() => close(request.kind === 'confirm' ? false : null)}>
      <form onSubmit={e => { e.preventDefault(); if (canSubmit) close(request.kind === 'confirm' ? true : text.trim()); }} className="space-y-4">
        {request.message && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{request.message}</p>}
        {request.kind === 'prompt' && (
          <label className="block text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            {request.label}
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={1000}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-sm border outline-none font-normal"
                      style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => close(request.kind === 'confirm' ? false : null)} className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>
          <button type="submit" disabled={!canSubmit} className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={request.kind === 'confirm' && request.danger
                    ? { backgroundColor: '#DC2626', color: '#fff' }
                    : { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}>
            {request.confirmLabel}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
