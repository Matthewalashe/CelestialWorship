import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, MapPin, X, Church } from 'lucide-react';
import { useParishes, useParishSubmission, type ParishSubmission } from '../hooks/useParishes';
import { useDraft } from '../hooks/useDraft';
import { useProfile } from '../hooks/useProfile';
import { usePageTitle } from '../hooks/usePageTitle';
import { SignInPrompt } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

interface ParishDraft {
  kind: 'parish' | 'ministry';
  name: string; diocese: string; province: string; country: string; state_region: string; city: string; address: string;
  map_url: string; shepherd_name: string; phone: string; email: string; website: string; contact_public: boolean; sundayTime: string;
}

const EMPTY: ParishDraft = {
  kind: 'parish', name: '', diocese: '', province: '', country: '', state_region: '', city: '', address: '', map_url: '', shepherd_name: '',
  phone: '', email: '', website: '', contact_public: false, sundayTime: '10:00',
};

function SubmitParish({ onClose, initialKind }: { onClose: () => void; initialKind: 'parish' | 'ministry' }) {
  const { submit, signedIn } = useParishSubmission();
  const { profile, save } = useProfile();
  const draft = useDraft<ParishDraft>('parish:new', { ...EMPTY, kind: initialKind, country: profile.country, state_region: profile.stateRegion });
  const v = draft.value;
  const [busy, setBusy] = useState(false);
  const valid = v.name.trim().length >= 3 && v.country.trim() && v.city.trim();

  const send = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const row: ParishSubmission = {
        kind: v.kind,
        name: v.name.trim(), diocese: v.diocese.trim() || null, province: v.province.trim() || null, country: v.country.trim(),
        state_region: v.state_region.trim() || null, city: v.city.trim() || null, address: v.address.trim() || null,
        latitude: null, longitude: null, shepherd_name: v.shepherd_name.trim() || null, phone: v.phone.trim() || null,
        email: v.email.trim() || null, website: v.website.trim() || null, map_url: v.map_url.trim() || null,
        service_times: v.sundayTime ? [{ service: 'lords_day_service', day: 'Sunday', time: v.sundayTime }] : null,
        giving_details: null, contact_public: v.contact_public,
      };
      const id = await submit(row);
      // People registering a parish are usually its shepherd or admin
      if (v.kind === 'parish' && (profile.memberType === 'shepherd' || profile.memberType === 'church_admin')) await save({ parishId: id, parishName: row.name });
      draft.clear();
      showToast('Thank you — the parish will be listed once a moderator confirms it');
      onClose();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto space-y-3"
           style={{ backgroundColor: 'var(--color-bg-secondary)' }} onClick={e => e.stopPropagation()} role="dialog" aria-label="Add a parish">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{v.kind === 'ministry' ? 'Register your ministry' : 'Add a parish'}</h2>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        {!signedIn ? <SignInPrompt message="Sign in to add a parish to the directory." /> : (
          <>
            <div className="flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }}>
              {(['parish', 'ministry'] as const).map(k => (
                <button key={k} onClick={() => draft.setValue({ kind: k })} aria-pressed={v.kind === k}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={v.kind === k ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
                  {k === 'parish' ? 'A parish (congregation)' : 'My ministry (independent shepherd)'}
                </button>
              ))}
            </div>
            <input value={v.name} onChange={e => draft.setValue({ name: e.target.value })}
                   placeholder={v.kind === 'ministry' ? 'Ministry name' : 'Parish name, e.g. CCC Mercy Land Parish'}
                   className={inputClass} style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <input value={v.country} onChange={e => draft.setValue({ country: e.target.value })} placeholder="Country" className={inputClass} style={inputStyle} />
              <input value={v.state_region} onChange={e => draft.setValue({ state_region: e.target.value })} placeholder="State / region" className={inputClass} style={inputStyle} />
              <input value={v.city} onChange={e => draft.setValue({ city: e.target.value })} placeholder="Town / city" className={inputClass} style={inputStyle} />
              <input value={v.province} onChange={e => draft.setValue({ province: e.target.value })} placeholder="Province (optional)" className={inputClass} style={inputStyle} />
            </div>
            <input value={v.diocese} onChange={e => draft.setValue({ diocese: e.target.value })} placeholder="Diocese / district (optional)" className={inputClass} style={inputStyle} />
            <input value={v.address} onChange={e => draft.setValue({ address: e.target.value })} placeholder="Street address" className={inputClass} style={inputStyle} />
            <input value={v.map_url} onChange={e => draft.setValue({ map_url: e.target.value })} placeholder="Google Maps link (optional)" className={inputClass} style={inputStyle} inputMode="url" />
            <input value={v.shepherd_name} onChange={e => draft.setValue({ shepherd_name: e.target.value })}
                   placeholder={v.kind === 'ministry' ? 'Your name and title' : 'Shepherd in charge (optional)'} className={inputClass} style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <input value={v.phone} onChange={e => draft.setValue({ phone: e.target.value })} placeholder="Parish phone" className={inputClass} style={inputStyle} inputMode="tel" />
              <input value={v.email} onChange={e => draft.setValue({ email: e.target.value })} placeholder="Parish email" className={inputClass} style={inputStyle} inputMode="email" />
            </div>
            <input value={v.website} onChange={e => draft.setValue({ website: e.target.value })} placeholder="Website or social page (optional)" className={inputClass} style={inputStyle} inputMode="url" />
            <label className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>Sunday service time
              <input type="time" value={v.sundayTime} onChange={e => draft.setValue({ sundayTime: e.target.value })} className={`${inputClass} mt-1`} style={inputStyle} />
            </label>
            <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" className="mt-1" checked={v.contact_public} onChange={e => draft.setValue({ contact_public: e.target.checked })} />
              The parish agrees to show its phone and email publicly in the directory
            </label>
            <button onClick={send} disabled={busy || !valid} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">Submit for listing</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Directory() {
  usePageTitle('directory', 'Parish directory');
  const { parishes, loading, backendReady } = useParishes();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [kind, setKind] = useState<'all' | 'parish' | 'ministry'>('all');

  const countries = useMemo(() => [...new Set(parishes.map(p => p.country))].sort(), [parishes]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parishes.filter(p =>
      (!country || p.country === country) &&
      (kind === 'all' || (p.kind ?? 'parish') === kind) &&
      (!q || [p.name, p.city, p.state_region, p.province, p.diocese, p.shepherd_name, p.address].filter(Boolean).join(' ').toLowerCase().includes(q)));
  }, [parishes, query, country, kind]);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>Parishes</h1>
        <button onClick={() => setParams({ submit: '1' })} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
          <Plus size={16} /> Add a parish
        </button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Find a Celestial Church of Christ parish near you.</p>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Parish, town, state or shepherd"
                 className={`${inputClass} pl-9`} style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} />
        </div>
        <select value={country} onChange={e => setCountry(e.target.value)} className="rounded-xl px-3 text-sm border" style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} aria-label="Country">
          <option value="">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex rounded-xl p-0.5 border mb-4 w-fit" style={card}>
        {(['all', 'parish', 'ministry'] as const).map(k => (
          <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={kind === k ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
            {k === 'all' ? 'All' : k === 'parish' ? 'Parishes' : 'Ministries'}
          </button>
        ))}
      </div>

      {!backendReady && (
        <p className="text-xs mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          Showing the Church’s headquarters. Parish listings appear once the online directory is set up.
        </p>
      )}

      {loading ? <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        : filtered.length === 0 ? <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>No parishes match.</p>
        : (
          <ul className="space-y-2">
            {filtered.map(p => (
              <li key={p.id}>
                <Link to={p.seed ? '#' : `/directory/${p.id}`} onClick={e => { if (p.seed) e.preventDefault(); }}
                      className="flex items-start gap-3 rounded-2xl border p-4" style={card}>
                  <Church size={20} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent-brand)' }} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {p.name}
                      {p.kind === 'ministry' && <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>Ministry</span>}
                      {p.live_now && <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: '#EF4444' }}>● Live</span>}
                    </span>
                    <span className="block text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                      <MapPin size={11} /> {[p.city, p.state_region, p.country].filter(Boolean).join(', ')}
                    </span>
                    {p.shepherd_name && <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Shepherd: {p.shepherd_name}</span>}
                    {p.seed && p.address && <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{p.address}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

      {params.get('submit') === '1' && <SubmitParish initialKind={params.get('kind') === 'ministry' ? 'ministry' : 'parish'} onClose={() => setParams({})} />}
    </div>
  );
}
