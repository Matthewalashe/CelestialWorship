import { useState, useEffect, useRef, useCallback } from 'react';

const PREFIX = 'cw-draft:';

/**
 * Autosaving draft: whatever the user types is kept on this device until they
 * submit or discard it, so closing the app or losing signal never loses writing.
 *
 *   const draft = useDraft('note:new', { title: '', content: '' });
 *   draft.value / draft.setValue(...) / draft.clear() / draft.savedAt
 */
export function useDraft<T extends object>(key: string, empty: T) {
  const storageKey = PREFIX + key;
  const emptyRef = useRef(empty);

  const read = useCallback((): { value: T; savedAt: string | null } => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { value: { ...emptyRef.current, ...parsed.value }, savedAt: parsed.savedAt ?? null };
      }
    } catch {}
    return { value: emptyRef.current, savedAt: null };
  }, [storageKey]);

  const [state, setState] = useState(read);

  // Switching to a different draft key loads that draft
  useEffect(() => { setState(read()); }, [read]);

  // Save shortly after typing stops
  useEffect(() => {
    const isEmpty = JSON.stringify(state.value) === JSON.stringify(emptyRef.current);
    const timer = setTimeout(() => {
      try {
        if (isEmpty) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, JSON.stringify({ value: state.value, savedAt: new Date().toISOString() }));
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [state.value, storageKey]);

  const setValue = useCallback((update: Partial<T> | ((prev: T) => T)) => {
    setState(prev => ({
      value: typeof update === 'function' ? update(prev.value) : { ...prev.value, ...update },
      savedAt: new Date().toISOString(),
    }));
  }, []);

  const clear = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
    setState({ value: emptyRef.current, savedAt: null });
  }, [storageKey]);

  const hasDraft = JSON.stringify(state.value) !== JSON.stringify(emptyRef.current);

  return { value: state.value, setValue, clear, savedAt: hasDraft ? state.savedAt : null, hasDraft };
}

/** All unsent drafts, for a "Drafts" list */
export function listDrafts(): { key: string; savedAt: string | null; value: unknown }[] {
  const drafts: { key: string; savedAt: string | null; value: unknown }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const parsed = JSON.parse(localStorage.getItem(k) || 'null');
      if (parsed) drafts.push({ key: k.slice(PREFIX.length), savedAt: parsed.savedAt ?? null, value: parsed.value });
    }
  } catch {}
  return drafts.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
}

export function discardDraft(key: string) {
  try { localStorage.removeItem(PREFIX + key); } catch {}
}
