import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Settings, Users, CalendarDays, HandHeart, HandCoins, CalendarClock, Radio, Trash2, Plus, Check, X, Download, Crown, Bell, Square, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  TEAM_ROLES, FULL_ADMIN_ROLES, type TeamRole,
  myAdminParishes, getParishPrivate, updateParish, listParishAdmins, addParishAdmin, removeParishAdmin,
  parishPrayerRequests, parishDonations, parishEvents, setEventStatus, listSlots, saveSlot, deleteSlot,
  parishAppointments, updateAppointment, type AppointmentSlot, type Appointment,
} from '../lib/parishAdmin';
import { moderate, DONATION_PURPOSES, type SharedPrayerRequest, type Donation, type ChurchEvent } from '../lib/community';
import type { Parish, GivingDetails, ServiceTime } from '../hooks/useParishes';
import { SignInPrompt, ErrorState } from '../components/CommunityStates';
import { listBanks, getPayoutAccount, savePayoutAccount, type Bank, type PayoutAccount } from '../lib/payments';
import { showToast } from '../components/Toast';
import { confirmDialog, promptDialog } from '../components/Dialog';
import { errorMessage } from '../lib/backend';
import { normalizeLinks, normalizeHttpsUrl } from '../utils/safeUrl';
import {
  PLATFORMS, listLivestreams, saveLivestream, setStreamStatus, notifyLive, saveChannels, youTubeChannelId, isStreamLive,
  shareMessage, streamLink, type Livestream, type Destination, type LivePlatform, type LiveChannels,
} from '../lib/live';
import { PRICING_ON, PARTNER_FEATURES, listPlans, getSubscription, hasPlan, subscribe, manageSubscription, planPrice, type Plan, type Subscription } from '../lib/plan';
import { ShareRow } from '../components/ShareRow';
import { ParishMediaManager } from '../components/ParishMedia';
import { LocationPicker } from '../components/LocationPicker';

const WORSHIP_LANGUAGES = ['English', 'Yorùbá', 'French', 'Egun', 'Igbo', 'Hausa', 'Twi', 'Ewe'];
import { ParishStructureCard, ShepherdClaimsCard } from '../components/ParishStructure';
import { tr } from '../i18n';

type Tab = 'details' | 'plan' | 'media' | 'live' | 'team' | 'events' | 'prayers' | 'giving' | 'appointments';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'details', label: 'Details', icon: <Settings size={15} /> },
  { id: 'plan', label: 'Plan', icon: <Crown size={15} /> },
  { id: 'media', label: 'Pictures', icon: <ImageIcon size={15} /> },
  { id: 'live', label: 'Livestream', icon: <Radio size={15} /> },
  { id: 'team', label: 'Team', icon: <Users size={15} /> },
  { id: 'events', label: 'Events', icon: <CalendarDays size={15} /> },
  { id: 'prayers', label: 'Prayer requests', icon: <HandHeart size={15} /> },
  { id: 'giving', label: 'Giving', icon: <HandCoins size={15} /> },
  { id: 'appointments', label: 'Appointments', icon: <CalendarClock size={15} /> },
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

