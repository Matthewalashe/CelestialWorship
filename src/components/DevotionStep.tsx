import { useState } from 'react';
import { BookOpen, Music, Info, ChevronRight, Repeat, Users } from 'lucide-react';
import type { Block, DevotionStep } from '../lib/devotion';
import type { BibleLesson, Hymn, ScriptureReference } from '../types';
import { PRAYERS, LORDS_DAY_OFFERINGS, WHO_LABELS } from '../data/prayers';
import { Sheet } from './Dialog';
import { PassageText } from './PassageText';
import { displayTitle, stanzaLabel } from '../utils/hymnText';
import { tr, useT } from '../i18n';

/*
 * One step of the Order of Service, as a worshipper follows it:
 *   who does what (acts), the words said or sung in full, then — set apart — how it is done.
 * Hymns and Bible passages open in a panel over the step, so the worshipper never loses their place.
 */

const WHO_COLOURS: Record<string, string> = {
  conductor: 'var(--color-accent-brand)',
  congregation: 'var(--color-success)',
  all: 'var(--color-success)',
  shepherd: 'var(--color-accent-gold)',
  preacher: 'var(--color-accent-gold)',
};

export function Who({ who }: { who?: string }) {
  if (!who) return null;
  const colour = WHO_COLOURS[who] ?? 'var(--color-text-secondary)';
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
          style={{ color: `color-mix(in srgb, ${colour} 60%, var(--color-text-primary))`, backgroundColor: `color-mix(in srgb, ${colour} 12%, transparent)` }}>
      <Users size={11} aria-hidden /> {tr(WHO_LABELS[who] ?? who)}
    </span>
  );
}

function Times({ n }: { n?: number }) {
  if (!n || n < 2) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'color-mix(in srgb, var(--color-accent-gold) 60%, var(--color-text-primary))', backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 14%, transparent)' }}
          title={`${n} ${tr('times')}`}>
      <Repeat size={11} aria-hidden /> {n}×
    </span>
  );
}

const card = { backgroundColor: 'var(--color-bg-card)' };
const muted = { color: 'var(--color-text-muted)' };

function PrayerText({ refKey, who }: { refKey: keyof typeof PRAYERS; who?: string }) {
  const { lang } = useT();
  const p = PRAYERS[refKey];
  const initial = lang === 'yo' ? 'yo' : lang === 'fr' && p.fr ? 'fr' : 'en';
  const [shown, setShown] = useState<'en' | 'yo' | 'fr'>(initial);
  const langs = (['en', 'yo', 'fr'] as const).filter(l => l !== 'fr' || p.fr);
  return (
    <div className="rounded-2xl p-5 space-y-3" style={card}>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-semibold text-[0.95em]" style={{ color: 'var(--color-text-primary)' }}>{tr(p.title)}</p>
        <Times n={p.repeat} />
        <span className="ml-auto inline-flex gap-1">
          {langs.map(l => (
            <button key={l} onClick={() => setShown(l)} aria-pressed={shown === l} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={shown === l ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : muted}>
              {l === 'en' ? tr('EN') : l === 'yo' ? tr('YO') : tr('FR')}
            </button>
          ))}
        </span>
      </div>
      <Who who={who ?? 'all'} />
      <p className="leading-relaxed" lang={shown}>{p[shown]}</p>
    </div>
  );
}

