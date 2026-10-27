import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lightbulb, BookOpen, Church, Mail, X } from 'lucide-react';
import { AtlasMap, LayerToggle, type MapLayer } from './AtlasMap';
import { PLACES, placeById, type LonLat } from '../data/bibleLands';
import { SPREAD, ANCIENT_NAMES } from '../data/christianity';
import { POSTCARDS, collectPostcard, useCollectedPostcards, usePostcardPhotos, type Postcard } from '../lib/postcards';
import { useParishes } from '../hooks/useParishes';
import { parseReference, referenceToPath } from '../utils/parseReference';
import { Sheet } from './Dialog';
import { tr } from '../i18n';

/*
 * The atlas beyond the games: explore the Holy Land on the 1884 map or the world today, follow the story of how the
 * Gospel spread, and keep the postcards collected along the way.
 */

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const muted = { color: 'var(--color-text-muted)' };
const flag = (iso2: string) => `https://flagcdn.com/w40/${iso2.toLowerCase()}.png`;

function ReadLink({ refs }: { refs: string }) {
  const first = refs.split(';')[0].trim();
  const ref = parseReference(first);
  return ref
    ? <Link to={referenceToPath(ref)} className="inline-flex items-center gap-1 font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}><BookOpen size={13} aria-hidden /> {tr(refs)}</Link>
    : <span className="font-semibold">{tr(refs)}</span>;
}