type PrivateParish = Parish & { contact_public: boolean; status: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toFixed(2)}`; }
}

// ── Details ──────────────────────────────────────────────────

function DetailsTab({ parish, onSaved }: { parish: PrivateParish; onSaved: () => void }) {
  const [p, setP] = useState(parish);
  const [busy, setBusy] = useState(false);
  useEffect(() => setP(parish), [parish]);
  const set = (u: Partial<PrivateParish>) => setP(x => ({ ...x, ...u }));
  const giving: GivingDetails = p.giving_details ?? {};
  const times: ServiceTime[] = p.service_times ?? [];
  const links = p.social_links ?? {};

  const save = async () => {
    setBusy(true);
    try {
      const urls = normalizeLinks({ website: p.website }, { website: 'Website' });
      const social = normalizeLinks(Object.fromEntries(Object.entries(links).filter(([, v]) => v)));
      await updateParish(p.id, {
        name: p.name, diocese: p.diocese, province: p.province, country: p.country, state_region: p.state_region, city: p.city,
        address: p.address, latitude: p.latitude, longitude: p.longitude, geo_precision: p.latitude != null ? 'address' : undefined,
        about: p.about?.trim() || null, founded_year: p.founded_year || null, worship_languages: p.worship_languages?.length ? p.worship_languages : null,
        hourly_prayers: !!p.hourly_prayers, shepherd_name: p.shepherd_name, phone: p.phone, email: p.email, website: urls.website,
        contact_public: p.contact_public, service_times: times.filter(t => t.time), giving_details: giving.note ? { note: giving.note } : null,
        social_links: social as Record<string, string>,
        accepts_prayer_requests: p.accepts_prayer_requests, accepts_appointments: p.accepts_appointments,
      });
      showToast(tr('Saved'));
      onSaved();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const text = (key: keyof PrivateParish, label: string, mode?: 'tel' | 'email' | 'url') => (
    <Field label={label}>
      <input value={(p[key] as string) ?? ''} onChange={e => set({ [key]: e.target.value || null } as Partial<PrivateParish>)}
             inputMode={mode} className={inputClass} style={inputStyle} />
    </Field>
  );

  return (
    <div className="space-y-4">
      {p.status !== 'published' && (
        <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>{tr('Waiting for a moderator to list this')}{' '}{p.kind === 'ministry' ? tr('ministry') : tr('parish')}{' '}{tr('in the directory. You can prepare its details now.')}</p>
      )}
      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        {text('name', 'Name')}
        <div className="grid grid-cols-2 gap-2">{text('diocese', 'Diocese / district')}{text('province', 'Province')}</div>
        {text('shepherd_name', p.kind === 'ministry' ? 'Shepherd' : 'Shepherd in charge')}
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Where it is')}</h3>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Write the full address and place the pin on the church, so members find it on the map and get directions.')}</p>
        <LocationPicker
          value={{ address: p.address ?? '', city: p.city ?? '', state_region: p.state_region ?? '', country: p.country ?? '', latitude: p.latitude, longitude: p.longitude }}
          onChange={u => set({ ...u, ...('address' in u ? { address: u.address || null } : {}), ...('city' in u ? { city: u.city || null } : {}),
                               ...('state_region' in u ? { state_region: u.state_region || null } : {}) })}
          inputClass={inputClass} inputStyle={inputStyle} requireCity />
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('About the parish')}</h3>
        <Field label={tr('Who you are, your history, what visitors should know')}>
          <textarea value={p.about ?? ''} onChange={e => set({ about: e.target.value })} rows={5} maxLength={4000} className={inputClass} style={inputStyle} />
        </Field>
        <Field label={tr('Year founded')}>
          <input type="number" min={1947} max={new Date().getFullYear()} value={p.founded_year ?? ''} onChange={e => set({ founded_year: e.target.value ? Number(e.target.value) : null })}
                 inputMode="numeric" className={inputClass} style={inputStyle} />
        </Field>
        <fieldset>
          <legend className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>{tr('Languages of worship')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {WORSHIP_LANGUAGES.map(l => {
              const on = (p.worship_languages ?? []).includes(l);
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => set({ worship_languages: on ? (p.worship_languages ?? []).filter(x => x !== l) : [...(p.worship_languages ?? []), l] })}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                        style={on ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' } : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {tr(l)}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" className="mt-1" checked={!!p.hourly_prayers} onChange={e => set({ hourly_prayers: e.target.checked })} />
          {tr('We hold the hourly prayers (Àdúrà Wákàtí) at 9am, 12 noon, 3pm and 6pm')}</label>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Pictures, videos, the logo and the cover photo are under the Media tab.')}</p>
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Contact & links</h3>
        <div className="grid grid-cols-2 gap-2">{text('phone', 'Phone', 'tel')}{text('email', 'Email', 'email')}</div>
        {text('website', 'Website', 'url')}
        {(['whatsapp', 'facebook', 'youtube', 'instagram'] as const).map(k => (
          <Field key={k} label={k}>
            <input value={links[k] ?? ''} onChange={e => set({ social_links: { ...links, [k]: e.target.value } })} inputMode="url"
                   placeholder={k === 'whatsapp' ? 'https://wa.me/234…' : `https://${k}.com/…`} className={inputClass} style={inputStyle} />
          </Field>
        ))}
        <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" className="mt-1" checked={p.contact_public} onChange={e => set({ contact_public: e.target.checked })} />{tr('Show the phone and email publicly in the directory')}</label>
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Service times')}</h3>
        {times.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <input value={t.service} onChange={e => set({ service_times: times.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)) })}
                   placeholder={tr('Service, e.g. Lord\'s Day Service')} className={inputClass} style={inputStyle} />
            <input type="time" value={t.time} onChange={e => set({ service_times: times.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })}
                   className={inputClass} style={inputStyle} />
            <button onClick={() => set({ service_times: times.filter((_, j) => j !== i) })} aria-label={tr('Remove')} style={{ color: 'var(--color-text-muted)' }}><Trash2 size={16} /></button>
          </div>
        ))}
        <button onClick={() => set({ service_times: [...times, { service: '', time: '' }] })} className="text-xs font-semibold inline-flex items-center gap-1"
                style={{ color: 'var(--color-accent-brand)' }}><Plus size={14} />{' '}{tr('Add a service')}</button>
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Message to givers')}</h3>
        <Field label={tr('Shown on the Give page')}>
          <input value={giving.note ?? ''} onChange={e => set({ giving_details: { note: e.target.value } })}
                 placeholder={tr('e.g. Harvest thanksgiving offerings close on Sunday')} className={inputClass} style={inputStyle} />
        </Field>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Set the bank account gifts are paid into under the Giving tab.')}</p>
      </section>

      <section className="rounded-2xl border p-4 space-y-2" style={card}>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={p.accepts_prayer_requests !== false} onChange={e => set({ accepts_prayer_requests: e.target.checked })} />{tr('Accept prayer requests from members')}</label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={!!p.accepts_appointments} onChange={e => set({ accepts_appointments: e.target.checked })} />{tr('Let members book appointments')}</label>
      </section>

      <button onClick={save} disabled={busy} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Save details')}</button>
    </div>
  );
}

// ── Livestream ───────────────────────────────────────────────

