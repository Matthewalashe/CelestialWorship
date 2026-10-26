import { useState } from 'react';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { UI_LANGUAGES, setUILanguage, contentDefaults, useT, tr, type UILanguage } from '../i18n';
import { useProfile } from '../hooks/useProfile';

/**
 * Choosing the language changes the whole app: its words, and the Bible and hymns open in the same language.
 * Saved with the profile too, so a signed-in member gets it on every device.
 */
export function useChooseLanguage() {
  const { save } = useProfile();
  return (id: UILanguage) => {
    const { bibleVersion, hymnView } = contentDefaults(id);
    try {
      localStorage.setItem('cw-bible-version', bibleVersion);
      localStorage.setItem('cw-hymn-view', hymnView);
    } catch {}
    setUILanguage(id);
    save({ preferredLanguage: id }).catch(() => {});
  };
}

/** One language icon; a tap shows the languages to switch to */
export function LanguageSwitch() {
  const { lang } = useT();
  const choose = useChooseLanguage();
  const [open, setOpen] = useState(false);
  const current = UI_LANGUAGES.find(l => l.id === lang) ?? UI_LANGUAGES[0];
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="true"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm" style={{ color: 'var(--color-text-primary)' }}>
        <Languages size={18} aria-hidden style={{ color: 'var(--color-text-muted)' }} />
        <span className="flex-1 text-left">{tr('Language')}</span>
        <span className="font-semibold" lang={current.htmlLang}>{current.name}</span>
        <ChevronDown size={16} aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
      </button>
      {open && (
        <ul role="listbox" aria-label={tr('App language')} className="mt-1 ml-9 space-y-0.5">
          {UI_LANGUAGES.map(l => (
            <li key={l.id}>
              <button role="option" aria-selected={lang === l.id} onClick={() => { choose(l.id); setOpen(false); }} lang={l.htmlLang}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left"
                      style={{ color: 'var(--color-text-primary)', fontWeight: lang === l.id ? 600 : 400 }}>
                <span className="flex-1">{l.name}<span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>{l.english}</span></span>
                {lang === l.id && <Check size={16} aria-hidden style={{ color: 'var(--color-accent-brand)' }} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
