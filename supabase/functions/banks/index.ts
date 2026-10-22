// GET /functions/v1/banks?country=nigeria — bank list for the payout account form.
import { json, preflight, paystack } from '../_shared/common.ts';

let cache: { at: number; country: string; banks: unknown[] } | null = null;

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  try {
    const country = new URL(req.url).searchParams.get('country') ?? 'nigeria';
    if (!cache || cache.country !== country || Date.now() - cache.at > 24 * 3_600_000) {
      const banks = await paystack(`/bank?country=${encodeURIComponent(country)}&perPage=200`);
      cache = { at: Date.now(), country, banks: (banks as any[]).map(b => ({ name: b.name, code: b.code })) };
    }
    return json({ banks: cache.banks });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
