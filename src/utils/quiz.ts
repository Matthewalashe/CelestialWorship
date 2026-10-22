import type { Hymn } from '../types';
import { QUESTION_BANKS, type QuizQuestion, type QuizTopic } from '../data/quizzes';
import { displayTitle, firstLine } from './hymnText';

/** Deterministic shuffle from a seed, so a round can be re-created and tested */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909);
    s = (s ^ (s >>> 16)) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle a question's options and move the answer index with them */
export function shuffleOptions(question: QuizQuestion, seed: number): QuizQuestion {
  const order = seededShuffle(question.options.map((_, i) => i), seed);
  return { ...question, options: order.map(i => question.options[i]), answer: order.indexOf(question.answer) };
}

// ── Progress ─────────────────────────────────────────────────

const PROGRESS_KEY = 'cw-quiz-progress';

export interface TopicProgress { best: number; attempts: number; mastered: string[]; lastPlayed: string | null }

export function readQuizProgress(): Record<QuizTopic, TopicProgress> {
  const empty: TopicProgress = { best: 0, attempts: 0, mastered: [], lastPlayed: null };
  let stored: Partial<Record<QuizTopic, TopicProgress>> = {};
  try { stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch {}
  const topics: QuizTopic[] = ['bible', 'hymns', 'constitution', 'geography', 'doctrine'];
  return Object.fromEntries(topics.map(t => [t, { ...empty, ...stored[t] }])) as Record<QuizTopic, TopicProgress>;
}

export function saveQuizResult(topic: QuizTopic, correctIds: string[], score: number, total: number) {
  const all = readQuizProgress();
  const p = all[topic];
  const percent = total ? Math.round((score / total) * 100) : 0;
  all[topic] = {
    best: Math.max(p.best, percent),
    attempts: p.attempts + 1,
    mastered: [...new Set([...p.mastered, ...correctIds])].slice(-500),
    lastPlayed: new Date().toISOString(),
  };
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch {}
}

// ── Building a round ─────────────────────────────────────────

/** Questions not yet answered correctly come first, so every round teaches something new */
export function buildRound(topic: Exclude<QuizTopic, 'hymns'>, count: number, seed: number, mastered: string[]): QuizQuestion[] {
  const bank = QUESTION_BANKS[topic];
  const fresh = seededShuffle(bank.filter(q => !mastered.includes(q.id)), seed);
  const review = seededShuffle(bank.filter(q => mastered.includes(q.id)), seed + 1);
  return [...fresh, ...review].slice(0, count).map((q, i) => shuffleOptions(q, seed + i * 31));
}

/** Hymn questions generated from the hymnal itself */
export function buildHymnRound(hymns: Hymn[], count: number, seed: number): QuizQuestion[] {
  const usable = hymns.filter(h => firstLine(h, 'yo') && h.verses.length > 0);
  if (usable.length < 8) return [];
  const picked = seededShuffle(usable, seed).slice(0, count);
  const questions: QuizQuestion[] = [];

  picked.forEach((hymn, i) => {
    const others = seededShuffle(usable.filter(h => h.number !== hymn.number), seed + i).slice(0, 3);
    const kind = (seed + i) % 3;
    let question: QuizQuestion;

    if (kind === 0) {
      question = {
        id: `h-num-${hymn.number}`,
        question: `Which hymn begins “${firstLine(hymn, 'yo')}”?`,
        options: [hymn, ...others].map(h => `Hymn ${h.number}`),
        answer: 0,
        explanation: `Hymn ${hymn.number}${hymn.section ? `, in the ${hymn.section.english} section` : ''}.`,
        source: `Hymn ${hymn.number}`,
        difficulty: 2,
      };
    } else if (kind === 1 && hymn.englishLyrics) {
      question = {
        id: `h-en-${hymn.number}`,
        question: `Hymn ${hymn.number} begins “${firstLine(hymn, 'yo')}”. Which is its English first line?`,
        options: [hymn, ...others].map(h => displayTitle(h, 'en')),
        answer: 0,
        explanation: `In English, hymn ${hymn.number} begins “${displayTitle(hymn, 'en')}”.`,
        source: `Hymn ${hymn.number}`,
        difficulty: 2,
      };
    } else {
      // Next line of the first stanza
      const lines = hymn.verses[0].yorubaLines;
      const decoys = others.map(h => h.verses[0]?.yorubaLines[1]).filter(Boolean) as string[];
      if (lines.length < 2 || decoys.length < 3 || decoys.includes(lines[1])) {
        question = {
          id: `h-sec-${hymn.number}`,
          question: `Which hymnal section is hymn ${hymn.number} (“${firstLine(hymn, 'yo')}”) in?`,
          options: [hymn.section?.english ?? 'General', ...[...new Set(others.map(h => h.section?.english ?? 'General'))]]
            .filter((v, idx, arr) => arr.indexOf(v) === idx),
          answer: 0,
          explanation: `Hymn ${hymn.number} is printed in the ${hymn.section?.english ?? 'general'} section.`,
          source: `Hymn ${hymn.number}`,
          difficulty: 3,
        };
        if (question.options.length < 2) return;
      } else {
        question = {
          id: `h-line-${hymn.number}`,
          question: `Complete the line from hymn ${hymn.number}: “${lines[0]} …”`,
          options: [lines[1], ...decoys],
          answer: 0,
          explanation: `“${lines[0]} / ${lines[1]}” — hymn ${hymn.number}.`,
          source: `Hymn ${hymn.number}`,
          difficulty: 3,
        };
      }
    }
    questions.push(shuffleOptions(question, seed + i * 17));
  });

  return questions;
}
