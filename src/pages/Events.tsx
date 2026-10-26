import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, MapPin, CalendarPlus, Church, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useParishes } from '../hooks/useParishes';
import { useDraft } from '../hooks/useDraft';
import { usePageTitle } from '../hooks/usePageTitle';
import { listEvents, submitEvent, EVENT_CATEGORIES, type ChurchEvent, type EventCategory } from '../lib/community';
import { churchObservances, lessonEvents, downloadIcs } from '../utils/churchCalendar';
import { useLessons } from '../hooks/useLessons';
import { toISODate } from '../utils/dateUtils';
import { SignInPrompt } from '../components/CommunityStates';
import { showToast } from '../components/Toast';
import { errorMessage, BackendError } from '../lib/backend';
import { Sheet } from '../components/Dialog';
import { tr } from '../i18n';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };

const CATEGORY_COLORS: Record<EventCategory, string> = {
  service: '#3B82F6', social: '#EC4899', youth: '#8B5CF6', harvest: '#F59E0B', anniversary: '#D4A843', convention: '#14B8A6',
  crusade: '#EF4444', wedding: '#F472B6', memorial: '#64748B', meeting: '#22C55E', other: '#94A3B8',
};

function formatWhen(e: ChurchEvent): string {
  const d = new Date(e.starts_at);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return e.all_day ? day : `${day} · ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

interface EventDraft {
  title: string; description: string; category: EventCategory; date: string; time: string; endDate: string;
  location: string; contact: string; scope: 'church' | 'parish';
}

function SubmitEvent({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { profile } = useProfile();
  const draft = useDraft<EventDraft>('event:new', {
    title: '', description: '', category: 'social', date: '', time: '', endDate: '', location: '', contact: '', scope: 'parish',
  });
  const v = draft.value;
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!v.title.trim() || !v.date) return;
    setBusy(true);
    try {
      const start = new Date(`${v.date}T${v.time || '00:00'}`);
      await submitEvent({
        title: v.title.trim(), description: v.description.trim() || null, category: v.category,
        starts_at: start.toISOString(),
        ends_at: v.endDate ? new Date(`${v.endDate}T23:59`).toISOString() : null,
        all_day: !v.time, location: v.location.trim() || profile.parishName || null, contact: v.contact.trim() || null,
        parish_id: profile.parishId, scope: v.scope,
      });
      draft.clear();
      showToast(tr('Event submitted, it appears once approved (straight away for verified parish admins)'));
      onDone();
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet label={tr('Add an event')} onClose={onClose}>
      <div className="space-y-3">
        <input value={v.title} onChange={e => draft.setValue({ title: e.target.value })} placeholder={tr('Event name')} maxLength={140} className={inputClass} style={inputStyle} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Date')}<input type="date" value={v.date} onChange={e => draft.setValue({ date: e.target.value })} className={`${inputClass} mt-1`} style={inputStyle} />
          </label>
          <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tr('Time (optional)')}<input type="time" value={v.time} onChange={e => draft.setValue({ time: e.target.value })} className={`${inputClass} mt-1`} style={inputStyle} />
          </label>
        </div>
        <label className="text-xs block" style={{ color: 'var(--color-text-muted)' }}>{tr('Ends on (for events over several days)')}<input type="date" value={v.endDate} min={v.date} onChange={e => draft.setValue({ endDate: e.target.value })} className={`${inputClass} mt-1`} style={inputStyle} />
        </label>
        <select value={v.category} onChange={e => draft.setValue({ category: e.target.value as EventCategory })} className={inputClass} style={inputStyle} aria-label={tr('Type')}>
          {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map(c => <option key={c} value={c}>{tr(EVENT_CATEGORIES[c])}</option>)}
        </select>
        <input value={v.location} onChange={e => draft.setValue({ location: e.target.value })} placeholder={profile.parishName || tr('Venue')} className={inputClass} style={inputStyle} />
        <textarea value={v.description} onChange={e => draft.setValue({ description: e.target.value })} rows={3} maxLength={4000}
                  placeholder={tr('Details, programme, dress code, what to bring')} className={inputClass} style={inputStyle} />
        <input value={v.contact} onChange={e => draft.setValue({ contact: e.target.value })} placeholder={tr('Contact for enquiries (optional)')} className={inputClass} style={inputStyle} />
        <select value={v.scope} onChange={e => draft.setValue({ scope: e.target.value as 'church' | 'parish' })} className={inputClass} style={inputStyle} aria-label={tr('Who is it for')}>
          <option value="parish">{profile.parishName ? `For ${profile.parishName}` : tr('For my parish')}</option>
          <option value="church">{tr('For the whole Church')}</option>
        </select>
        <button onClick={submit} disabled={busy || !v.title.trim() || !v.date} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Submit event')}</button>
      </div>
    </Sheet>
  );
}

export default function Events() {
  usePageTitle('events', 'Church events');
  const { user } = useAuth();
  const { profile } = useProfile();
  const { parishes } = useParishes();
  const [params, setParams] = useSearchParams();
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [scope, setScope] = useState<'all' | 'parish'>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [dbEvents, setDbEvents] = useState<ChurchEvent[]>([]);
  const [backendNote, setBackendNote] = useState<string | null>(null);
  const [open, setOpen] = useState<ChurchEvent | null>(null);
  const submitting = params.get('submit') === '1';

  const range = useMemo(() => {
    // List view shows the next three months; calendar view shows the month on screen
    if (view === 'list') {
      const from = new Date(cursor.year, cursor.month, 1);
      return { from, to: new Date(cursor.year, cursor.month + 3, 0, 23, 59) };
    }
    return { from: new Date(cursor.year, cursor.month, 1), to: new Date(cursor.year, cursor.month + 1, 0, 23, 59) };
  }, [cursor, view]);

  const load = useCallback(async () => {
    try {
      setDbEvents(await listEvents(range.from, range.to));
      setBackendNote(null);
    } catch (e) {
      setDbEvents([]);
      setBackendNote(e instanceof BackendError && e.notSetUp ? 'Parish events will appear here once the church’s online service is set up.' : errorMessage(e));
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const { lessons } = useLessons();
  const events = useMemo(() => {
    const years = new Set([range.from.getFullYear(), range.to.getFullYear()]);
    const builtIns = [...years].flatMap(y => churchObservances(y));
    const observances = [...builtIns, ...lessonEvents(lessons, builtIns)]
      .filter(e => new Date(e.ends_at ?? e.starts_at) >= range.from && new Date(e.starts_at) <= range.to);
    let list = [...observances, ...dbEvents];
    if (scope === 'parish') list = list.filter(e => e.builtIn || (profile.parishId && e.parish_id === profile.parishId));
    // Hide past events in the list view (but keep them in the calendar)
    if (view === 'list') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      list = list.filter(e => new Date(e.ends_at ?? e.starts_at) >= today);
    }
    return list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [dbEvents, range, scope, profile.parishId, view, lessons]);

  const byDay = useMemo(() => {
    const map = new Map<string, ChurchEvent[]>();
    // Multi-day events (a convocation, a crusade) show on every day they run, up to a month
    for (const e of events) {
      const day = new Date(e.starts_at); day.setHours(0, 0, 0, 0);
      const last = new Date(e.ends_at ?? e.starts_at);
      for (let i = 0; i < 31 && day <= last; i++, day.setDate(day.getDate() + 1)) {
        const key = toISODate(day);
        map.set(key, [...(map.get(key) ?? []), e]);
      }
    }
    return map;
  }, [events]);

  const parishName = (id: string | null) => (id ? parishes.find(p => p.id === id)?.name : null);
  const shown = selectedDay ? byDay.get(selectedDay) ?? [] : events;

  const move = (delta: number) => {
    setSelectedDay(null);
    setCursor(c => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const todayKey = toISODate(new Date());

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Events')}</h1>
        {user && (
          <button onClick={() => setParams({ submit: '1' })} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1">
            <Plus size={16} />{' '}{tr('Add event')}</button>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{tr('Church observances, harvests, conventions and parish social events.')}</p>
      {!user && <div className="mb-4"><SignInPrompt message={tr('Sign in to add your parish’s events to the calendar.')} /></div>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-xl p-0.5 border" style={card}>
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setSelectedDay(null); }} aria-pressed={view === v}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
                    style={view === v ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>{v}</button>
          ))}
        </div>
        <div className="flex rounded-xl p-0.5 border" style={card}>
          {(['all', 'parish'] as const).map(s => (
            <button key={s} onClick={() => setScope(s)} aria-pressed={scope === s} disabled={s === 'parish' && !profile.parishId}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                    style={scope === s ? { backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
              {s === 'all' ? tr('Whole Church') : tr('My parish')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => move(-1)} className="p-2 rounded-lg" style={card} aria-label={tr('Previous month')}><ChevronLeft size={18} /></button>
        <h2 className="font-semibold font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>
          {tr(MONTHS[cursor.month])} {cursor.year}{view === 'list' ? tr(' onwards') : ''}
        </h2>
        <button onClick={() => move(1)} className="p-2 rounded-lg" style={card} aria-label={tr('Next month')}><ChevronRight size={18} /></button>
      </div>

      {view === 'calendar' && (
        <div className="rounded-2xl border p-3 mb-4" style={card}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d, i) => <div key={i} className="text-center text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const key = toISODate(new Date(cursor.year, cursor.month, day));
              const dayEvents = byDay.get(key) ?? [];
              const selected = selectedDay === key;
              return (
                <button key={day} onClick={() => setSelectedDay(selected ? null : key)} aria-pressed={selected}
                        className="aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative"
                        style={{
                          backgroundColor: selected ? 'var(--color-accent-brand)' : key === todayKey ? 'var(--color-bg-primary)' : 'transparent',
                          color: selected ? 'var(--color-text-on-accent)' : 'var(--color-text-primary)',
                          fontWeight: key === todayKey ? 700 : 400,
                        }}>
                  {day}
                  {dayEvents.length > 0 && (
                    <span className="flex gap-0.5 absolute bottom-1">
                      {dayEvents.slice(0, 3).map(e => <span key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[e.category] }} />)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {backendNote && <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>{backendNote}</p>}

      {shown.length === 0 ? (
        <p className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('No events')}{' '}{selectedDay ? tr('on this day') : tr('in this period')}.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map(e => (
            <li key={e.id}>
              <button onClick={() => setOpen(e)} className="w-full text-left rounded-2xl border p-4 flex gap-3" style={card}>
                <span className="w-1 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[e.category] }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{formatWhen(e)}</span>
                  <span className="block font-semibold mt-0.5" style={{ color: e.status === 'cancelled' ? 'var(--color-text-muted)' : 'var(--color-text-primary)', textDecoration: e.status === 'cancelled' ? 'line-through' : undefined }}>
                    {tr(e.title)}
                  </span>
                  <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {e.builtIn ? tr('Whole Church') : parishName(e.parish_id) ?? (e.scope === 'church' ? tr('Whole Church') : tr('Parish event'))}
                    {e.location ? ` · ${e.location}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Sheet label={open.title} onClose={() => setOpen(null)}
               title={<span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: CATEGORY_COLORS[open.category] }}>{tr(EVENT_CATEGORIES[open.category])}</span>}>
          <div>
            <h3 className="text-xl font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-text-primary)' }}>{tr(open.title)}</h3>
            {open.status === 'cancelled' && <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-warning)' }}>{tr('Cancelled')}</p>}
            <p className="text-sm mt-3 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}><Clock size={15} /> {formatWhen(open)}
              {open.ends_at && ` – ${new Date(open.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}</p>
            {open.location && <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}><MapPin size={15} /> {open.location}</p>}
            {(parishName(open.parish_id) || open.builtIn) && (
              <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}><Church size={15} /> {open.builtIn ? tr('Observed by the whole Church') : parishName(open.parish_id)}</p>
            )}
            {open.description && <p className="text-sm mt-4 whitespace-pre-line leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{tr(open.description)}</p>}
            {open.contact && <p className="text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>{tr('Enquiries:')}{' '}{open.contact}</p>}
            <button onClick={() => downloadIcs(open)} className="btn-primary mt-5 px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
              <CalendarPlus size={16} />{' '}{tr('Add to my calendar')}</button>
          </div>
        </Sheet>
      )}

      {submitting && user && <SubmitEvent onClose={() => setParams({})} onDone={() => { setParams({}); load(); }} />}
    </div>
  );
}