function PsalmBlock({ block, step, onOpenPassage, compact }: { block: Extract<Block, { kind: 'psalm' }>; step: number; onOpenPassage: (r: ScriptureReference) => void; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const { lang } = useT();
  // Yorùbá and French readers read the psalm from their Bible; the English as read in church stays a tap away
  const ownBible = lang === 'yo' || lang === 'fr';
  const [english, setEnglish] = useState(false);
  const ref: ScriptureReference = { raw: `${tr('Psalm')} ${block.chapter}`, book: 'Psalms', chapter: block.chapter, verseStart: block.range?.[0] ?? 1, verseEnd: block.range?.[1] ?? 176 };
  return (
    <section className="space-y-4" aria-label={block.ref}>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Psalm')} {block.chapter}{block.range ? `:${block.range[0]}–${block.range[1]}` : ''}</h3>
        <button onClick={() => onOpenPassage(ref)} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }} data-step={step}>
          <BookOpen size={15} /> {tr('Open in the Bible')}
        </button>
      </div>
      {block.spiritLed && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('The holy name is called as the Spirit leads.')}</p>}
      {block.follows && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Read straight after')} {block.follows}.</p>}
      {block.name && (
        <div className="rounded-2xl p-4 space-y-2" style={card}>
          <div className="flex items-center gap-2 flex-wrap"><Who who="conductor" /><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('calls the holy name')}</span><Times n={3} /></div>
          <p className="text-2xl font-bold font-[Outfit] tracking-wide" style={{ color: 'var(--color-accent-gold)' }}>{block.name}</p>
          <p className="text-xs -mt-1" style={muted}>{tr('A name of God, given in tongues')}</p>
          <div className="flex items-center gap-2 flex-wrap"><Who who="congregation" /><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('answers')}</span><b>{tr('Holy')}</b></div>
        </div>
      )}
      {block.verses.length > 0 && !open && (
        <button onClick={() => setOpen(true)} className="text-sm font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Show the')} {block.verses.length} {tr('verses as read in church')}</button>
      )}
      {block.verses.length > 0 && open && (
        <>
          <p className="text-xs" style={muted}>{tr('The service conductor reads a line; the congregation repeats it.')}</p>
          {ownBible && <PassageText reference={ref} defaultOpen compact />}
          {ownBible && (
            <button onClick={() => setEnglish(e => !e)} aria-expanded={english} className="text-sm font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
              {english ? tr('Hide the English') : tr('The English, as read in church')}
            </button>
          )}
          {(!ownBible || english) && <ol className="space-y-2.5" lang="en">
            {block.verses.map((v, i) => (
              <li key={i} className="flex gap-3 leading-relaxed">
                <span className="text-[0.7em] font-bold pt-1 w-5 shrink-0 text-right" style={{ color: 'var(--color-accent-brand)' }}>{i + 1}</span>
                <span>{v}</span>
              </li>
            ))}
          </ol>}
        </>
      )}
    </section>
  );
}

