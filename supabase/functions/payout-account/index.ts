// POST /functions/v1/payout-account  { parish_id, bank_code, bank_name, account_number }
// Verifies the account with the bank, then creates or updates the parish's Flutterwave subaccount
// so gifts made through the platform settle straight to the parish.
import { json, preflight, adminClient, userClient, flutterwave } from '../_shared/common.ts';

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
    const { data: parish } = await admin.from('parishes').select('id, name, email, phone').eq('id', parish_id).single();
    if (!parish) return json({ error: 'Parish not found' }, 404);

    // 1. Confirm the account exists and get the account holder's name
    let accountName: string;
    try {
      const resolved = await flutterwave('/accounts/resolve', {
        method: 'POST', body: JSON.stringify({ account_number: String(account_number), account_bank: String(bank_code) }),
      });
      accountName = resolved.account_name;
    } catch (e) {
      await admin.from('payout_accounts').upsert({
        parish_id, bank_name, bank_code, account_number, status: 'failed', status_message: (e as Error).message,
        updated_by: user.id, updated_at: new Date().toISOString(),
      });
      return json({ error: `The bank could not confirm this account: ${(e as Error).message}` }, 422);
    }

    // 2. Create or update the subaccount. Flutterwave needs a phone number for the business.
    const mobile = (parish.phone ?? '').replace(/[^\d+]/g, '');
    if (mobile.length < 7) return json({ error: 'Add the parish phone number under Details first — the payment provider needs it' }, 400);
    // PLATFORM_PERCENTAGE is the platform's share of each gift (0 = none); Flutterwave takes it as a fraction
    const share = Math.max(0, Number(Deno.env.get('PLATFORM_PERCENTAGE') ?? '0')) / 100;
    const payload = {
      account_bank: String(bank_code), account_number: String(account_number), business_name: parish.name,
      business_email: parish.email ?? undefined, business_mobile: mobile, country: 'NG',
      split_type: 'percentage', split_value: share,
      meta: [{ meta_name: 'parish_id', meta_value: parish_id }],
    };
    const { data: existing } = await admin.from('payout_accounts').select('subaccount_id').eq('parish_id', parish_id).maybeSingle();
    const sub = existing?.subaccount_id
      ? await flutterwave(`/subaccounts/${existing.subaccount_id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await flutterwave('/subaccounts', { method: 'POST', body: JSON.stringify(payload) });

    await admin.from('payout_accounts').upsert({
      parish_id, bank_name, bank_code, account_number, account_name: accountName,
      subaccount_code: sub.subaccount_id, subaccount_id: sub.id,
      status: 'verified', status_message: null, updated_by: user.id, updated_at: new Date().toISOString(),
    });

    return json({ status: 'verified', account_name: accountName });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
