import { useCallback, useEffect, useState } from 'react';

/**
 * Interface language: English, Yorùbá and French.
 *
 * The app's own words are written in English and translated through catalogs keyed by the
 * English text (public/i18n/<lang>.json). `tr('Save')` returns the word in the chosen
 * language, or the English if there's no translation yet. Content (hymns, Bible, devotion) has its own language choices, which start
 * from this one. Translations should be reviewed by native speakers; corrections welcome.
 *
 * scripts/i18n.cjs wraps new text in tr() and lists strings that still need translating.
 */

export type UILanguage = 'en' | 'yo' | 'fr';

export const UI_LANGUAGES: { id: UILanguage; name: string; english: string; htmlLang: string; beta?: boolean }[] = [
  { id: 'en', name: 'English', english: 'English', htmlLang: 'en' },
  { id: 'yo', name: 'Yorùbá', english: 'Yoruba', htmlLang: 'yo' },
  { id: 'fr', name: 'Français', english: 'French', htmlLang: 'fr' },
];

type Entry = { en: string; yo: string; fr: string };

const STRINGS = {
  'nav.home': { en: 'Home', yo: 'Ilé', fr: 'Accueil' },
  'nav.services': { en: 'Service', yo: 'Ìsìn', fr: 'Culte' },
  'nav.hymns': { en: 'Hymnal', yo: 'Orin', fr: 'Cantiques' },
  'nav.bible': { en: 'Bible', yo: 'Bíbélì', fr: 'Bible' },
  'nav.more': { en: 'Menu', yo: 'Àkójọ', fr: 'Menu' },
  'nav.lessons': { en: 'Bible lessons', yo: 'Ẹ̀kọ́ Bíbélì', fr: 'Leçons bibliques' },
  'nav.devotion': { en: 'Devotion', yo: 'Ìfọkànsìn', fr: 'Dévotion' },
  'nav.library': { en: 'My notes', yo: 'Àkọsílẹ̀ mi', fr: 'Mes notes' },
  'nav.events': { en: 'Events', yo: 'Ètò ìjọ', fr: 'Événements' },
  'nav.prayer': { en: 'Prayer requests', yo: 'Ìbéèrè àdúrà', fr: 'Demandes de prière' },
  'nav.articles': { en: 'Articles', yo: 'Àròkọ', fr: 'Articles' },
  'nav.quiz': { en: 'Quizzes', yo: 'Ìdánwò', fr: 'Quiz' },
  'nav.learn': { en: 'Learn', yo: 'Ẹ̀kọ́', fr: 'Apprendre' },
  'nav.studio': { en: 'Studio', yo: 'Ilé iṣẹ́', fr: 'Studio' },
  'nav.stories': { en: 'Bible stories', yo: 'Ìtàn Bíbélì', fr: 'Histoires bibliques' },
  'nav.directory': { en: 'Parishes', yo: 'Àwọn ìjọ', fr: 'Paroisses' },
  'nav.give': { en: 'Give', yo: 'Ọrẹ', fr: 'Donner' },
  'nav.history': { en: 'Our Church', yo: 'Ìjọ wa', fr: 'Notre Église' },
  'nav.constitution': { en: 'Constitution', yo: 'Òfin ìjọ', fr: 'Constitution' },
  'nav.selector': { en: 'Plan hymns', yo: 'Yíyan orin', fr: 'Choisir les cantiques' },
  'nav.operator': { en: 'Project to screen', yo: 'Ìfihàn', fr: 'Projeter à l’écran' },
  'nav.profile': { en: 'Profile & settings', yo: 'Ìwé mi', fr: 'Profil et réglages' },
  'nav.live': { en: 'Livestreams', yo: 'Ní tààrà', fr: 'En direct' },
  'nav.moderate': { en: 'Moderation', yo: 'Àbójútó', fr: 'Modération' },
  'nav.admin': { en: 'Admin dashboard', yo: 'Pátákó alákòóso', fr: 'Tableau de bord' },
  'nav.install': { en: 'Get the app', yo: 'Gba ìṣàfilọ́lẹ̀', fr: 'Installer l’app' },
  'nav.space': { en: 'Parish space', yo: 'Ààyè ìjọ', fr: 'Espace paroissial' },
  'nav.maps': { en: 'Bible maps', yo: 'Máàpù Bíbélì', fr: 'Cartes bibliques' },
  'nav.structure': { en: 'Ranks & symbols', yo: 'Ipò àti àmì', fr: 'Rangs et symboles' },

  'home.morning': { en: 'Good Morning', yo: 'Ẹ káàárọ̀', fr: 'Bonjour' },
  'home.afternoon': { en: 'Good Afternoon', yo: 'Ẹ káàsán', fr: 'Bon après-midi' },
  'home.evening': { en: 'Good Evening', yo: 'Ẹ káalẹ́', fr: 'Bonsoir' },
  'home.night': { en: 'Peace Be Unto You', yo: 'Àlàáfíà fún yín', fr: 'La paix soit avec vous' },
  'home.verseOfDay': { en: 'Verse of the Day', yo: 'Ẹsẹ Ọjọ́ Òní', fr: 'Verset du jour' },
  'home.todaysServices': { en: "Today's Services", yo: 'Ìsìn Òní', fr: 'Cultes du jour' },
  'home.startDevotion': { en: 'Start Devotion', yo: 'Bẹ̀rẹ̀ Ìfọkànsìn', fr: 'Commencer la dévotion' },
  'home.continue': { en: 'Continue', yo: 'Tẹ̀síwájú', fr: 'Continuer' },
  'home.quickActions': { en: 'Quick Actions', yo: 'Àwọn ọ̀nà kíákíá', fr: 'Accès rapide' },
  'home.upcoming': { en: 'Upcoming', yo: 'Ohun tó ń bọ̀', fr: 'À venir' },
  'home.streak': { en: 'day streak', yo: 'ọjọ́ léraléra', fr: 'jours d’affilée' },

  'common.save': { en: 'Save', yo: 'Fi pamọ́', fr: 'Enregistrer' },
  'common.cancel': { en: 'Cancel', yo: 'Fagilé', fr: 'Annuler' },
  'common.next': { en: 'Next', yo: 'Tẹ̀síwájú', fr: 'Suivant' },
  'common.back': { en: 'Back', yo: 'Padà', fr: 'Retour' },
  'common.skip': { en: 'Skip', yo: 'Fò ó', fr: 'Passer' },
  'common.done': { en: 'Done', yo: 'Ó parí', fr: 'Terminé' },
  'common.signIn': { en: 'Sign in', yo: 'Wọlé', fr: 'Se connecter' },
  'common.signOut': { en: 'Sign out', yo: 'Jáde', fr: 'Se déconnecter' },
  'common.share': { en: 'Share', yo: 'Pín', fr: 'Partager' },
  'common.search': { en: 'Search', yo: 'Wá', fr: 'Rechercher' },

  'onboarding.welcomeTitle': { en: 'Welcome to CelestialWorship', yo: 'Ẹ káàbọ̀ sí CelestialWorship', fr: 'Bienvenue sur CelestialWorship' },
  'onboarding.welcomeBody': {
    en: 'Hymns, the Bible, the Order of Service and your devotion, together, and working offline.',
    yo: 'Orin, Bíbélì, Ètò Ìsìn àti ìfọkànsìn rẹ, papọ̀, ó sì ń ṣiṣẹ́ láìsí íntánẹ́ẹ̀tì.',
    fr: 'Les cantiques, la Bible, l’ordre du culte et votre dévotion, réunis, et disponibles hors ligne.',
  },
  'onboarding.getStarted': { en: 'Get started', yo: 'Bẹ̀rẹ̀', fr: 'Commencer' },
  'onboarding.languageTitle': { en: 'Your languages', yo: 'Èdè rẹ', fr: 'Vos langues' },
  'onboarding.aboutTitle': { en: 'About you', yo: 'Nípa rẹ', fr: 'À propos de vous' },
  'onboarding.parishTitle': { en: 'Your parish', yo: 'Ìjọ rẹ', fr: 'Votre paroisse' },
  'onboarding.remindersTitle': { en: 'Reminders', yo: 'Ìránnilétí', fr: 'Rappels' },
  'onboarding.accountTitle': { en: 'Keep it safe', yo: 'Pa á mọ́', fr: 'Gardez-le en sécurité' },
  'onboarding.finish': { en: 'Enter', yo: 'Wọlé', fr: 'Entrer' },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

const KEY = 'cw-ui-language';
const CHANGE_EVENT = 'cw-ui-language-changed';
const isLang = (v: unknown): v is UILanguage => v === 'en' || v === 'yo' || v === 'fr';
// Egun (Gun) waits until its translation is ready (data-src/i18n_review/egun.csv); anyone who chose it reads French
const known = (v: unknown): UILanguage | null => (v === 'egun' ? 'fr' : isLang(v) ? v : null);

export function getUILanguage(): UILanguage {
  try {
    const stored = known(localStorage.getItem(KEY));
    if (stored) return stored;
    // The language saved with the profile (read directly: the profile module uses this one)
    const fromProfile = known(JSON.parse(localStorage.getItem('cw-profile') || '{}').preferredLanguage);
    if (fromProfile) return fromProfile;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.startsWith('yo') ? 'yo' : nav.startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

// ── Catalogs ─────────────────────────────────────────────────

type Catalog = Record<string, string>;
const catalogs: Partial<Record<UILanguage, Catalog>> = {};
const CACHE = (l: UILanguage) => `cw-i18n-${l}`;
let current: UILanguage = 'en';
let version = 0;

const chain = (l: UILanguage): UILanguage[] => (l === 'en' ? [] : [l]);

function fromCache(l: UILanguage) {
  if (catalogs[l]) return;
  try {
    const raw = localStorage.getItem(CACHE(l));
    if (raw) catalogs[l] = JSON.parse(raw);
  } catch {}
}

async function fetchCatalog(l: UILanguage): Promise<boolean> {
  try {
    const res = await fetch(`/i18n/${l}.json`);
    if (!res.ok) return false;
    const text = await res.text();
    const fresh = JSON.parse(text) as Catalog;
    const changed = JSON.stringify(catalogs[l]) !== text;
    catalogs[l] = fresh;
    try { localStorage.setItem(CACHE(l), text); } catch {}
    return changed;
  } catch {
    return false;
  }
}

function announce() {
  version++;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Use a language: the cached catalog straight away, then the latest from the server */
function activate(l: UILanguage) {
  current = l;
  document.documentElement.lang = UI_LANGUAGES.find(x => x.id === l)?.htmlLang ?? 'en';
  const langs = chain(l);
  langs.forEach(fromCache);
  const missing = langs.some(x => !catalogs[x]);
  Promise.all(langs.map(fetchCatalog)).then(changed => {
    // Re-render only when the screen would show different words
    if (current === l && missing && changed.some(Boolean)) announce();
  });
}

if (typeof window !== 'undefined') activate(getUILanguage());

export function setUILanguage(lang: UILanguage) {
  // Loaded when needed, so the words never wait on (or depend on) the analytics
  if (lang !== current) { const from = current; import('../hooks/useAnalytics').then(m => m.trackEvent('language_changed', { to: lang, from })).catch(() => {}); }
  try { localStorage.setItem(KEY, lang); } catch {}
  activate(lang);
  announce();
}

/** The app's words in the chosen language. Anything that isn't a known English string passes through. */
export function tr<T>(text: T): T {
  if (current === 'en' || typeof text !== 'string') return text;
  for (const l of chain(current)) {
    const hit = catalogs[l]?.[text];
    if (hit) return hit as T;
  }
  return text;
}

export function translate(key: StringKey, lang: UILanguage = current): string {
  const e: Entry = STRINGS[key];
  return e[lang] || e.en;
}

/** Changes whenever the words on screen should change (language picked, catalog arrived) */
export function useLanguageVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    const sync = () => setV(version);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  return `${current}:${v}`;
}

/** const { t, lang, setLang } = useT(); t('nav.home') */
export function useT() {
  const [lang, setLang] = useState<UILanguage>(current);
  useEffect(() => {
    const sync = () => setLang(current);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  const t = useCallback((key: StringKey) => translate(key, lang), [lang]);
  return { t, lang, setLang: setUILanguage };
}

/** Where content starts for a reader who hasn't chosen: Bible version and hymn view from the app language */
export function contentDefaults(lang: UILanguage = current): { bibleVersion: string; hymnView: 'yo' | 'both' | 'en' } {
  if (lang === 'yo') return { bibleVersion: 'yo', hymnView: 'yo' };
  if (lang === 'fr') return { bibleVersion: 'fr', hymnView: 'both' };
  return { bibleVersion: 'en', hymnView: 'both' };
}
