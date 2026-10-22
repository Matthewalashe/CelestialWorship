import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, Check, X, ChevronRight, RotateCcw, Share2, Trophy } from 'lucide-react';
import { QUIZ_TOPICS, QUESTION_BANKS, type QuizTopic, type QuizQuestion } from '../data/quizzes';
import { buildRound, buildHymnRound, readQuizProgress, saveQuizResult } from '../utils/quiz';
import { useHymns } from '../hooks/useHymns';
import { recordActivity } from '../hooks/useProgress';
import { usePageTitle } from '../hooks/usePageTitle';
import { parseReference, referenceToPath } from '../utils/parseReference';
import { showToast } from '../components/Toast';

const ROUND_SIZE = 10;
const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

/** A source that is a Bible reference becomes a link to the passage */
function SourceLink({ source }: { source: string }) {
  const first = source.split(';')[0].trim();
  const ref = /\d+:\d+/.test(first) ? parseReference(first) : null;
  if (ref) return <Link to={referenceToPath(ref)} className="font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{source}</Link>;
  const hymn = first.match(/^Hymn (\d+)$/);
  if (hymn) return <Link to={`/hymns/${hymn[1]}`} className="font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{source}</Link>;
  if (/^Constitution/.test(first)) return <Link to="/constitution" className="font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{source}</Link>;
  return <span className="font-semibold">{source}</span>;
}

function TopicPicker({ onPick }: { onPick: (t: QuizTopic) => void }) {
  const progress = readQuizProgress();
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>
        <GraduationCap size={24} style={{ color: 'var(--color-accent-gold)' }} /> Quizzes
      </h1>
      <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
        Ten questions a round. Every answer comes with an explanation and where to read more.
      </p>
      <ul className="space-y-3">
        {(Object.keys(QUIZ_TOPICS) as QuizTopic[]).map(t => {
          const p = progress[t];
          const total = t === 'hymns' ? null : QUESTION_BANKS[t].length;
          return (
            <li key={t}>
              <button onClick={() => onPick(t)} className="w-full text-left rounded-2xl border p-4 flex items-center gap-4" style={card}>
                <span className="text-3xl" aria-hidden>{QUIZ_TOPICS[t].icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{QUIZ_TOPICS[t].title}</span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{QUIZ_TOPICS[t].description}</span>
                  {p.attempts > 0 && (
                    <span className="block text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Best {p.best}%{total ? ` · learnt ${Math.min(p.mastered.length, total)} of ${total}` : ''}
                    </span>
                  )}
                </span>
                <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Quiz() {
  usePageTitle('quiz', 'Quizzes');
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') as QuizTopic | null;
  const { hymns } = useHymns();
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const questions: QuizQuestion[] = useMemo(() => {
    if (!topic || !(topic in QUIZ_TOPICS)) return [];
    if (topic === 'hymns') return buildHymnRound(hymns, ROUND_SIZE, seed);
    return buildRound(topic, ROUND_SIZE, seed, readQuizProgress()[topic].mastered);
  }, [topic, seed, hymns]);

  useEffect(() => { setIndex(0); setChosen(null); setCorrect([]); setFinished(false); }, [topic, seed]);

  if (!topic || !(topic in QUIZ_TOPICS)) return <TopicPicker onPick={t => setParams({ topic: t })} />;
  if (!questions.length) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Preparing questions…</p>;

  const q = questions[index];
  const answered = chosen !== null;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    if (i === q.answer) setCorrect(c => [...c, q.id]);
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setChosen(null);
    } else {
      saveQuizResult(topic, correct, correct.length, questions.length);
      recordActivity('quiz');
      setFinished(true);
    }
  };

  if (finished) {
    const percent = Math.round((correct.length / questions.length) * 100);
    const message = percent === 100 ? 'Excellent — every answer right!' : percent >= 70 ? 'Well done!' : percent >= 40 ? 'Good effort — keep learning.' : 'Keep going — every round teaches something new.';
    const share = async () => {
      const text = `I scored ${correct.length}/${questions.length} in the ${QUIZ_TOPICS[topic].title} quiz on CelestialWorship.`;
      const url = `${window.location.origin}/quiz?topic=${topic}`;
      if (navigator.share) { try { await navigator.share({ text, url }); return; } catch {} }
      try { await navigator.clipboard.writeText(`${text} ${url}`); showToast('Copied'); } catch {}
    };
    return (
      <div className="px-4 py-12 max-w-md mx-auto text-center space-y-4">
        <Trophy size={48} className="mx-auto" style={{ color: 'var(--color-accent-gold)' }} />
        <p className="text-5xl font-black font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{correct.length}/{questions.length}</p>
        <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button onClick={() => setSeed(s => s + 1)} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"><RotateCcw size={16} /> Another round</button>
          <button onClick={share} className="px-5 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Share2 size={16} /> Share</button>
          <button onClick={() => setParams({})} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Other quizzes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setParams({})} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ {QUIZ_TOPICS[topic].title}</button>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{index + 1} / {questions.length} · {correct.length} right</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%`, backgroundColor: 'var(--color-accent-gold)' }} />
      </div>

      <h2 className="text-xl font-bold font-[Outfit] leading-snug mb-5" style={{ color: 'var(--color-text-primary)' }}>{q.question}</h2>
      <div className="space-y-2" role="radiogroup">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const isChosen = i === chosen;
          const style = !answered
            ? { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }
            : isAnswer
              ? { backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)', borderColor: 'var(--color-success)', color: 'var(--color-text-primary)' }
              : isChosen
                ? { backgroundColor: 'color-mix(in srgb, var(--color-warning) 15%, transparent)', borderColor: 'var(--color-warning)', color: 'var(--color-text-primary)' }
                : { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' };
          return (
            <button key={i} role="radio" aria-checked={isChosen} onClick={() => choose(i)} disabled={answered}
                    className="w-full text-left p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors" style={style}>
              <span className="flex-1">{opt}</span>
              {answered && isAnswer && <Check size={18} style={{ color: 'var(--color-success)' }} />}
              {answered && isChosen && !isAnswer && <X size={18} style={{ color: 'var(--color-warning)' }} />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-5 p-4 rounded-2xl animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <p className="font-semibold mb-1" style={{ color: chosen === q.answer ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {chosen === q.answer ? 'Correct!' : `The answer is: ${q.options[q.answer]}`}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{q.explanation}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Source: <SourceLink source={q.source} /></p>
          <button onClick={next} className="btn-primary w-full mt-4 py-3 rounded-xl text-sm font-semibold">
            {index + 1 < questions.length ? 'Next question' : 'See my score'}
          </button>
        </div>
      )}
    </div>
  );
}
