import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, Mail, Globe, Clock, HandCoins, HandHeart, CalendarClock, Check, Star, Settings, Navigation } from 'lucide-react';
import { useParishes } from '../hooks/useParishes';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { listEvents, type ChurchEvent } from '../lib/community';
import {
  listSlots, availableTimes, bookAppointment, myAppointments, APPOINTMENT_TOPICS, myAdminParishes,
  type AppointmentSlot, type Appointment,
} from '../lib/parishAdmin';
import { SignInPrompt } from '../components/CommunityStates';
import { LivePlayer, isLiveNow } from '../components/LiveEmbed';
import { FollowButton } from '../components/FollowButton';
import { JoinSpaceButton } from '../components/MySpaces';
import { ParishGallery } from '../components/ParishMedia';
import { listLivestreams, bestEmbed, isStreamLive, PLATFORMS, type Livestream, type LivePlatform } from '../lib/live';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { safeHref } from '../utils/safeUrl';
import { tr } from '../i18n';
import { MapView } from '../components/MapView';
import { hasPoint } from '../lib/geo';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const SERVICE_NAMES: Record<string, string> = {
  lords_day_service: "Lord's Day Service", morning_service: 'Morning Service', seekers_service: 'Seekers Service',
  mercy_day_service: 'Mercy Day Service', power_day_service: 'Power Day Service', evening_service_lords_day: 'Evening Service',
};

