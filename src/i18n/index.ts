import { useCallback, useEffect, useState } from 'react';
import { readLocalProfile } from '../hooks/useProfile';

/**
 * Interface language. Content (hymns, Bible) has its own language choices;
 * this only translates the app's own words. Yorùbá strings should be reviewed
 * by a native speaker before release.
 */

export type UILanguage = 'en' | 'yo';

const STRINGS = {
  'nav.home': { en: 'Home', yo: 'Ilé' },
  'nav.services': { en: 'Service', yo: 'Ìsìn' },
  'nav.hymns': { en: 'Hymnal', yo: 'Orin' },
  'nav.bible': { en: 'Bible', yo: 'Bíbélì' },
  'nav.more': { en: 'Menu', yo: 'Àkójọ' },
  'nav.lessons': { en: 'Bible lessons', yo: 'Ẹ̀kọ́ Bíbélì' },
  'nav.devotion': { en: 'Devotion', yo: 'Ìfọkànsìn' },
  'nav.library': { en: 'My Library', yo: 'Àkójọ mi' },
  'nav.events': { en: 'Events', yo: 'Ètò ìjọ' },
  'nav.prayer': { en: 'Prayer requests', yo: 'Ìbéèrè àdúrà' },
  'nav.articles': { en: 'Articles', yo: 'Àròkọ' },
  'nav.quiz': { en: 'Quizzes', yo: 'Ìdánwò' },
  'nav.learn': { en: 'Learn', yo: 'Ẹ̀kọ́' },
  'nav.studio': { en: 'Studio', yo: 'Ilé iṣẹ́' },
  'nav.stories': { en: 'Bible stories', yo: 'Ìtàn Bíbélì' },
  'nav.directory': { en: 'Parishes', yo: 'Àwọn ìjọ' },
  'nav.give': { en: 'Give', yo: 'Ọrẹ' },
  'nav.history': { en: 'Our Church', yo: 'Ìjọ wa' },
  'nav.constitution': { en: 'Constitution', yo: 'Òfin ìjọ' },
  'nav.selector': { en: 'Plan hymns', yo: 'Yíyan orin' },
  'nav.operator': { en: 'Project to screen', yo: 'Ìfihàn' },
  'nav.profile': { en: 'Profile & settings', yo: 'Ìwé mi' },
  'nav.live': { en: 'Livestreams', yo: 'Ní tààrà' },
  'nav.moderate': { en: 'Moderation', yo: 'Àbójútó' },

  'home.morning': { en: 'Good Morning', yo: 'Ẹ káàárọ̀' },
  'home.afternoon': { en: 'Good Afternoon', yo: 'Ẹ káàsán' },
  'home.evening': { en: 'Good Evening', yo: 'Ẹ káalẹ́' },
  'home.night': { en: 'Peace Be Unto You', yo: 'Àlàáfíà fún yín' },
  'home.verseOfDay': { en: 'Verse of the Day', yo: 'Ẹsẹ Ọjọ́ Òní' },
  'home.todaysServices': { en: "Today's Services", yo: 'Ìsìn Òní' },
  'home.startDevotion': { en: 'Start Devotion', yo: 'Bẹ̀rẹ̀ Ìfọkànsìn' },
  'home.continue': { en: 'Continue', yo: 'Tẹ̀síwájú' },
  'home.quickActions': { en: 'Quick Actions', yo: 'Àwọn ọ̀nà kíákíá' },
  'home.upcoming': { en: 'Upcoming', yo: 'Ohun tó ń bọ̀' },
  'home.streak': { en: 'day streak', yo: 'ọjọ́ léraléra' },

  'common.save': { en: 'Save', yo: 'Fi pamọ́' },
  'common.cancel': { en: 'Cancel', yo: 'Fagilé' },
  'common.next': { en: 'Next', yo: 'Tẹ̀síwájú' },
  'common.back': { en: 'Back', yo: 'Padà' },
  'common.skip': { en: 'Skip', yo: 'Fò ó' },
  'common.done': { en: 'Done', yo: 'Ó parí' },
  'common.signIn': { en: 'Sign in', yo: 'Wọlé' },
  'common.signOut': { en: 'Sign out', yo: 'Jáde' },
  'common.share': { en: 'Share', yo: 'Pín' },
  'common.search': { en: 'Search', yo: 'Wá' },

  'onboarding.welcomeTitle': { en: 'Welcome to CelestialWorship', yo: 'Ẹ káàbọ̀ sí CelestialWorship' },
  'onboarding.welcomeBody': {
    en: 'Hymns, the Bible, the Order of Service and your devotion — together, and working offline.',
    yo: 'Orin, Bíbélì, Ètò Ìsìn àti ìfọkànsìn rẹ — papọ̀, ó sì ń ṣiṣẹ́ láìsí íntánẹ́ẹ̀tì.',
  },
  'onboarding.getStarted': { en: 'Get started', yo: 'Bẹ̀rẹ̀' },
  'onboarding.languageTitle': { en: 'Your languages', yo: 'Èdè rẹ' },
  'onboarding.aboutTitle': { en: 'About you', yo: 'Nípa rẹ' },
  'onboarding.parishTitle': { en: 'Your parish', yo: 'Ìjọ rẹ' },
  'onboarding.remindersTitle': { en: 'Reminders', yo: 'Ìránnilétí' },
  'onboarding.accountTitle': { en: 'Keep it safe', yo: 'Pa á mọ́' },
  'onboarding.finish': { en: 'Enter', yo: 'Wọlé' },
} as const;

export type StringKey = keyof typeof STRINGS;

const KEY = 'cw-ui-language';
const CHANGE_EVENT = 'cw-ui-language-changed';

export function getUILanguage(): UILanguage {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'en' || stored === 'yo') return stored;
    return readLocalProfile().preferredLanguage === 'yo' ? 'yo' : 'en';
  } catch {
    return 'en';
  }
}

export function setUILanguage(lang: UILanguage) {
  try { localStorage.setItem(KEY, lang); } catch {}
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function translate(key: StringKey, lang: UILanguage = getUILanguage()): string {
  return STRINGS[key][lang] ?? STRINGS[key].en;
}

/** const { t, lang, setLang } = useT(); t('nav.home') */
export function useT() {
  const [lang, setLang] = useState<UILanguage>(getUILanguage);
  useEffect(() => {
    document.documentElement.lang = lang;
    const sync = () => setLang(getUILanguage());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [lang]);
  const t = useCallback((key: StringKey) => translate(key, lang), [lang]);
  return { t, lang, setLang: setUILanguage };
}
