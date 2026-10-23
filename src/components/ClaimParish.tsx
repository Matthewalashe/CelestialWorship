import { useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { Sheet } from './Dialog';
import { SignInPrompt } from './CommunityStates';
import { showToast } from './Toast';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { submitClaim, CLAIM_ROLES, EVIDENCE_HINT, type ClaimRole } from '../lib/claims';
import { errorMessage } from '../lib/backend';
import type { Parish } from '../hooks/useParishes';
import { tr } from '../i18n';

const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

/**
 * “I lead or serve in this parish”: the claimant confirms the parish’s current details, says their role and
 * attaches evidence. A moderator reviews it; once approved they administer the parish.
 */
export function ClaimParish({ parish, onClose }: { parish: Parish; onClose: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const input = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<ClaimRole>(profile.memberType === 'church_admin' ? 'admin' : 'shepherd');
  const [office, setOffice] = useState(profile.memberType === 'shepherd' ? 'Shepherd-in-charge' : '');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const me = [profile.churchTitle, profile.displayName].filter(Boolean).join(' ');
  const [d, setD] = useState({
    name: parish.name, country: parish.country, state_region: parish.state_region ?? '', city: parish.city ?? '', address: parish.address ?? '',
    phone: parish.phone ?? profile.phone ?? '', email: parish.email ?? user?.email ?? '',
    shepherd_name: role === 'shepherd' ? me : parish.shepherd_name ?? '',
  });

  const send = async () => {
    setBusy(true);
    try {
      await submitClaim({ parish, role, office, note, files, details: d });
      showToast(tr('Sent — a moderator will review your evidence and let you know'));
      onClose();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const row = (key: keyof typeof d, label: string, mode?: 'tel' | 'email') => (
    <label className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}
      <input value={d[key]} onChange={e => setD({ ...d, [key]: e.target.value })} inputMode={mode} className={`${field} mt-1`} style={fieldStyle} />
    </label>
  );

  return (
    <Sheet label={tr('Claim this parish')} title={`Claim ${parish.name}`} onClose={onClose}>
      {!user ? <SignInPrompt message={tr('Sign in to claim a parish.')} /> : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('If you lead or serve in this parish, claim it to keep its details up to date and run its page. A moderator checks your evidence first.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Your role')}<select value={role} onChange={e => setRole(e.target.value as ClaimRole)} className={`${field} mt-1`} style={fieldStyle}>
                {(Object.keys(CLAIM_ROLES) as ClaimRole[]).map(r => <option key={r} value={r}>{tr(CLAIM_ROLES[r])}</option>)}
              </select>
            </label>
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Office (optional)')}<input value={office} onChange={e => setOffice(e.target.value)} placeholder={tr('e.g. Shepherd-in-charge')} className={`${field} mt-1`} style={fieldStyle} />
            </label>
          </div>
          <details className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }} open>
            <summary className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{tr('The parish today')}</summary>
            <div className="space-y-2 mt-3">
              {row('name', 'Name')}
              <div className="grid grid-cols-2 gap-2">{row('city', 'Town / city')}{row('state_region', 'State / region')}</div>
              {row('address', 'Street address')}
              <div className="grid grid-cols-2 gap-2">{row('phone', 'Parish phone', 'tel')}{row('email', 'Parish email', 'email')}</div>
              {row('shepherd_name', 'Shepherd-in-charge')}
            </div>
          </details>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{tr('Evidence (1–5 files, PDF or photos)')}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{EVIDENCE_HINT}{' '}{tr('Only moderators see it.')}</p>
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
                  <span className="flex-1 truncate">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><X size={14} /></button>
                </li>
              ))}
            </ul>
            {files.length < 5 && (
              <button onClick={() => input.current?.click()} className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 border-2 border-dashed"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><FileUp size={16} />{' '}{tr('Add evidence')}</button>
            )}
            <input ref={input} type="file" accept="application/pdf,image/*" multiple className="hidden"
                   onChange={e => { setFiles([...files, ...(e.target.files ?? [])].slice(0, 5)); e.target.value = ''; }} />
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={1000} placeholder={tr('Anything the moderator should know (optional)')}
                    aria-label={tr('Note to the moderator')} className={field} style={fieldStyle} />
          <button onClick={send} disabled={busy || !files.length || d.name.trim().length < 3} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">
            {busy ? tr('Sending…') : tr('Send claim for review')}
          </button>
        </div>
      )}
    </Sheet>
  );
}
