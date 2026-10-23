import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Settings, Users, CalendarDays, HandHeart, HandCoins, CalendarClock, Radio, Trash2, Plus, Check, X, Download } from 'lucide-react';
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
import { normalizeLinks } from '../utils/safeUrl';

type Tab = 'details' | 'live' | 'team' | 'events' | 'prayers' | 'giving' | 'appointments';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'details', label: 'Details', icon: <Settings size={15} /> },
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
      const urls = normalizeLinks({ map_url: p.map_url, website: p.website }, { map_url: 'Map link', website: 'Website' });
      const social = normalizeLinks(Object.fromEntries(Object.entries(links).filter(([, v]) => v)));
      await updateParish(p.id, {
        name: p.name, diocese: p.diocese, province: p.province, country: p.country, state_region: p.state_region, city: p.city,
        address: p.address, map_url: urls.map_url, shepherd_name: p.shepherd_name, phone: p.phone, email: p.email, website: urls.website,
        contact_public: p.contact_public, service_times: times.filter(t => t.time), giving_details: giving.note ? { note: giving.note } : null,
        social_links: social as Record<string, string>,
        accepts_prayer_requests: p.accepts_prayer_requests, accepts_appointments: p.accepts_appointments,
      });
      showToast('Saved');
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
        <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
          Waiting for a moderator to list this {p.kind === 'ministry' ? 'ministry' : 'parish'} in the directory. You can prepare its details now.
        </p>
      )}
      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        {text('name', 'Name')}
        <div className="grid grid-cols-2 gap-2">{text('diocese', 'Diocese / district')}{text('province', 'Province')}</div>
        <div className="grid grid-cols-2 gap-2">{text('country', 'Country')}{text('state_region', 'State / region')}</div>
        {text('city', 'Town / city')}
        {text('address', 'Address')}
        {text('map_url', 'Map link (Google Maps)', 'url')}
        {text('shepherd_name', p.kind === 'ministry' ? 'Shepherd' : 'Shepherd in charge')}
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
          <input type="checkbox" className="mt-1" checked={p.contact_public} onChange={e => set({ contact_public: e.target.checked })} />
          Show the phone and email publicly in the directory
        </label>
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Service times</h3>
        {times.map((t, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <input value={t.service} onChange={e => set({ service_times: times.map((x, j) => (j === i ? { ...x, service: e.target.value } : x)) })}
                   placeholder="Service, e.g. Lord's Day Service" className={inputClass} style={inputStyle} />
            <input type="time" value={t.time} onChange={e => set({ service_times: times.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })}
                   className={inputClass} style={inputStyle} />
            <button onClick={() => set({ service_times: times.filter((_, j) => j !== i) })} aria-label="Remove" style={{ color: 'var(--color-text-muted)' }}><Trash2 size={16} /></button>
          </div>
        ))}
        <button onClick={() => set({ service_times: [...times, { service: '', time: '' }] })} className="text-xs font-semibold inline-flex items-center gap-1"
                style={{ color: 'var(--color-accent-brand)' }}><Plus size={14} /> Add a service</button>
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Message to givers</h3>
        <Field label="Shown on the Give page">
          <input value={giving.note ?? ''} onChange={e => set({ giving_details: { note: e.target.value } })}
                 placeholder="e.g. Harvest thanksgiving offerings close on Sunday" className={inputClass} style={inputStyle} />
        </Field>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Set the bank account gifts are paid into under the Giving tab.</p>
      </section>

      <section className="rounded-2xl border p-4 space-y-2" style={card}>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={p.accepts_prayer_requests !== false} onChange={e => set({ accepts_prayer_requests: e.target.checked })} />
          Accept prayer requests from members
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={!!p.accepts_appointments} onChange={e => set({ accepts_appointments: e.target.checked })} />
          Let members book appointments
        </label>
      </section>

      <button onClick={save} disabled={busy} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50">Save details</button>
    </div>
  );
}

// ── Livestream ───────────────────────────────────────────────