/** Shown where a feature needs the Partner plan */
function PlanGate({ feature, fullAdmin, onPlan }: { feature: string; fullAdmin: boolean; onPlan: () => void }) {
  return (
    <div className="rounded-2xl border p-4 space-y-2" style={card}>
      <p className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><Crown size={16} style={{ color: 'var(--color-accent-gold)' }} /> {feature}{' '}{tr('is part of the Partner plan')}</p>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Gifts, support for your articles and livestreaming come with the plan. Reading, worship and prayer stay free for everyone.')}</p>
      {fullAdmin
        ? <button onClick={onPlan} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">{tr('See the plan')}</button>
        : <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Ask your shepherd or parish administrator to subscribe.')}</p>}
    </div>
  );
}

const PLATFORM_KEYS = Object.keys(PLATFORMS) as LivePlatform[];

function DestinationsEditor({ value, onChange }: { value: Destination[]; onChange: (d: Destination[]) => void }) {
  const set = (i: number, d: Partial<Destination>) => onChange(value.map((x, j) => (j === i ? { ...x, ...d } : x)));
  return (
    <div className="space-y-2">
      {value.map((d, i) => (
        <div key={i} className="flex gap-2">
          <select value={d.platform} onChange={e => set(i, { platform: e.target.value as LivePlatform })} aria-label={tr('Platform')} className="rounded-xl px-2 py-2 text-sm border w-32 shrink-0" style={inputStyle}>
            {PLATFORM_KEYS.map(k => <option key={k} value={k}>{tr(PLATFORMS[k].label)}</option>)}
          </select>
          <input value={d.url} onChange={e => set(i, { url: e.target.value })} inputMode="url" placeholder={PLATFORMS[d.platform].hint} aria-label={`${PLATFORMS[d.platform].label} link`} className={inputClass} style={inputStyle} />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={tr('Remove')} className="p-2 shrink-0" style={{ color: 'var(--color-text-muted)' }}><X size={16} /></button>
        </div>
      ))}
      {value.length < 8 && (
        <button onClick={() => onChange([...value, { platform: value.some(v => v.platform === 'youtube') ? 'facebook' : 'youtube', url: '' }])}
                className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}><Plus size={14} />{' '}{tr('Add a platform')}</button>
      )}
    </div>
  );
}

function cleanDestinations(list: Destination[]): Destination[] {
  return list.filter(d => d.url.trim()).map(d => {
    const url = normalizeHttpsUrl(d.url);
    if (!url) throw new Error(`${PLATFORMS[d.platform].label}: that isn’t a valid https:// link`);
    return { platform: d.platform, url };
  });
}

/** Destinations people already use, from the saved channels */
function fromChannels(c: LiveChannels | null | undefined): Destination[] {
  const out: Destination[] = [];
  for (const k of ['youtube', 'facebook', 'instagram', 'tiktok', 'x', 'mixlr'] as const) if (c?.[k]) out.push({ platform: k, url: c[k]! });
  return out.length ? out : [{ platform: 'youtube', url: '' }];
}