export function StepBlocks({ step, lessons, isLordsDay, suggest, onOpenHymn, onOpenPassage, onMoreHymns, compact = false }: {
  step: DevotionStep;
  /** The whole order on one page: long psalms fold */
  compact?: boolean;
  lessons: BibleLesson[];
  isLordsDay: boolean;
  suggest: (category: NonNullable<DevotionStep['hymnSlot']>['category']) => Hymn[];
  onOpenHymn: (n: number) => void;
  onOpenPassage: (r: ScriptureReference) => void;
  onMoreHymns: () => void;
}) {
  const { lang } = useT();
  const doing = step.blocks.filter(b => b.kind !== 'instruction' && b.kind !== 'note');
  const guidance = step.blocks.filter(b => b.kind === 'instruction' || b.kind === 'note') as Extract<Block, { kind: 'instruction' | 'note' }>[];

  return (
    <div className="space-y-5">
      {doing.map((b, i) => {
        switch (b.kind) {
          case 'act':
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap"><Who who={b.who} /><Times n={b.repeat} /></div>
                <p className="text-[1.05em] font-medium leading-snug" style={{ color: 'var(--color-text-primary)' }}>{tr(b.text)}</p>
              </div>
            );
          case 'say':
            return (
              <div key={i} className="rounded-2xl p-4 flex items-center gap-3 flex-wrap" style={card}>
                <Who who={b.who ?? 'all'} />
                <p className="text-xl font-semibold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr(b.text)}</p>
                <Times n={b.repeat} />
              </div>
            );
          case 'prayer':
            return <PrayerText key={i} refKey={b.ref} who={b.who} />;
          case 'song':
            return (
              <div key={i} className="rounded-2xl p-5 space-y-3" style={card}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Music size={16} style={{ color: 'var(--color-accent-gold)' }} aria-hidden />
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(b.title)}</p>
                  <Times n={b.repeat} />
                  {b.hymn && (
                    <button onClick={() => onOpenHymn(b.hymn!)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ color: 'var(--color-accent-gold)', backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 12%, transparent)' }}>
                      {tr('Hymn')} {b.hymn} <ChevronRight size={13} />
                    </button>
                  )}
                </div>
                <div className="italic leading-relaxed">{b.lines.map((l, j) => <p key={j}>{l}</p>)}</div>
              </div>
            );
          case 'hymn': {
            const options = !b.number && step.hymnSlot?.category ? suggest(step.hymnSlot.category).slice(0, 4) : [];
            return (
              <div key={i} className="rounded-2xl p-5 space-y-3" style={card}>
                <div className="flex items-center gap-2"><Music size={16} style={{ color: 'var(--color-accent-gold)' }} aria-hidden />
                  <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b.number ? `${tr('Hymn')} ${b.number}` : tr('Sing a hymn')}{b.label ? ` — ${tr(b.label)}` : ''}</p>
                </div>
                {b.number ? (
                  <button onClick={() => onOpenHymn(b.number!)} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">{tr('Open the hymn')} <ChevronRight size={15} /></button>
                ) : options.length > 0 ? (
                  <>
                    <p className="text-xs" style={muted}>{tr('Suggested for today — tap one to sing it here:')}</p>
                    <ul className="space-y-1.5">
                      {options.map(h => (
                        <li key={h.number}>
                          <button onClick={() => onOpenHymn(h.number)} className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                            <span className="w-10 text-center font-bold tabular-nums" style={{ color: 'var(--color-accent-gold)' }}>{h.number}</span>
                            <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--color-text-primary)' }}>{displayTitle(h, lang === 'yo' ? 'yo' : 'en')}</span>
                            <ChevronRight size={15} style={muted} />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button onClick={onMoreHymns} className="text-xs font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr('More hymns for this point')}</button>
                  </>
                ) : <p className="text-sm" style={muted}>{tr('Choose a hymn you know for this point of the service.')}</p>}
              </div>
            );
          }
          case 'psalm':
            return <PsalmBlock key={i} block={b} step={step.n} onOpenPassage={onOpenPassage} compact={compact} />;
          case 'passage': {
            const ref: ScriptureReference = { raw: b.ref, book: b.book, chapter: b.chapter, verseStart: b.verseStart, verseEnd: b.verseEnd };
            return (
              <section key={i} className="space-y-4" aria-label={b.ref}>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{b.ref.startsWith(b.book) ? tr(b.book) + b.ref.slice(b.book.length) : b.ref}</h3>
                  <button onClick={() => onOpenPassage(ref)} className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}>
                    <BookOpen size={15} /> {tr('Open in the Bible')}
                  </button>
                </div>
                {b.name && (
                  <div className="rounded-2xl p-4 space-y-2" style={card}>
                    <div className="flex items-center gap-2 flex-wrap"><Who who="conductor" /><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('calls the holy name')}</span><Times n={3} /></div>
                    <p className="text-2xl font-bold font-[Outfit] tracking-wide" style={{ color: 'var(--color-accent-gold)' }}>{b.name}</p>
                    <p className="text-xs -mt-1" style={muted}>{tr('A name of God, given in tongues')}</p>
                    <div className="flex items-center gap-2 flex-wrap"><Who who="congregation" /><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('answers')}</span><b>{tr('Holy')}</b></div>
                  </div>
                )}
                <PassageText reference={ref} defaultOpen compact />
              </section>
            );
          }
          case 'psalm_choice':
            return (
              <div key={i} className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('One of these psalms may be read:')}</p>
                <div className="flex flex-wrap gap-2">
                  {b.refs.map(r => {
                    const ch = Number(r.replace(/\D/g, ''));
                    return <button key={r} onClick={() => onOpenPassage({ raw: r, book: 'Psalms', chapter: ch, verseStart: 1, verseEnd: 176 })}
                                   className="px-3 py-1.5 rounded-full text-sm font-semibold border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}><BookOpen size={14} /> {r}</button>;
                  })}
                </div>
              </div>
            );
          case 'lesson': {
            const ref = lessons.map(l => (b.which === 1 ? l.firstLesson : l.secondLesson)).find(Boolean) ?? null;
            return (
              <div key={i} className="rounded-2xl p-5 space-y-3" style={card}>
                <div className="flex items-center gap-2"><Who who="reader" /><span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b.which === 1 ? tr('First Lesson') : tr('Second Lesson')}</span></div>
                {ref ? (
                  <>
                    <button onClick={() => onOpenPassage(ref)} className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent-brand)' }}>
                      <BookOpen size={15} /> {ref.raw}
                    </button>
                    <PassageText reference={ref} defaultOpen compact />
                  </>
                ) : <p className="text-sm" style={muted}>{tr('No lesson is set for today in the Bible lessons. Read a passage you have chosen.')}</p>}
              </div>
            );
          }
          case 'offering':
            return (
              <div key={i} className="rounded-2xl p-5 space-y-3" style={card}>
                <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b.parts && isLordsDay ? tr('The offerings') : tr('Offerings')}</p>
                {b.parts && isLordsDay ? (
                  <ol className="space-y-2">
                    {LORDS_DAY_OFFERINGS.map((o, j) => (
                      <li key={j} className="flex items-baseline gap-3">
                        <span className="text-xs font-bold w-4" style={{ color: 'var(--color-accent-gold)' }}>{j + 1}</span>
                        <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>{lang === 'yo' ? o.yo : lang === 'fr' ? o.fr : o.en}</span>
                        <span className="text-xs" style={muted}>{lang === 'yo' ? o.en : o.yo}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm" style={muted}>{tr('Members bring their offerings to the altar.')}</p>}
              </div>
            );
          case 'list':
            return (
              <ul key={i} className="space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex flex-col gap-1">
                    <Who who={it.who} />
                    <span style={{ color: 'var(--color-text-primary)' }}>{tr(it.text)}</span>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}

      {guidance.length > 0 && (
        <aside className="rounded-2xl p-4 space-y-2 text-[0.85em] border border-dashed" style={{ borderColor: 'var(--color-border)' }} aria-label={tr('How it is done')}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider" style={muted}><Info size={13} aria-hidden /> {tr('How it is done')}</p>
          {guidance.map((g, i) => <p key={i} className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr(g.text)}</p>)}
        </aside>
      )}
    </div>
  );
}

// ── Panels over the step ─────────────────────────────────────

export function HymnPanel({ hymn, step, onClose }: { hymn: Hymn; step: number; onClose: () => void }) {
  const { lang } = useT();
  const [view, setView] = useState<'yo' | 'both' | 'en'>(() => {
    try { return (localStorage.getItem('cw-hymn-view') as 'yo' | 'both' | 'en') || 'yo'; } catch { return 'yo'; }
  });
  return (
    <Sheet label={`${tr('Hymn')} ${hymn.number}`} onClose={onClose}
           title={<span>{tr('Hymn')} {hymn.number} <span className="font-normal" style={muted}>· {displayTitle(hymn, lang === 'yo' ? 'yo' : 'en')}</span></span>}>
      <div className="space-y-4">
        <div className="inline-flex rounded-lg p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={tr('Lyrics language')}>
          {(['yo', 'both', 'en'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className="px-2.5 py-1 rounded-md text-xs font-semibold"
                    style={view === v ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-secondary)' } : muted}>
              {v === 'yo' ? tr('Yorùbá') : v === 'en' ? tr('English') : tr('Both')}
            </button>
          ))}
        </div>
        {hymn.verses.map((v, i) => (
          <div key={i} className={v.kind === 'chorus' ? 'pl-4 border-l-2' : ''} style={v.kind === 'chorus' ? { borderColor: 'var(--color-accent-gold)' } : undefined}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: v.kind === 'chorus' ? 'var(--color-accent-gold)' : 'var(--color-text-muted)' }}>{stanzaLabel(v, view === 'en' ? 'en' : 'yo')}</p>
            {view !== 'en' && v.yorubaLines.map((l, j) => <p key={`y${j}`} lang="yo" className="leading-relaxed">{l}</p>)}
            {view !== 'yo' && v.englishLines.map((l, j) => <p key={`e${j}`} className={`leading-relaxed ${view === 'both' ? 'italic text-[0.9em]' : ''}`} style={view === 'both' ? muted : undefined}>{l}</p>)}
          </div>
        ))}
        <button onClick={onClose} className="btn-primary w-full py-3 rounded-xl font-semibold">{tr('Back to step')} {step}</button>
      </div>
    </Sheet>
  );
}

export function PassagePanel({ reference, step, onClose }: { reference: ScriptureReference; step: number; onClose: () => void }) {
  return (
    <Sheet label={reference.raw} onClose={onClose} title={reference.raw}>
      <div className="space-y-4">
        <PassageText reference={reference} defaultOpen />
        <button onClick={onClose} className="btn-primary w-full py-3 rounded-xl font-semibold">{tr('Back to step')} {step}</button>
      </div>
    </Sheet>
  );
}
