import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Hash, Plus, Send, Users, Link2, Lock, Trash2, Share2, CalendarDays, Check, X, ClipboardList, UserPlus, Copy, Phone, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useServices } from '../hooks/useServices';
import { usePageTitle } from '../hooks/usePageTitle';
import { Sheet, confirmDialog } from '../components/Dialog';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';
import {
  mySpaces, spacePeople, channels as loadChannels, addChannel, feed, post, deletePost, rosters as loadRosters, saveRoster, deleteRoster,
  myDuties, respond, rosterMessage, personName, DUTY_TEMPLATES, DEFAULT_DUTIES,
  spaceRequests, decideRequest, createInvite, leaveSpace, type JoinRequest,
  type MySpace, type SpacePerson, type Channel, type Post, type Audience, type Roster, type Duty, type MyDuty,
} from '../lib/parishSpace';

/*
 * A parish's own space: its shepherds, ministers and members talk in channels, and the parish plans who
 * ministers at each service. Posts can stay in the space, go to chosen people, or be shared by link.
 */

const PLANNERS = ['shepherd', 'admin', 'parochial_committee', 'editor'];
const card = { backgroundColor: 'var(--color-bg-card)' };
const muted = { color: 'var(--color-text-muted)' };
const text = { color: 'var(--color-text-primary)' };
const field = 'w-full rounded-xl px-3 py-2.5 text-sm border outline-none';
const fieldStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const origin = () => window.location.origin;
const when = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

async function shareText(message: string, url?: string) {
  if (navigator.share) { try { await navigator.share({ text: message, url }); return; } catch { return; } }
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
}

// ── Posts ────────────────────────────────────────────────────

