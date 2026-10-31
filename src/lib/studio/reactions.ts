import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabase';

/**
 * Everything between the studio and people on the app's own watch page: the number watching, reactions, comments,
 * prayer requests and polls. They pass through the realtime channel of the broadcast and are not stored.
 * What happens on YouTube or Facebook stays on those platforms.
 *
 * The channel is open to viewers, so nothing they send is trusted: it is checked here, nothing reaches the picture
 * until the person running the studio chooses it, and prayer requests are seen only by them.
 */

export const REACTIONS = [
  { emoji: '🙏', label: 'Amen' }, { emoji: '🙌', label: 'Halleluyah' }, { emoji: '❤️', label: 'Love' }, { emoji: '🕊️', label: 'Peace' },
];
const ALLOWED = new Set(REACTIONS.map(r => r.emoji));
const channelName = (id: string) => `live-${id}`;

export interface LiveMessage { id: string; kind: 'comment' | 'prayer'; name: string; text: string; from: string; at: number }
export interface LivePoll { id: string; question: string; options: string[]; counts: number[]; open: boolean }

const MAX_NAME = 40, MAX_TEXT = 240, MAX_MESSAGES = 100, MAX_VOTERS = 50_000;
const SEND_GAP = 4000;
const POLL_REPEAT = 5000;

const tidy = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\p{Cc}\p{Cf}]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** A comment or prayer request as it should be kept, or null if it is not one */
export function cleanMessage(payload: unknown, now = Date.now()): LiveMessage | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  const text = tidy(p.text, MAX_TEXT);
  const from = tidy(p.from, 64);
  if (!text || !from || (p.kind !== 'comment' && p.kind !== 'prayer')) return null;
  return { id: `${from}-${now}`, kind: p.kind, name: tidy(p.name, MAX_NAME), text, from, at: now };
}

/** A poll typed by the host: a question and two to four answers, or null */
export function makePoll(id: string, question: string, answers: string[]): LivePoll | null {
  const q = tidy(question, 140);
  const options = answers.map(a => tidy(a, 60)).filter(Boolean).slice(0, 4);
  if (!q || options.length < 2) return null;
  return { id, question: q, options, counts: options.map(() => 0), open: true };
}

/** A poll as the host sent it, checked before a viewer's page shows it */
export function cleanPoll(payload: unknown): LivePoll | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (typeof p.id !== 'string' || !Array.isArray(p.options) || !Array.isArray(p.counts)) return null;
  const poll = makePoll(p.id, p.question as string, p.options as string[]);
  if (!poll || p.counts.length !== poll.options.length) return null;
  return { ...poll, counts: p.counts.map(n => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)), open: p.open === true };
}

/** One vote per voter, the latest counting. False if the vote is not valid. */
export function recordVote(votes: Map<string, number>, poll: LivePoll | null, payload: unknown): boolean {
  const p = (payload ?? {}) as Record<string, unknown>;
  const voter = tidy(p.voter, 64);
  if (!poll?.open || p.pollId !== poll.id || !voter || !Number.isInteger(p.option)) return false;
  const option = p.option as number;
  if (option < 0 || option >= poll.options.length) return false;
  if (!votes.has(voter) && votes.size >= MAX_VOTERS) return false;
  votes.set(voter, option);
  return true;
}

export function countVotes(votes: Map<string, number>, options: number): number[] {
  const counts = Array.from({ length: options }, () => 0);
  votes.forEach(o => { counts[o] += 1; });
  return counts;
}

function deviceKey(): string {
  try {
    let key = localStorage.getItem('cw-live-device');
    if (!key) { key = crypto.randomUUID(); localStorage.setItem('cw-live-device', key); }
    return key;
  } catch { return crypto.randomUUID(); }
}

