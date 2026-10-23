import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Map as MapIcon, ChevronRight, Footprints, Timer, Globe2, History, List, MapPin } from 'lucide-react';
import { BibleMap, LayerToggle, type MapLayer, type MapPin as Pin } from '../components/BibleMap';
import { PLACES, JESUS_JOURNEY, BIBLE_LANDS, placeById, distanceKm, distanceScore, type BiblePlace, type LonLat } from '../data/bibleLands';
import { seededShuffle } from '../utils/quiz';
import { answerPoints, recordRound, type RoundOutcome } from '../utils/gamify';
import { postWeekXp } from '../lib/leaderboard';
import { recordActivity } from '../hooks/useProgress';
import { usePageTitle } from '../hooks/usePageTitle';
import { parseReference, referenceToPath } from '../utils/parseReference';
import { RoundSummary } from '../components/GameUi';

type Game = 'journey' | 'thennow' | 'master' | 'lands';

const GAMES: { id: Game; title: string; description: string; icon: typeof MapIcon }[] = [
  { id: 'journey', title: 'Journey of Jesus', description: 'From Bethlehem to the Mount of Olives — put each moment of His life on the map.', icon: Footprints },
  { id: 'thennow', title: 'Then & Now', description: 'Bible names and what the places are called today.', icon: History },
  { id: 'master', title: 'Map Master', description: 'Sixty seconds: find as many Bible places as you can.', icon: Timer },
  { id: 'lands', title: 'Bible Lands Today', description: 'Egypt, Cush, Persia, Macedonia… which country is it now?', icon: Globe2 },
];

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

function RefLink({ refs }: { refs: string }) {
  const first = refs.split(';')[0].trim();
  const ref = parseReference(first);
  return ref
    ? <Link to={referenceToPath(ref)} className="font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{refs}</Link>
    : <span className="font-semibold">{refs}</span>;
}

function PlaceFacts({ place }: { place: BiblePlace }) {
  return (
    <div className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
      <p><span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{place.name}</span> → today <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{place.today}</span>, {place.country}{place.traditional ? ' (traditional site)' : ''}</p>
      <p>{place.note}</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Read: <RefLink refs={place.refs} /></p>
    </div>
  );
}

function finish(xp: number, correct: number, total: number, bestCombo: number): RoundOutcome {
  const outcome = recordRound({ xp, correct, total, bestCombo, map: true });
  recordActivity('quiz');
  postWeekXp();
  return outcome;
}

// ── Journey of Jesus ─────────────────────────────────────────

