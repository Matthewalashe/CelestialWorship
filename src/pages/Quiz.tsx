import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, Check, X, ChevronRight, Timer, BookOpen, Map as MapIcon, CalendarCheck, Share2, Heart } from 'lucide-react';
import { QUIZ_TOPICS, QUESTION_BANKS, type QuizTopic, type QuizQuestion } from '../data/quizzes';
import { buildRound, buildHymnRound, readQuizProgress, saveQuizResult, seededShuffle, shuffleOptions } from '../utils/quiz';
import {
  ANSWER_MS, answerPoints, comboMultiplier, recordRound, recordDaily, dailySeed, dailyDoneToday, dailyShareText,
  type RoundOutcome,
} from '../utils/gamify';
import { postWeekXp } from '../lib/leaderboard';
import { useHymns } from '../hooks/useHymns';
import { recordActivity } from '../hooks/useProgress';
import { usePageTitle } from '../hooks/usePageTitle';
import { parseReference, referenceToPath } from '../utils/parseReference';
import { RoundSummary, LevelBar, BadgeShelf, Leaderboard, useGameState, shareText } from '../components/GameUi';
import { tr } from '../i18n';

const ROUND_SIZE = 10;
const LIVES = 3;
const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

type Mode = 'learn' | 'challenge' | 'daily';

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

/** Today's five questions, the same for everyone */
export function dailyQuestions(date = new Date()): QuizQuestion[] {
  const seed = dailySeed(date);
  const pick = (topic: Exclude<QuizTopic, 'hymns'>, n: number, offset: number) => seededShuffle(QUESTION_BANKS[topic], seed + offset).slice(0, n);
  return [...pick('bible', 2, 1), ...pick('geography', 1, 2), ...pick('doctrine', 1, 3), ...pick('constitution', 1, 4)]
    .map((q, i) => shuffleOptions(q, seed + i * 31));
}

// ── Home ─────────────────────────────────────────────────────

