import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2, Bookmark, BookmarkCheck, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { loadChapter, preferredBibleVersion } from '../hooks/useBible';
import { useSavedPassages } from '../hooks/useNotes';
import { getBibleVersion } from '../data/bibleVersions';
import { parseReference } from '../utils/parseReference';
import type { DailyVerse } from '../data/dailyVerses';
import { showToast } from './Toast';
import { useT, tr } from '../i18n';

/**
 * Today's verse in the reader's own Bible (KJV, Bíbélì Mímọ́ or Louis Segond), with the verses around it a tap
 * away, and ways to keep it: read the chapter, save it to the library, share it.
 */
export function VerseOfTheDay({ verse }: { verse: DailyVerse }) {
  const { t } = useT();
  const ref = useMemo(() => parseReference(verse.reference), [verse.reference]);
  const [versionId, setVersionId] = useState(() => preferredBibleVersion());
  const [chapter, setChapter] = useState<Record<string, string> | null>(null);
  const [around, setAround] = useState(false);
  const [saved, setSaved] = useState(false);
  const { savePassage } = useSavedPassages();

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    (async () => {
      const wanted = preferredBibleVersion();
      // The reader's version may not have the chapter yet (a 1900 chapter in review): the KJV then
      const data = (await loadChapter(ref.book, ref.chapter, wanted)) ?? (wanted !== 'en' ? await loadChapter(ref.book, ref.chapter, 'en') : null);
      if (cancelled || !data) return;
      setChapter(data.verses);
      setVersionId(data.versionId);
    })();
    return () => { cancelled = true; };
  }, [ref]);

  const range = ref ? Array.from({ length: ref.verseEnd - ref.verseStart + 1 }, (_, i) => ref.verseStart + i) : [];
  const text = chapter ? range.map(n => chapter[n]).filter(Boolean).join(' ') : verse.text;
  const version = getBibleVersion(versionId);
  const place = ref ? `${tr(ref.book)} ${ref.chapter}:${ref.verseStart}${ref.verseEnd > ref.verseStart ? `–${ref.verseEnd}` : ''}` : verse.reference;
  const context = ref && chapter
    ? Object.entries(chapter).map(([n, v]) => [Number(n), v] as [number, string])
        .filter(([n]) => n >= ref.verseStart - 3 && n <= ref.verseEnd + 3).sort((a, b) => a[0] - b[0])
    : [];
  const chapterPath = `${verse.path.split('?')[0]}?lang=${versionId}&v=${ref?.verseStart ?? 1}`;

  const share = async () => {
    const body = `“${text}” — ${place} (${version.abbreviation})`;
    if (navigator.share) { try { await navigator.share({ title: place, text: body, url: `${window.location.origin}${chapterPath}` }); return; } catch {} }
    try { await navigator.clipboard.writeText(body); showToast(tr('Copied')); } catch {}
  };

  const save = async () => {
    if (!ref || saved) return;
    try {
      await savePassage(ref.book, ref.chapter, ref.verseStart, ref.verseEnd, text, 'favorite');
      setSaved(true);
      showToast(tr('Saved to your library'));
    } catch {
      showToast(tr('Could not save — try again'));
    }
  };

  const action = 'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl';
  return (
    <section aria-labelledby="votd" className="space-y-4">
      <h2 id="votd" className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{t('home.verseOfDay')}</h2>
      <figure className="space-y-3">
        <blockquote className="text-[1.4rem] leading-relaxed" style={{ color: 'var(--color-text-primary)', fontFamily: 'Literata, Georgia, serif' }} lang={version.language}>
          “{text}”
        </blockquote>
        <figcaption className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          {place} <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>· {version.abbreviation}</span>
        </figcaption>
      </figure>

      {around && context.length > 0 && (
        <ol className="space-y-2 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-bg-card)' }} lang={version.language}>
          {context.map(([n, v]) => {
            const it = ref && n >= ref.verseStart && n <= ref.verseEnd;
            return (
              <li key={n} className="flex gap-3 text-[15px] leading-relaxed" style={{ color: it ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: it ? 600 : 400 }}>
                <span className="text-[0.7em] font-bold pt-1 w-5 shrink-0 text-right" style={{ color: 'var(--color-accent-brand)' }}>{n}</span><span>{v}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-1.5 -ml-3">
        {context.length > 0 && (
          <button onClick={() => setAround(a => !a)} aria-expanded={around} className={action} style={{ color: 'var(--color-text-secondary)' }}>
            {around ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />} {around ? tr('Hide the passage') : tr('The verses around it')}
          </button>
        )}
        <Link to={chapterPath} className={action} style={{ color: 'var(--color-accent-brand)' }}><BookOpen size={15} aria-hidden /> {tr('Read the chapter')}</Link>
        <button onClick={save} disabled={!ref} className={action} aria-pressed={saved} style={{ color: saved ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
          {saved ? <BookmarkCheck size={15} aria-hidden /> : <Bookmark size={15} aria-hidden />} {saved ? tr('Saved') : tr('Save')}
        </button>
        <button onClick={share} className={action} style={{ color: 'var(--color-text-secondary)' }}><Share2 size={15} aria-hidden /> {tr('Share')}</button>
      </div>
    </section>
  );
}
