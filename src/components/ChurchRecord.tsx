import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Globe2, Lock } from 'lucide-react';
import { listRecords, saveRecord, deleteRecord, RECORD_KINDS, type ChurchRecord, type RecordKind } from '../lib/churchRecords';
import { MEN_RANKS, WOMEN_RANKS } from '../data/ranks';
import { Sheet, confirmDialog } from './Dialog';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import type { MemberProfile } from '../hooks/useProfile';
import { tr } from '../i18n';

const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const label = 'block text-xs';
const muted = { color: 'var(--color-text-muted)' };

/** Rank, office and a short biography, part of the profile form */
export function RankFields({ draft, update }: { draft: MemberProfile; update: (u: Partial<MemberProfile>) => void }) {
  const ranks = draft.rankLine === 'women' ? WOMEN_RANKS : draft.rankLine === 'men' ? MEN_RANKS : [...MEN_RANKS, ...WOMEN_RANKS];
  const known = ranks.some(r => r.name === draft.rank);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className={label} style={muted}>{tr('Rank line')}<select value={draft.rankLine} onChange={e => update({ rankLine: e.target.value as MemberProfile['rankLine'] })} className={`${field} mt-1`} style={fieldStyle}>
            <option value=""></option><option value="men">{tr('Men')}</option><option value="women">{tr('Women')}</option>
          </select>
        </label>
        <label className={label} style={muted}>{tr('Rank')}<select value={known ? draft.rank : draft.rank ? '__other' : ''} onChange={e => update({ rank: e.target.value === '__other' ? ' ' : e.target.value })} className={`${field} mt-1`} style={fieldStyle}>
            <option value=""></option>
            {ranks.map(r => <option key={`${r.name}-${r.order}`} value={r.name}>{r.name}</option>)}
            <option value="__other">{tr('Other…')}</option>
          </select>
        </label>
      </div>
      {!known && draft.rank && (
        <input value={draft.rank.trim()} onChange={e => update({ rank: e.target.value })} placeholder={tr('Your rank as written')} aria-label={tr('Rank')} className={field} style={fieldStyle} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={label} style={muted}>{tr('Office (optional)')}<input value={draft.office} onChange={e => update({ office: e.target.value })} list="offices" placeholder={tr('e.g. Head of Province')} className={`${field} mt-1`} style={fieldStyle} />
          <datalist id="offices">
            {['Shepherd-in-charge', 'Assistant shepherd', 'Head of Circuit', 'Head of District', 'Head of State', 'Head of Province', 'Head of Region', 'Head of Diocese', 'Choir master', 'Parochial committee chairman', 'Secretary'].map(o => <option key={o} value={o} />)}
          </datalist>
        </label>
        <label className={label} style={muted}>{tr('Over (optional)')}<input value={draft.officeScope} onChange={e => update({ officeScope: e.target.value })} placeholder={tr('e.g. Lagos Province 3')} className={`${field} mt-1`} style={fieldStyle} />
        </label>
      </div>
      <label className={label} style={muted}>{tr('About you (optional)')}<textarea value={draft.bio} onChange={e => update({ bio: e.target.value })} rows={3} maxLength={2000} placeholder={tr('Your background and ministry')} className={`${field} mt-1`} style={fieldStyle} />
      </label>
    </>
  );
}

const year = (d: string | null) => (d ? d.slice(0, 4) : '');

function RecordForm({ initial, onClose, onSaved }: { initial: Partial<ChurchRecord> & { kind: RecordKind }; onClose: () => void; onSaved: () => void }) {
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);
  const meta = RECORD_KINDS[r.kind];
  const set = (u: Partial<ChurchRecord>) => setR(x => ({ ...x, ...u }));
  const save = async () => {
    setBusy(true);
    try { await saveRecord(r); showToast(tr('Saved')); onSaved(); onClose(); } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet label={meta.label} onClose={onClose}>
      <div className="space-y-3">
        {meta.hint && <p className="text-xs" style={muted}>{tr(meta.hint)}</p>}
        {r.kind === 'birth' && (
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <input type="checkbox" checked={!!r.born_in_ccc} onChange={e => set({ born_in_ccc: e.target.checked })} />{' '}{tr('Born into the Celestial Church')}</label>
        )}
        {r.kind === 'rank' ? (
          <label className={label} style={muted}>{tr(meta.title)}
            <input value={r.title ?? ''} onChange={e => set({ title: e.target.value })} list="all-ranks" className={`${field} mt-1`} style={fieldStyle} />
            <datalist id="all-ranks">{[...MEN_RANKS, ...WOMEN_RANKS].map(x => <option key={`${x.name}-${x.order}`} value={x.name} />)}</datalist>
          </label>
        ) : r.kind !== 'birth' && (
          <label className={label} style={muted}>{tr(meta.title)}
            <input value={r.title ?? ''} onChange={e => set({ title: e.target.value })} maxLength={160} className={`${field} mt-1`} style={fieldStyle} />
          </label>
        )}
        <label className={label} style={muted}>{meta.place}
          <input value={r.place ?? ''} onChange={e => set({ place: e.target.value })} maxLength={160} className={`${field} mt-1`} style={fieldStyle} />
        </label>
        {meta.officiant && (
          <label className={label} style={muted}>{meta.officiant}
            <input value={r.officiant ?? ''} onChange={e => set({ officiant: e.target.value })} maxLength={160} className={`${field} mt-1`} style={fieldStyle} />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className={label} style={muted}>{meta.dates === 'range' ? tr('From') : tr('Date')}
            <input type="date" value={r.start_date ?? ''} onChange={e => set({ start_date: e.target.value })} className={`${field} mt-1`} style={fieldStyle} />
          </label>
          {meta.dates === 'range' && (
            <label className={label} style={muted}>{tr('To (blank if ongoing)')}<input type="date" value={r.end_date ?? ''} onChange={e => set({ end_date: e.target.value })} className={`${field} mt-1`} style={fieldStyle} />
            </label>
          )}
        </div>
        <label className={label} style={muted}>{tr('Notes (optional)')}<textarea value={r.details ?? ''} onChange={e => set({ details: e.target.value })} rows={2} maxLength={1000} className={`${field} mt-1`} style={fieldStyle} />
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
          <input type="checkbox" checked={!!r.is_public} onChange={e => set({ is_public: e.target.checked })} />{' '}{tr('Show on my public profile')}</label>
        <button onClick={save} disabled={busy} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Save')}</button>
      </div>
    </Sheet>
  );
}

/** The church record: birth, baptism, ranks, investiture… and a shepherd's ministry history */
export function ChurchRecordSection({ shepherd }: { shepherd: boolean }) {
  const [records, setRecords] = useState<ChurchRecord[] | null>([]);
  const [editing, setEditing] = useState<(Partial<ChurchRecord> & { kind: RecordKind }) | null>(null);
  const load = useCallback(() => { listRecords().then(setRecords).catch(() => setRecords(null)); }, []);
  useEffect(() => { load(); }, [load]);

  const personal: RecordKind[] = ['birth', 'baptism', 'rank', 'investiture', 'anointing'];
  const ministry: RecordKind[] = ['ordination', 'stewardship', 'studentship', 'education', 'certificate', 'travel', 'other'];
  const kinds = shepherd ? [...personal, ...ministry] : [...personal, 'education', 'certificate', 'stewardship', 'other'] as RecordKind[];

  return (
    <section className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Church record')}</h2>
      <p className="text-xs mt-0.5 mb-3" style={muted}>
        {shepherd ? tr('Your birth, baptism, ranks, investiture and your ministry: education, certificates, studentship, stewardships and travels.') : tr('Your birth, baptism, ranks and investiture.')}{' '}{tr('Private unless you choose to show an entry.')}</p>
      {records === null ? <p className="text-sm" style={muted}>{tr('Your church record opens when the church’s online service is set up.')}</p> : (
        <>
          <ul className="space-y-1.5 mb-3">
            {records.map(r => (
              <li key={r.id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(RECORD_KINDS[r.kind].label)}{r.title ? ` · ${r.title}` : ''}</span>
                  <span className="block text-xs truncate" style={muted}>{[r.place, r.officiant, [year(r.start_date), year(r.end_date)].filter(Boolean).join('–')].filter(Boolean).join(' · ')}</span>
                </span>
                {r.is_public ? <Globe2 size={14} aria-label={tr('Public')} style={muted} /> : <Lock size={14} aria-label={tr('Private')} style={muted} />}
                <button onClick={() => setEditing(r)} aria-label={tr('Edit')} className="p-1" style={muted}><Pencil size={14} /></button>
                <button onClick={async () => { if (await confirmDialog({ title: tr('Delete this entry?'), confirmLabel: tr('Delete'), danger: true })) { try { await deleteRecord(r.id); load(); } catch (e) { showToast(errorMessage(e)); } } }}
                        aria-label={tr('Delete')} className="p-1" style={muted}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            {kinds.map(k => (
              <button key={k} onClick={() => setEditing({ kind: k, is_public: RECORD_KINDS[k].publicByDefault })}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <Plus size={12} /> {tr(RECORD_KINDS[k].label)}
              </button>
            ))}
          </div>
        </>
      )}
      {editing && <RecordForm initial={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </section>
  );
}
