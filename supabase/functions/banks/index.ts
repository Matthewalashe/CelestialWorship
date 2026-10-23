// GET /functions/v1/banks?country=NG — bank list for the payout account form (from Flutterwave).
import { json, preflight, flutterwave } from '../_shared/common.ts';

// Older app versions ask for ?country=nigeria
const COUNTRY: Record<string, string> = { nigeria: 'NG', ghana: 'GH', kenya: 'KE', 'south africa': 'ZA' };

let cache: { at: number; country: string; banks: unknown[] } | null = null;

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  try {
    const asked = (new URL(req.url).searchParams.get('country') ?? 'NG').toLowerCase();
    const country = COUNTRY[asked] ?? asked.toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) return json({ error: 'Unknown country' }, 400);
    if (!cache || cache.country !== country || Date.now() - cache.at > 24 * 3_600_000) {
      const banks = await flutterwave(`/banks/${country}`);
      cache = {
        at: Date.now(), country,
        banks: (banks as { name: string; code: string }[]).map(b => ({ name: b.name, code: b.code })).sort((a, b) => a.name.localeCompare(b.name)),
      };
    }
    return json({ banks: cache.banks });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