function LiveTab({ parish, onSaved, fullAdmin, onPlan }: { parish: PrivateParish; onSaved: () => void; fullAdmin: boolean; onPlan: () => void }) {
  const [plan, setPlan] = useState<boolean | null>(null);
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [form, setForm] = useState<{ id?: string; title: string; when: string; description: string; destinations: Destination[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    hasPlan(parish.id).then(setPlan);
    listLivestreams({ parishId: parish.id, limit: 30 }).then(r => setStreams(r ?? [])).catch(e => showToast(errorMessage(e)));
  }, [parish.id]);
  useEffect(() => { load(); }, [load]);

  if (plan === null) return <p className="text-center py-8 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>;

  const live = streams.find(isStreamLive);
  const scheduled = streams.filter(s => s.status === 'scheduled').sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); load(); onSaved(); } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); } };

  const goLive = (s: Livestream) => run(async () => {
    await setStreamStatus(s.id, 'live');
    try { const sent = await notifyLive(s.id); showToast(`You’re live: ${sent} member${sent === 1 ? '' : 's'} alerted`); }
    catch { showToast(tr('You’re live. Alerts could not be sent.')); }
  });

  const submit = (startNow: boolean) => form && run(async () => {
    const destinations = cleanDestinations(form.destinations);
    const saved = await saveLivestream({
      id: form.id, parish_id: parish.id, title: form.title.trim(), description: form.description.trim() || null,
      scheduled_at: form.when ? new Date(form.when).toISOString() : startNow ? new Date().toISOString() : null,
      destinations, status: 'scheduled',
    });
    setForm(null);
    if (startNow) await goLive(saved);
    else showToast(tr('Scheduled, it shows on the Live page'));
  });

  return (
    <div className="space-y-4">
      {!plan && <PlanGate feature="Livestreaming" fullAdmin={fullAdmin} onPlan={onPlan} />}

      {plan && live && (
        <div className="rounded-2xl border-2 p-4 space-y-3" style={{ ...card, borderColor: '#EF4444' }}>
          <p className="text-xs font-bold flex items-center gap-1" style={{ color: '#EF4444' }}><Radio size={14} />{' '}{tr('LIVE NOW')}</p>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(live.title)}</p>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => run(() => setStreamStatus(live.id, 'ended'))} className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}><Square size={14} />{' '}{tr('End broadcast')}</button>
            {!live.notified_at && (
              <button disabled={busy} onClick={() => run(async () => { const n = await notifyLive(live.id); showToast(`${n} alerted`); })}
                      className="px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <Bell size={14} /> Alert members & followers
              </button>
            )}
          </div>
          <ShareRow text={shareMessage(parish.name, live)} url={streamLink(live.id)} />
        </div>
      )}

      {plan && !form && !live && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setForm({ title: '', when: '', description: '', destinations: fromChannels(parish.live_channels) })}
                  className="py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2" style={{ backgroundColor: '#EF4444', color: '#fff' }}>
            <Radio size={16} />{' '}{tr('Go live')}</button>
          <button onClick={() => setForm({ title: '', when: ' ', description: '', destinations: fromChannels(parish.live_channels) })}
                  className="py-3 rounded-xl text-sm font-semibold border inline-flex items-center justify-center gap-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
            <CalendarClock size={16} />{' '}{tr('Schedule')}</button>
        </div>
      )}

      {plan && form && (
        <div className="rounded-2xl border p-4 space-y-3" style={card}>
          <Field label={tr('Title')}><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={140} placeholder={tr('e.g. Sunday service')} className={inputClass} style={inputStyle} /></Field>
          {form.when !== '' && (
            <Field label={tr('Starts')}><input type="datetime-local" value={form.when.trim()} onChange={e => setForm({ ...form, when: e.target.value })} className={inputClass} style={inputStyle} /></Field>
          )}
          <Field label={tr('Where it streams')}>
            <DestinationsEditor value={form.destinations} onChange={destinations => setForm({ ...form, destinations })} />
          </Field>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Paste the link of this broadcast on each platform (YouTube and Facebook play inside the app). With a YouTube channel saved below, the channel’s live video plays even without a link.')}</p>
          <Field label={tr('Description (optional)')}><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} maxLength={1000} className={inputClass} style={inputStyle} /></Field>
          <div className="flex gap-2">
            {form.when === '' ? (
              <button disabled={busy || form.title.trim().length < 3} onClick={() => submit(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: '#EF4444', color: '#fff' }}><Radio size={16} /> Go live & alert</button>
            ) : (
              <button disabled={busy || form.title.trim().length < 3 || !form.when.trim()} onClick={() => submit(false)} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Schedule')}</button>
            )}
            <button onClick={() => setForm(null)} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Cancel')}</button>
          </div>
        </div>
      )}

      {scheduled.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Scheduled')}</h3>
          <ul className="space-y-2">
            {scheduled.map(s => (
              <li key={s.id} className="rounded-2xl border p-3 space-y-2" style={card}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(s.title)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''} · {s.destinations.map(d => PLATFORMS[d.platform]?.label).join(', ') || tr('YouTube channel')}</p>
                  </div>
                  {plan && !live && <button disabled={busy} onClick={() => goLive(s)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>{tr('Go live')}</button>}
                  <button disabled={busy} onClick={async () => { if (await confirmDialog({ title: tr('Cancel this broadcast?'), confirmLabel: tr('Cancel broadcast'), danger: true })) run(() => setStreamStatus(s.id, 'cancelled')); }}
                          aria-label={tr('Cancel broadcast')} className="p-1.5" style={{ color: 'var(--color-text-muted)' }}><Trash2 size={15} /></button>
                </div>
                <ShareRow text={shareMessage(parish.name, s)} url={streamLink(s.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ChannelsCard parish={parish} onSaved={onSaved} />

      <details className="rounded-2xl border p-4 text-sm" style={card}>
        <summary className="font-semibold cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{tr('How to stream to several platforms at once')}</summary>
        <ol className="list-decimal pl-5 mt-3 space-y-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <li>{tr('Start the stream with the tool you use: YouTube Studio, Facebook Live Producer, or OBS on a computer.')}</li>
          <li>{tr('To reach YouTube, Facebook, Instagram and TikTok together, send one stream to a multistreaming service (for example Restream or StreamYard), or add each platform’s stream key in OBS’s “Multiple RTMP outputs”.')}</li>
          <li>{tr('Here, press')}{' '}<b>{tr('Go live')}</b>{tr(', paste the link from each platform and send the alert. Members and followers get a notification; the broadcast shows on the Live page and your parish page.')}</li>
          <li>{tr('Share it to WhatsApp, Facebook, X and Telegram with the buttons, the link opens the broadcast in the app, with every platform listed.')}</li>
          <li>{tr('Press')}{' '}<b>{tr('End broadcast')}</b>{' '}{tr('when you finish; it then appears under “Watch again”.')}</li>
        </ol>
        <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>{tr('Never paste a stream key here, keys stay in your streaming software.')}</p>
      </details>
    </div>
  );
}

function ChannelsCard({ parish, onSaved }: { parish: PrivateParish; onSaved: () => void }) {
  const [c, setC] = useState<LiveChannels & { youtube_input?: string }>({ ...(parish.live_channels ?? {}), youtube_input: parish.live_channels?.youtube_channel_id ?? parish.live_channels?.youtube ?? '' });
  const save = async () => {
    try {
      const youtubeInput = (c.youtube_input ?? '').trim();
      const channelId = youTubeChannelId(youtubeInput);
      const links = normalizeLinks({
        youtube: channelId ? '' : youtubeInput, facebook: c.facebook, instagram: c.instagram, tiktok: c.tiktok, x: c.x, mixlr: c.mixlr,
      }, { youtube: 'YouTube', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', x: 'X', mixlr: 'Mixlr' });
      const channels: LiveChannels = Object.fromEntries(Object.entries(links).filter(([, v]) => v)) as LiveChannels;
      if (channelId) { channels.youtube_channel_id = channelId; channels.youtube = `https://www.youtube.com/channel/${channelId}`; }
      await saveChannels(parish.id, channels);
      showToast(tr('Channels saved'));
      onSaved();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };
  const row = (key: 'facebook' | 'instagram' | 'tiktok' | 'x' | 'mixlr') => (
    <Field label={PLATFORMS[key].label}>
      <input value={c[key] ?? ''} onChange={e => setC({ ...c, [key]: e.target.value })} inputMode="url" placeholder={PLATFORMS[key].hint} className={inputClass} style={inputStyle} />
    </Field>
  );
  return (
    <details className="rounded-2xl border p-4" style={card}>
      <summary className="text-sm font-semibold cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>{tr('Your channels')}</summary>
      <div className="space-y-3 mt-3">
        <Field label={tr('YouTube channel')}>
          <input value={c.youtube_input ?? ''} onChange={e => setC({ ...c, youtube_input: e.target.value })} placeholder="https://youtube.com/channel/UC… or the channel id" className={inputClass} style={inputStyle} />
        </Field>
        <p className="text-[11px] -mt-1" style={{ color: 'var(--color-text-muted)' }}>{tr('With the channel id (starts with UC), whatever is live on your channel plays in the app automatically.')}</p>
        {row('facebook')}{row('instagram')}{row('tiktok')}{row('x')}{row('mixlr')}
        <button onClick={save} className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold">{tr('Save channels')}</button>
      </div>
    </details>
  );
}

// ── Plan ─────────────────────────────────────────────────────

function PlanTab({ parish }: { parish: PrivateParish }) {
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<Plan[] | null | undefined>(undefined);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listPlans().then(setPlans).catch(() => setPlans(null));
    getSubscription(parish.id).then(setSub).catch(() => {});
    hasPlan(parish.id).then(setActive);
  }, [parish.id]);
  useEffect(() => {
    load();
    // Back from Flutterwave: the webhook may take a moment
    if (params.get('subscribed')) { const t = setTimeout(load, 4000); return () => clearTimeout(t); }
  }, [load, params]);

  const go = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); } };
  const end = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="space-y-4">
      {params.get('subscribed') && !active && <p className="text-sm p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>{tr('Payment received, your plan will show here in a moment.')}</p>}
      <div className="rounded-2xl border p-4 space-y-3" style={card}>
        <p className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Crown size={18} style={{ color: 'var(--color-accent-gold)' }} />{' '}{tr('Partner plan')}<span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={active ? { backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' } : { backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}>
            {active ? (sub?.status === 'non_renewing' ? tr('Ends soon') : sub?.status === 'past_due' ? tr('Payment failed') : tr('Active')) : tr('Not subscribed')}
          </span>
        </p>
        <ul className="space-y-1.5">
          {PARTNER_FEATURES.map(f => <li key={f} className="text-sm flex gap-2" style={{ color: 'var(--color-text-secondary)' }}><Check size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} /> {f}</li>)}
        </ul>
        {active && end && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{sub?.status === 'non_renewing' ? tr('Ends') : tr('Renews')}{' '}{tr('on')}{' '}{end}.</p>}
        {sub?.status === 'past_due' && <p className="text-xs" style={{ color: 'var(--color-warning)' }}>{tr('The last payment failed. Pay again to keep gifts and livestreaming on.')}</p>}
      </div>

      {active && sub && sub.status !== 'past_due' ? (
        sub.status === 'non_renewing' ? (
          <button disabled={busy} onClick={() => go(async () => { await manageSubscription(parish.id, 'resume'); showToast(tr('The plan will renew')); load(); })}
                  className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">{tr('Keep renewing')}</button>
        ) : (
          <button disabled={busy} onClick={() => go(async () => {
                    if (!(await confirmDialog({ title: tr('Stop the plan renewing?'), message: tr('It keeps working until the end of the period already paid for.'), confirmLabel: tr('Stop renewing'), danger: true }))) return;
                    await manageSubscription(parish.id, 'cancel'); showToast(tr('The plan will not renew')); load();
                  })}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{tr('Stop renewing')}</button>
        )
      ) : plans === undefined ? (
        <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>
      ) : plans === null || plans.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('Plans open when the church’s online service is set up.')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {plans.map(p => (
            <button key={p.id} disabled={busy} onClick={() => go(() => subscribe(parish.id, p.id))} className="rounded-2xl border p-4 text-left disabled:opacity-60" style={card}>
              <span className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.interval === 'monthly' ? tr('Monthly') : tr('Yearly')}</span>
              <span className="block text-lg font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-accent-gold)' }}>{planPrice(p)}</span>
              <span className="block text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{tr('Pay securely with Flutterwave')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team ─────────────────────────────────────────────────────

function TeamTab({ parishId }: { parishId: string }) {
  const [admins, setAdmins] = useState<Awaited<ReturnType<typeof listParishAdmins>>>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('admin');
  const { user } = useAuth();
  const load = useCallback(() => listParishAdmins(parishId).then(setAdmins).catch(e => showToast(errorMessage(e))), [parishId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {admins.map(a => (
          <li key={a.user_id} className="flex items-center gap-3 rounded-2xl border p-3" style={card}>
            <span className="flex-1">
              <span className="block font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {[a.church_title, a.display_name].filter(Boolean).join(' ') || tr('Member')}{a.user_id === user?.id ? tr(' (you)') : ''}
              </span>
              <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{TEAM_ROLES[a.role]?.label ?? a.role}{a.verified ? '' : tr(' · awaiting verification')}</span>
            </span>
            {a.user_id !== user?.id && (
              <button onClick={async () => { if (await confirmDialog({ title: tr('Remove this person from the team?'), confirmLabel: tr('Remove'), danger: true })) { try { await removeParishAdmin(parishId, a.user_id); load(); } catch (e) { showToast(errorMessage(e)); } } }}
                      aria-label={tr('Remove')} style={{ color: 'var(--color-text-muted)' }}><Trash2 size={16} /></button>
            )}
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border p-4 space-y-2" style={card}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Add to the team')}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('They must have signed up to the app first.')}{' '}{tr(TEAM_ROLES[role].label)}: {TEAM_ROLES[role].can.toLowerCase()}.</p>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder={tr('Their email address')} inputMode="email" className={inputClass} style={inputStyle} />
        <div className="flex gap-2">
          <select value={role} onChange={e => setRole(e.target.value as TeamRole)} className={inputClass} style={inputStyle} aria-label={tr('Role')}>
            {(Object.keys(TEAM_ROLES) as TeamRole[]).filter(r => r !== 'editor').map(r => <option key={r} value={r}>{tr(TEAM_ROLES[r].label)}</option>)}
          </select>
          <button onClick={async () => { try { await addParishAdmin(parishId, email, role); setEmail(''); showToast(tr('Added')); load(); } catch (e) { showToast(errorMessage(e)); } }}
                  disabled={!email.includes('@')} className="btn-primary px-4 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Add')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Events ───────────────────────────────────────────────────

function EventsTab({ parishId }: { parishId: string }) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const load = useCallback(() => parishEvents(parishId).then(setEvents).catch(e => showToast(errorMessage(e))), [parishId]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-3">
      <Link to="/events?submit=1" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1"><Plus size={16} />{' '}{tr('Add an event')}</Link>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Events you add as a verified administrator are published to the public calendar straight away.')}</p>
      <ul className="space-y-2">
        {events.map(e => (
          <li key={e.id} className="rounded-2xl border p-3 flex items-center gap-3" style={card}>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{new Date(e.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(e.title)}</span>
              <span className="block text-[11px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{e.status}</span>
            </span>
            {e.status === 'pending' && <button onClick={async () => { await setEventStatus(e.id, 'published'); load(); }} className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>{tr('Publish')}</button>}
            {e.status === 'published' && <button onClick={async () => { if (await confirmDialog({ title: tr('Cancel this event?'), message: tr('It will show as cancelled on the calendar.'), confirmLabel: tr('Cancel event'), danger: true })) { await setEventStatus(e.id, 'cancelled'); load(); } }} className="text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>{tr('Cancel')}</button>}
          </li>
        ))}
        {events.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>{tr('No events yet.')}</p>}
      </ul>
    </div>
  );
}

// ── Prayer requests ──────────────────────────────────────────

function PrayersTab({ parishId }: { parishId: string }) {
  const [items, setItems] = useState<SharedPrayerRequest[]>([]);
  const load = useCallback(() => parishPrayerRequests(parishId).then(setItems).catch(e => showToast(errorMessage(e))), [parishId]);
  useEffect(() => { load(); }, [load]);
  const decide = async (id: string, status: SharedPrayerRequest['status']) => {
    try { await moderate('prayer_requests', id, { status }); load(); } catch (e) { showToast(errorMessage(e)); }
  };
  return (
    <ul className="space-y-2">
      {items.map(r => (
        <li key={r.id} className="rounded-2xl border p-4" style={card}>
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>{r.status}</span><span>· {r.visibility === 'shepherd' ? tr('For the shepherd only') : r.visibility}</span>
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr(r.title)}</p>
          {r.body && <p className="text-sm mt-1 whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{r.body}</p>}
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{r.is_anonymous ? tr('Anonymous') : r.display_name} · {new Date(r.created_at).toLocaleDateString('en-GB')}{' '}{tr('· prayed')}{' '}{r.prayer_count}×</p>
          {r.status === 'pending' && (
            <div className="flex gap-3 mt-3 text-xs font-semibold">
              <button onClick={() => decide(r.id, 'published')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}><Check size={14} />{' '}{tr('Publish')}</button>
              <button onClick={() => decide(r.id, 'hidden')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><X size={14} />{' '}{tr('Keep private')}</button>
            </div>
          )}
        </li>
      ))}
      {items.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>{tr('No prayer requests for this parish yet.')}</p>}
    </ul>
  );
}

// ── Giving ───────────────────────────────────────────────────

function PayoutAccountCard({ parishId }: { parishId: string }) {
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [number, setNumber] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getPayoutAccount(parishId).then(a => { setAccount(a); setEditing(!a); }).catch(() => setEditing(true)), [parishId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (editing && !banks.length) listBanks().then(setBanks).catch(e => showToast(errorMessage(e))); }, [editing, banks.length]);

  const save = async () => {
    const bank = banks.find(b => b.code === bankCode);
    if (!bank || !/^\d{10}$/.test(number)) return;
    setBusy(true);
    try {
      const r = await savePayoutAccount({ parishId, bank, accountNumber: number });
      showToast(`Verified: ${r.account_name}`);
      setNumber('');
      load();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border p-4 space-y-3" style={card}>
      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Payout account')}</h3>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Members always pay through the app’s secure gateway; gifts to this parish settle into this account. Only shepherds and administrators can see it.')}</p>
      {account && !editing ? (
        <div className="text-sm space-y-1">
          <p style={{ color: 'var(--color-text-primary)' }}>{account.bank_name} · ••••{account.account_number.slice(-4)}</p>
          {account.account_name && <p style={{ color: 'var(--color-text-secondary)' }}>{account.account_name}</p>}
          <p className="text-xs font-semibold" style={{ color: account.status === 'verified' ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {account.status === 'verified' ? tr('Verified, online giving is on') : account.status === 'failed' ? `Not verified: ${account.status_message ?? ''}` : tr('Pending')}
          </p>
          <button onClick={() => setEditing(true)} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Change account')}</button>
        </div>
      ) : (
        <div className="space-y-2">
          <select value={bankCode} onChange={e => setBankCode(e.target.value)} className={inputClass} style={inputStyle} aria-label={tr('Bank')}>
            <option value="">{banks.length ? tr('Choose the bank') : tr('Loading banks…')}</option>
            {banks.map(b => <option key={b.code + b.name} value={b.code}>{b.name}</option>)}
          </select>
          <input value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder={tr('10-digit account number')}
                 className={inputClass} style={inputStyle} />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !bankCode || number.length !== 10} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
              {busy ? tr('Checking with the bank…') : tr('Verify and save')}
            </button>
            {account && <button onClick={() => setEditing(false)} className="px-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Cancel')}</button>}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('The account name is confirmed with the bank before anything is saved.')}</p>
        </div>
      )}
    </section>
  );
}

function GivingTab({ parishId, fullAdmin, onPlan }: { parishId: string; fullAdmin: boolean; onPlan: () => void }) {
  const [plan, setPlan] = useState<boolean | null>(null);
  useEffect(() => { hasPlan(parishId).then(setPlan); }, [parishId]);
  const [items, setItems] = useState<(Donation & { donor_name: string | null; is_anonymous: boolean })[]>([]);
  useEffect(() => { parishDonations(parishId).then(setItems).catch(e => showToast(errorMessage(e))); }, [parishId]);

  const totals = useMemo(() => {
    const paid = items.filter(d => d.status === 'paid' || d.status === 'fulfilled');
    const byPurpose = new Map<string, number>();
    for (const d of paid) byPurpose.set(`${d.purpose}|${d.currency}`, (byPurpose.get(`${d.purpose}|${d.currency}`) ?? 0) + d.amount_minor);
    return { paid, byPurpose, pledged: items.filter(d => d.status === 'pledged') };
  }, [items]);

  const exportCsv = () => {
    const rows = [['Date', 'Purpose', 'Amount', 'Currency', 'Status', 'Donor', 'Reference', 'Note']];
    for (const d of items) {
      rows.push([d.created_at.slice(0, 10), DONATION_PURPOSES[d.purpose], (d.amount_minor / 100).toFixed(2), d.currency, d.status,
        d.is_anonymous ? 'Anonymous' : d.donor_name ?? '', d.provider_reference ?? '', d.note ?? '']);
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'giving.csv';
    a.click();
  };

  return (
    <div className="space-y-3">
      {plan === false && <PlanGate feature="Taking gifts" fullAdmin={fullAdmin} onPlan={onPlan} />}
      {fullAdmin && <PayoutAccountCard parishId={parishId} />}
      <div className="grid grid-cols-2 gap-2">
        {[...totals.byPurpose].map(([key, amount]) => {
          const [purpose, currency] = key.split('|');
          return (
            <div key={key} className="rounded-2xl border p-3" style={card}>
              <p className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>{money(amount, currency)}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{DONATION_PURPOSES[purpose as keyof typeof DONATION_PURPOSES] ?? purpose}{' '}{tr('(confirmed)')}</p>
            </div>
          );
        })}
      </div>
      {totals.pledged.length > 0 && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{totals.pledged.length}{' '}{tr('open pledge')}{totals.pledged.length > 1 ? 's' : ''}</p>}
      <button onClick={exportCsv} disabled={!items.length} className="px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1 disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Download size={15} />{' '}{tr('Export CSV')}</button>
      <ul className="space-y-1">
        {items.slice(0, 100).map(d => (
          <li key={d.id} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{tr(DONATION_PURPOSES[d.purpose])} · {d.is_anonymous ? tr('Anonymous') : d.donor_name ?? ''}</span>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{money(d.amount_minor, d.currency)}</span>
            <span className="text-[10px] uppercase w-16 text-right" style={{ color: d.status === 'paid' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{d.status}</span>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>{tr('No gifts recorded through the app yet.')}</p>}
    </div>
  );
}

// ── Appointments ─────────────────────────────────────────────

function AppointmentsTab({ parishId }: { parishId: string }) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [slot, setSlot] = useState({ weekday: 2, start_time: '16:00', end_time: '18:00', minutes_per_meeting: 30, location: '', host_role: 'shepherd' as AppointmentSlot['host_role'] });
  const load = useCallback(async () => {
    try {
      setSlots(await listSlots(parishId, { all: true }));
      setBookings(await parishAppointments(parishId));
    } catch (e) { showToast(errorMessage(e)); }
  }, [parishId]);
  useEffect(() => { load(); }, [load]);

  const upcoming = bookings.filter(b => new Date(b.ends_at) > new Date() && ['requested', 'confirmed'].includes(b.status));
  const decide = async (b: Appointment, status: Appointment['status']) => {
    let note = '';
    if (status === 'declined') {
      const answer = await promptDialog({ title: tr('Decline appointment'), label: tr('A short note for the member (optional)'), confirmLabel: tr('Decline'), required: false });
      if (answer === null) return;
      note = answer;
    }
    try { await updateAppointment(b.id, { status, host_note: note || b.host_note }); load(); } catch (e) { showToast(errorMessage(e)); }
  };

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Requests & bookings</h3>
        {upcoming.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('Nothing booked.')}</p> : (
          <ul className="space-y-2">
            {upcoming.map(b => (
              <li key={b.id} className="rounded-2xl border p-3" style={card}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
                  {new Date(b.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                  {b.host_id === user?.id ? tr(' · with you') : ''}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b.member_name}: {b.topic}</p>
                {b.details && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{b.details}</p>}
                {b.member_phone && <a href={`tel:${b.member_phone}`} className="text-xs" style={{ color: 'var(--color-accent-brand)' }}>{b.member_phone}</a>}
                <div className="flex gap-3 mt-2 text-xs font-semibold">
                  {b.status === 'requested' && <button onClick={() => decide(b, 'confirmed')} style={{ color: 'var(--color-success)' }}>{tr('Confirm')}</button>}
                  <button onClick={() => decide(b, 'declined')} style={{ color: 'var(--color-warning)' }}>{tr('Decline')}</button>
                  {b.status === 'confirmed' && <button onClick={() => decide(b, 'done')} style={{ color: 'var(--color-text-muted)' }}>{tr('Mark done')}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('My weekly hours')}</h3>
        <ul className="space-y-1">
          {slots.filter(s => s.host_id === user?.id).map(s => (
            <li key={s.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex-1">{tr(WEEKDAYS[s.weekday])} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.minutes_per_meeting}{' '}{tr('min')}{s.location ? ` · ${s.location}` : ''}</span>
              <button onClick={async () => { await deleteSlot(s.id); load(); }} aria-label={tr('Remove')}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <select value={slot.weekday} onChange={e => setSlot({ ...slot, weekday: Number(e.target.value) })} className={inputClass} style={inputStyle} aria-label={tr('Day')}>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <select value={slot.minutes_per_meeting} onChange={e => setSlot({ ...slot, minutes_per_meeting: Number(e.target.value) })} className={inputClass} style={inputStyle} aria-label={tr('Length')}>
            {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m}{' '}{tr('minutes each')}</option>)}
          </select>
          <input type="time" value={slot.start_time} onChange={e => setSlot({ ...slot, start_time: e.target.value })} className={inputClass} style={inputStyle} aria-label={tr('From')} />
          <input type="time" value={slot.end_time} onChange={e => setSlot({ ...slot, end_time: e.target.value })} className={inputClass} style={inputStyle} aria-label={tr('To')} />
        </div>
        <input value={slot.location} onChange={e => setSlot({ ...slot, location: e.target.value })} placeholder={tr('Where, e.g. Vestry or a call link')} className={inputClass} style={inputStyle} />
        <button onClick={async () => {
          try { await saveSlot({ ...slot, parish_id: parishId, active: true, location: slot.location || null }); showToast(tr('Hours added')); load(); }
          catch (e) { showToast(errorMessage(e)); }
        }} disabled={slot.end_time <= slot.start_time} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Add hours')}</button>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Turn on “Let members book appointments” under Details for these to show.')}</p>
      </section>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function ParishAdmin() {
  usePageTitle('parish_admin', 'Manage parish');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [mine, setMine] = useState<{ parish: Parish; role: TeamRole }[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [parish, setParish] = useState<PrivateParish | null>(null);
  const tab = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'details') as Tab;
  const parishId = params.get('parish') ?? mine?.[0]?.parish.id ?? null;

  useEffect(() => {
    if (!user) return;
    myAdminParishes().then(setMine).catch(setError);
  }, [user]);

  const reload = useCallback(() => {
    if (parishId) getParishPrivate(parishId).then(setParish).catch(setError);
  }, [parishId]);
  useEffect(() => { reload(); }, [reload]);

  if (!user) return <div className="px-4 py-6 max-w-2xl mx-auto"><SignInPrompt message={tr('Sign in to manage your parish or ministry.')} /></div>;
  if (error) return <ErrorState error={error} />;
  if (mine && mine.length === 0) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center space-y-3">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('You don’t manage a parish or ministry yet')}</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Register it in the directory. Once a moderator lists it, you can manage it here, or ask its current administrator to add you.')}</p>
        <Link to="/directory?submit=1" className="btn-primary inline-block px-5 py-2.5 rounded-xl text-sm font-semibold">{tr('Register a parish or ministry')}</Link>
      </div>
    );
  }
  if (!parish) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>;

  const setTab = (t: Tab) => setParams({ parish: parish.id, tab: t }, { replace: true });
  const myRole = mine?.find(m => m.parish.id === parish.id)?.role ?? 'admin';
  const full = FULL_ADMIN_ROLES.includes(myRole);
  // What each team role can open (the server enforces the same rules)
  const allowed: Record<Tab, boolean> = {
    details: full, plan: full, media: full || myRole === 'media', live: full || myRole === 'media', team: full, events: true,
    prayers: full || myRole === 'parochial_committee', giving: full || myRole === 'parochial_committee', appointments: full,
  };
  const visibleTabs = TABS.filter(t => allowed[t.id] && (t.id !== 'plan' || PRICING_ON));
  const activeTab: Tab = allowed[tab] ? tab : visibleTabs[0].id;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-accent-gold)' }}>{parish.kind === 'ministry' ? tr('Ministry') : tr('Parish')}{' '}{tr('admin')}</p>
          <h1 className="text-xl font-bold font-[Outfit] truncate" style={{ color: 'var(--color-text-primary)' }}>{parish.name}</h1>
        </div>
        {mine && mine.length > 1 && (
          <select value={parish.id} onChange={e => setParams({ parish: e.target.value, tab })} className="rounded-xl px-2 py-2 text-xs border" style={inputStyle} aria-label={tr('Parish')}>
            {mine.map(m => <option key={m.parish.id} value={m.parish.id}>{m.parish.name}</option>)}
          </select>
        )}
        <Link to={`/directory/${parish.id}`} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('View page')}</Link>
      </div>

      <div className="flex gap-1 overflow-x-auto hide-scrollbar mb-5" role="tablist">
        {visibleTabs.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
                  style={activeTab === t.id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            {t.icon}{tr(t.label)}
          </button>
        ))}
      </div>

      <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-muted)' }}>{tr('Your role:')}{' '}{tr(TEAM_ROLES[myRole].label)}</p>
      {activeTab === 'details' && <div className="space-y-4"><DetailsTab parish={parish} onSaved={reload} /><ParishStructureCard parish={parish} onSaved={reload} /></div>}
      {activeTab === 'plan' && PRICING_ON && <PlanTab parish={parish} />}
      {activeTab === 'media' && <ParishMediaManager parish={parish} onSaved={reload} />}
      {activeTab === 'live' && <LiveTab parish={parish} onSaved={reload} fullAdmin={full} onPlan={() => setTab('plan')} />}
      {activeTab === 'team' && <div className="space-y-4"><ShepherdClaimsCard parishId={parish.id} /><TeamTab parishId={parish.id} /></div>}
      {activeTab === 'events' && <EventsTab parishId={parish.id} />}
      {activeTab === 'prayers' && <PrayersTab parishId={parish.id} />}
      {activeTab === 'giving' && <GivingTab parishId={parish.id} fullAdmin={full} onPlan={() => setTab('plan')} />}
      {activeTab === 'appointments' && <AppointmentsTab parishId={parish.id} />}
    </div>
  );
}
