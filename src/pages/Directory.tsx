import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Plus, MapPin, Church, Phone, Mail, User as UserIcon, ChevronRight, List, Map as MapIcon, LocateFixed } from 'lucide-react';
import { useParishes, useParishSubmission, continentOf, PARISH_LEVELS, type ParishSubmission, type Parish, type ParishLevel } from '../hooks/useParishes';
import { useDraft } from '../hooks/useDraft';
import { useProfile } from '../hooks/useProfile';
import { usePageTitle } from '../hooks/usePageTitle';
import { SignInPrompt } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { Sheet } from '../components/Dialog';
import { normalizeLinks } from '../utils/safeUrl';
import { ClaimParish } from '../components/ClaimParish';
import { tr } from '../i18n';
import { LocationPicker } from '../components/LocationPicker';
import { MapView } from '../components/MapView';
import { currentPosition, distanceKm, hasPoint } from '../lib/geo';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

interface ParishDraft {
  kind: 'parish' | 'ministry';
  name: string; diocese: string; province: string; country: string; state_region: string; city: string; address: string;
  latitude: number | null; longitude: number | null; shepherd_name: string; phone: string; email: string; website: string; contact_public: boolean; sundayTime: string;
  level: ParishLevel; ownership: 'community' | 'private'; affiliated: boolean; affiliation: string;
  /** Independent shepherds: own the ministry, or support it */
  relationship: 'owner' | 'supporting';
}

const EMPTY: ParishDraft = {
  kind: 'parish', name: '', diocese: '', province: '', country: '', state_region: '', city: '', address: '', latitude: null, longitude: null, shepherd_name: '',
  phone: '', email: '', website: '', contact_public: false, sundayTime: '10:00',
  level: 'parish', ownership: 'community', affiliated: true, affiliation: '', relationship: 'owner',
};

