import { Languages } from 'lucide-react';
import { UI_LANGUAGES, setUILanguage, useT, tr } from '../i18n';
import { useProfile } from '../hooks/useProfile';

const SHORT: Record<string, string> = { en: 'EN', yo: 'YO', fr: 'FR' };

/** The app's language, one tap away. `full` shows the languages' own names (for the menu). */
export function LanguageSwitch({ full = false }: { full?: boolean }) {
  const { lang } = useT();
  const { save } = useProfile();
  // Kept with the profile too, so a signed-in member gets it on every device
  const choose = (id: typeof UI_LANGUAGES[number]['id']) => {
    setUILanguage(id);
    save({ preferredLanguage: id }).catch(() => {});
  };
  return (
    <div role="group" aria-label={tr('App language')} className="inline-flex flex-wrap items-center gap-1">
      <Languages size={15} aria-hidden style={{ color: 'var(--color-text-muted)' }} />
      {UI_LANGUAGES.map(l => (
        <button key={l.id} onClick={() => choose(l.id)} aria-pressed={lang === l.id} lang={l.htmlLang}
                aria-label={l.name} title={l.name}
                className={`${full ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px] tracking-wide'} rounded-full font-semibold border`}
                style={lang === l.id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                                     : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {full ? l.name : SHORT[l.id]}
        </button>
      ))}
    </div>
  );
}
