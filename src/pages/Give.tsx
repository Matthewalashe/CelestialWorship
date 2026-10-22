import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { HandCoins, ShieldCheck, CheckCircle2, Clock, XCircle, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useParishes } from '../hooks/useParishes';
import { usePageTitle } from '../hooks/usePageTitle';
import { createDonation, verifyDonation, listMyDonations, DONATION_PURPOSES, type DonationPurpose, type Donation } from '../lib/community';
import { payDonation, parishCanReceive } from '../lib/payments';
import { showToast } from '../components/Toast';
import { errorMessage } from '../lib/backend';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };
const inputClass = 'w-full rounded-xl px-3 py-3 text-sm border outline-none';
const inputStyle = { backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' };
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

function money(minor: number, currency: string) {
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toFixed(0)}`; }
}

export default function Give() {
  usePageTitle('give', 'Give');
  const { user } = useAuth();
  const { profile } = useProfile();
  const { parishes } = useParishes();
  const [params, setParams] = useSearchParams();

  const [parishId, setParishId] = useState<string>(params.get('parish') ?? profile.parishId ?? '');
  const [purpose, setPurpose] = useState<DonationPurpose>((params.get('purpose') as DonationPurpose) || 'tithe');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [anonymous, setAnonymous] = useState(false);
  const [pledge, setPledge] = useState(false);
  const [pledgeDue, setPledgeDue] = useState('');
  const [canReceive, setCanReceive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Donation['status'] | 'checking' | null>(params.get('reference') ? 'checking' : null);
  const [history, setHistory] = useState<Donation[]>([]);

  const parish = parishes.find(p => p.id === parishId);
  const realParishes = useMemo(() => parishes.filter(p => !p.seed), [parishes]);

  useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user]);

  useEffect(() => {
    if (!parishId) { setCanReceive(null); return; }
    setCanReceive(null);
    parishCanReceive(parishId).then(setCanReceive);
  }, [parishId]);

  // Back from Paystack: confirm the payment on the server
  useEffect(() => {
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    verifyDonation(reference)
      .then(status => setResult(status))
      .catch(() => setResult('initiated'));
  }, [params]);

  useEffect(() => {
    if (user) listMyDonations().then(setHistory).catch(() => {});
  }, [user, result]);

  const amountMinor = Math.round(Number(amount.replace(/[^\d.]/g, '')) * 100);
  const valid = amountMinor >= 10_000 && parishId && /\S+@\S+\.\S+/.test(email); // at least ₦100

  const give = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const donation = await createDonation({
        parishId, purpose, amountMinor, currency: 'NGN', note, donorEmail: email,
        donorName: [profile.churchTitle, profile.displayName].filter(Boolean).join(' '), isAnonymous: anonymous,
        pledgeDue: pledge ? pledgeDue || undefined : undefined,
      });
      if (pledge) {
        showToast('Pledge recorded — you can redeem it from your giving history');
        setAmount(''); setNote('');
        setHistory(await listMyDonations());
      } else {
        await payDonation(donation);
      }
    } catch (e) {
      showToast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const redeemPledge = async (d: Donation) => {
    try {
      const donation = await createDonation({
        parishId: d.parish_id, purpose: d.purpose, amountMinor: d.amount_minor, currency: d.currency,
        note: `Pledge fulfilment ${d.provider_reference ?? ''}`.trim(), donorEmail: email || user?.email || '',
        donorName: profile.displayName, isAnonymous: false,
      });
      await payDonation(donation);
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  if (result) {
    const icon = result === 'paid' ? <CheckCircle2 size={44} style={{ color: 'var(--color-success)' }} />
      : result === 'failed' ? <XCircle size={44} style={{ color: 'var(--color-warning)' }} />
      : <Clock size={44} style={{ color: 'var(--color-accent-gold)' }} />;
    return (
      <div className="px-4 py-12 max-w-md mx-auto text-center space-y-4">
        <div className="flex justify-center">{icon}</div>
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>
          {result === 'checking' ? 'Confirming your gift…' : result === 'paid' ? 'Thank you — God bless you' : result === 'failed' ? 'The payment didn’t go through' : 'Waiting for confirmation'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {result === 'paid' ? '“God loveth a cheerful giver.” — 2 Corinthians 9:7. Your receipt is sent to your email by Paystack.'
            : result === 'failed' ? 'You were not charged. You can try again.'
            : result === 'checking' ? 'This takes a moment.' : 'If you were charged, your gift will show as paid once Paystack confirms it.'}
        </p>
        <button onClick={() => { setResult(null); setParams({}); }} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto pb-24 space-y-5">
      <header>
        <h1 className="text-2xl font-bold font-[Outfit] flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <HandCoins size={24} style={{ color: 'var(--color-accent-gold)' }} /> Give
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          “Bring ye all the tithes into the storehouse” — Malachi 3:10
        </p>
      </header>

      <section className="rounded-2xl border p-4 space-y-3" style={card}>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>To</span>
          <select value={parishId} onChange={e => setParishId(e.target.value)} className={`${inputClass} mt-1`} style={inputStyle}>
            <option value="">Choose a parish or ministry</option>
            {realParishes.map(p => <option key={p.id} value={p.id}>{p.name}{p.city ? `, ${p.city}` : ''}</option>)}
          </select>
        </label>
        {parishId && canReceive === false && (
          <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}>
            {parish?.name ?? 'This parish'} hasn’t set up online giving yet. {parish?.giving_details?.note ?? 'Please give in church, or ask the parish to set it up in the app.'}
          </p>
        )}

        <div>
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>For</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {(Object.keys(DONATION_PURPOSES) as DonationPurpose[]).filter(p => p !== 'pledge').map(p => (
              <button key={p} onClick={() => setPurpose(p)} aria-pressed={purpose === p}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                      style={purpose === p ? { backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-text-on-accent)', borderColor: 'transparent' }
                                           : { borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                {DONATION_PURPOSES[p]}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--color-text-muted)' }}>Amount (₦)</span>
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0"
                 className={`${inputClass} mt-1 text-2xl font-bold`} style={inputStyle} />
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map(n => (
            <button key={n} onClick={() => setAmount(String(n))} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>{money(n * 100, 'NGN')}</button>
          ))}
        </div>

        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email for your receipt" className={inputClass} style={inputStyle} autoComplete="email" />
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Note (optional), e.g. thanksgiving for my new job" className={inputClass} style={inputStyle} />
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} /> Give anonymously to the parish
        </label>
        {user && (
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={pledge} onChange={e => setPledge(e.target.checked)} /> Make this a pledge to pay later
          </label>
        )}
        {pledge && <input type="date" value={pledgeDue} onChange={e => setPledgeDue(e.target.value)} className={inputClass} style={inputStyle} aria-label="Pledge due date" />}

        <button onClick={give} disabled={busy || !valid || (!pledge && canReceive === false)}
                className="btn-primary w-full py-3.5 rounded-xl text-base font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
          <Lock size={16} /> {pledge ? 'Record pledge' : amountMinor > 0 ? `Give ${money(amountMinor, 'NGN')}` : 'Give'}
        </button>
        <p className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <ShieldCheck size={13} className="shrink-0 mt-0.5" /> Payment is processed securely by Paystack (card, bank transfer or USSD) and goes straight to the parish’s account. Card details never touch this app.
        </p>
      </section>

      {user ? history.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>My giving</h2>
          <ul className="space-y-1.5">
            {history.slice(0, 30).map(d => (
              <li key={d.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ color: 'var(--color-text-primary)' }}>{DONATION_PURPOSES[d.purpose]} · {parishes.find(p => p.id === d.parish_id)?.name ?? ''}</span>
                  <span className="block text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {d.status === 'pledged' && d.pledge_due ? ` · due ${new Date(d.pledge_due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                </span>
                <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{money(d.amount_minor, d.currency)}</span>
                {d.status === 'pledged'
                  ? <button onClick={() => redeemPledge(d)} className="text-xs font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Pay now</button>
                  : <span className="text-[10px] uppercase w-14 text-right" style={{ color: d.status === 'paid' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{d.status === 'initiated' ? 'pending' : d.status}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          <Link to="/signin?returnTo=/give" className="font-semibold" style={{ color: 'var(--color-accent-brand)' }}>Sign in</Link> to keep a record of your giving and make pledges.
        </p>
      )}
    </div>
  );
}
