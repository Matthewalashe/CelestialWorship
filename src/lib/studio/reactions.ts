import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabase';

/**
 * Reactions and the number watching, for people on the app's own watch page. They pass through the realtime channel
 * of the broadcast and are not stored. Reactions on YouTube or Facebook stay on those platforms.
 */

export const REACTIONS = [
  { emoji: '🙏', label: 'Amen' }, { emoji: '🙌', label: 'Halleluyah' }, { emoji: '❤️', label: 'Love' }, { emoji: '🕊️', label: 'Peace' },
];
const ALLOWED = new Set(REACTIONS.map(r => r.emoji));
const channelName = (id: string) => `live-${id}`;

/** On the watch page: counts this person as watching, and lets them react */
export function useLiveAudience(streamId: string | null) {
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const last = useRef(0);
  useEffect(() => {
    if (!streamId) return;
    const key = crypto.randomUUID();
    const rt = supabase.channel(channelName(streamId), { config: { presence: { key }, broadcast: { self: false } } });
    rt.subscribe(status => { if (status === 'SUBSCRIBED') void rt.track({ at: Date.now() }); });
    channel.current = rt;
    return () => { channel.current = null; void supabase.removeChannel(rt); };
  }, [streamId]);
  return useCallback((emoji: string) => {
    // A tap at most every third of a second
    if (Date.now() - last.current < 330) return;
    last.current = Date.now();
    void channel.current?.send({ type: 'broadcast', event: 'react', payload: { emoji } });
  }, []);
}

/** In the studio: who is watching on the app, and their reactions as they come */
export function useLiveFeedback(streamId: string | null, onReaction: (emoji: string) => void) {
  const [viewers, setViewers] = useState(0);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const handler = useRef(onReaction);
  handler.current = onReaction;
  useEffect(() => {
    setViewers(0);
    setTotals({});
    if (!streamId) return;
    const rt = supabase.channel(channelName(streamId), { config: { presence: { key: 'studio' } } });
    rt.on('presence', { event: 'sync' }, () => setViewers(Object.keys(rt.presenceState()).filter(k => k !== 'studio').length));
    rt.on('broadcast', { event: 'react' }, ({ payload }) => {
      const emoji = payload?.emoji;
      // The channel is open to viewers: only the four reactions on the page are ever shown
      if (typeof emoji !== 'string' || !ALLOWED.has(emoji)) return;
      setTotals(t => ({ ...t, [emoji]: (t[emoji] ?? 0) + 1 }));
      handler.current(emoji);
    });
    rt.subscribe();
    return () => { void supabase.removeChannel(rt); };
  }, [streamId]);
  return { viewers, totals };
}