function Journey({ layer }: { layer: MapLayer }) {
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<LonLat | null>(null);
  const [checked, setChecked] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [listMode, setListMode] = useState(false);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const stop = JESUS_JOURNEY[i];
  const place = placeById(stop.placeId)!;
  const options = useMemo(() => seededShuffle([place, ...seededShuffle(PLACES.filter(p => p.map === 'holyland' && p.id !== place.id), i * 7 + 3).slice(0, 3)], i), [place, i]);

  const km = guess ? distanceKm({ lon: guess[0], lat: guess[1] }, place) : null;
  const score = km === null ? 0 : place.id === 'egypt-flight' ? distanceScore(km, 250) : distanceScore(km);
  const route = JESUS_JOURNEY.slice(0, checked ? i + 1 : i).map(s => { const p = placeById(s.placeId)!; return [p.lon, p.lat] as LonLat; });

  const check = () => { if (!guess) return; setChecked(true); setScores(s => [...s, score]); };
  const next = () => {
    if (i + 1 < JESUS_JOURNEY.length) { setI(i + 1); setGuess(null); setChecked(false); return; }
    const total = scores.reduce((a, b) => a + b, 0);
    setOutcome(finish(Math.round(total / 8), scores.filter(s => s >= 50).length, scores.length, 0));
  };

  if (outcome) {
    const total = scores.reduce((a, b) => a + b, 0);
    return <RoundSummary outcome={outcome} headline={`${total} / ${JESUS_JOURNEY.length * 100}`} sub="You walked with Jesus from Bethlehem to the Mount of Olives."
                         shareText={`I traced the Journey of Jesus on CelestialWorship: ${total} points.`} sharePath="/maps?game=journey"
                         onAgain={() => { setI(0); setGuess(null); setChecked(false); setScores([]); setOutcome(null); }} />;
  }

  const pins: Pin[] = [
    ...(guess ? [{ at: guess, kind: 'guess' as const }] : []),
    ...(checked ? [{ at: [place.lon, place.lat] as LonLat, kind: 'answer' as const, label: layer === 'now' ? place.today : place.name }] : []),
  ];
  const focus: [number, number, number] | undefined = place.id === 'egypt-flight' ? undefined : [35.3, 32.2, 2.6];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        <span>Stop {i + 1} of {JESUS_JOURNEY.length}</span>
        <span>{scores.reduce((a, b) => a + b, 0)} points</span>
      </div>
      <p className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{stop.prompt}</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}><RefLink refs={stop.ref} /></p>

      {listMode ? (
        <div className="space-y-2" role="radiogroup" aria-label="Choose the place">
          {options.map(o => (
            <button key={o.id} role="radio" aria-checked={guess?.[0] === o.lon && guess?.[1] === o.lat} disabled={checked}
                    onClick={() => setGuess([o.lon, o.lat])} className="w-full text-left p-3 rounded-xl border-2 text-sm"
                    style={{ ...card, borderColor: guess?.[0] === o.lon && guess?.[1] === o.lat ? 'var(--color-accent-brand)' : 'var(--color-border)', color: 'var(--color-text-primary)' }}>
              {o.name}
            </button>
          ))}
        </div>
      ) : (
        <BibleMap region="holyland" layer={layer} pins={pins} route={route} focus={focus} onTap={checked ? undefined : setGuess} height="55vh" />
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => setListMode(m => !m)} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
          {listMode ? <><MapPin size={13} /> Use the map</> : <><List size={13} /> Choose from a list</>}
        </button>
        {!checked && <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>{guess ? 'Move your pin or check' : listMode ? 'Pick one' : 'Tap the map · pinch to zoom'}</span>}
      </div>

      {!checked ? (
        <button onClick={check} disabled={!guess} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50">Check</button>
      ) : (
        <div className="p-4 rounded-2xl space-y-2 animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)' }} aria-live="polite">
          <p className="font-semibold" style={{ color: score >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {score >= 90 ? 'Right there!' : score >= 50 ? 'Close!' : 'Not quite.'} {km !== null && `${km < 1 ? '<1' : Math.round(km)} km away · +${score}`}
          </p>
          <PlaceFacts place={place} />
          <button onClick={next} className="btn-primary w-full mt-2 py-3 rounded-xl text-sm font-semibold">{i + 1 < JESUS_JOURNEY.length ? 'Next stop' : 'Finish the journey'}</button>
        </div>
      )}
    </div>
  );
}

// ── Then & Now ───────────────────────────────────────────────

function ThenNow({ layer }: { layer: MapLayer }) {
  const [seed, setSeed] = useState(() => Date.now() % 10000);
  const round = useMemo(() => {
    const renamed = PLACES.filter(p => p.today.toLowerCase() !== p.name.toLowerCase());
    return seededShuffle(renamed, seed).slice(0, 10).map((pl, k) => {
      const reverse = k % 2 === 1;
      const others = seededShuffle(renamed.filter(o => o.id !== pl.id && o.today !== pl.today), seed + k).slice(0, 3);
      const options = seededShuffle([pl, ...others], seed + k * 13);
      return { place: pl, reverse, options };
    });
  }, [seed]);
  const [k, setK] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [right, setRight] = useState(0);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const started = useRef(Date.now());

  useEffect(() => { started.current = Date.now(); }, [k]);

  if (outcome) return <RoundSummary outcome={outcome} headline={`${right} / ${round.length}`} sub="Bible names and the places today."
                                    shareText={`Then & Now on CelestialWorship: ${right}/${round.length}`} sharePath="/maps?game=thennow"
                                    onAgain={() => { setSeed(s => s + 1); setK(0); setChosen(null); setCombo(0); setBest(0); setXp(0); setRight(0); setOutcome(null); }} />;

  const q = round[k];
  const answered = chosen !== null;
  const choose = (id: string) => {
    if (answered) return;
    setChosen(id);
    const ok = id === q.place.id;
    const nextCombo = ok ? combo + 1 : 0;
    setCombo(nextCombo); setBest(b => Math.max(b, nextCombo));
    if (ok) { setRight(r => r + 1); setXp(x => x + answerPoints({ correct: true, difficulty: 2, ms: Date.now() - started.current, combo: nextCombo })); }
  };
  const next = () => {
    if (k + 1 < round.length) { setK(k + 1); setChosen(null); return; }
    setOutcome(finish(xp, right, round.length, best));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        <span>{k + 1} / {round.length}</span>
        <span>{combo >= 3 && <span style={{ color: 'var(--color-accent-gold)' }}>🔥 {combo} · </span>}{xp} XP</span>
      </div>
      <p className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>
        {q.reverse ? <>Which Bible place is <em>{q.place.today}</em> ({q.place.country}) today?</> : <>What is <em>{q.place.name}</em> called today?</>}
      </p>
      <div className="space-y-2" role="radiogroup">
        {q.options.map(o => {
          const isAnswer = o.id === q.place.id, isChosen = o.id === chosen;
          return (
            <button key={o.id} role="radio" aria-checked={isChosen} disabled={answered} onClick={() => choose(o.id)}
                    className="w-full text-left p-3 rounded-xl border-2 text-sm"
                    style={{ ...card, color: 'var(--color-text-primary)', borderColor: answered && isAnswer ? 'var(--color-success)' : answered && isChosen ? 'var(--color-warning)' : 'var(--color-border)' }}>
              {q.reverse ? o.name : `${o.today}, ${o.country}`}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="space-y-3 animate-slide-up" aria-live="polite">
          <BibleMap region={q.place.map} layer={layer} height="35vh" focus={q.place.map === 'holyland' ? [q.place.lon, q.place.lat, 1.6] : [q.place.lon, q.place.lat, 18]}
                    pins={[{ at: [q.place.lon, q.place.lat], kind: 'answer', label: layer === 'now' ? q.place.today : q.place.name }]} />
          <PlaceFacts place={q.place} />
          <button onClick={next} className="btn-primary w-full py-3 rounded-xl text-sm font-semibold">{k + 1 < round.length ? 'Next' : 'See my score'}</button>
        </div>
      )}
    </div>
  );
}

// ── Map Master (timed) ───────────────────────────────────────

const MASTER_SECONDS = 60;

function Master({ layer }: { layer: MapLayer }) {
  const pool = useMemo(() => PLACES.filter(p => p.map === 'holyland' && !['temple', 'golgotha', 'gethsemane', 'olives', 'shechem', 'on', 'tabgha'].includes(p.id)), []);
  const [seed, setSeed] = useState(() => Date.now() % 10000);
  const order = useMemo(() => seededShuffle(pool, seed), [pool, seed]);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(MASTER_SECONDS);
  const [k, setK] = useState(0);
  const [hits, setHits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && (left <= 0 || k >= order.length) && !done.current) {
      done.current = true;
      setRunning(false);
      setOutcome(finish(xp, hits, k, best));
    }
  }, [left, k, running, order.length, xp, hits, best]);

  const reset = () => { done.current = false; setSeed(s => s + 1); setLeft(MASTER_SECONDS); setK(0); setHits(0); setCombo(0); setBest(0); setXp(0); setOutcome(null); setRunning(true); };

  if (outcome) return <RoundSummary outcome={outcome} headline={`${hits} found`} sub={`in ${MASTER_SECONDS} seconds`}
                                    shareText={`Map Master on CelestialWorship: I found ${hits} Bible places in a minute.`} sharePath="/maps?game=master" onAgain={reset} />;

  if (!running) {
    return (
      <div className="text-center py-8 space-y-4">
        <Timer size={40} className="mx-auto" style={{ color: 'var(--color-accent-gold)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>A place is named — tap its dot on the map. Right answers in a row build a combo.</p>
        <button onClick={reset} className="btn-primary px-8 py-3 rounded-xl font-semibold">Start</button>
      </div>
    );
  }

  const target = order[k];
  const tap = (id: string) => {
    if (!target || flash) return;
    const ok = id === target.id;
    const nextCombo = ok ? combo + 1 : 0;
    setCombo(nextCombo); setBest(b => Math.max(b, nextCombo));
    if (ok) { setHits(h => h + 1); setXp(x => x + answerPoints({ correct: true, difficulty: 2, combo: nextCombo })); }
    setFlash({ id: target.id, ok });
    setTimeout(() => { setFlash(null); setK(n => n + 1); }, ok ? 350 : 900);
  };

  const pins: Pin[] = pool.map(p => ({
    at: [p.lon, p.lat], id: p.id,
    kind: flash?.id === p.id ? (flash.ok ? 'hit' : 'miss') : 'place',
    label: flash && !flash.ok && flash.id === p.id ? p.name : undefined,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
        <span aria-live="polite">Find: <span style={{ color: 'var(--color-accent-brand)' }}>{target?.name}</span></span>
        <span style={{ color: left <= 10 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{left}s</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${(left / MASTER_SECONDS) * 100}%`, backgroundColor: left <= 10 ? 'var(--color-warning)' : 'var(--color-accent-gold)' }} />
      </div>
      <BibleMap region="holyland" layer={layer} pins={pins} dotsClickable onDot={tap} focus={[35.3, 32.0, 3.2]} height="60vh" />
      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>{hits} found{combo >= 3 ? ` · 🔥 ${combo}` : ''} · {xp} XP</p>
    </div>
  );
}

// ── Bible lands today ───────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  EGY: 'Egypt', SDN: 'Sudan', IRQ: 'Iraq', IRN: 'Iran', SYR: 'Syria', LBN: 'Lebanon', JOR: 'Jordan', TUR: 'Turkey', GRC: 'Greece',
  CYP: 'Cyprus', CYN: 'Cyprus', ITA: 'Italy', LBY: 'Libya', YEM: 'Yemen', ETH: 'Ethiopia', ERI: 'Eritrea', SAU: 'Saudi Arabia',
  ARM: 'Armenia', MLT: 'Malta', ISR: 'Israel', PSX: 'Palestine',
};

function Lands({ layer }: { layer: MapLayer }) {
  const [seed, setSeed] = useState(() => Date.now() % 10000);
  const round = useMemo(() => seededShuffle(BIBLE_LANDS, seed).slice(0, 10), [seed]);
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [listMode, setListMode] = useState(false);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);

  if (outcome) return <RoundSummary outcome={outcome} headline={`${right} / ${round.length}`} sub="Lands of the Bible and the countries today."
                                    shareText={`Bible Lands Today on CelestialWorship: ${right}/${round.length}`} sharePath="/maps?game=lands"
                                    onAgain={() => { setSeed(s => s + 1); setK(0); setPicked(null); setRight(0); setCombo(0); setBest(0); setXp(0); setOutcome(null); }} />;

  const land = round[k];
  const answered = picked !== null;
  const ok = answered && land.countries.includes(picked);
  const pick = (id: string) => {
    if (answered) return;
    setPicked(id);
    const good = land.countries.includes(id);
    const nextCombo = good ? combo + 1 : 0;
    setCombo(nextCombo); setBest(b => Math.max(b, nextCombo));
    if (good) { setRight(r => r + 1); setXp(x => x + answerPoints({ correct: true, difficulty: 2, combo: nextCombo })); }
  };
  const next = () => {
    if (k + 1 < round.length) { setK(k + 1); setPicked(null); return; }
    setOutcome(finish(xp, right, round.length, best));
  };
  const listOptions = seededShuffle([...new Set([land.countries[0], ...seededShuffle(Object.keys(COUNTRY_NAMES).filter(c => !land.countries.includes(c) && c !== 'CYN'), seed + k).slice(0, 3)])], seed + k * 3);
  const highlight = answered ? [...land.countries.map(id => ({ id, tone: 'right' as const })), ...(!ok ? [{ id: picked!, tone: 'wrong' as const }] : [])] : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        <span>{k + 1} / {round.length}</span>
        <span>{combo >= 3 && <span style={{ color: 'var(--color-accent-gold)' }}>🔥 {combo} · </span>}{xp} XP</span>
      </div>
      <p className="text-lg font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>Where is <em>{land.name}</em> today?</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Also: {land.aka}</p>
      {listMode ? (
        <div className="grid grid-cols-2 gap-2">
          {listOptions.map(id => (
            <button key={id} disabled={answered} onClick={() => pick(id)} className="p-3 rounded-xl border-2 text-sm"
                    style={{ ...card, color: 'var(--color-text-primary)', borderColor: answered && land.countries.includes(id) ? 'var(--color-success)' : answered && id === picked ? 'var(--color-warning)' : 'var(--color-border)' }}>
              {COUNTRY_NAMES[id]}
            </button>
          ))}
        </div>
      ) : (
        <BibleMap region="world" layer={layer === 'then' ? 'both' : layer} onCountry={answered ? undefined : pick} highlight={highlight} focus={[33, 33, 34]} height="50vh" />
      )}
      <button onClick={() => setListMode(m => !m)} className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg" style={{ color: 'var(--color-text-secondary)' }}>
        {listMode ? <><MapPin size={13} /> Use the map</> : <><List size={13} /> Choose from a list</>}
      </button>
      {answered && (
        <div className="p-4 rounded-2xl space-y-2 animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)' }} aria-live="polite">
          <p className="font-semibold" style={{ color: ok ? 'var(--color-success)' : 'var(--color-warning)' }}>{ok ? 'Correct!' : `It’s ${land.answer}.`}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{land.note}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Read: <RefLink refs={land.refs} /></p>
          <button onClick={next} className="btn-primary w-full mt-2 py-3 rounded-xl text-sm font-semibold">{k + 1 < round.length ? 'Next' : 'See my score'}</button>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function MapGames() {
  usePageTitle('maps', 'Bible map games');
  const [params, setParams] = useSearchParams();
  const game = params.get('game') as Game | null;
  const [layer, setLayer] = useState<MapLayer>(() => { try { return (localStorage.getItem('cw-map-layer') as MapLayer) || 'then'; } catch { return 'then'; } });
  const changeLayer = (l: MapLayer) => { setLayer(l); try { localStorage.setItem('cw-map-layer', l); } catch {} };
  const meta = GAMES.find(g => g.id === game);

  if (!meta) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-5">
        <div>
          <Link to="/quiz" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ Quizzes</Link>
          <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
            <MapIcon size={24} style={{ color: 'var(--color-accent-gold)' }} /> Bible map games
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Walk where Jesus walked. Every place tells you its name today and where to read about it.</p>
        </div>
        <ul className="space-y-3">
          {GAMES.map(g => (
            <li key={g.id}>
              <button onClick={() => setParams({ game: g.id })} className="w-full text-left rounded-2xl border p-4 flex items-center gap-4" style={card}>
                <g.icon size={28} style={{ color: 'var(--color-accent-gold)' }} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{g.title}</span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{g.description}</span>
                </span>
                <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </li>
          ))}
        </ul>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Explore the map</h2>
            <LayerToggle layer={layer} onChange={changeLayer} />
          </div>
          <BibleMap region="holyland" layer={layer} height="50vh" focus={[35.3, 32.2, 3]}
                    pins={PLACES.filter(p => p.map === 'holyland').map(p => ({ at: [p.lon, p.lat] as LonLat, kind: 'place' as const, id: p.id, label: layer === 'now' ? p.today : p.name }))} />
          <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Regions are approximate, as in the time of Jesus (Luke 3:1). Today’s borders are from Natural Earth and are shown for orientation only, not as a view on disputed territory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-24 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setParams({})} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>‹ Map games</button>
        <LayerToggle layer={layer} onChange={changeLayer} />
      </div>
      <h1 className="text-xl font-bold font-[Outfit] flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}><meta.icon size={20} style={{ color: 'var(--color-accent-gold)' }} /> {meta.title}</h1>
      {game === 'journey' && <Journey layer={layer} />}
      {game === 'thennow' && <ThenNow layer={layer} />}
      {game === 'master' && <Master layer={layer} />}
      {game === 'lands' && <Lands layer={layer} />}
    </div>
  );
}
