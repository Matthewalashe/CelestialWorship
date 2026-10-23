import { Share2, Link2 } from 'lucide-react';
import { shareTargets } from '../lib/live';
import { showToast } from './Toast';
import { tr } from '../i18n';

/** Share to the phone's apps, or straight to a social network */
export function ShareRow({ text, url }: { text: string; url: string }) {
  const native = async () => {
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch { return; } }
    try { await navigator.clipboard.writeText(`${text} ${url}`); showToast(tr('Link copied')); } catch {}
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); showToast(tr('Link copied')); } catch {} };
  const pill = 'h-9 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border';
  const style = { borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={native} className={pill} style={style}><Share2 size={14} />{' '}{tr('Share')}</button>
      {shareTargets(text, url).map(t => (
        <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className={pill} style={style}>{tr(t.label)}</a>
      ))}
      <button onClick={copy} className={pill} style={style} aria-label={tr('Copy link')}><Link2 size={14} /></button>
    </div>
  );
}