function formatSlotTime(d: Date) {
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

function BookAppointment({ parishId }: { parishId: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [times, setTimes] = useState<{ slot: AppointmentSlot; start: Date; end: Date }[]>([]);
  const [host, setHost] = useState<string>('');
  const [chosen, setChosen] = useState<number | null>(null);
  const [topic, setTopic] = useState(APPOINTMENT_TOPICS[0]);
  const [details, setDetails] = useState('');
  const [phone, setPhone] = useState(profile.phone);
  const [mine, setMine] = useState<Appointment[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await listSlots(parishId);
      setSlots(s);
      setTimes(await availableTimes(s));
      if (user) setMine((await myAppointments()).filter(a => a.parish_id === parishId));
    } catch {}
  }, [parishId, user]);
  useEffect(() => { refresh(); }, [refresh]);

  const hosts = useMemo(() => [...new Map(slots.map(s => [s.host_id, s])).values()], [slots]);
  const shownTimes = times.filter(t => !host || t.slot.host_id === host);

  if (!slots.length && !mine.length) return null;

  const book = async () => {
    if (chosen === null) return;
    setBusy(true);
    try {
      const t = shownTimes[chosen];
      await bookAppointment({ ...t, topic, details, name: [profile.churchTitle, profile.displayName].filter(Boolean).join(' '), phone });
      showToast(tr('Requested — you’ll see it confirmed here'));
      setChosen(null);
      setDetails('');
      refresh();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border p-4 space-y-3" style={card}>
      <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
        <CalendarClock size={18} style={{ color: 'var(--color-accent-brand)' }} />{' '}{tr('Book an appointment')}</h2>
      {mine.filter(a => new Date(a.starts_at) > new Date() && ['requested', 'confirmed'].includes(a.status)).map(a => (
        <p key={a.id} className="text-sm p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
          {formatSlotTime(new Date(a.starts_at))} · {a.topic} — <strong>{a.status === 'confirmed' ? tr('Confirmed') : tr('Waiting for confirmation')}</strong>
          {a.host_note && <span className="block text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{a.host_note}</span>}
        </p>
      ))}
      {!user ? <SignInPrompt message={tr('Sign in to book time with the shepherd or a parish administrator.')} /> : (
        <>
          {hosts.length > 1 && (
            <select value={host} onChange={e => { setHost(e.target.value); setChosen(null); }} className={inputClass} style={inputStyle} aria-label={tr('With')}>
              <option value="">{tr('Anyone available')}</option>
              {hosts.map(h => <option key={h.host_id} value={h.host_id}>{h.host_name} ({h.host_role})</option>)}
            </select>
          )}
          {shownTimes.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('No free times in the next three weeks.')}</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {shownTimes.slice(0, 40).map((t, i) => (
                <button key={i} onClick={() => setChosen(i)} aria-pressed={chosen === i}
                        className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border"
                        style={chosen === i ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                                            : { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                  {formatSlotTime(t.start)}{!host && hosts.length > 1 ? ` · ${t.slot.host_name}` : ''}
                </button>
              ))}
            </div>
          )}
          {chosen !== null && (
            <div className="space-y-2">
              <select value={topic} onChange={e => setTopic(e.target.value)} className={inputClass} style={inputStyle} aria-label={tr('Reason')}>
                {APPOINTMENT_TOPICS.map(t => <option key={t}>{t}</option>)}
              </select>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={2} maxLength={1000} placeholder={tr('Anything they should know beforehand (optional)')}
                        className={inputClass} style={inputStyle} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={tr('Phone number to reach you')} className={inputClass} style={inputStyle} inputMode="tel" />
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {shownTimes[chosen].slot.location ? `Where: ${shownTimes[chosen].slot.location}. ` : ''}{tr('Your request goes to')}{' '}{shownTimes[chosen].slot.host_name}.
              </p>
              <button onClick={book} disabled={busy} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Request this time')}</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function ParishPage() {
  const { id } = useParams<{ id: string }>();
  const { parishes, loading } = useParishes();
  const { profile, save } = useProfile();
  const { user } = useAuth();
  const parish = parishes.find(p => p.id === id);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  usePageTitle('parish', parish?.name);

  useEffect(() => {
    if (!id) return;
    const from = new Date();
    const to = new Date(Date.now() + 120 * 86_400_000);
    listEvents(from, to).then(all => setEvents(all.filter(e => e.parish_id === id))).catch(() => {});
    if (user) myAdminParishes().then(list => setIsAdmin(list.some(p => p.parish.id === id))).catch(() => {});
  }, [id, user]);

  if (loading) return <p className="text-center py-16 animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>;
  if (!parish) {
    return (
      <div className="text-center py-16 px-4">
        <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>{tr('This parish isn’t in the directory.')}</p>
        <Link to="/directory" className="btn-primary px-5 py-2 rounded-xl text-sm">{tr('All parishes')}</Link>
      </div>
    );
  }

  const point = hasPoint(parish) ? { lat: parish.latitude!, lng: parish.longitude! } : null;
  const directions = point ? `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}` : null;
  const mapLink = safeHref(parish.map_url)
    || (point ? `https://www.google.com/maps?q=${point.lat},${point.lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent([parish.name, parish.address, parish.city, parish.country].filter(Boolean).join(', '))}`);
  const isMine = profile.parishId === parish.id;
  const g = parish.giving_details;
  const whatsapp = safeHref(parish.social_links?.whatsapp) || (parish.phone ? `https://wa.me/${parish.phone.replace(/[^\d]/g, '')}` : null);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-4">
      <Link to="/directory" className="text-sm inline-flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
        <ChevronLeft size={16} />{' '}{tr('Parishes')}</Link>

      {(parish.cover_url || parish.logo_url) && (
        <div className="relative w-full aspect-[8/3] rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-accent-brand), var(--color-accent-gold))' }}>
          {parish.cover_url && <img src={parish.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          {parish.logo_url && <img src={parish.logo_url} alt="" className="absolute left-3 bottom-3 w-16 h-16 rounded-xl object-cover border-2 border-white" />}
        </div>
      )}
      <header>
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{parish.name}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {[parish.kind === 'ministry' ? 'Independent ministry' : null, parish.diocese, parish.province].filter(Boolean).join(' · ')}
        </p>
        {parish.shepherd_name && <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('Shepherd:')}{' '}{parish.shepherd_name}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          <FollowButton parishId={parish.id} name={parish.name} />
          <button onClick={async () => { await save({ parishId: parish.id, parishName: parish.name, country: parish.country, stateRegion: parish.state_region ?? '' }); showToast(tr('Set as your parish')); }}
                  disabled={isMine} className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-100"
                  style={isMine ? { backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)' } : { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' }}>
            {isMine ? <><Check size={15} />{' '}{tr('My parish')}</> : <><Star size={15} />{' '}{tr('Make this my parish')}</>}
          </button>
          {!parish.seed && <JoinSpaceButton parishId={parish.id} />}
          {isAdmin && (
            <Link to={`/parish-admin?parish=${parish.id}`} className="px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-1.5"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              <Settings size={15} />{' '}{tr('Manage parish')}</Link>
          )}
        </div>
      </header>

      <ParishLive parishId={parish.id} parish={parish} />

      {(parish.about || parish.founded_year || parish.worship_languages?.length || parish.hourly_prayers) && (
        <section className="space-y-2">
          {parish.about && <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-text-primary)' }}>{parish.about}</p>}
          <p className="text-xs flex flex-wrap gap-x-3 gap-y-1" style={{ color: 'var(--color-text-muted)' }}>
            {parish.founded_year && <span>{tr('Founded')} {parish.founded_year}</span>}
            {parish.worship_languages?.length ? <span>{tr('Worship in')} {parish.worship_languages.map(l => tr(l)).join(', ')}</span> : null}
            {parish.hourly_prayers && <span>{tr('Hourly prayers at 9am, 12 noon, 3pm and 6pm')}</span>}
          </p>
        </section>
      )}

      <ParishGallery parishId={parish.id} />

      {point && (
        <section className="space-y-2">
          <MapView label={`${tr('Map')}: ${parish.name}`} markers={[{ id: parish.id, lat: point.lat, lng: point.lng, title: parish.name }]}
                   selected={parish.id} zoom={parish.geo_precision === 'town' ? 12 : 16} className="h-56" />
          <div className="flex items-center gap-3">
            {parish.geo_precision === 'town' && <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('Approximate — the town only. The parish can place its exact pin when it claims this page.')}</span>}
            {directions && parish.geo_precision !== 'town' && (
              <a href={directions} target="_blank" rel="noopener noreferrer" className="ml-auto btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5">
                <Navigation size={15} aria-hidden /> {tr('Directions')}
              </a>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        {parish.address && (
          <a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <MapPin size={18} className="shrink-0" style={{ color: 'var(--color-accent-brand)' }} />
            <span>{parish.address}{parish.city ? `, ${parish.city}` : ''}<span className="block text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Open in Maps')}</span></span>
          </a>
        )}
        {parish.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone size={18} style={{ color: 'var(--color-accent-brand)' }} />
            <a href={`tel:${parish.phone}`} style={{ color: 'var(--color-text-primary)' }}>{parish.phone}</a>
            {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold ml-auto" style={{ color: 'var(--color-success)' }}>{tr('WhatsApp')}</a>}
          </div>
        )}
        {parish.email && (
          <a href={`mailto:${parish.email}`} className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <Mail size={18} style={{ color: 'var(--color-accent-brand)' }} /> {parish.email}
          </a>
        )}
        {safeHref(parish.website) && (
          <a href={safeHref(parish.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <Globe size={18} style={{ color: 'var(--color-accent-brand)' }} /> {parish.website!.replace(/^https?:\/\//, '')}
          </a>
        )}
        {parish.social_links && Object.entries(parish.social_links).filter(([k, url]) => k !== 'whatsapp' && safeHref(url)).map(([k, url]) => (
          <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>
            <Globe size={18} style={{ color: 'var(--color-accent-brand)' }} /> {k}
          </a>
        ))}
        {!parish.phone && !parish.email && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('This parish hasn’t published contact details.')}</p>
        )}
      </section>

      {parish.service_times && parish.service_times.length > 0 && (
        <section className="rounded-2xl border p-4" style={card}>
          <h2 className="font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--color-text-primary)' }}><Clock size={18} />{' '}{tr('Service times')}</h2>
          <ul className="space-y-1 text-sm">
            {parish.service_times.map((s, i) => (
              <li key={i} className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                <span>{SERVICE_NAMES[s.service] ?? s.service}{s.day ? ` (${s.day})` : ''}</span><span className="font-semibold">{s.time}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to={`/give?parish=${parish.id}`} className="rounded-2xl border p-4 flex flex-col gap-1" style={card}>
          <HandCoins size={20} style={{ color: 'var(--color-accent-gold)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Tithe & offering</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{g?.note || tr('Tithes, offerings and thanksgiving')}</span>
        </Link>
        {parish.accepts_prayer_requests !== false && (
          <Link to="/prayer-requests" onClick={() => { if (!isMine) save({ parishId: parish.id, parishName: parish.name }); }} className="rounded-2xl border p-4 flex flex-col gap-1" style={card}>
            <HandHeart size={20} style={{ color: 'var(--color-accent-brand)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{tr('Prayer request')}</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Ask this parish to pray with you')}</span>
          </Link>
        )}
      </div>

      {parish.accepts_appointments && <BookAppointment parishId={parish.id} />}

      {events.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{tr('Coming up')}</h2>
          <ul className="space-y-2">
            {events.slice(0, 6).map(e => (
              <li key={e.id} className="rounded-xl border p-3 text-sm" style={card}>
                <span className="block text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>
                  {new Date(e.starts_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span style={{ color: 'var(--color-text-primary)' }}>{tr(e.title)}</span>
              </li>
            ))}
          </ul>
          <Link to="/events" className="text-xs font-semibold mt-2 inline-block" style={{ color: 'var(--color-accent-brand)' }}>{tr('All events →')}</Link>
        </section>
      )}
    </div>
  );
}

/** The parish's broadcast now, its next one, and where it streams */
function ParishLive({ parishId, parish }: { parishId: string; parish: import('../hooks/useParishes').Parish }) {
  const [streams, setStreams] = useState<Livestream[]>([]);
  useEffect(() => { listLivestreams({ parishId, limit: 10 }).then(r => setStreams(r ?? [])).catch(() => {}); }, [parishId]);
  const live = streams.find(isStreamLive);
  const next = streams.filter(s => s.status === 'scheduled' && s.scheduled_at && new Date(s.scheduled_at) > new Date())
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))[0];
  const channels = Object.entries(parish.live_channels ?? {}).filter(([k, v]) => k !== 'youtube_channel_id' && safeHref(v as string)) as [LivePlatform, string][];
  const legacyLive = !live && safeHref(parish.live_url) && isLiveNow(parish.live_now, parish.live_updated_at);
  if (!live && !next && !channels.length && !legacyLive) return null;
  return (
    <section className="space-y-3">
      {live && (
        <Link to={`/live/${live.id}`} className="block"><LivePlayer embed={bestEmbed(live, parish.live_channels)} destinations={live.destinations} title={live.title} live /></Link>
      )}
      {legacyLive && <LivePlayer embed={bestEmbed({ destinations: [{ platform: 'other', url: parish.live_url! }] }, parish.live_channels)} destinations={[{ platform: 'other', url: parish.live_url! }]} title={parish.live_title || tr('Live')} live />}
      {next && (
        <Link to={`/live/${next.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--color-text-primary)' }}><b>{tr('Next live:')}</b> {tr(next.title)}</span>
          <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>{new Date(next.scheduled_at!).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
        </Link>
      )}
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {channels.map(([k, url]) => (
            <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-full border"
               style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>{PLATFORMS[k]?.label ?? k}</a>
          ))}
        </div>
      )}
    </section>
  );
}