function PostcardView({ p: card0, big = false }: { p: Postcard; big?: boolean }) {
  const photos = usePostcardPhotos();
  const p = { ...card0, photo: card0.photo ?? photos[card0.id] };
  return (
    <figure className="rounded-2xl overflow-hidden border" style={card}>
      {p.photo
        ? <img src={p.photo.src} alt={`${tr(p.then)}, ${tr(p.now)}`} loading="lazy" decoding="async" className={`w-full object-cover ${big ? 'aspect-[4/3]' : 'aspect-[3/2]'}`} />
        : <div className={`w-full flex items-center justify-center ${big ? 'aspect-[4/3]' : 'aspect-[3/2]'} font-[Outfit] text-lg font-bold`} style={{ backgroundColor: '#EFE2C2', color: '#5A4320' }}>{tr(p.then)}</div>}
      <figcaption className="p-3 space-y-1">
        <p className="font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>{tr(p.then)}</p>
        <p className="text-xs" style={muted}>{tr(p.now)}{p.kind === 'place' ? ` · ${tr(p.country)}` : ''}</p>
        {big && <p className="text-sm leading-relaxed pt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr(p.fact)}</p>}
        {big && <p className="text-xs pt-1"><ReadLink refs={p.ref} /></p>}
        {big && p.photo && (
          <p className="text-[10px] pt-1" style={muted}>{tr('Photo')}: <a href={p.photo.source} target="_blank" rel="noopener noreferrer" className="underline">{p.photo.credit}</a>, {p.photo.license}</p>
        )}
      </figcaption>
    </figure>
  );
}

// ── Explore ──────────────────────────────────────────────────

export function ExploreAtlas({ layer, onLayer }: { layer: MapLayer; onLayer: (l: MapLayer) => void }) {
  const [where, setWhere] = useState<'holyland' | 'world'>('holyland');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [country, setCountry] = useState<{ name: string; iso2: string | null } | null>(null);
  const [fly, setFly] = useState<{ lat: number; lon: number; zoom: number } | null>(null);
  const { parishes } = useParishes();
  const ccc = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of parishes) counts.set(p.country, (counts.get(p.country) ?? 0) + 1);
    return counts;
  }, [parishes]);
  const place = placeId ? placeById(placeId) : undefined;
  const postcard = place ? POSTCARDS.find(p => p.id === place.id) : undefined;
  const ancient = country?.iso2 ? ANCIENT_NAMES.find(a => a.iso2 === country.iso2) : undefined;
  const parishCount = country ? ccc.get(country.name) ?? ccc.get(country.name.replace('United States of America', 'United States')) ?? 0 : 0;

  useEffect(() => { if (place) collectPostcard(place.id); }, [place]);

  return (
    <section className="space-y-3" aria-labelledby="explore">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="explore" className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Explore the map')}</h2>
        <LayerToggle layer={layer} onChange={onLayer} />
      </div>
      <div className="flex rounded-xl p-0.5 border w-fit" style={card} role="group" aria-label={tr('Which map')}>
        {(['holyland', 'world'] as const).map(w => (
          <button key={w} onClick={() => { setWhere(w); setPlaceId(null); setCountry(null); setFly(null); }} aria-pressed={where === w}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={where === w ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>
            {w === 'holyland' ? tr('The Holy Land') : tr('The world')}
          </button>
        ))}
      </div>
      {where === 'holyland' ? (
        <AtlasMap region="holyland" layer={layer} height="58vh" focus={[35.3, 32.0, 2.6]} dotsClickable onDot={setPlaceId}
                  pins={PLACES.filter(p => p.map === 'holyland').map(p => ({ at: [p.lon, p.lat] as LonLat, kind: p.id === placeId ? 'answer' as const : 'place' as const, id: p.id }))} />
      ) : (
        <AtlasMap region="world" layer={layer} height="58vh" focus={[30, 30, 46]} fly={fly}
                  marked={[...ccc.keys(), ...(ccc.has('United States') ? ['United States of America'] : [])]}
                  onCountry={(_, info) => setCountry(info)} />
      )}
      {where === 'holyland' && !place && <p className="text-xs" style={muted}>{tr('Tap a dot to see the place then and now. The old map is “Palestine in the time of Christ” by Edward Weller, about 1884. Compare it with today’s map by dragging the divider.')}</p>}
      {place && postcard && (
        <div className="grid sm:grid-cols-2 gap-3 items-start animate-slide-up">
          <PostcardView p={postcard} big />
          <p className="text-xs" style={muted}>{place.traditional ? tr('The exact site is not known: this is the site tradition points to.') : ''}</p>
        </div>
      )}
      {where === 'world' && country && (
        <div className="rounded-2xl border p-4 space-y-2 animate-slide-up" style={card}>
          <div className="flex items-center gap-3">
            {country.iso2 && <img src={flag(country.iso2)} alt="" width={32} height={22} className="rounded-sm border" style={{ borderColor: 'var(--color-border)' }} />}
            <p className="font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>{tr(country.name)}</p>
            <button onClick={() => setCountry(null)} aria-label={tr('Close')} style={muted}><X size={16} /></button>
          </div>
          {ancient && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}><span className="font-semibold">{tr('In Bible times')}:</span> <em>{tr(ancient.then)}</em>. {tr(ancient.note)}</p>}
          <p className="text-sm inline-flex items-center gap-1.5" style={{ color: parishCount ? 'var(--color-accent-brand)' : 'var(--color-text-muted)' }}>
            <Church size={14} aria-hidden />{parishCount ? `${parishCount} ${tr('Celestial parishes in the directory')}` : tr('No Celestial parish listed here yet')}
          </p>
          {parishCount > 0 && <Link to="/directory?view=map" className="text-xs font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{tr('Open the map of parishes')}</Link>}
        </div>
      )}
      {where === 'world' && (
        <div className="space-y-2">
          <p className="text-xs" style={muted}>{tr('Countries in blue have Celestial parishes in the directory. Tap a country, or a name below, to see what it was called in Bible times.')}</p>
          <ul className="grid sm:grid-cols-2 gap-1.5" aria-label={tr('Legend: lands then and now')}>
            {ANCIENT_NAMES.map(a => (
              <li key={a.iso2}>
                <button onClick={() => { setFly({ lat: a.lat, lon: a.lon, zoom: 5 }); setCountry({ name: a.country, iso2: a.iso2 }); }}
                        className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                  <img src={flag(a.iso2)} alt="" width={28} height={19} loading="lazy" className="rounded-sm border shrink-0" style={{ borderColor: 'var(--color-border)' }} />
                  <span className="min-w-0 text-sm leading-tight">
                    <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(a.country)}</span>
                    <span className="block text-xs italic" style={muted}>{tr(a.then)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px]" style={muted}>{tr('Today’s borders are from Natural Earth, for orientation only, not as a view on disputed territory.')}</p>
    </section>
  );
}

// ── The story of the Church ─────────────────────────────────

export function StoryOfTheChurch() {
  const [i, setI] = useState(0);
  const stop = SPREAD[i];
  useEffect(() => { collectPostcard(`spread-${stop.id}`); }, [stop.id]);
  const pins = SPREAD.map((s, k) => ({ at: [s.lon, s.lat] as LonLat, kind: k === i ? 'answer' as const : k < i ? 'hit' as const : 'place' as const, id: s.id }));
  const route = SPREAD.slice(0, i + 1).map(s => [s.lon, s.lat] as LonLat);
  return (
    <section className="space-y-3" aria-labelledby="story">
      <div>
        <h2 id="story" className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('How the Gospel spread')}</h2>
        <p className="text-xs" style={muted}>{tr('From Pentecost in Jerusalem to the Celestial Church in Porto-Novo: twenty stops, each with its story and why it matters.')}</p>
      </div>
      <AtlasMap region="world" layer="now" height="42vh" pins={pins} route={route} fly={{ lat: stop.lat, lon: stop.lon, zoom: stop.zoom - 2 }} dotsClickable onDot={id => setI(SPREAD.findIndex(s => s.id === id))} />
      <article className="rounded-2xl border overflow-hidden" style={card} aria-live="polite">
        <div className="px-4 pt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr(stop.when)} · {i + 1}/{SPREAD.length}</p>
          <h3 className="text-lg font-bold font-[Outfit] mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{tr(stop.title)}</h3>
          <p className="text-xs" style={muted}>{tr(stop.place)} · {tr('today')} {tr(stop.today)}</p>
        </div>
        <dl className="px-4 py-3 space-y-3 text-sm">
          <div><dt className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>{tr('What happened')}</dt><dd className="leading-relaxed mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{tr(stop.story)}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>{tr('Why it matters')}</dt><dd className="leading-relaxed mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{tr(stop.why)}</dd></div>
          <div><dt className="text-[11px] uppercase tracking-wider font-semibold" style={muted}>{tr('Read it')}</dt><dd className="mt-0.5"><ReadLink refs={stop.source} /></dd></div>
        </dl>
        <div className="mx-4 mb-3 p-3 rounded-xl flex gap-2.5 text-sm" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <Lightbulb size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--color-accent-gold)' }} aria-hidden />
          <p><span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr('Did you know?')}</span>{' '}<span style={{ color: 'var(--color-text-secondary)' }}>{tr(stop.didYouKnow)}</span></p>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><ChevronLeft size={16} aria-hidden /> {tr('Back')}</button>
          <button onClick={() => setI(Math.min(SPREAD.length - 1, i + 1))} disabled={i === SPREAD.length - 1} className="btn-primary flex-[2] py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40">
            {tr('Next stop')} <ChevronRight size={16} aria-hidden /></button>
        </div>
      </article>
    </section>
  );
}

// ── Postcards ────────────────────────────────────────────────

export function PostcardAlbum() {
  const have = useCollectedPostcards();
  const [open, setOpen] = useState<Postcard | null>(null);
  const cards = POSTCARDS.filter(p => have.includes(p.id));
  return (
    <section className="space-y-3" aria-labelledby="postcards">
      <div className="flex items-center justify-between">
        <h2 id="postcards" className="font-semibold inline-flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><Mail size={16} aria-hidden /> {tr('My postcards')}</h2>
        <span className="text-xs font-semibold" style={muted}>{have.length} / {POSTCARDS.length}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="h-full rounded-full" style={{ width: `${(have.length / POSTCARDS.length) * 100}%`, backgroundColor: 'var(--color-accent-brand)' }} />
      </div>
      {cards.length === 0
        ? <p className="text-sm" style={muted}>{tr('Find places in the map games, explore the map or follow the story of the Church to collect postcards of the Bible lands as they are today.')}</p>
        : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cards.map(p => <li key={p.id}><button onClick={() => setOpen(p)} className="w-full text-left"><PostcardView p={p} /></button></li>)}
          </ul>
        )}
      {open && <Sheet label={tr(open.then)} onClose={() => setOpen(null)}><PostcardView p={open} big /></Sheet>}
    </section>
  );
}
