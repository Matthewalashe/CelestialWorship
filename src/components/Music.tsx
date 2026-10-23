import { useState } from 'react';
import { Music2, SkipForward, SlidersHorizontal } from 'lucide-react';
import { useMusic, type MusicSource } from '../hooks/useMusic';
import { Sheet } from './Dialog';

/** One tap turns quiet music on or off */
export function MusicButton() {
  const { on, toggle } = useMusic();
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? 'Turn music off' : 'Turn music on'}
            className="h-9 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--color-bg-card)', color: on ? 'var(--color-accent-brand)' : 'var(--color-text-secondary)' }}>
      <Music2 size={16} /> <span className="hidden sm:inline">{on ? 'Music on' : 'Music'}</span>
    </button>
  );
}

/** What is playing, shown under the toolbar while music is on */
export function NowPlaying() {
  const { on, now, skip } = useMusic();
  const [open, setOpen] = useState(false);
  if (!on || !now) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-xs" style={{ backgroundColor: 'var(--color-bg-card)' }} aria-live="polite">
      <Music2 size={14} style={{ color: 'var(--color-accent-brand)' }} className="shrink-0" />
      <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-secondary)' }}>{now.title}</span>
      <button onClick={skip} aria-label="Next piece" className="p-1" style={{ color: 'var(--color-text-secondary)' }}><SkipForward size={15} /></button>
      <button onClick={() => setOpen(true)} aria-label="Music settings" className="p-1" style={{ color: 'var(--color-text-secondary)' }}><SlidersHorizontal size={15} /></button>
      {open && <MusicSettings onClose={() => setOpen(false)} />}
    </div>
  );
}

export function MusicSettings({ onClose }: { onClose: () => void }) {
  const { on, toggle, source, setSource, volume, setVolume, now } = useMusic();
  const options: { value: MusicSource; label: string }[] = [
    { value: 'both', label: 'Both' }, { value: 'tunes', label: 'Celestial tunes' }, { value: 'recordings', label: 'Hymns & instrumentals' },
  ];
  return (
    <Sheet label="Music" onClose={onClose}>
      <div className="space-y-4">
        <label className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-primary)' }}>
          Play quiet music while I read and pray
          <input type="checkbox" className="w-5 h-5" checked={on} onChange={toggle} />
        </label>
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Music</p>
          <div className="flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label="Music">
            {options.map(o => (
              <button key={o.value} onClick={() => setSource(o.value)} aria-pressed={source === o.value} className="flex-1 py-2 rounded-lg text-xs font-semibold"
                      style={source === o.value ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : { color: 'var(--color-text-secondary)' }}>{o.label}</button>
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Celestial tunes are played on your phone from the hymnal’s sol-fa. Hymns and instrumentals are public-domain and openly licensed recordings, streamed from Wikimedia Commons.
          </p>
        </div>
        <label className="block text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Volume
          <input type="range" min={0.05} max={1} step={0.05} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-full mt-1" />
        </label>
        {now && (
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Now: <b>{now.title}</b><br />{now.detail}{now.page && <> · <a href={now.page} target="_blank" rel="noopener noreferrer" className="underline">source</a></>}
          </p>
        )}
      </div>
    </Sheet>
  );
}
