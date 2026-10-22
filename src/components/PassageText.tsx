import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { loadChapter } from '../hooks/useBible';
import { referenceToPath } from '../utils/parseReference';
import type { ScriptureReference } from '../types';

function preferredVersion(): string {
  try { return localStorage.getItem('cw-bible-version') || 'en'; } catch { return 'en'; }
}

/**
 * A Bible passage shown in place (in the Order of Service, Devotion…), collapsed by default
 * so long readings don't push the order off screen.
 */
export function PassageText({ reference, defaultOpen = false, compact = false }: { reference: ScriptureReference; defaultOpen?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [verses, setVerses] = useState<[number, string][] | null>(null);
  const [failed, setFailed] = useState(false);
  const version = preferredVersion();

  useEffect(() => {
    if (!open || verses) return;
    let cancelled = false;
    (async () => {
      // The preferred version may not have the chapter (e.g. a 1900 chapter still in review): fall back to KJV
      const data = (await loadChapter(reference.book, reference.chapter, version)) ?? (await loadChapter(reference.book, reference.chapter, 'en'));
      if (cancelled) return;
      if (!data) { setFailed(true); return; }
      setVerses(Object.entries(data.verses)
        .map(([n, t]) => [Number(n), t] as [number, string])
        .filter(([n]) => n >= reference.verseStart && n <= reference.verseEnd)
        .sort((a, b) => a[0] - b[0]));
    })();
    return () => { cancelled = true; };
  }, [open, verses, reference, version]);

  const label = reference.raw || `${reference.book} ${reference.chapter}:${reference.verseStart}-${reference.verseEnd}`;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'color-mix(in srgb, var(--color-accent-blue) 30%, transparent)' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
              className={`w-full flex items-center gap-2 ${compact ? 'px-3 py-1.5' : 'px-3 py-2'} text-xs font-semibold`}
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-blue) 12%, transparent)', color: 'var(--color-accent-blue)' }}>
        <BookOpen size={14} /> <span className="flex-1 text-left">{label}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-3 py-3 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
          {failed ? <p style={{ color: 'var(--color-text-muted)' }}>Couldn’t load this passage offline.</p>
            : !verses ? <p className="animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
            : verses.map(([n, t]) => (
              <p key={n}><sup className="text-[10px] font-bold mr-1" style={{ color: 'var(--color-accent-blue)' }}>{n}</sup>{t}</p>
            ))}
          <Link to={referenceToPath(reference)} className="inline-block text-xs font-semibold pt-1" style={{ color: 'var(--color-accent-brand)' }}>Open in the Bible →</Link>
        </div>
      )}
    </div>
  );
}
