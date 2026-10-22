// POST /functions/v1/payout-account  { parish_id, bank_code, bank_name, account_number }
// Verifies the account with the bank, then creates or updates the parish's Paystack subaccount
// so gifts made through the platform settle straight to the parish.
import { json, preflight, adminClient, userClient, paystack } from '../_shared/common.ts';

Deno.serve(async req => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const { parish_id, bank_code, bank_name, account_number } = await req.json();
    if (!parish_id || !bank_code || !/^\d{10}$/.test(String(account_number))) {
      return json({ error: 'A parish, bank and 10-digit account number are required' }, 400);
    }

    // Only the parish's shepherds/admins may set where its money goes
    const caller = userClient(req);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Sign in first' }, 401);
    const { data: allowed } = await caller.rpc('is_parish_admin', { pid: parish_id });
    if (!allowed) return json({ error: 'Only the parish shepherd or an administrator can set the payout account' }, 403);

    const admin = adminClient();
    const { data: parish } = await admin.from('parishes').select('id, name, email').eq('id', parish_id).single();
    if (!parish) return json({ error: 'Parish not found' }, 404);

    // 1. Confirm the account exists and get the account holder's name
    let accountName: string;
    try {
      const resolved = await paystack(`/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`);
      accountName = resolved.account_name;
    } catch (e) {
      await admin.from('payout_accounts').upsert({
        parish_id, bank_name, bank_code, account_number, status: 'failed', status_message: (e as Error).message,
        updated_by: user.id, updated_at: new Date().toISOString(),
      });
      return json({ error: `The bank could not confirm this account: ${(e as Error).message}` }, 422);
    }

    // 2. Create or update the subaccount. PLATFORM_PERCENTAGE is the platform's share (0 = none).
    const percentage = Number(Deno.env.get('PLATFORM_PERCENTAGE') ?? '0');
    const { data: existing } = await admin.from('payout_accounts').select('subaccount_code').eq('parish_id', parish_id).maybeSingle();
    const payload = {
      business_name: parish.name, settlement_bank: bank_code, account_number,
      percentage_charge: percentage, primary_contact_email: parish.email ?? undefined,
      description: `CelestialWorship parish ${parish_id}`,
    };
    const sub = existing?.subaccount_code
      ? await paystack(`/subaccount/${existing.subaccount_code}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await paystack('/subaccount', { method: 'POST', body: JSON.stringify(payload) });

    await admin.from('payout_accounts').upsert({
      parish_id, bank_name, bank_code, account_number, account_name: accountName, subaccount_code: sub.subaccount_code,
      status: 'verified', status_message: null, updated_by: user.id, updated_at: new Date().toISOString(),
    });

    return json({ status: 'verified', account_name: accountName });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
