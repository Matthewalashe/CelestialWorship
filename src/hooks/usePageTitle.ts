import { useEffect } from 'react';

const BASE_TITLE = 'CelestialWorship';

const PAGE_TITLES: Record<string, string> = {
  home: 'CelestialWorship — Celestial Church of Christ Hymnal, Bible & Devotion',
  bible: 'Bible — KJV in English & Yoruba | CelestialWorship',
  bible_chapter: '',  // Dynamic - set by component
  hymns: 'CCC Hymns — 500+ Celestial Church Hymns | CelestialWorship',
  hymn_detail: '',  // Dynamic - set by component  
  services: 'Order of Service — CCC Liturgy | CelestialWorship',
  service_detail: '', // Dynamic
  devotion: 'Daily Devotion — Private Worship Guide | CelestialWorship',
  lessons: 'Bible Lessons 2026 — Weekly Readings | CelestialWorship',
  lesson_detail: '', // Dynamic
  constitution: 'CCC Constitution | CelestialWorship',
  notes: 'My Notes & Saved Passages | CelestialWorship',
  control: 'Broadcast Control | CelestialWorship',
  suggestions: 'Hymn Suggestions | CelestialWorship',
};

/**
 * Sets document.title for SEO and browser tab. 
 * For pages with dynamic titles (e.g. Bible chapters, individual hymns),
 * pass a custom title string.
 */
export function usePageTitle(pageKey: string, customTitle?: string) {
  useEffect(() => {
    if (customTitle) {
      document.title = `${customTitle} | ${BASE_TITLE}`;
    } else if (PAGE_TITLES[pageKey]) {
      document.title = PAGE_TITLES[pageKey];
    } else {
      document.title = BASE_TITLE;
    }
    return () => { document.title = BASE_TITLE; };
  }, [pageKey, customTitle]);
}
