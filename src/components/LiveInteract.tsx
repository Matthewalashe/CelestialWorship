import { useState } from 'react';
import type { LiveMessage, LivePoll } from '../lib/studio/reactions';
import { useProfile } from '../hooks/useProfile';
import { showToast } from './Toast';
import { tr } from '../i18n';

/** On the watch page: send a comment or a prayer request, and answer a poll */
export function LiveInteract({ send, vote, poll, voted }: {
  send: (kind: LiveMessage['kind'], name: string, text: string) => boolean;
  vote: (pollId: string, option: number) => void;
  poll: LivePoll | null;
  voted: number | null;
}) {
  const { profile } = useProfile();
  const [kind, setKind] = useState<LiveMessage['kind']>('comment');
  const [text, setText] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!send(kind, kind === 'prayer' ? '' : profile.displayName || '', text)) { showToast(tr('Please wait a moment before sending again')); return; }
    setText('');
    showToast(kind === 'prayer' ? tr('Your prayer request was sent to the church') : tr('Sent'));
  };
  const total = poll ? poll.counts.reduce((a, b) => a + b, 0) : 0;
  const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
  return (
    <div className="space-y-3">
      {poll && (
        <div className="rounded-2xl border p-4 space-y-2" style={card}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{poll.question}</p>
          {poll.options.map((o, i) => {
            const share = total ? Math.round((poll.counts[i] / total) * 100) : 0;
            return (
              <button key={o} disabled={!poll.open} onClick={() => vote(poll.id, i)} aria-pressed={voted === i} className="relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm"
                      style={{ borderColor: voted === i ? 'var(--color-accent-brand)' : 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${share}%`, backgroundColor: 'var(--color-bg-card-hover)' }} />
                <span className="relative flex justify-between gap-2"><span>{o}</span><span>{share}%</span></span>
              </button>
            );
          })}
        </div>
      )}
      <form onSubmit={submit} className="rounded-2xl border p-3 space-y-2" style={card}>
        <div className="flex gap-1" role="radiogroup" aria-label={tr('What are you sending?')}>
          {([['comment', 'Comment'], ['prayer', 'Prayer request']] as const).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={kind === id ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : { color: 'var(--color-text-secondary)' }}>{tr(label)}</button>
          ))}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={240} placeholder={kind === 'prayer' ? tr('Your request goes only to the person running the service, without your name.') : tr('Say something to the church')}
                  className="w-full rounded-xl px-3 py-2 text-sm border outline-none resize-none" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
        <button type="submit" disabled={!text.trim()} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Send')}</button>
      </form>
    </div>
  );
}