function LiveTab({ parish, onSaved }: { parish: PrivateParish; onSaved: () => void }) {
  const [url, setUrl] = useState(parish.live_url ?? '');
  const [title, setTitle] = useState(parish.live_title ?? '');
  const go = async (liveNow: boolean) => {
    try {
      const { live_url } = normalizeLinks({ live_url: url }, { live_url: 'Livestream link' });
      await updateParish(parish.id, { live_url, live_title: title.trim() || null, live_now: liveNow });
      showToast(liveNow ? 'You are live — it shows on the Live page' : 'Saved');
      onSaved();
    } catch (e) {
      showToast(errorMessage(e));
    }
  };
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={card}>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Stream on YouTube, Facebook or any platform, then paste the link here. YouTube streams play inside the app.
      </p>
      <Field label="Stream or channel link"><input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" placeholder="https://youtube.com/live/…" className={inputClass} style={inputStyle} /></Field>
      <Field label="Title"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sunday service — live" className={inputClass} style={inputStyle} /></Field>
      <div className="flex flex-wrap gap-2">
        {parish.live_now ? (
          <button onClick={() => go(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>End live</button>
        ) : (
          <button onClick={() => go(true)} disabled={!url.trim()} className="px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#EF4444', color: '#fff' }}><Radio size={16} /> Go live</button>
        )}
        <button onClick={() => go(!!parish.live_now)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>Save link</button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>A “live” flag switches itself off after six hours if you forget.</p>
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
                {[a.church_title, a.display_name].filter(Boolean).join(' ') || 'Member'}{a.user_id === user?.id ? ' (you)' : ''}
              </span>
              <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{TEAM_ROLES[a.role]?.label ?? a.role}{a.verified ? '' : ' · awaiting verification'}</span>
            </span>
            {a.user_id !== user?.id && (
              <button onClick={async () => { if (await confirmDialog({ title: 'Remove this person from the team?', confirmLabel: 'Remove', danger: true })) { try { await removeParishAdmin(parishId, a.user_id); load(); } catch (e) { showToast(errorMessage(e)); } } }}
                      aria-label="Remove" style={{ color: 'var(--color-text-muted)' }}><Trash2 size={16} /></button>
            )}
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border p-4 space-y-2" style={card}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add to the team</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>They must have signed up to the app first. {TEAM_ROLES[role].label}: {TEAM_ROLES[role].can.toLowerCase()}.</p>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Their email address" inputMode="email" className={inputClass} style={inputStyle} />
        <div className="flex gap-2">
          <select value={role} onChange={e => setRole(e.target.value as TeamRole)} className={inputClass} style={inputStyle} aria-label="Role">
            {(Object.keys(TEAM_ROLES) as TeamRole[]).filter(r => r !== 'editor').map(r => <option key={r} value={r}>{TEAM_ROLES[r].label}</option>)}
          </select>
          <button onClick={async () => { try { await addParishAdmin(parishId, email, role); setEmail(''); showToast('Added'); load(); } catch (e) { showToast(errorMessage(e)); } }}
                  disabled={!email.includes('@')} className="btn-primary px-4 rounded-xl text-sm font-semibold disabled:opacity-50">Add</button>
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
      <Link to="/events?submit=1" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1"><Plus size={16} /> Add an event</Link>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Events you add as a verified administrator are published to the public calendar straight away.</p>
      <ul className="space-y-2">
        {events.map(e => (
          <li key={e.id} className="rounded-2xl border p-3 flex items-center gap-3" style={card}>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{new Date(e.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{e.title}</span>
              <span className="block text-[11px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{e.status}</span>
            </span>
            {e.status === 'pending' && <button onClick={async () => { await setEventStatus(e.id, 'published'); load(); }} className="text-xs font-semibold" style={{ color: 'var(--color-success)' }}>Publish</button>}
            {e.status === 'published' && <button onClick={async () => { if (await confirmDialog({ title: 'Cancel this event?', message: 'It will show as cancelled on the calendar.', confirmLabel: 'Cancel event', danger: true })) { await setEventStatus(e.id, 'cancelled'); load(); } }} className="text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>Cancel</button>}
          </li>
        ))}
        {events.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No events yet.</p>}
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
            <span>{r.status}</span><span>· {r.visibility === 'shepherd' ? 'For the shepherd only' : r.visibility}</span>
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{r.title}</p>
          {r.body && <p className="text-sm mt-1 whitespace-pre-line" style={{ color: 'var(--color-text-secondary)' }}>{r.body}</p>}
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{r.is_anonymous ? 'Anonymous' : r.display_name} · {new Date(r.created_at).toLocaleDateString('en-GB')} · prayed {r.prayer_count}×</p>
          {r.status === 'pending' && (
            <div className="flex gap-3 mt-3 text-xs font-semibold">
              <button onClick={() => decide(r.id, 'published')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)' }}><Check size={14} /> Publish</button>
              <button onClick={() => decide(r.id, 'hidden')} className="inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><X size={14} /> Keep private</button>
            </div>
          )}
        </li>
      ))}
      {items.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No prayer requests for this parish yet.</p>}
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
      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Payout account</h3>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Members always pay through the app’s secure gateway; gifts to this parish settle into this account. Only shepherds and administrators can see it.
      </p>
      {account && !editing ? (
        <div className="text-sm space-y-1">
          <p style={{ color: 'var(--color-text-primary)' }}>{account.bank_name} · ••••{account.account_number.slice(-4)}</p>
          {account.account_name && <p style={{ color: 'var(--color-text-secondary)' }}>{account.account_name}</p>}
          <p className="text-xs font-semibold" style={{ color: account.status === 'verified' ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {account.status === 'verified' ? 'Verified — online giving is on' : account.status === 'failed' ? `Not verified: ${account.status_message ?? ''}` : 'Pending'}
          </p>
          <button onClick={() => setEditing(true)} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Change account</button>
        </div>
      ) : (
        <div className="space-y-2">
          <select value={bankCode} onChange={e => setBankCode(e.target.value)} className={inputClass} style={inputStyle} aria-label="Bank">
            <option value="">{banks.length ? 'Choose the bank' : 'Loading banks…'}</option>
            {banks.map(b => <option key={b.code + b.name} value={b.code}>{b.name}</option>)}
          </select>
          <input value={number} onChange={e => setNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="10-digit account number"
                 className={inputClass} style={inputStyle} />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy || !bankCode || number.length !== 10} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">
              {busy ? 'Checking with the bank…' : 'Verify and save'}
            </button>
            {account && <button onClick={() => setEditing(false)} className="px-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cancel</button>}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>The account name is confirmed with the bank before anything is saved.</p>
        </div>
      )}
    </section>
  );
}

function GivingTab({ parishId, fullAdmin }: { parishId: string; fullAdmin: boolean }) {
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
      {fullAdmin && <PayoutAccountCard parishId={parishId} />}
      <div className="grid grid-cols-2 gap-2">
        {[...totals.byPurpose].map(([key, amount]) => {
          const [purpose, currency] = key.split('|');
          return (
            <div key={key} className="rounded-2xl border p-3" style={card}>
              <p className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>{money(amount, currency)}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{DONATION_PURPOSES[purpose as keyof typeof DONATION_PURPOSES] ?? purpose} (confirmed)</p>
            </div>
          );
        })}
      </div>
      {totals.pledged.length > 0 && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{totals.pledged.length} open pledge{totals.pledged.length > 1 ? 's' : ''}</p>}
      <button onClick={exportCsv} disabled={!items.length} className="px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1 disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Download size={15} /> Export CSV</button>
      <ul className="space-y-1">
        {items.slice(0, 100).map(d => (
          <li key={d.id} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{DONATION_PURPOSES[d.purpose]} · {d.is_anonymous ? 'Anonymous' : d.donor_name ?? '—'}</span>
            <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{money(d.amount_minor, d.currency)}</span>
            <span className="text-[10px] uppercase w-16 text-right" style={{ color: d.status === 'paid' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{d.status}</span>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No gifts recorded through the app yet.</p>}
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
      const answer = await promptDialog({ title: 'Decline appointment', label: 'A short note for the member (optional)', confirmLabel: 'Decline', required: false });
      if (answer === null) return;
      note = answer;
    }
    try { await updateAppointment(b.id, { status, host_note: note || b.host_note }); load(); } catch (e) { showToast(errorMessage(e)); }
  };

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Requests & bookings</h3>
        {upcoming.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nothing booked.</p> : (
          <ul className="space-y-2">
            {upcoming.map(b => (
              <li key={b.id} className="rounded-2xl border p-3" style={card}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
                  {new Date(b.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                  {b.host_id === user?.id ? ' · with you' : ''}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b.member_name} — {b.topic}</p>
                {b.details && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{b.details}</p>}
                {b.member_phone && <a href={`tel:${b.member_phone}`} className="text-xs" style={{ color: 'var(--color-accent-brand)' }}>{b.member_phone}</a>}
                <div className="flex gap-3 mt-2 text-xs font-semibold">
                  {b.status === 'requested' && <button onClick={() => decide(b, 'confirmed')} style={{ color: 'var(--color-success)' }}>Confirm</button>}
                  <button onClick={() => decide(b, 'declined')} style={{ color: 'var(--color-warning)' }}>Decline</button>
                  {b.status === 'confirmed' && <button onClick={() => decide(b, 'done')} style={{ color: 'var(--color-text-muted)' }}>Mark done</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>My weekly hours</h3>
        <ul className="space-y-1">
          {slots.filter(s => s.host_id === user?.id).map(s => (
            <li key={s.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="flex-1">{WEEKDAYS[s.weekday]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.minutes_per_meeting} min{s.location ? ` · ${s.location}` : ''}</span>
              <button onClick={async () => { await deleteSlot(s.id); load(); }} aria-label="Remove"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          <select value={slot.weekday} onChange={e => setSlot({ ...slot, weekday: Number(e.target.value) })} className={inputClass} style={inputStyle} aria-label="Day">
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <select value={slot.minutes_per_meeting} onChange={e => setSlot({ ...slot, minutes_per_meeting: Number(e.target.value) })} className={inputClass} style={inputStyle} aria-label="Length">
            {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes each</option>)}
          </select>
          <input type="time" value={slot.start_time} onChange={e => setSlot({ ...slot, start_time: e.target.value })} className={inputClass} style={inputStyle} aria-label="From" />
          <input type="time" value={slot.end_time} onChange={e => setSlot({ ...slot, end_time: e.target.value })} className={inputClass} style={inputStyle} aria-label="To" />
        </div>
        <input value={slot.location} onChange={e => setSlot({ ...slot, location: e.target.value })} placeholder="Where, e.g. Vestry or a call link" className={inputClass} style={inputStyle} />
        <button onClick={async () => {
          try { await saveSlot({ ...slot, parish_id: parishId, active: true, location: slot.location || null }); showToast('Hours added'); load(); }
          catch (e) { showToast(errorMessage(e)); }
        }} disabled={slot.end_time <= slot.start_time} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">Add hours</button>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Turn on “Let members book appointments” under Details for these to show.</p>
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

  if (!user) return <div className="px-4 py-6 max-w-2xl mx-auto"><SignInPrompt message="Sign in to manage your parish or ministry." /></div>;
  if (error) return <ErrorState error={error} />;
  if (mine && mine.length === 0) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center space-y-3">
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>You don’t manage a parish or ministry yet</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Register it in the directory. Once a moderator lists it, you can manage it here — or ask its current administrator to add you.
        </p>
        <Link to="/directory?submit=1" className="btn-primary inline-block px-5 py-2.5 rounded-xl text-sm font-semibold">Register a parish or ministry</Link>
      </div>
    );
  }
  if (!parish) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>Loading…</p>;

  const setTab = (t: Tab) => setParams({ parish: parish.id, tab: t }, { replace: true });
  const myRole = mine?.find(m => m.parish.id === parish.id)?.role ?? 'admin';
  const full = FULL_ADMIN_ROLES.includes(myRole);
  // What each team role can open (the server enforces the same rules)
  const allowed: Record<Tab, boolean> = {
    details: full, live: full || myRole === 'media', team: full, events: true,
    prayers: full || myRole === 'parochial_committee', giving: full || myRole === 'parochial_committee', appointments: full,
  };
  const visibleTabs = TABS.filter(t => allowed[t.id]);
  const activeTab: Tab = allowed[tab] ? tab : visibleTabs[0].id;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-accent-gold)' }}>{parish.kind === 'ministry' ? 'Ministry' : 'Parish'} admin</p>
          <h1 className="text-xl font-bold font-[Outfit] truncate" style={{ color: 'var(--color-text-primary)' }}>{parish.name}</h1>
        </div>
        {mine && mine.length > 1 && (
          <select value={parish.id} onChange={e => setParams({ parish: e.target.value, tab })} className="rounded-xl px-2 py-2 text-xs border" style={inputStyle} aria-label="Parish">
            {mine.map(m => <option key={m.parish.id} value={m.parish.id}>{m.parish.name}</option>)}
          </select>
        )}
        <Link to={`/directory/${parish.id}`} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>View page</Link>
      </div>

      <div className="flex gap-1 overflow-x-auto hide-scrollbar mb-5" role="tablist">
        {visibleTabs.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
                  style={activeTab === t.id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <p className="text-[11px] mb-4" style={{ color: 'var(--color-text-muted)' }}>Your role: {TEAM_ROLES[myRole].label}</p>
      {activeTab === 'details' && <DetailsTab parish={parish} onSaved={reload} />}
      {activeTab === 'live' && <LiveTab parish={parish} onSaved={reload} />}
      {activeTab === 'team' && <TeamTab parishId={parish.id} />}
      {activeTab === 'events' && <EventsTab parishId={parish.id} />}
      {activeTab === 'prayers' && <PrayersTab parishId={parish.id} />}
      {activeTab === 'giving' && <GivingTab parishId={parish.id} fullAdmin={full} />}
      {activeTab === 'appointments' && <AppointmentsTab parishId={parish.id} />}
    </div>
  );
}
