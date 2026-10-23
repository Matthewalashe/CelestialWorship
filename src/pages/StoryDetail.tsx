import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, BookOpen } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useStory, useStoryCollections, markStoryRead } from '../lib/stories';
import { parseReference, referenceToPath } from '../utils/parseReference';
import { ReaderButtons, ReaderFrame, useReadingStyle } from '../components/Reader';
import { useReader } from '../hooks/useReader';

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { story, error } = useStory(id);
  const { data: collections } = useStoryCollections();
  const { reading } = useReader();
  const navigate = useNavigate();
  const readingStyle = useReadingStyle();
  const [speaking, setSpeaking] = useState(false);
  usePageTitle('story', story ? `${story.title} — Bible stories` : 'Bible stories');

  useEffect(() => { if (story) markStoryRead(story.id); }, [story]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, [id]);

  if (error) return <p className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>{error} · <Link to="/stories" className="underline">All stories</Link></p>;
  if (!story) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>;

  const collection = collections.find(c => c.stories.some(s => s.id === story.id));
  const list = collection?.stories ?? [];
  const at = list.findIndex(s => s.id === story.id);
  const prev = at > 0 ? list[at - 1] : null;
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  // "Genesis 6–7" opens at chapter 6; "Matthew 2:13-23" keeps its verses
  const first = story.ref.split(';')[0].trim().replace(/–/g, '-');
  const firstRef = parseReference(first.includes(':') ? first : first.replace(/-\d+$/, ''));

  const readAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance([story.title, ...story.paragraphs].join('\n\n'));
    u.lang = 'en-GB'; u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel(); window.dispatchEvent(new Event('cw-speech-start')); synth.speak(u);
    setSpeaking(true);
  };

  const body = (
    <>
      {story.paragraphs.map((p, i) => <p key={i} className="mb-[0.9em]">{p}</p>)}
      {story.questions.length > 0 && (
        <section className="mt-8 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Talk about it</h2>
          <ol className="list-decimal pl-5 space-y-1">{story.questions.map(q => <li key={q}>{q}</li>)}</ol>
        </section>
      )}
    </>
  );

  return (
    <article className="px-4 py-5 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Link to={`/stories${collection ? `?c=${collection.id}` : ''}`} className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>‹ {collection?.title ?? 'Bible stories'}</Link>
        {'speechSynthesis' in window && (
          <button onClick={readAloud} aria-label={speaking ? 'Stop reading' : 'Read the story aloud'} className="h-9 px-2.5 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--color-bg-card)', color: speaking ? 'var(--color-accent-brand)' : 'var(--color-text-secondary)' }}>
            {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />} <span className="hidden sm:inline">{speaking ? 'Stop' : 'Read to me'}</span>
          </button>
        )}
        <ReaderButtons />
      </div>

      {story.image && (
        <figure className="rounded-2xl overflow-hidden mb-5" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <img src={story.image.src} alt={story.title} width={640} height={480} className="w-full h-auto" />
        </figure>
      )}
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-accent-gold)' }}>Story {story.number}</p>
      <h1 className="text-3xl font-bold font-[Outfit] mt-1 leading-tight" style={{ color: 'var(--color-text-primary)' }}>{story.title}</h1>
      {firstRef ? (
        <Link to={referenceToPath(firstRef)} className="inline-flex items-center gap-1 text-sm font-semibold mt-2" style={{ color: 'var(--color-accent-brand)' }}>
          <BookOpen size={15} /> Read it in the Bible: {story.ref}
        </Link>
      ) : <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>{story.ref}</p>}

      <div className="mt-6" style={{ ...readingStyle, fontSize: `calc(${readingStyle.fontSize} + 1px)`, color: 'var(--color-text-primary)' }}>{body}</div>

      <nav className="flex justify-between gap-2 mt-8 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }} aria-label="More stories">
        {prev ? <Link to={`/stories/${prev.id}`} className="text-sm inline-flex items-center gap-1 max-w-[48%]" style={{ color: 'var(--color-text-primary)' }}><ChevronLeft size={16} className="shrink-0" /><span className="truncate">{prev.title}</span></Link> : <span />}
        {next ? <Link to={`/stories/${next.id}`} className="text-sm font-semibold inline-flex items-center gap-1 max-w-[48%] text-right" style={{ color: 'var(--color-accent-brand)' }}><span className="truncate">{next.title}</span><ChevronRight size={16} className="shrink-0" /></Link> : <span />}
      </nav>

      {story.image && (
        <p className="text-[11px] mt-6" style={{ color: 'var(--color-text-muted)' }}>
          Picture: Jim Padgett, Sweet Publishing / Gospel Light, CC BY-SA 3.0 — <a href={story.image.source} target="_blank" rel="noopener noreferrer" className="underline">source</a>.
          {story.id.startsWith('cl-') && ' Text: Mary A. Lathbury, 1898 (public domain).'}
        </p>
      )}

      {reading && (
        <ReaderFrame title={story.title} place={`Story ${story.number} · ${story.ref}`}
                     prev={prev ? { label: prev.title, go: () => navigate(`/stories/${prev.id}`) } : undefined}
                     next={next ? { label: next.title, go: () => navigate(`/stories/${next.id}`) } : undefined}>
          {story.image && <img src={story.image.src} alt="" className="w-full h-auto rounded-lg mb-6" />}
          {body}
        </ReaderFrame>
      )}
    </article>
  );
}
