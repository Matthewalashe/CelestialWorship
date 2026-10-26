import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Share2, Trophy } from 'lucide-react';
import { levelFor, readGame, BADGES, weekStart, type RoundOutcome, type GameState } from '../utils/gamify';
import { leaderboardOptedIn, setLeaderboardOptIn, weekLeaderboard, postWeekXp, leaveLeaderboard, type LeaderboardRow } from '../lib/leaderboard';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { showToast } from './Toast';
import { errorMessage } from '../lib/backend';
import { tr } from '../i18n';

export function useGameState(): GameState {
  const [s, setS] = useState(readGame);
  useEffect(() => {
    const on = () => setS(readGame());
    window.addEventListener('cw-game-change', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('cw-game-change', on); window.removeEventListener('storage', on); };
  }, []);
  return s;
}

export async function shareText(text: string, path?: string) {
  const url = path ? `${window.location.origin}${path}` : undefined;
  if (navigator.share) { try { await navigator.share({ text, url }); return; } catch {} }
  try { await navigator.clipboard.writeText(url ? `${text}\n${url}` : text); showToast(tr('Copied, paste it to share')); } catch {}
}

export function LevelBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const lv = levelFor(xp);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-bold ${compact ? 'text-sm' : ''}`} style={{ color: 'var(--color-text-primary)' }}>{tr('Level')}{' '}{lv.level} · {tr(lv.title)}</span>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{xp}{' '}{tr('XP')}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mt-1.5" style={{ backgroundColor: 'var(--color-bg-secondary)' }}
           role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lv.progress * 100)} aria-label={tr('Progress to the next level')}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lv.progress * 100}%`, background: 'linear-gradient(90deg, var(--color-accent-gold), var(--color-accent-brand))' }} />
      </div>
      {!compact && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          <em>{lv.verse}</em>{lv.next && ` · ${lv.next.xp - xp} XP to ${lv.next.title}`}
        </p>
      )}
    </div>
  );
}

/** End-of-round screen: score, XP, level, new badges */
export function RoundSummary({ outcome, headline, sub, shareText: text, sharePath, onAgain, extra }: {
  outcome: RoundOutcome; headline: string; sub?: string; shareText: string; sharePath: string; onAgain?: () => void; extra?: React.ReactNode;
}) {
  return (
    <div className="py-8 max-w-md mx-auto text-center space-y-4" aria-live="polite">
      <div className="relative inline-block">
        <Trophy size={52} className="mx-auto animate-bounce-once" style={{ color: 'var(--color-accent-gold)' }} />
        <Burst />
      </div>
      <p className="text-5xl font-black font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{headline}</p>
      {sub && <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>}
      <p className="text-lg font-bold" style={{ color: 'var(--color-accent-gold)' }}>+{outcome.xpGained}{' '}{tr('XP')}</p>
      {outcome.levelUp && <p className="text-sm font-bold px-3 py-1.5 rounded-full inline-block" style={{ backgroundColor: 'var(--color-accent-gold)', color: '#1F2937' }}>{tr('Level up! You are now a')}{' '}{tr(levelFor(outcome.total).title)}</p>}
      <div className="text-left p-4 rounded-2xl" style={{ backgroundColor: 'var(--color-bg-card)' }}><LevelBar xp={outcome.total} /></div>
      {outcome.newBadges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{tr('New badge')}{outcome.newBadges.length > 1 ? 's' : ''}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {outcome.newBadges.map(b => (
              <span key={b.id} className="px-3 py-2 rounded-xl text-sm font-semibold animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-primary)' }}>
                <span aria-hidden>{b.icon}</span> {tr(b.title)}
              </span>
            ))}
          </div>
        </div>
      )}
      {extra}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {onAgain && <button onClick={onAgain} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"><RotateCcw size={16} />{' '}{tr('Play again')}</button>}
        <button onClick={() => shareText(text, sharePath)} className="px-5 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-2" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}><Share2 size={16} />{' '}{tr('Share')}</button>
      </div>
    </div>
  );
}

