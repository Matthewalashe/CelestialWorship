import { useState, useEffect } from 'react';
import { Languages, Plus, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useDraft } from '../hooks/useDraft';
import { raise, errorMessage } from '../lib/backend';
import { showToast } from './Toast';
import type { Hymn } from '../types';
import { stanzaLabel } from '../utils/hymnText';

/**
 * Egun and French translations of a hymn, contributed by members and published by moderators.
 * Published translations are cached on the device so they work offline afterwards.
 */

type TranslationLanguage = 'egun' | 'fr';
const LANGUAGE_NAMES: Record<TranslationLanguage, string> = { egun: 'Egun (Gun)', fr: 'Français' };

interface Translation {
  id: string;
  language: TranslationLanguage;
  title: string | null;
  stanzas: { kind: 'verse' | 'chorus'; number: number | null; lines: string[] }[];
  source: string | null;
}

const cacheKey = (n: number) => `cw-hymn-translations-${n}`;

function readCache(n: number): Translation[] {
  try { return JSON.parse(localStorage.getItem(cacheKey(n)) || '[]'); } catch { return []; }
}

export function HymnTranslations({ hymn, fontSize }: { hymn: Hymn; fontSize: number }) {
  const { user } = useAuth();
  const [translations, setTranslations] = useState<Translation[]>(() => readCache(hymn.number));
  const [showing, setShowing] = useState<TranslationLanguage | null>(null);
  const [contributing, setContributing] = useState(false);

  useEffect(() => {
    setTranslations(readCache(hymn.number));
    setShowing(null);
    supabase.from('hymn_translations').select('id, language, title, stanzas, source')
      .eq('hymn_number', hymn.number).eq('status', 'published')
      .then(({ data, error }) => {
        if (error || !data) return;
        setTranslations(data as Translation[]);
        try { localStorage.setItem(cacheKey(hymn.number), JSON.stringify(data)); } catch {}
      });
  }, [hymn.number]);

  const shown = translations.find(t => t.language === showing);

  return (
    <section className="mt-8 pt-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <Languages size={16} style={{ color: 'var(--color-text-muted)' }} />
        {translations.map(t => (
          <button key={t.id} onClick={() => setShowing(showing === t.language ? null : t.language)} aria-pressed={showing === t.language}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={showing === t.language
                    ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                    : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {LANGUAGE_NAMES[t.language]}
          </button>
        ))}
        {translations.length === 0 && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No Egun or French translation yet.</span>}
        {user && (
          <button onClick={() => setContributing(true)} className="ml-auto text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}>
            <Plus size={14} /> Contribute a translation
          </button>
        )}
      </div>

      {shown && (
        <div className="mt-4 space-y-5" style={{ fontSize }}>
          {shown.title && <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{shown.title}</p>}
          {shown.stanzas.map((s, i) => (
            <div key={i} className={s.kind === 'chorus' ? 'pl-4 border-l-2 italic' : ''} style={{ borderColor: 'color-mix(in srgb, var(--color-accent-gold) 50%, transparent)' }}>
              <p className="text-[0.6em] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-accent-gold)' }}>
                {s.kind === 'chorus' ? (shown.language === 'fr' ? 'Refrain' : 'Chorus') : s.number}
              </p>
              {s.lines.map((l, j) => <p key={j} style={{ color: 'var(--color-text-primary)' }}>{l}</p>)}
            </div>
          ))}
          {shown.source && <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Source: {shown.source}</p>}
        </div>
      )}

      {contributing && <ContributeForm hymn={hymn} onClose={() => setContributing(false)} />}
    </section>
  );
}

function ContributeForm({ hymn, onClose }: { hymn: Hymn; onClose: () => void }) {
  const { user } = useAuth();
  const draft = useDraft<{ language: TranslationLanguage; title: string; stanzas: string[]; source: string }>(
    `translation:${hymn.number}`, { language: 'fr', title: '', stanzas: hymn.verses.map(() => ''), source: '' });
  const v = draft.value;
  const [busy, setBusy] = useState(false);
  const filled = v.stanzas.filter(s => s.trim()).length;

  const submit = async () => {
    if (!user || !filled || v.source.trim().length < 3) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('hymn_translations').insert({
        hymn_number: hymn.number, language: v.language, title: v.title.trim() || null, source: v.source.trim(),
        contributor_id: user.id, status: 'submitted',
        stanzas: hymn.verses.map((verse, i) => ({ kind: verse.kind, number: verse.number, lines: v.stanzas[i]?.split('\n').map(l => l.trim()).filter(Boolean) ?? [] }))
          .filter(s => s.lines.length),
      });
      raise(error, 'Sending your translation');
      draft.clear();
      showToast('Thank you — a moderator will review it');
      onClose();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'w-full rounded-xl px-3 py-2 text-sm border outline-none';
  const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto space-y-3"
           style={{ backgroundColor: 'var(--color-bg-secondary)' }} onClick={e => e.stopPropagation()} role="dialog" aria-label="Contribute a translation">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Translate hymn {hymn.number}</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        <div className="flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }}>
          {(['fr', 'egun'] as const).map(l => (
            <button key={l} onClick={() => draft.setValue({ language: l })} aria-pressed={v.language === l} className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                    style={v.language === l ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
        <input value={v.title} onChange={e => draft.setValue({ title: e.target.value })} placeholder="Title (optional)" className={inputClass} style={inputStyle} />
        {hymn.verses.map((verse, i) => (
          <div key={i}>
            <p className="text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {stanzaLabel(verse)} — <span className="normal-case font-normal">{verse.yorubaLines[0] ?? verse.englishLines[0]}</span>
            </p>
            <textarea value={v.stanzas[i] ?? ''} rows={Math.max(3, verse.yorubaLines.length)} placeholder="One line per line of the hymn"
                      onChange={e => draft.setValue(d => ({ ...d, stanzas: d.stanzas.map((s, j) => (j === i ? e.target.value : s)) }))}
                      className={inputClass} style={inputStyle} />
          </div>
        ))}
        <input value={v.source} onChange={e => draft.setValue({ source: e.target.value })}
               placeholder="Source: e.g. “Parish hymn book, Cotonou (with permission)” or “My own translation”" className={inputClass} style={inputStyle} />
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Only submit texts you wrote yourself or have permission to share.</p>
        <button onClick={submit} disabled={busy || !filled || v.source.trim().length < 3} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
          Submit for review
        </button>
      </div>
    </div>
  );
}
