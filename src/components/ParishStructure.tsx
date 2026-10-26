import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import { useParishes, PARISH_LEVELS, type Parish, type ParishLevel } from '../hooks/useParishes';
import { updateParish } from '../lib/parishAdmin';
import { listRelations, addRelation, removeRelation, shepherdClaims, authenticateShepherd } from '../lib/churchRecords';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const muted = { color: 'var(--color-text-muted)' };

/** Where the parish sits: its level, the headquarters it answers to, ownership, affiliation and sister parishes */
export function ParishStructureCard({ parish, onSaved }: { parish: Parish; onSaved: () => void }) {
  const { parishes } = useParishes();
  const real = parishes.filter(p => !p.seed && p.id !== parish.id);
  const [v, setV] = useState({
    level: parish.level ?? 'parish', parent_id: parish.parent_id ?? '', ownership: parish.ownership ?? 'community',
    affiliated: parish.affiliated ?? true, affiliation: parish.affiliation ?? '',
  });
  const [relations, setRelations] = useState<{ related_id: string; relation: 'sister' | 'branch' }[]>([]);
  const [adding, setAdding] = useState('');
  const loadRelations = useCallback(() => { listRelations(parish.id).then(setRelations).catch(() => {}); }, [parish.id]);
  useEffect(() => { loadRelations(); }, [loadRelations]);

  const save = async () => {
    try {
      await updateParish(parish.id, { level: v.level as ParishLevel, parent_id: v.parent_id || null, ownership: v.ownership as Parish['ownership'],
                                       affiliated: v.affiliated, affiliation: v.affiliated ? v.affiliation.trim() || null : null });
      showToast(tr('Saved')); onSaved();
    } catch (e) { showToast(errorMessage(e)); }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={card}>
      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Structure')}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs" style={muted}>{tr('This is a')}<select value={v.level} onChange={e => setV({ ...v, level: e.target.value as ParishLevel })} className={`${field} mt-1`} style={fieldStyle}>
            {(Object.keys(PARISH_LEVELS) as ParishLevel[]).map(l => <option key={l} value={l}>{tr(PARISH_LEVELS[l])}</option>)}
          </select>
        </label>
        <label className="text-xs" style={muted}>{tr('Ownership')}<select value={v.ownership} onChange={e => setV({ ...v, ownership: e.target.value as 'community' | 'private' })} className={`${field} mt-1`} style={fieldStyle}>
            <option value="community">{tr('Community church')}</option><option value="private">{tr('Privately owned')}</option>
          </select>
        </label>
      </div>
      <label className="block text-xs" style={muted}>{tr('Answers to (headquarters, circuit, province…)')}<select value={v.parent_id} onChange={e => setV({ ...v, parent_id: e.target.value })} className={`${field} mt-1`} style={fieldStyle}>
          <option value=""></option>
          {real.filter(p => p.level && p.level !== 'parish').map(p => <option key={p.id} value={p.id}>{tr(p.name)} ({tr(PARISH_LEVELS[p.level!])})</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <input type="checkbox" checked={v.affiliated} onChange={e => setV({ ...v, affiliated: e.target.checked })} />{' '}{tr('Affiliated to a headquarters or diocese')}</label>
      {v.affiliated && <input value={v.affiliation} onChange={e => setV({ ...v, affiliation: e.target.value })} placeholder={tr('Affiliated to')} aria-label={tr('Affiliated to')} className={field} style={fieldStyle} />}
      <button onClick={save} className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold">{tr('Save structure')}</button>

      <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs font-semibold mb-2" style={muted}>{tr('Sister parishes and branches')}</p>
        <ul className="space-y-1 mb-2">
          {relations.map(r => {
            const p = parishes.find(x => x.id === r.related_id);
            return (
              <li key={r.related_id} className="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <Link to={`/directory/${r.related_id}`} className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{p?.name ?? tr('Parish')}</Link>
                <span className="text-[11px]" style={muted}>{r.relation === 'branch' ? tr('Branch') : tr('Sister')}</span>
                <button onClick={async () => { try { await removeRelation(parish.id, r.related_id); loadRelations(); } catch (e) { showToast(errorMessage(e)); } }} aria-label={tr('Remove')} style={muted}><X size={14} /></button>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <select value={adding} onChange={e => setAdding(e.target.value)} aria-label={tr('Parish to add')} className={field} style={fieldStyle}>
            <option value="">{tr('Add a parish…')}</option>
            {real.filter(p => !relations.some(r => r.related_id === p.id)).map(p => <option key={p.id} value={p.id}>{tr(p.name)}{p.city ? `, ${p.city}` : ''}</option>)}
          </select>
          {(['sister', 'branch'] as const).map(rel => (
            <button key={rel} disabled={!adding} onClick={async () => { try { await addRelation(parish.id, adding, rel); setAdding(''); loadRelations(); } catch (e) { showToast(errorMessage(e)); } }}
                    className="px-3 rounded-xl text-xs font-semibold border disabled:opacity-40" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{rel === 'sister' ? tr('Sister') : tr('Branch')}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** People who say they are shepherds of this parish: the parish confirms them */
export function ShepherdClaimsCard({ parishId }: { parishId: string }) {
  const [claims, setClaims] = useState<{ id: string; display_name: string | null; church_title: string | null; rank: string | null }[]>([]);
  const [office, setOffice] = useState<Record<string, string>>({});
  const load = useCallback(() => { shepherdClaims(parishId).then(setClaims).catch(() => {}); }, [parishId]);
  useEffect(() => { load(); }, [load]);
  if (!claims.length) return null;
  return (
    <div className="rounded-2xl border p-4 space-y-2" style={card}>
      <p className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><ShieldCheck size={16} />{' '}{tr('Shepherds to authenticate')}</p>
      <p className="text-xs" style={muted}>{tr('These members say they are shepherds of this parish. Authenticate only those you know serve here.')}</p>
      <ul className="space-y-2">
        {claims.map(c => (
          <li key={c.id} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            <Link to={`/people/${c.id}`} className="text-sm font-semibold underline" style={{ color: 'var(--color-text-primary)' }}>{[c.church_title, c.display_name].filter(Boolean).join(' ') || tr('Member')}</Link>
            {c.rank && <p className="text-xs" style={muted}>{c.rank}</p>}
            <div className="flex gap-2">
              <input value={office[c.id] ?? 'Shepherd'} onChange={e => setOffice({ ...office, [c.id]: e.target.value })} aria-label={tr('Office')} className={field} style={fieldStyle} />
              <button onClick={async () => { try { await authenticateShepherd(parishId, c.id, office[c.id] ?? 'Shepherd'); showToast(tr('Authenticated')); load(); } catch (e) { showToast(errorMessage(e)); } }}
                      className="btn-primary px-4 rounded-xl text-sm font-semibold shrink-0">{tr('Authenticate')}</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