/** On the watch page: counts this person as watching, and lets them take part */
export function useLiveAudience(streamId: string | null) {
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const last = useRef(0);
  const lastSent = useRef(0);
  const [poll, setPoll] = useState<LivePoll | null>(null);
  const [voted, setVoted] = useState<number | null>(null);
  const key = useRef(deviceKey());
  useEffect(() => {
    if (!streamId) return;
    const rt = supabase.channel(channelName(streamId), { config: { presence: { key: crypto.randomUUID() }, broadcast: { self: false } } });
    rt.on('broadcast', { event: 'poll' }, ({ payload }) => {
      const next = cleanPoll(payload);
      setPoll(old => { if (old?.id !== next?.id) setVoted(null); return next; });
    });
    rt.subscribe(status => { if (status === 'SUBSCRIBED') void rt.track({ at: Date.now() }); });
    channel.current = rt;
    return () => { channel.current = null; void supabase.removeChannel(rt); };
  }, [streamId]);
  const react = useCallback((emoji: string) => {
    // A tap at most every third of a second
    if (Date.now() - last.current < 330) return;
    last.current = Date.now();
    void channel.current?.send({ type: 'broadcast', event: 'react', payload: { emoji } });
  }, []);
  /** False if sent too soon after the last one */
  const send = useCallback((kind: LiveMessage['kind'], name: string, text: string): boolean => {
    if (Date.now() - lastSent.current < SEND_GAP) return false;
    lastSent.current = Date.now();
    void channel.current?.send({ type: 'broadcast', event: 'message', payload: { kind, name, text, from: key.current } });
    return true;
  }, []);
  const vote = useCallback((pollId: string, option: number) => {
    setVoted(option);
    void channel.current?.send({ type: 'broadcast', event: 'vote', payload: { pollId, option, voter: key.current } });
  }, []);
  return { react, send, vote, poll, voted };
}

/** In the studio: who is watching on the app, and what they send */
export function useLiveFeedback(streamId: string | null, onReaction: (emoji: string) => void) {
  const [viewers, setViewers] = useState(0);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [poll, setPollState] = useState<LivePoll | null>(null);
  const handler = useRef(onReaction);
  handler.current = onReaction;
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollNow = useRef<LivePoll | null>(null);
  const votes = useRef(new Map<string, number>());
  const heardFrom = useRef(new Map<string, number>());

  const publish = useCallback((next: LivePoll | null) => {
    pollNow.current = next;
    setPollState(next);
    void channel.current?.send({ type: 'broadcast', event: 'poll', payload: next });
  }, []);

  useEffect(() => {
    setViewers(0); setTotals({}); setMessages([]); setPollState(null);
    pollNow.current = null; votes.current.clear(); heardFrom.current.clear();
    if (!streamId) return;
    const rt = supabase.channel(channelName(streamId), { config: { presence: { key: 'studio' } } });
    rt.on('presence', { event: 'sync' }, () => setViewers(Object.keys(rt.presenceState()).filter(k => k !== 'studio').length));
    rt.on('broadcast', { event: 'react' }, ({ payload }) => {
      const emoji = payload?.emoji;
      if (typeof emoji !== 'string' || !ALLOWED.has(emoji)) return;
      setTotals(t => ({ ...t, [emoji]: (t[emoji] ?? 0) + 1 }));
      handler.current(emoji);
    });
    rt.on('broadcast', { event: 'message' }, ({ payload }) => {
      const m = cleanMessage(payload);
      if (!m) return;
      // Someone sending by hand, past the page's own limit
      const before = heardFrom.current.get(m.from) ?? 0;
      if (m.at - before < SEND_GAP / 2) return;
      heardFrom.current.set(m.from, m.at);
      setMessages(list => [m, ...list].slice(0, MAX_MESSAGES));
    });
    rt.on('broadcast', { event: 'vote' }, ({ payload }) => {
      const now = pollNow.current;
      if (!now || !recordVote(votes.current, now, payload)) return;
      const next = { ...now, counts: countVotes(votes.current, now.options.length) };
      pollNow.current = next;
      setPollState(next);
    });
    rt.subscribe();
    channel.current = rt;
    // Whoever arrives late still sees the poll and its results
    const repeat = setInterval(() => { if (pollNow.current) void rt.send({ type: 'broadcast', event: 'poll', payload: pollNow.current }); }, POLL_REPEAT);
    return () => { clearInterval(repeat); channel.current = null; void supabase.removeChannel(rt); };
  }, [streamId]);

  const startPoll = useCallback((next: LivePoll) => { votes.current.clear(); publish(next); }, [publish]);
  const closePoll = useCallback(() => { if (pollNow.current) publish({ ...pollNow.current, open: false }); }, [publish]);
  const clearPoll = useCallback(() => { publish(null); }, [publish]);
  const dismiss = useCallback((id: string) => setMessages(list => list.filter(m => m.id !== id)), []);
  return { viewers, totals, messages, poll, startPoll, closePoll, clearPoll, dismiss };
}