function Home({ onPlay }: { onPlay: (topic: QuizTopic | 'daily', mode: Mode) => void }) {
  const game = useGameState();
  const progress = readQuizProgress();
  const [picked, setPicked] = useState<QuizTopic | null>(null);
  const daily = dailyDoneToday();

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-2 mb-1" style={{ color: 'var(--color-text-primary)' }}>
          <GraduationCap size={24} style={{ color: 'var(--color-accent-gold)' }} /> Quizzes & games
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Learn as you play: every answer explains itself and shows you where to read more.')}</p>
      </div>

      <div className="p-4 rounded-2xl border" style={card}><LevelBar xp={game.xp} /></div>

      {/* Daily challenge */}
      <div className="p-4 rounded-2xl border flex items-center gap-4" style={{ ...card, borderColor: 'var(--color-accent-gold)' }}>
        <CalendarCheck size={30} style={{ color: 'var(--color-accent-gold)' }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Daily challenge')}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {daily ? <>{tr('Done today:')}{' '}{[...daily].map(m => (m === '1' ? '🟩' : '🟥')).join('')}</> : tr('Five questions, the same for everyone today.')}
            {game.daily.streak > 0 && ` · 🔥 ${game.daily.streak}-day streak`}
          </p>
        </div>
        {daily
          ? <button onClick={() => shareText(dailyShareText(daily, game.daily.streak), '/quiz?daily=1')} className="p-2 rounded-xl" aria-label={tr('Share today’s result')} style={{ color: 'var(--color-accent-brand)' }}><Share2 size={18} /></button>
          : <button onClick={() => onPlay('daily', 'daily')} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">{tr('Play')}</button>}
      </div>

      {/* Topics */}
      <ul className="space-y-3">
        {(Object.keys(QUIZ_TOPICS) as QuizTopic[]).map(t => {
          const p = progress[t];
          const total = t === 'hymns' ? null : QUESTION_BANKS[t].length;
          const open = picked === t;
          return (
            <li key={t} className="rounded-2xl border overflow-hidden" style={card}>
              <button onClick={() => setPicked(open ? null : t)} aria-expanded={open} className="w-full text-left p-4 flex items-center gap-4">
                <span className="text-3xl" aria-hidden>{QUIZ_TOPICS[t].icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(QUIZ_TOPICS[t].title)}</span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{tr(QUIZ_TOPICS[t].description)}</span>
                  {p.attempts > 0 && (
                    <span className="block text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{tr('Best')}{' '}{p.best}%{total ? ` · learnt ${Math.min(p.mastered.length, total)} of ${total}` : ''}
                    </span>
                  )}
                </span>
                <ChevronRight size={18} className={`transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
              </button>
              {open && (
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  <button onClick={() => onPlay(t, 'learn')} className="p-3 rounded-xl border text-left" style={{ borderColor: 'var(--color-border)' }}>
                    <BookOpen size={18} style={{ color: 'var(--color-accent-brand)' }} />
                    <span className="block text-sm font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{tr('Learn')}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('No clock. Take your time.')}</span>
                  </button>
                  <button onClick={() => onPlay(t, 'challenge')} className="p-3 rounded-xl border text-left" style={{ borderColor: 'var(--color-border)' }}>
                    <Timer size={18} style={{ color: 'var(--color-accent-gold)' }} />
                    <span className="block text-sm font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{tr('Challenge')}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('20 s a question, 3 lives, combos.')}</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Link to="/maps" className="p-4 rounded-2xl border flex items-center gap-4" style={card}>
        <MapIcon size={28} style={{ color: 'var(--color-accent-gold)' }} />
        <span className="flex-1">
          <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Bible map games')}</span>
          <span className="block text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tr('The journey of Jesus, Bible places today, old and new maps.')}</span>
        </span>
        <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
      </Link>

      <section>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Badges')}</h2>
        <BadgeShelf earned={game.badges} />
      </section>

      <section>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('This week’s leaderboard')}</h2>
        <Leaderboard />
      </section>
    </div>
  );
}

// ── A round ──────────────────────────────────────────────────

function Round({ topic, mode, questions, onExit, onAgain }: {
  topic: QuizTopic | 'daily'; mode: Mode; questions: QuizQuestion[]; onExit: () => void; onAgain?: () => void;
}) {
  const timed = mode !== 'learn';
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [gain, setGain] = useState<number | null>(null);
  const [lives, setLives] = useState(LIVES);
  const [left, setLeft] = useState(ANSWER_MS);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [streak, setStreak] = useState(0);
  const startedAt = useRef(Date.now());

  const q = questions[index];
  const answered = chosen !== null;

  useEffect(() => { startedAt.current = Date.now(); setLeft(ANSWER_MS); }, [index]);

  const choose = (i: number) => {
    if (answered) return;
    const ms = Date.now() - startedAt.current;
    const ok = i === q.answer;
    const nextCombo = ok ? combo + 1 : 0;
    const pts = answerPoints({ correct: ok, difficulty: q.difficulty, ms: timed ? ms : undefined, combo: nextCombo });
    setChosen(i);
    setMarks(m => [...m, ok]);
    setCombo(nextCombo);
    setBestCombo(b => Math.max(b, nextCombo));
    setXp(x => x + pts);
    setGain(ok ? pts : null);
    if (ok) setCorrectIds(c => [...c, q.id]);
    else if (mode === 'challenge') setLives(l => l - 1);
  };

  // Countdown; running out counts as a wrong answer
  useEffect(() => {
    if (!timed || answered) return;
    const t = setInterval(() => {
      const remaining = ANSWER_MS - (Date.now() - startedAt.current);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) choose(-1);
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- choose reads the current question
  }, [timed, answered, index]);

  const end = (finalMarks: boolean[]) => {
    const right = finalMarks.filter(Boolean).length;
    if (topic !== 'daily') saveQuizResult(topic, correctIds, right, finalMarks.length);
    else setStreak(recordDaily(finalMarks));
    recordActivity('quiz');
    setOutcome(recordRound({ xp, topic: topic === 'daily' ? undefined : topic, correct: right, total: finalMarks.length, bestCombo }));
    postWeekXp();
  };

  const next = () => {
    const out = mode === 'challenge' && lives <= 0;
    if (!out && index + 1 < questions.length) { setIndex(index + 1); setChosen(null); setGain(null); return; }
    end(marks);
  };

  if (outcome) {
    const right = marks.filter(Boolean).length;
    const title = topic === 'daily' ? 'Daily challenge' : QUIZ_TOPICS[topic].title;
    const dailyText = topic === 'daily' ? dailyShareText(marks.map(m => (m ? '1' : '0')).join(''), streak) : null;
    return (
      <div className="px-4">
        <RoundSummary
          outcome={outcome}
          headline={`${right}/${marks.length}`}
          sub={mode === 'challenge' && lives <= 0 ? 'Out of lives — well played!' : right === marks.length ? 'Every answer right!' : right / Math.max(marks.length, 1) >= 0.7 ? 'Well done!' : 'Keep going — every round teaches something new.'}
          shareText={dailyText ?? `I scored ${right}/${marks.length} in the ${title} quiz on CelestialWorship.`}
          sharePath={topic === 'daily' ? '/quiz?daily=1' : `/quiz?topic=${topic}`}
          onAgain={onAgain}
          extra={dailyText ? <p className="text-2xl tracking-widest" aria-label={`${right} of ${marks.length} right`}>{marks.map(m => (m ? '🟩' : '🟥')).join('')}</p> : undefined}
        />
        <p className="text-center"><button onClick={onExit} className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{tr('Back to quizzes')}</button></p>
      </div>
    );
  }

  const title = topic === 'daily' ? 'Daily challenge' : QUIZ_TOPICS[topic].title;
  return (
    <div className="px-4 py-6 max-w-xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-2 gap-2">
        <button onClick={onExit} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ {title}</button>
        <span className="text-xs font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
          {mode === 'challenge' && <span aria-label={`${lives} lives left`} className="inline-flex gap-0.5">{Array.from({ length: LIVES }, (_, i) => <Heart key={i} size={13} fill={i < lives ? '#EF4444' : 'none'} stroke="#EF4444" />)}</span>}
          {combo >= 3 && <span style={{ color: 'var(--color-accent-gold)' }}>🔥 {combo} ×{comboMultiplier(combo)}</span>}
          <span>{xp}{' '}{tr('XP')}</span>
          <span>{index + 1}/{questions.length}</span>
        </span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        {timed && !answered
          ? <div className="h-full rounded-full" style={{ width: `${(left / ANSWER_MS) * 100}%`, backgroundColor: left < 5000 ? 'var(--color-warning)' : 'var(--color-accent-gold)', transition: 'width 0.2s linear' }}
                 role="timer" aria-label={`${Math.ceil(left / 1000)} seconds left`} />
          : <div className="h-full rounded-full transition-all" style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%`, backgroundColor: 'var(--color-accent-gold)' }} />}
      </div>

      <h2 className="text-xl font-bold font-[Outfit] leading-snug mb-5" style={{ color: 'var(--color-text-primary)' }}>{q.question}</h2>
      <div className="space-y-2 relative" role="radiogroup" aria-label={tr('Answers')}>
        {gain !== null && gain > 0 && <span className="absolute -top-8 right-0 text-lg font-black animate-slide-up" style={{ color: 'var(--color-accent-gold)' }} aria-hidden>+{gain}</span>}
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
                    className={`w-full text-left p-4 rounded-2xl border-2 flex items-center gap-3 transition-colors ${answered && isChosen && !isAnswer ? 'animate-shake' : ''}`} style={style}>
              <span className="flex-1">{opt}</span>
              {answered && isAnswer && <Check size={18} style={{ color: 'var(--color-success)' }} />}
              {answered && isChosen && !isAnswer && <X size={18} style={{ color: 'var(--color-warning)' }} />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-5 p-4 rounded-2xl animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)' }} aria-live="polite">
          <p className="font-semibold mb-1" style={{ color: chosen === q.answer ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {chosen === q.answer ? tr('Correct!') : chosen === -1 ? `Time’s up — the answer is: ${q.options[q.answer]}` : `The answer is: ${q.options[q.answer]}`}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{q.explanation}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Source:')}{' '}<SourceLink source={q.source} /></p>
          <button onClick={next} className="btn-primary w-full mt-4 py-3 rounded-xl text-sm font-semibold">
            {mode === 'challenge' && lives <= 0 ? tr('See my score') : index + 1 < questions.length ? tr('Next question') : tr('See my score')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function Quiz() {
  usePageTitle('quiz', 'Quizzes');
  const [params, setParams] = useSearchParams();
  const topicParam = params.get('topic') as QuizTopic | null;
  // Decided once, so finishing today's challenge doesn't swap the result screen for the home screen
  const [doneAtStart] = useState(() => dailyDoneToday());
  const isDaily = params.get('daily') === '1' && !doneAtStart;
  const mode: Mode = isDaily ? 'daily' : params.get('mode') === 'challenge' ? 'challenge' : 'learn';
  const topic: QuizTopic | 'daily' | null = isDaily ? 'daily' : topicParam && topicParam in QUIZ_TOPICS ? topicParam : null;
  const { hymns } = useHymns();
  const [seed, setSeed] = useState(() => Date.now() % 100000);

  const questions: QuizQuestion[] = useMemo(() => {
    if (!topic) return [];
    if (topic === 'daily') return dailyQuestions();
    if (topic === 'hymns') return buildHymnRound(hymns, ROUND_SIZE, seed);
    return buildRound(topic, ROUND_SIZE, seed, readQuizProgress()[topic].mastered);
  }, [topic, seed, hymns]);

  const play = (t: QuizTopic | 'daily', m: Mode) => setParams(t === 'daily' ? { daily: '1' } : { topic: t, mode: m });

  if (!topic) return <Home onPlay={play} />;
  if (!questions.length) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Preparing questions…')}</p>;

  return (
    <Round
      key={`${topic}-${mode}-${seed}`}
      topic={topic}
      mode={mode}
      questions={questions}
      onExit={() => setParams({})}
      onAgain={topic === 'daily' ? undefined : () => setSeed(s => s + 1)}
    />
  );
}