const AFFILIATIONS = ['Supreme Headquarters, Porto-Novo', 'International Headquarters, Ketu', 'Celestial City, Imeko'];

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
      const urls = normalizeLinks({ website: v.website }, { website: 'Website' });
      const row: ParishSubmission = {
        kind: v.kind,
        name: v.name.trim(), diocese: v.diocese.trim() || null, province: v.province.trim() || null, country: v.country.trim(),
        state_region: v.state_region.trim() || null, city: v.city.trim() || null, address: v.address.trim() || null,
        latitude: v.latitude, longitude: v.longitude, geo_precision: v.latitude != null ? 'address' : undefined, shepherd_name: v.shepherd_name.trim() || null, phone: v.phone.trim() || null,
        email: v.email.trim() || null, website: urls.website, map_url: null,
        service_times: v.sundayTime ? [{ service: 'lords_day_service', day: 'Sunday', time: v.sundayTime }] : null,
        giving_details: null, contact_public: v.contact_public,
        level: v.kind === 'ministry' ? 'parish' : v.level, ownership: v.ownership, affiliated: v.affiliated,
        affiliation: v.affiliated ? (v.affiliation.trim() || null) : null, continent: continentOf({ country: v.country.trim(), continent: null }),
        ...(v.kind === 'ministry' ? { registrant_relationship: v.relationship } : {}),
      } as ParishSubmission;
      const id = await submit(row);
      // People registering a parish are usually its shepherd or admin
      if (v.kind === 'parish' && (profile.memberType === 'shepherd' || profile.memberType === 'church_admin')) await save({ parishId: id, parishName: row.name });
      draft.clear();
      showToast(tr('Thank you — the parish will be listed once a moderator confirms it'));
      onClose();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet label={v.kind === 'ministry' ? tr('Register your ministry') : tr('Add a parish')} onClose={onClose}>
      <div className="space-y-3">
        {!signedIn ? <SignInPrompt message={tr('Sign in to add a parish to the directory.')} /> : (
          <>
            <div className="flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }}>
              {(['parish', 'ministry'] as const).map(k => (
                <button key={k} onClick={() => draft.setValue({ kind: k })} aria-pressed={v.kind === k}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={v.kind === k ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
                  {k === 'parish' ? tr('A parish (congregation)') : tr('My ministry (independent shepherd)')}
                </button>
              ))}
            </div>
            {v.kind === 'ministry' && (
              <fieldset className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
                <legend className="text-xs font-semibold px-1" style={{ color: 'var(--color-text-muted)' }}>{tr('Your place in this ministry')}</legend>
                {([['owner', 'I founded / own this ministry'], ['supporting', 'I support or serve in this ministry']] as const).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm py-1" style={{ color: 'var(--color-text-primary)' }}>
                    <input type="radio" name="relationship" checked={v.relationship === val} onChange={() => draft.setValue({ relationship: val })} /> {label}
                  </label>
                ))}
              </fieldset>
            )}
            <input value={v.name} onChange={e => draft.setValue({ name: e.target.value })}
                   placeholder={v.kind === 'ministry' ? tr('Ministry name') : tr('Parish name, e.g. CCC Mercy Land Parish')}
                   className={inputClass} style={inputStyle} />
            <LocationPicker value={v} onChange={u => draft.setValue(u)} inputClass={inputClass} inputStyle={inputStyle} requireCity />
            <div className="grid grid-cols-2 gap-2">
              <input value={v.province} onChange={e => draft.setValue({ province: e.target.value })} placeholder={tr('Province (optional)')} className={inputClass} style={inputStyle} />
              <input value={v.diocese} onChange={e => draft.setValue({ diocese: e.target.value })} placeholder={tr('Diocese / district (optional)')} className={inputClass} style={inputStyle} />
            </div>
            <input value={v.shepherd_name} onChange={e => draft.setValue({ shepherd_name: e.target.value })}
                   placeholder={v.kind === 'ministry' ? tr('Your name and title') : tr('Shepherd in charge (optional)')} className={inputClass} style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <input value={v.phone} onChange={e => draft.setValue({ phone: e.target.value })} placeholder={tr('Parish phone')} className={inputClass} style={inputStyle} inputMode="tel" />
              <input value={v.email} onChange={e => draft.setValue({ email: e.target.value })} placeholder={tr('Parish email')} className={inputClass} style={inputStyle} inputMode="email" />
            </div>
            <input value={v.website} onChange={e => draft.setValue({ website: e.target.value })} placeholder={tr('Website or social page (optional)')} className={inputClass} style={inputStyle} inputMode="url" />
            {v.kind === 'parish' && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('This parish is')}<select value={v.level} onChange={e => draft.setValue({ level: e.target.value as ParishLevel })} className={`${inputClass} mt-1`} style={inputStyle}>
                    {(Object.keys(PARISH_LEVELS) as ParishLevel[]).filter(l => !['supreme_hq', 'international_hq'].includes(l)).map(l => <option key={l} value={l}>{tr(PARISH_LEVELS[l])}</option>)}
                  </select>
                </label>
                <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Ownership')}<select value={v.ownership} onChange={e => draft.setValue({ ownership: e.target.value as 'community' | 'private' })} className={`${inputClass} mt-1`} style={inputStyle}>
                    <option value="community">{tr('Community church')}</option>
                    <option value="private">{tr('Privately owned')}</option>
                  </select>
                </label>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={v.affiliated} onChange={e => draft.setValue({ affiliated: e.target.checked })} />{' '}{tr('Affiliated to a headquarters or diocese')}</label>
            {v.affiliated && (
              <>
                <input list="affiliations" value={v.affiliation} onChange={e => draft.setValue({ affiliation: e.target.value })} placeholder={tr('Affiliated to, e.g. a headquarters or diocese')} className={inputClass} style={inputStyle} />
                <datalist id="affiliations">{AFFILIATIONS.map(a => <option key={a} value={a} />)}</datalist>
              </>
            )}
            <label className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{tr('Sunday service time')}<input type="time" value={v.sundayTime} onChange={e => draft.setValue({ sundayTime: e.target.value })} className={`${inputClass} mt-1`} style={inputStyle} />
            </label>
            <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" className="mt-1" checked={v.contact_public} onChange={e => draft.setValue({ contact_public: e.target.checked })} />{tr('The parish agrees to show its phone and email publicly in the directory')}</label>
            <button onClick={send} disabled={busy || !valid} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Submit for listing')}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** One parish: its address, contact and shepherd at a glance */
function ParishCard({ p, onClaim, away }: { p: Parish; onClaim: () => void; away?: string }) {
  const body = (
    <>
      <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {p.name}
        {p.kind === 'ministry' && <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>{tr('Ministry')}</span>}
        {p.level && p.level !== 'parish' && <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-brand)' }}>{tr(PARISH_LEVELS[p.level])}</span>}
        {p.live_now && <span className="ml-2 text-[10px] uppercase font-bold" style={{ color: '#EF4444' }}>{tr('● Live')}</span>}
      </span>
      {away && <span className="block text-[11px] font-semibold mt-0.5" style={{ color: 'var(--color-accent-gold)' }}>{away}</span>}
      {p.address && <span className="block text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{p.address}</span>}
      {p.shepherd_name && <span className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}><UserIcon size={11} /> {p.shepherd_name}</span>}
      {(p.affiliation || p.ownership === 'private') && (
        <span className="block text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {[p.ownership === 'private' ? 'Privately owned' : null, p.affiliation ? `Affiliated: ${p.affiliation}` : null].filter(Boolean).join(' · ')}
        </span>
      )}
    </>
  );
  const contact = (p.phone || p.email) && (
    <span className="flex flex-wrap gap-3 mt-2 text-xs">
      {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--color-accent-brand)' }}><Phone size={12} /> {p.phone}</a>}
      {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 font-semibold break-all" style={{ color: 'var(--color-accent-brand)' }}><Mail size={12} /> {p.email}</a>}
    </span>
  );
  if (!p.seed) {
    return (
      <div className="rounded-2xl border p-4" style={card}>
        <Link to={`/directory/${p.id}`} className="flex items-start gap-3">
          <Church size={20} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent-brand)' }} />
          <span className="flex-1 min-w-0">{body}</span>
          <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
        </Link>
        <span className="block pl-8">{contact}</span>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border p-4" style={card}>
      <div className="flex items-start gap-3">
        <Church size={20} className="shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
        <span className="flex-1 min-w-0">{body}{contact}</span>
      </div>
      {p.listing && (
        <div className="flex items-center gap-2 mt-3 pl-8">
          <span className="flex-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {p.listing.url?.includes('celestialchurchofchrist-worldwide')
              ? tr('From the Church’s public list (2005–2012) — may be out of date.')
              : <>{tr('Listed from')} <a href={p.listing.url} target="_blank" rel="noopener noreferrer" className="underline">{tr(p.listing.source)}</a> — {tr('not yet confirmed by the parish.')}</>}
          </span>
          <button onClick={onClaim} className="text-xs font-semibold px-3 py-1.5 rounded-full border shrink-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Claim this parish')}</button>
        </div>
      )}
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

  const [view, setView] = useState<'list' | 'map'>(() => (params.get('view') === 'map' ? 'map' : 'list'));
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [continent, setContinent] = useState('');
  const [state, setState] = useState('');
  const continents = useMemo(() => [...new Set(parishes.map(continentOf))].sort(), [parishes]);
  const countries = useMemo(() => [...new Set(parishes.filter(p => !continent || continentOf(p) === continent).map(p => p.country))].sort(), [parishes, continent]);
  const states = useMemo(() => [...new Set(parishes.filter(p => p.country === country).map(p => p.state_region).filter(Boolean) as string[])].sort(), [parishes, country]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parishes.filter(p =>
      (!continent || continentOf(p) === continent) && (!country || p.country === country) && (!state || p.state_region === state) &&
      (kind === 'all' || (p.kind ?? 'parish') === kind) &&
      (!q || [p.name, p.city, p.state_region, p.province, p.diocese, p.shepherd_name, p.address, p.country].filter(Boolean).join(' ').toLowerCase().includes(q)));
  }, [parishes, query, continent, country, state, kind]);

  // Continent › country › state › town
  const grouped = useMemo(() => {
    const out = new Map<string, Map<string, Parish[]>>();
    for (const p of [...filtered].sort((a, b) => (a.city ?? '').localeCompare(b.city ?? '') || a.name.localeCompare(b.name))) {
      const head = `${continentOf(p)} › ${p.country}${p.state_region ? ` › ${p.state_region}` : ''}`;
      const town = p.city || p.state_region || p.country;
      if (!out.has(head)) out.set(head, new Map());
      const towns = out.get(head)!;
      towns.set(town, [...(towns.get(town) ?? []), p]);
    }
    return [...out.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);
  // Nearest first once the reader has shared where they are
  const nearest = useMemo(() => (me ? filtered.filter(hasPoint).map(p => ({ p, km: distanceKm(me, { lat: p.latitude!, lng: p.longitude! }) })).sort((a, b) => a.km - b.km) : []), [filtered, me]);
  const markers = useMemo(() => filtered.filter(hasPoint).map(p => ({
    id: p.id, lat: p.latitude!, lng: p.longitude!, title: p.geo_precision === 'town' ? `${p.name} (${tr('approximate')})` : p.name,
  })), [filtered]);
  const pickedParish = picked ? filtered.find(p => p.id === picked) : undefined;
  const nearMe = async () => {
    setLocating(true);
    try {
      setMe(await currentPosition());
      setContinent(''); setCountry(''); setState('');
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setLocating(false);
    }
  };

  const claimId = params.get('claim');
  const claim = claimId ? parishes.find(p => p.id === claimId) : undefined;

  const chip = (on: boolean) => (on ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' } : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' });

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Parishes')}</h1>
        <button onClick={() => setParams({ submit: '1' })} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
          <Plus size={16} />{' '}{tr('Add a parish')}</button>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{parishes.length}{' '}{tr('parishes and ministries. Find one near you.')}</p>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('Parish, town, street, state or shepherd')} aria-label={tr('Search parishes')}
               className={`${inputClass} pl-9`} style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-2" role="group" aria-label={tr('Continent')}>
        {['', ...continents].map(c => (
          <button key={c || 'all'} onClick={() => { setContinent(c); setCountry(''); setState(''); }} aria-pressed={continent === c}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap" style={chip(continent === c)}>{c || tr('All continents')}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <select value={country} onChange={e => { setCountry(e.target.value); setState(''); }} className="flex-1 rounded-xl px-3 py-2 text-sm border" style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} aria-label={tr('Country')}>
          <option value="">{tr('All countries')}</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {country && states.length > 0 && (
          <select value={state} onChange={e => setState(e.target.value)} className="flex-1 rounded-xl px-3 py-2 text-sm border" style={{ ...inputStyle, backgroundColor: 'var(--color-bg-card)' }} aria-label={tr('State or region')}>
            <option value="">{tr('All states / regions')}</option>
            {states.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex rounded-xl p-0.5 border w-fit" style={card}>
        {(['all', 'parish', 'ministry'] as const).map(k => (
          <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={kind === k ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
            {k === 'all' ? tr('All') : k === 'parish' ? tr('Parishes') : tr('Ministries')}
          </button>
        ))}
      </div>
      <div className="flex rounded-xl p-0.5 border w-fit ml-auto" style={card} role="group" aria-label={tr('Show as')}>
        {(['list', 'map'] as const).map(k => (
          <button key={k} onClick={() => setView(k)} aria-pressed={view === k} className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                  style={view === k ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
            {k === 'list' ? <List size={13} aria-hidden /> : <MapIcon size={13} aria-hidden />}{k === 'list' ? tr('List') : tr('Map')}
          </button>
        ))}
      </div>
      <button onClick={nearMe} disabled={locating} className="px-3 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-1 disabled:opacity-50"
              style={{ ...card, color: 'var(--color-accent-brand)' }}>
        <LocateFixed size={13} aria-hidden /> {locating ? tr('Finding you…') : tr('Near me')}
      </button>
      </div>

      {view === 'map' && (
        <div className="mb-6 space-y-3">
          <MapView label={tr('Map of parishes')} markers={markers} selected={picked} onSelect={setPicked} me={me}
                   center={me && !picked ? me : null} zoom={me ? 11 : 4} className="h-[60vh] min-h-80" />
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {markers.length}{' '}{tr('of')}{' '}{filtered.length}{' '}{tr('on the map. Parishes add their exact place when they claim their entry.')}
          </p>
          {pickedParish && <ParishCard p={pickedParish} onClaim={() => setParams({ claim: pickedParish.id })} />}
        </div>
      )}

      {me && nearest.length > 0 && (
        <section className="mb-6" aria-label={tr('Nearest to you')}>
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Nearest to you')}</h2>
          <ul className="space-y-2">
            {nearest.slice(0, 5).map(({ p, km }) => (
              <li key={p.id}>
                <ParishCard p={p} onClaim={() => setParams({ claim: p.id })}
                            away={`${p.geo_precision === 'town' ? '≈ ' : ''}${km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`} ${tr('away')}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!backendReady && (
        <p className="text-xs mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>{tr('Showing the headquarters and the parishes from the Church’s public list. Parishes registered in the app appear once the online directory is set up.')}</p>
      )}

      {loading ? <p className="text-center py-10 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>
        : filtered.length === 0 ? <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('No parishes match.')}</p>
        : (
          <div className="space-y-6">
            {grouped.map(([head, towns]) => (
              <section key={head}>
                <h2 className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{head}</h2>
                {[...towns.entries()].map(([town, list]) => (
                  <div key={town} className="mb-3">
                    <p className="text-sm font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-text-primary)' }}><MapPin size={13} /> {town}</p>
                    <ul className="space-y-2">{list.map(p => <li key={p.id}><ParishCard p={p} onClaim={() => setParams({ claim: p.id })} /></li>)}</ul>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

      {params.get('submit') === '1' && <SubmitParish initialKind={params.get('kind') === 'ministry' ? 'ministry' : 'parish'} onClose={() => setParams({})} />}
      {claim && <ClaimParish parish={claim} onClose={() => setParams({})} />}
    </div>
  );
}
