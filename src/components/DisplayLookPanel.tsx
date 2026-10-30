import { BACKGROUND_COLOURS, TRANSITIONS, type LookBackground, type LookSettings } from '../lib/studio/look';
import { MediaGrid } from './StudioMedia';
import { tr } from '../i18n';

function BackgroundChoice({ title, value, onChange }: { title: string; value: LookBackground; onChange: (b: LookBackground) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold">{tr(title)}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {BACKGROUND_COLOURS.map(c => (
          <button key={c.color} onClick={() => onChange({ ...value, color: c.color, url: undefined, kind: undefined })} aria-label={tr(c.name)} title={tr(c.name)}
                  aria-pressed={!value.url && value.color === c.color} className="w-7 h-7 rounded-lg border-2"
                  style={{ backgroundColor: c.color, borderColor: !value.url && value.color === c.color ? 'var(--color-accent-brand)' : 'var(--color-border)' }} />
        ))}
      </div>
      {value.url && (
        <div className="flex items-center gap-2 text-xs">
          {value.kind === 'image' ? <img src={value.url} alt="" className="h-9 w-16 object-cover rounded" /> : <span>{tr('Video')}</span>}
          <button onClick={() => onChange({ ...value, url: undefined, kind: undefined })} className="underline text-[var(--color-text-muted)]">{tr('Remove')}</button>
        </div>
      )}
      {value.url && (
        <label className="block text-xs">{tr('Darken the picture so the words stand out')}
          <input type="range" min={0} max={0.85} step={0.05} value={value.dim} onChange={e => onChange({ ...value, dim: Number(e.target.value) })} className="w-full" />
        </label>
      )}
    </fieldset>
  );
}

/** The operator's choices for how words look on the screen */
export function DisplayLookPanel({ look, update }: { look: LookSettings; update: (c: Partial<LookSettings>) => void }) {
  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <BackgroundChoice title="Background for hymns" value={look.hymn} onChange={hymn => update({ hymn })} />
      <BackgroundChoice title="Background for the Bible" value={look.verse} onChange={verse => update({ verse })} />
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold">{tr('Between slides')}</legend>
        <div className="grid grid-cols-4 gap-1">
          {TRANSITIONS.map(t => (
            <button key={t.id} onClick={() => update({ transition: t.id })} aria-pressed={look.transition === t.id}
                    className={`py-1.5 rounded-lg text-xs font-semibold ${look.transition === t.id ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-secondary)]'}`}>{tr(t.name)}</button>
          ))}
        </div>
        {look.transition !== 'cut' && (
          <label className="block text-xs">{tr('Speed')}
            <input type="range" min={0.2} max={2} step={0.1} value={look.seconds} onChange={e => update({ seconds: Number(e.target.value) })} className="w-full" />
          </label>
        )}
      </fieldset>
      <div className="border-t pt-3 border-[var(--color-border)]">
        <p className="text-xs font-semibold mb-2">{tr('Your own pictures and videos')}</p>
        <MediaGrid actions={item => (
          <>
            <button onClick={() => update({ hymn: { ...look.hymn, url: item.url, kind: item.kind } })} className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)]">{tr('For hymns')}</button>
            <button onClick={() => update({ verse: { ...look.verse, url: item.url, kind: item.kind } })} className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-[var(--color-border)]">{tr('For the Bible')}</button>
          </>
        )} />
      </div>
    </div>
  );
}
