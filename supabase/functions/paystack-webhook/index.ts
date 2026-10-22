// POST /functions/v1/paystack-webhook — set this URL as the webhook in the Paystack dashboard.
// Paystack signs each event with the secret key (HMAC SHA-512); unsigned calls are rejected.
import { json, adminClient } from '../_shared/common.ts';

async function signatureValid(body: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

Deno.serve(async req => {
  const body = await req.text();
  if (!(await signatureValid(body, req.headers.get('x-paystack-signature')))) return json({ error: 'bad signature' }, 401);

  const event = JSON.parse(body);
  if (event.event === 'charge.success') {
    const tx = event.data;
    const admin = adminClient();
    const { data: donation } = await admin.from('donations').select('id, amount_minor, currency, status').eq('provider_reference', tx.reference).maybeSingle();
    if (donation && donation.status !== 'paid' && Number(tx.amount) === Number(donation.amount_minor) && tx.currency === donation.currency) {
      await admin.from('donations').update({ status: 'paid', paid_at: tx.paid_at ?? new Date().toISOString() }).eq('id', donation.id);
    }
  }
  return json({ received: true });
});