/** A small celebratory burst (skipped when the person prefers less motion) */
function Burst() {
  return (
    <span aria-hidden className="absolute inset-0 pointer-events-none motion-reduce:hidden">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-burst"
              style={{ backgroundColor: i % 2 ? 'var(--color-accent-gold)' : 'var(--color-accent-brand)', ['--angle' as string]: `${i * 36}deg` }} />
      ))}
    </span>
  );
}

export function BadgeShelf({ earned }: { earned: string[] }) {
  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {BADGES.map(b => {
        const has = earned.includes(b.id);
        return (
          <li key={b.id} className="rounded-xl p-2 text-center border" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: has ? 'var(--color-accent-gold)' : 'var(--color-border)' }}
              title={b.description}>
            <span className="text-2xl block" aria-hidden style={{ filter: has ? undefined : 'grayscale(1)', opacity: has ? 1 : 0.4 }}>{b.icon}</span>
            <span className="block text-[11px] font-semibold leading-tight mt-1" style={{ color: has ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{tr(b.title)}</span>
            <span className="sr-only">{has ? tr('Earned') : tr('Not yet earned')}: {tr(b.description)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Leaderboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [scope, setScope] = useState<'church' | 'parish'>('church');
  const [rows, setRows] = useState<LeaderboardRow[] | null | undefined>(undefined);
  const [optIn, setOptIn] = useState(leaderboardOptedIn);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setRows(undefined); setError(null);
    weekLeaderboard(scope === 'parish' ? profile.parishId : null)
      .then(r => { if (!cancelled) setRows(r); })
      .catch(e => { if (!cancelled) setError(errorMessage(e)); });
    return () => { cancelled = true; };
  }, [user, scope, profile.parishId, optIn]);

  if (!user) return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}><Link to="/signin" className="font-semibold underline" style={{ color: 'var(--color-accent-brand)' }}>{tr('Sign in')}</Link>{' '}{tr('to see this week’s leaderboard.')}</p>;

  const toggle = async () => {
    if (optIn) { await leaveLeaderboard(); setOptIn(false); showToast(tr('You have left the leaderboard')); return; }
    setLeaderboardOptIn(true); setOptIn(true); await postWeekXp(); showToast(tr('You’re on the leaderboard'));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-xl p-0.5 border" style={{ borderColor: 'var(--color-border)' }} role="group" aria-label={tr('Leaderboard')}>
          {([['church', 'Whole church'], ['parish', 'My parish']] as const).map(([v, t]) => (
            <button key={v} onClick={() => setScope(v)} aria-pressed={scope === v} disabled={v === 'parish' && !profile.parishId}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                    style={scope === v ? { backgroundColor: 'var(--color-accent-brand)', color: 'var(--color-text-on-accent)' } : { color: 'var(--color-text-secondary)' }}>{t}</button>
          ))}
        </div>
        <label className="ml-auto text-xs inline-flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={optIn} onChange={toggle} />{' '}{tr('Show me on it')}</label>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{tr('This week, from Monday')}{' '}{new Date(`${weekStart()}T12:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{tr('. Only your public name and XP are shown.')}</p>
      {error && <p className="text-sm" style={{ color: 'var(--color-warning)' }}>{error}</p>}
      {rows === undefined && !error && <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading…')}</p>}
      {rows === null && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('The leaderboard opens when the church’s online service is set up.')}</p>}
      {rows && rows.length === 0 && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tr('No one yet this week, be the first.')}</p>}
      {rows && rows.length > 0 && (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.user_id} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm"
                style={{ backgroundColor: r.user_id === user.id ? 'color-mix(in srgb, var(--color-accent-gold) 18%, transparent)' : 'var(--color-bg-card)' }}>
              <span className="w-6 text-center font-bold" style={{ color: 'var(--color-text-muted)' }}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
              <span className="flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>{r.name ?? tr('A Celestian')}</span>
              <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{r.xp}{' '}{tr('XP')}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