function Posts({ space, people, canPlan, to }: { space: MySpace; people: SpacePerson[]; canPlan: boolean; to: string | null }) {
  const { user } = useAuth();
  const [chans, setChans] = useState<Channel[]>([]);
  const [channel, setChannel] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [body, setBody] = useState('');
  // "Message" on someone in People opens here, for that person only
  const [audience, setAudience] = useState<Audience>(to ? 'people' : 'space');
  const [chosen, setChosen] = useState<string[]>(to ? [to] : []);
  const [busy, setBusy] = useState(false);
  const [newChannel, setNewChannel] = useState(false);

  useEffect(() => {
    loadChannels(space.parish_id).then(c => { setChans(c); setChannel(c[0]?.id ?? null); }).catch(e => showToast(errorMessage(e)));
  }, [space.parish_id]);
  const load = useCallback(() => { if (channel) feed(space.parish_id, channel).then(setPosts).catch(e => showToast(errorMessage(e))); }, [space.parish_id, channel]);
  useEffect(() => { setPosts(null); load(); }, [load]);

  const send = async () => {
    if (!body.trim() || !channel) return;
    if (audience === 'people' && !chosen.length) { showToast(tr('Choose who it is for')); return; }
    setBusy(true);
    try {
      const made = await post({ parishId: space.parish_id, channelId: channel, body, audience, people: chosen });
      setBody(''); setChosen([]);
      if (audience === 'link' && made.share_token) {
        try { await navigator.clipboard.writeText(`${origin()}/shared/${made.share_token}`); showToast(tr('Posted, link copied')); } catch { showToast(tr('Posted')); }
      } else showToast(tr('Posted'));
      setAudience('space');
      load();
    } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
        {chans.map(c => (
          <button key={c.id} onClick={() => setChannel(c.id)} aria-pressed={channel === c.id}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={channel === c.id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { ...card, color: 'var(--color-text-secondary)' }}>
            <Hash size={14} /> {c.name}
          </button>
        ))}
        {canPlan && <button onClick={() => setNewChannel(true)} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><Plus size={14} /> {tr('Channel')}</button>}
      </div>

      {/* Composer */}
      <div className="rounded-2xl p-4 space-y-3" style={card}>
        <label className="sr-only" htmlFor="space-body">{tr('Write to the space')}</label>
        <textarea id="space-body" value={body} onChange={e => setBody(e.target.value)} rows={3} maxLength={4000} placeholder={tr('Share news, a reminder, a prayer point…')} className={`${field} resize-none`} style={fieldStyle} />
        <div className="flex flex-wrap items-center gap-2">
          <select value={audience} onChange={e => setAudience(e.target.value as Audience)} aria-label={tr('Who can see it')} className="rounded-xl px-3 py-2 text-sm border" style={fieldStyle}>
            <option value="space">{tr('Everyone in the space')}</option>
            <option value="people">{tr('Only the people I choose')}</option>
            <option value="link">{tr('Anyone with the link (to share outside)')}</option>
          </select>
          <button onClick={send} disabled={busy || !body.trim()} className="btn-primary ml-auto px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"><Send size={15} /> {tr('Post')}</button>
        </div>
        {audience === 'people' && (
          <ul className="max-h-40 overflow-y-auto space-y-1">
            {people.filter(p => p.user_id !== user?.id).map(p => (
              <li key={p.user_id}>
                <label className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg" style={text}>
                  <input type="checkbox" checked={chosen.includes(p.user_id)} onChange={e => setChosen(c => (e.target.checked ? [...c, p.user_id] : c.filter(x => x !== p.user_id)))} />
                  {personName(p)}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Posts */}
      {posts === null ? <p className="text-sm animate-pulse" style={muted}>{tr('Loading…')}</p>
        : posts.length === 0 ? <p className="text-sm text-center py-8" style={muted}>{tr('Nothing here yet. Start the conversation.')}</p>
        : (
          <ul className="space-y-3">
            {posts.map(p => {
              const link = p.share_token ? `${origin()}/shared/${p.share_token}` : null;
              return (
                <li key={p.id} className="rounded-2xl p-4 space-y-2" style={card}>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full grid place-items-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-accent-brand)' }}>{(p.author_name ?? '?')[0]?.toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate" style={text}>{[p.author_title, p.author_name].filter(Boolean).join(' ') || tr('Member')}</span>
                      <span className="block text-[11px]" style={muted}>{when(p.created_at)}</span>
                    </span>
                    {p.audience !== 'space' && (
                      <span className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ ...muted, backgroundColor: 'var(--color-bg-primary)' }}>
                        {p.audience === 'link' ? <><Link2 size={11} /> {tr('Shared by link')}</> : <><Lock size={11} /> {tr('Chosen people')}</>}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={text}>{p.body}</p>
                  <div className="flex gap-3 pt-1">
                    {link && <button onClick={() => shareText(p.body, link)} className="text-xs inline-flex items-center gap-1" style={muted}><Share2 size={13} /> {tr('Share')}</button>}
                    {link && <button onClick={async () => { try { await navigator.clipboard.writeText(link); showToast(tr('Link copied')); } catch { showToast(tr('Couldn\'t copy')); } }} className="text-xs inline-flex items-center gap-1" style={muted}><Copy size={13} /> {tr('Copy link')}</button>}
                    {(p.author_id === user?.id || ['shepherd', 'admin'].includes(space.role)) && (
                      <button onClick={async () => { if (await confirmDialog({ title: tr('Delete this post?'), confirmLabel: tr('Delete'), danger: true })) { try { await deletePost(p.id); load(); } catch (e) { showToast(errorMessage(e)); } } }}
                              className="text-xs inline-flex items-center gap-1 ml-auto" style={muted}><Trash2 size={13} /> {tr('Delete')}</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      {newChannel && <NewChannel parishId={space.parish_id} onClose={added => { setNewChannel(false); if (added) loadChannels(space.parish_id).then(setChans); }} />}
    </div>
  );
}

function NewChannel({ parishId, onClose }: { parishId: string; onClose: (added: boolean) => void }) {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  return (
    <Sheet label={tr('New channel')} onClose={() => onClose(false)}>
      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder={tr('e.g. Choir, Ministers, Youth, Media')} aria-label={tr('Channel name')} className={field} style={fieldStyle} />
        <input value={about} onChange={e => setAbout(e.target.value)} maxLength={200} placeholder={tr('What it is for (optional)')} aria-label={tr('What it is for')} className={field} style={fieldStyle} />
        <button disabled={!name.trim()} onClick={async () => { try { await addChannel(parishId, name, about); onClose(true); } catch (e) { showToast(errorMessage(e)); } }}
                className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Add channel')}</button>
      </div>
    </Sheet>
  );
}

// ── Rosters ──────────────────────────────────────────────────

function DutyRow({ d, people }: { d: Duty; people: SpacePerson[] }) {
  const who = d.user_id ? personName(people.find(p => p.user_id === d.user_id)) : d.person_name;
  const colour = d.status === 'accepted' ? 'var(--color-success)' : d.status === 'declined' ? '#DC2626' : 'var(--color-text-muted)';
  return (
    <li className="flex items-baseline gap-3 py-1.5">
      <span className="text-sm flex-1 min-w-0" style={{ color: 'var(--color-text-secondary)' }}>{tr(d.duty)}</span>
      <span className="text-sm font-semibold text-right" style={text}>{who || ''}</span>
      {d.user_id && <span className="text-[10px] font-bold uppercase w-16 text-right" style={{ color: colour }}>{d.status === 'accepted' ? tr('Accepted') : d.status === 'declined' ? tr('Declined') : tr('Asked')}</span>}
    </li>
  );
}

function Rosters({ space, people, canPlan }: { space: MySpace; people: SpacePerson[]; canPlan: boolean }) {
  const [list, setList] = useState<Roster[] | null>(null);
  const [mine, setMine] = useState<MyDuty[]>([]);
  const [editing, setEditing] = useState<Roster | 'new' | null>(null);
  const load = useCallback(() => {
    loadRosters(space.parish_id).then(setList).catch(e => { setList([]); showToast(errorMessage(e)); });
    myDuties().then(d => setMine(d.filter(x => x.parish_id === space.parish_id)));
  }, [space.parish_id]);
  useEffect(() => { load(); }, [load]);

  const answer = async (id: string, a: 'accepted' | 'declined') => {
    try { await respond(id, a); showToast(a === 'accepted' ? tr('Thank you, accepted') : tr('Declined')); load(); } catch (e) { showToast(errorMessage(e)); }
  };

  return (
    <div className="space-y-6">
      {mine.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-widest font-semibold" style={muted}>{tr('Your duties')}</h3>
          {mine.map(d => (
            <div key={d.id} className="rounded-2xl p-4 flex flex-wrap items-center gap-3 border" style={{ ...card, borderColor: 'var(--color-accent-brand)' }}>
              <span className="flex-1 min-w-[10rem]">
                <span className="block font-semibold" style={text}>{tr(d.duty)}</span>
                <span className="block text-xs" style={muted}>{tr(d.title)} · {dayLabel(d.service_date)}</span>
              </span>
              {d.status === 'assigned' ? (
                <span className="flex gap-2">
                  <button onClick={() => answer(d.id, 'accepted')} className="btn-primary px-3 py-1.5 rounded-lg text-sm font-semibold inline-flex items-center gap-1"><Check size={14} /> {tr('Accept')}</button>
                  <button onClick={() => answer(d.id, 'declined')} className="px-3 py-1.5 rounded-lg text-sm border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', ...text }}><X size={14} /> {tr('Decline')}</button>
                </span>
              ) : <span className="text-xs font-semibold" style={{ color: d.status === 'accepted' ? 'var(--color-success)' : '#DC2626' }}>{d.status === 'accepted' ? tr('Accepted') : tr('Declined')}</span>}
            </div>
          ))}
        </section>
      )}

      {canPlan && <button onClick={() => setEditing('new')} className="btn-primary w-full py-3 rounded-2xl font-semibold inline-flex items-center justify-center gap-2"><Plus size={18} /> {tr('New roster')}</button>}

      {list === null ? <p className="text-sm animate-pulse" style={muted}>{tr('Loading…')}</p>
        : list.length === 0 ? <p className="text-sm text-center py-8" style={muted}>{canPlan ? tr('No rosters yet. Plan who ministers at the next service.') : tr('No rosters published yet.')}</p>
        : (
          <ul className="space-y-3">
            {list.map(r => {
              const link = `${origin()}/roster/${r.share_token}`;
              const duties = r.parish_roster_duties ?? [];
              const message = rosterMessage(r, duties.map(d => ({ duty: d.duty, person: d.user_id ? personName(people.find(p => p.user_id === d.user_id)) : d.person_name })), link, space.name);
              return (
                <li key={r.id} className="rounded-2xl p-4 space-y-3" style={card}>
                  <div className="flex items-start gap-3">
                    <span className="w-12 text-center shrink-0 pt-0.5">
                      <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--color-accent-gold)' }}>{new Date(`${r.service_date}T12:00:00`).toLocaleDateString([], { month: 'short' })}</span>
                      <span className="block text-2xl font-bold font-[Outfit] leading-none" style={text}>{new Date(`${r.service_date}T12:00:00`).getDate()}</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold" style={text}>{tr(r.title)}</span>
                      <span className="block text-xs" style={muted}>{dayLabel(r.service_date)}{r.status === 'draft' ? ` · ${tr('Draft')}` : ''}</span>
                    </span>
                    {canPlan && <button onClick={() => setEditing(r)} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Edit')}</button>}
                  </div>
                  <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>{duties.map((d, i) => <DutyRow key={i} d={d} people={people} />)}</ul>
                  {r.notes && <p className="text-xs" style={muted}>{r.notes}</p>}
                  {r.status === 'published' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: '#1F9D55' }}>{tr('Send on WhatsApp')}</a>
                      <button onClick={() => shareText(message, link)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', ...text }}><Share2 size={13} /> {tr('Share')}</button>
                      <button onClick={async () => { try { await navigator.clipboard.writeText(link); showToast(tr('Link copied')); } catch { showToast(tr('Couldn\'t copy')); } }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', ...text }}><Link2 size={13} /> {tr('Copy link')}</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

      {editing && <RosterEditor space={space} people={people} roster={editing === 'new' ? null : editing} onClose={saved => { setEditing(null); if (saved) load(); }} />}
    </div>
  );
}

function nextSunday(): string {
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function RosterEditor({ space, people, roster, onClose }: { space: MySpace; people: SpacePerson[]; roster: Roster | null; onClose: (saved: boolean) => void }) {
  const { services } = useServices();
  const [date, setDate] = useState(roster?.service_date ?? nextSunday());
  const [serviceId, setServiceId] = useState(roster?.service_id ?? 'lords_day_service');
  const [title, setTitle] = useState(roster?.title ?? '');
  const [notes, setNotes] = useState(roster?.notes ?? '');
  const [duties, setDuties] = useState<Duty[]>(() => roster?.parish_roster_duties?.length
    ? roster.parish_roster_duties.map(d => ({ ...d }))
    : (DUTY_TEMPLATES['lords_day_service']).map((duty, i) => ({ position: i, duty, user_id: null, person_name: null })));
  const [busy, setBusy] = useState(false);
  const serviceName = services.find(s => s.id === serviceId)?.displayName ?? '';

  const chooseService = (id: string) => {
    setServiceId(id);
    // A fresh roster takes the duties usually given out at that service
    if (!roster && duties.every(d => !d.user_id && !d.person_name)) setDuties((DUTY_TEMPLATES[id] ?? DEFAULT_DUTIES).map((duty, i) => ({ position: i, duty, user_id: null, person_name: null })));
  };
  const set = (i: number, patch: Partial<Duty>) => setDuties(ds => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const save = async (status: Roster['status']) => {
    setBusy(true);
    try {
      await saveRoster({ id: roster?.id, parishId: space.parish_id, serviceDate: date, serviceId, title: title.trim() || serviceName || tr('Service roster'), notes, status, duties });
      showToast(status === 'published' ? tr('Published, those on duty can see it') : tr('Draft saved'));
      onClose(true);
    } catch (e) { showToast(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Sheet label={roster ? tr('Edit roster') : tr('New roster')} onClose={() => onClose(false)} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs" style={muted}>{tr('Date')}<input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${field} mt-1`} style={fieldStyle} /></label>
          <label className="text-xs" style={muted}>{tr('Service')}
            <select value={serviceId} onChange={e => chooseService(e.target.value)} className={`${field} mt-1`} style={fieldStyle}>
              {services.map(s => <option key={s.id} value={s.id}>{tr(s.displayName)}</option>)}
            </select>
          </label>
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={serviceName || tr('Title')} aria-label={tr('Title')} className={field} style={fieldStyle} />
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={muted}>{tr('Who ministers')}</p>
          {duties.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input value={d.duty} onChange={e => set(i, { duty: e.target.value })} aria-label={tr('Duty')} className={field} style={fieldStyle} />
              {d.person_name === null || d.user_id ? (
                <select value={d.user_id ?? ''} onChange={e => (e.target.value === '__other' ? set(i, { user_id: null, person_name: '' }) : set(i, { user_id: e.target.value || null, person_name: null }))}
                        aria-label={tr('Person')} className={field} style={fieldStyle}>
                  <option value="">{tr('Choose…')}</option>
                  {people.map(p => <option key={p.user_id} value={p.user_id}>{personName(p)}</option>)}
                  <option value="__other">{tr('Someone not on the app…')}</option>
                </select>
              ) : (
                <input value={d.person_name ?? ''} onChange={e => set(i, { person_name: e.target.value })} placeholder={tr('Their name')} aria-label={tr('Person')} className={field} style={fieldStyle} />
              )}
              <button onClick={() => setDuties(ds => ds.filter((_, j) => j !== i))} aria-label={tr('Remove')} className="p-2" style={muted}><X size={16} /></button>
            </div>
          ))}
          <button onClick={() => setDuties(ds => [...ds, { position: ds.length, duty: '', user_id: null, person_name: null }])} className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: 'var(--color-accent-brand)' }}><Plus size={15} /> {tr('Add a duty')}</button>
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder={tr('Notes for those on duty (optional), e.g. come by 9:30 to sanctify')} aria-label={tr('Notes')} className={`${field} resize-none`} style={fieldStyle} />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => save('published')} className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50">{tr('Publish')}</button>
          <button disabled={busy} onClick={() => save('draft')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-50" style={{ borderColor: 'var(--color-border)', ...text }}>{tr('Save draft')}</button>
          {roster && (
            <button disabled={busy} onClick={async () => { if (await confirmDialog({ title: tr('Delete this roster?'), confirmLabel: tr('Delete'), danger: true })) { try { await deleteRoster(roster.id); onClose(true); } catch (e) { showToast(errorMessage(e)); } } }}
                    className="px-3 py-2.5 rounded-xl text-sm" style={{ color: '#DC2626' }}><Trash2 size={16} /></button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ── People ───────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  shepherd: 'Shepherd', admin: 'Administrator', parochial_committee: 'Parochial committee', media: 'Media', choir: 'Choir', editor: 'Editor', minister: 'Minister', member: 'Member',
};

function People({ space, people, canPlan, onMessage, onChanged }: { space: MySpace; people: SpacePerson[]; canPlan: boolean; onMessage: (userId: string) => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [inviteRole, setInviteRole] = useState<'member' | 'minister'>('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const loadRequests = useCallback(() => { if (canPlan) spaceRequests(space.parish_id).then(setRequests).catch(() => setRequests([])); }, [canPlan, space.parish_id]);
  useEffect(() => { loadRequests(); }, [loadRequests]);

  const decide = async (r: JoinRequest, approve: boolean, role: 'member' | 'minister' = 'member') => {
    try { await decideRequest(r.id, approve, role); showToast(approve ? tr('Admitted to the space') : tr('Declined')); loadRequests(); onChanged(); } catch (e) { showToast(errorMessage(e)); }
  };
  const makeInvite = async () => {
    try { setLink(await createInvite(space.parish_id, inviteRole, inviteEmail)); } catch (e) { showToast(errorMessage(e)); }
  };
  const inviteText = (url: string) => `${tr('You are invited to join')} ${space.name} ${tr('on CelestialWorship')}: ${url}`;
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); showToast(tr('Link copied')); } catch { showToast(tr('Couldn’t copy')); } };
  const chip = 'px-2.5 py-1 rounded-lg text-xs font-semibold border inline-flex items-center gap-1';
  const chipStyle = { borderColor: 'var(--color-border)', ...text };

  return (
    <div className="space-y-6">
      {canPlan && requests.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] uppercase tracking-widest font-semibold" style={muted}>{tr('Asking to join')}</h3>
          {requests.map(r => (
            <div key={r.id} className="rounded-2xl p-4 space-y-2 border" style={{ ...card, borderColor: 'var(--color-accent-brand)' }}>
              <Link to={`/people/${r.user_id}`} className="font-semibold text-sm" style={text}>{personName(r)}</Link>
              {r.note && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{r.note}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => decide(r, true, 'member')} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold">{tr('Admit as member')}</button>
                <button onClick={() => decide(r, true, 'minister')} className={chip} style={chipStyle}>{tr('Admit as minister')}</button>
                <button onClick={() => decide(r, false)} className="px-3 py-1.5 rounded-lg text-xs" style={muted}>{tr('Decline')}</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {canPlan && (
        <section className="rounded-2xl p-4 space-y-3" style={card}>
          <p className="font-semibold text-sm flex items-center gap-2" style={text}><UserPlus size={16} style={{ color: 'var(--color-accent-brand)' }} /> {tr('Invite people')}</p>
          <p className="text-xs" style={muted}>{tr('Anyone with the link joins after signing in, or signing up, if they are new. Put an email to make the link for one person only.')}</p>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'member' | 'minister')} aria-label={tr('Role')} className="rounded-xl px-3 py-2 text-sm border" style={fieldStyle}>
              <option value="member">{tr('Member')}</option>
              <option value="minister">{tr('Minister')}</option>
            </select>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder={tr('Email (optional)')} aria-label={tr('Email (optional)')} className={field} style={fieldStyle} />
          </div>
          <button onClick={makeInvite} className="btn-primary w-full py-2.5 rounded-xl text-sm font-semibold">{tr('Make an invitation link')}</button>
          {link && (
            <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
              <p className="text-xs break-all" style={text}>{link}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(inviteText(link))}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: '#1F9D55' }}>{tr('Send on WhatsApp')}</a>
                <button onClick={() => shareText(inviteText(link), link)} className={chip} style={chipStyle}><Share2 size={13} /> {tr('Share')}</button>
                <button onClick={() => copy(link)} className={chip} style={chipStyle}><Copy size={13} /> {tr('Copy link')}</button>
              </div>
            </div>
          )}
          {['shepherd', 'admin'].includes(space.role) && (
            <Link to={`/parish-admin?parish=${space.parish_id}&tab=team`} className="block text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>{tr('Give someone a leadership role (shepherd, administrator, media, choir…) ›')}</Link>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest font-semibold" style={muted}>{people.length} {tr('in this space')}</h3>
        <ul className="rounded-2xl overflow-hidden" style={card}>
          {people.map((p, i) => (
            <li key={p.user_id} className="px-4 py-3 space-y-2" style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold shrink-0" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-accent-brand)' }}>{(p.display_name ?? '?')[0]?.toUpperCase()}</span>
                <span className="flex-1 min-w-0">
                  <Link to={`/people/${p.user_id}`} className="block text-sm font-semibold truncate" style={text}>{personName(p)}</Link>
                  <span className="block text-xs" style={muted}>{tr(ROLE_LABEL[p.role] ?? p.role)}</span>
                </span>
              </div>
              {p.user_id !== user?.id && (
                <div className="flex flex-wrap gap-2 pl-12">
                  <button onClick={() => onMessage(p.user_id)} className={chip} style={chipStyle}><Send size={12} /> {tr('Message')}</button>
                  {p.phone && <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className={chip} style={chipStyle}><Phone size={12} /> {p.phone}</a>}
                  {p.phone && <a href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={chip} style={chipStyle}>{tr('WhatsApp')}</a>}
                  {p.email && <a href={`mailto:${p.email}`} className={chip} style={chipStyle}><Mail size={12} /> {tr('Email')}</a>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <button onClick={async () => { if (await confirmDialog({ title: tr('Leave this parish space?'), message: tr('You can ask to join again later.'), confirmLabel: tr('Leave'), danger: true })) { try { await leaveSpace(space.parish_id); showToast(tr('You have left the space')); onChanged(); } catch (e) { showToast(errorMessage(e)); } } }}
              className="w-full text-sm py-2" style={muted}>{tr('Leave this space')}</button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function ParishSpace() {
  usePageTitle('space', 'Parish space');
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [spaces, setSpaces] = useState<MySpace[] | null>(null);
  const [people, setPeople] = useState<SpacePerson[]>([]);
  const tab = (params.get('tab') as 'posts' | 'rosters' | 'people') || 'posts';

  const loadSpaces = useCallback(() => { if (user) mySpaces().then(setSpaces).catch(() => setSpaces([])); }, [user]);
  useEffect(() => { loadSpaces(); }, [loadSpaces]);
  const space = useMemo(() => spaces?.find(s => s.parish_id === params.get('parish')) ?? spaces?.[0] ?? null, [spaces, params]);
  const loadPeople = useCallback(() => { if (space) spacePeople(space.parish_id).then(setPeople).catch(() => setPeople([])); }, [space]);
  useEffect(() => { loadPeople(); }, [loadPeople]);

  if (!loading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Users size={36} className="mx-auto" style={{ color: 'var(--color-accent-brand)' }} />
        <h1 className="text-xl font-bold font-[Outfit]" style={text}>{tr('Parish space')}</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('Sign in to see your parish’s space: its channels, rosters and people.')}</p>
        <Link to="/signin?returnTo=/space" className="btn-primary inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">{tr('Sign in')}</Link>
      </div>
    );
  }
  if (spaces === null) return <p className="text-sm text-center py-16 animate-pulse" style={muted}>{tr('Loading…')}</p>;
  if (!space) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Users size={36} className="mx-auto" style={{ color: 'var(--color-accent-brand)' }} />
        <h1 className="text-xl font-bold font-[Outfit]" style={text}>{tr('Parish space')}</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tr('You are not in a parish space yet. Ask your shepherd or parish administrator to add you, or, if you run a parish, claim it in Parishes.')}</p>
        <Link to="/directory" className="btn-primary inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">{tr('Parishes')}</Link>
      </div>
    );
  }
  const canPlan = PLANNERS.includes(space.role);
  const setTab = (t: string) => { const p = new URLSearchParams(params); p.set('tab', t); p.delete('to'); setParams(p, { replace: true }); };

  return (
    <div className="px-4 pt-6 pb-28 max-w-2xl mx-auto space-y-6">
      <header className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr('Parish space')}</p>
        {spaces.length > 1 ? (
          <select value={space.parish_id} onChange={e => { const p = new URLSearchParams(params); p.set('parish', e.target.value); setParams(p); }}
                  aria-label={tr('Parish')} className="text-2xl font-bold font-[Outfit] bg-transparent outline-none" style={text}>
            {spaces.map(s => <option key={s.parish_id} value={s.parish_id}>{s.name}</option>)}
          </select>
        ) : <h1 className="text-2xl font-bold font-[Outfit]" style={text}>{space.name}</h1>}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={card} role="tablist">
          {([['posts', tr('Posts'), <Hash key="h" size={15} />], ['rosters', tr('Rosters'), <CalendarDays key="c" size={15} />], ['people', tr('People'), <Users key="u" size={15} />]] as const).map(([id, label, icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5"
                    style={tab === id ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : muted}>
              {icon} {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'posts' && <Posts key={params.get('to') ?? ''} space={space} people={people} canPlan={canPlan} to={params.get('to')} />}
      {tab === 'rosters' && <Rosters space={space} people={people} canPlan={canPlan} />}
      {tab === 'people' && <People space={space} people={people} canPlan={canPlan}
                                   onMessage={uid => { const p = new URLSearchParams(params); p.set('tab', 'posts'); p.set('to', uid); setParams(p); }}
                                   onChanged={() => { loadSpaces(); loadPeople(); }} />}
      <p className="text-[11px] text-center" style={muted}><ClipboardList size={12} className="inline mr-1" />{tr('Only people in this parish space can read it, except posts you choose to share by link.')}</p>
    </div>
  );
}
