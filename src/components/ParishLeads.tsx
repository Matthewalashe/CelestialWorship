import { Link } from 'react-router-dom';
import { Check, X, MapPin } from 'lucide-react';
import { publishParishLead, dismissParishLead } from '../lib/parishLeads';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };

/** Parishes people said were missing (from onboarding): add each to the directory in one step, or dismiss it */
export function ParishLeads({ leads, onDone }: { leads: any[]; onDone: () => void }) {
  const decide = async (id: string, add: boolean) => {
    try {
      if (add) {
        await publishParishLead(id);
        showToast(tr('Added to the directory'));
      } else {
        await dismissParishLead(id);
        showToast(tr('Dismissed'));
      }
      onDone();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  if (!leads.length) return <p className="text-center py-10 text-sm" style={muted}>{tr('Nothing waiting.')}</p>;
  return (
    <ul className="space-y-3">
      {leads.map(l => (
        <li key={l.id} className="rounded-2xl border p-4 space-y-1.5" style={card}>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{l.name}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{[l.address, l.city, l.state_region, l.country].filter(Boolean).join(', ')}</p>
          {l.latitude != null && (
            <a href={`https://www.openstreetmap.org/?mlat=${l.latitude}&mlon=${l.longitude}#map=17/${l.latitude}/${l.longitude}`} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
              <MapPin size={12} aria-hidden /> {tr('Pinned on the map')} · {Number(l.latitude).toFixed(5)}, {Number(l.longitude).toFixed(5)}
            </a>
          )}
          <p className="text-xs" style={muted}>
            {[l.shepherd_name && `${tr('Shepherd')}: ${l.shepherd_name}`, l.phone, l.email, l.sunday_time && `${tr('Sunday')} ${l.sunday_time}`].filter(Boolean).join(' · ')}
          </p>
          {l.notes && <p className="text-xs whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{l.notes}</p>}
          <p className="text-[11px]" style={muted}>
            {tr('Suggested by')} {l.contact_name || tr('a visitor')} · {new Date(l.created_at).toLocaleDateString()}
            {l.submitted_by && <> · <Link to={`/people/${l.submitted_by}`} className="underline">{tr('profile')}</Link></>}
          </p>
          <div className="flex items-center gap-4 pt-1 text-sm font-semibold">
            <button onClick={() => decide(l.id, true)} className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}><Check size={16} /> {tr('Add to directory')}</button>
            <button onClick={() => decide(l.id, false)} className="inline-flex items-center gap-1" style={{ color: 'var(--color-warning)' }}><X size={16} /> {tr('Dismiss')}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
