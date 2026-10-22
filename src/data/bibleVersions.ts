/**
 * Bible versions the reader can show.
 *
 * - Local versions ship as JSON in /public/data/bible/<dir>/<Book>.json (works offline).
 * - Licensed versions (NKJV, NLT, AMP, NIV…) are copyrighted and are only shown through
 *   API.Bible under its licence. They appear when configured:
 *     VITE_BIBLE_PROXY_URL   recommended: a server proxy that holds the API key
 *                            (see supabase/functions/bible-proxy)
 *     VITE_API_BIBLE_KEY     or the key itself (dev / non-commercial only — it is public in the bundle)
 *     VITE_API_BIBLE_VERSIONS  JSON map of version id -> API.Bible bibleId,
 *                            e.g. {"nkjv":"…","nlt":"…","amp":"…","niv":"…"}
 *   NIV additionally needs Biblica's permission for commercial use.
 */

export type BibleLanguageCode = 'en' | 'yo';

export interface BibleVersion {
  /** Used in URLs (?lang=…). "en" and "yo" are kept for existing links. */
  id: string;
  abbreviation: string;
  name: string;
  language: BibleLanguageCode;
  source: { kind: 'local'; dir: string } | { kind: 'api'; bibleId: string };
  copyright: string;
  /** Text still being proofread — shown with a notice */
  preview?: boolean;
}

const LOCAL_VERSIONS: BibleVersion[] = [
  {
    id: 'en',
    abbreviation: 'KJV',
    name: 'King James Version',
    language: 'en',
    source: { kind: 'local', dir: 'en' },
    copyright: 'King James Version — public domain.',
  },
  {
    id: 'yo1900',
    abbreviation: 'Bibeli Mimọ',
    name: 'Bibeli Mimọ (1900)',
    language: 'yo',
    source: { kind: 'local', dir: 'yo1900' },
    copyright: 'Bibeli Mimọ, 1900 edition (Crowther translation, revised) — public domain. Digitised from the scan at archive.org (item YOROLD_DBS_HS); about 40% of chapters have passed checks so far, and the opening word of a chapter may be misread. Corrections welcome.',
    preview: true,
  },
  {
    id: 'yo',
    abbreviation: 'Yorùbá Òde-Òní',
    name: 'Bíbélì Mímọ́ ní Èdè Yorùbá Òde-Òní',
    language: 'yo',
    source: { kind: 'local', dir: 'yo' },
    copyright: 'Copyright © 2009, 2017 by Biblica, Inc. Used under the Creative Commons Attribution-ShareAlike 4.0 licence. The original work by Biblica, Inc. is available for free at www.biblica.com and open.bible.',
  },
];

const API_VERSION_META: Record<string, Omit<BibleVersion, 'source' | 'id'>> = {
  nkjv: { abbreviation: 'NKJV', name: 'New King James Version', language: 'en', copyright: 'Scripture taken from the New King James Version®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.' },
  nlt: { abbreviation: 'NLT', name: 'New Living Translation', language: 'en', copyright: 'Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers. All rights reserved.' },
  amp: { abbreviation: 'AMP', name: 'Amplified Bible', language: 'en', copyright: 'Scripture quotations taken from the Amplified® Bible (AMP), Copyright © 2015 by The Lockman Foundation. Used by permission. www.lockman.org' },
  niv: { abbreviation: 'NIV', name: 'New International Version', language: 'en', copyright: 'Scripture quotations taken from The Holy Bible, New International Version® NIV®. Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. All rights reserved worldwide.' },
};

function configuredApiVersions(): BibleVersion[] {
  const env = import.meta.env;
  if (!env.VITE_BIBLE_PROXY_URL && !env.VITE_API_BIBLE_KEY) return [];
  let ids: Record<string, string> = {};
  try {
    ids = JSON.parse(env.VITE_API_BIBLE_VERSIONS || '{}');
  } catch {
    console.warn('VITE_API_BIBLE_VERSIONS is not valid JSON');
  }
  return Object.entries(ids)
    .filter(([id, bibleId]) => API_VERSION_META[id] && bibleId)
    .map(([id, bibleId]) => ({ id, ...API_VERSION_META[id], source: { kind: 'api', bibleId } }));
}

/** KJV first: it is the church's preferred English version */
export const BIBLE_VERSIONS: BibleVersion[] = [
  LOCAL_VERSIONS[0],
  ...configuredApiVersions(),
  ...LOCAL_VERSIONS.slice(1),
];

export const DEFAULT_VERSION_ID = 'en';

export function getBibleVersion(id: string | null | undefined): BibleVersion {
  return BIBLE_VERSIONS.find(v => v.id === id) ?? BIBLE_VERSIONS[0];
}

/** Companion version for side-by-side reading: the other language, using a complete text */
export function companionVersion(version: BibleVersion): BibleVersion {
  if (version.language === 'yo') return BIBLE_VERSIONS[0];
  return BIBLE_VERSIONS.find(v => v.language === 'yo' && !v.preview) ?? BIBLE_VERSIONS[0];
}

/** USFM book codes used by API.Bible */
export const USFM_CODES: Record<string, string> = {
  Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU', Joshua: 'JOS', Judges: 'JDG',
  Ruth: 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA', '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH',
  '2 Chronicles': '2CH', Ezra: 'EZR', Nehemiah: 'NEH', Esther: 'EST', Job: 'JOB', Psalms: 'PSA', Proverbs: 'PRO',
  Ecclesiastes: 'ECC', 'Song of Solomon': 'SNG', Isaiah: 'ISA', Jeremiah: 'JER', Lamentations: 'LAM', Ezekiel: 'EZK',
  Daniel: 'DAN', Hosea: 'HOS', Joel: 'JOL', Amos: 'AMO', Obadiah: 'OBA', Jonah: 'JON', Micah: 'MIC', Nahum: 'NAM',
  Habakkuk: 'HAB', Zephaniah: 'ZEP', Haggai: 'HAG', Zechariah: 'ZEC', Malachi: 'MAL', Matthew: 'MAT', Mark: 'MRK',
  Luke: 'LUK', John: 'JHN', Acts: 'ACT', Romans: 'ROM', '1 Corinthians': '1CO', '2 Corinthians': '2CO', Galatians: 'GAL',
  Ephesians: 'EPH', Philippians: 'PHP', Colossians: 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH',
  '1 Timothy': '1TI', '2 Timothy': '2TI', Titus: 'TIT', Philemon: 'PHM', Hebrews: 'HEB', James: 'JAS', '1 Peter': '1PE',
  '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN', '3 John': '3JN', Jude: 'JUD', Revelation: 'REV',
};
