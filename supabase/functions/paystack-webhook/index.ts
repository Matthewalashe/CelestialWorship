// POST /functions/v1/paystack-webhook — set this URL as the webhook in the Paystack dashboard.
// Paystack signs each event with the secret key (HMAC SHA-512); unsigned calls are rejected.
// Handles gifts (charge.success) and the Partner plan (subscription and invoice events).
import { json, adminClient } from '../_shared/common.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

async function signatureValid(body: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

function periodEnd(from: Date, interval: string): string {
  const d = new Date(from);
  if (interval === 'annually') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

async function planByCode(admin: SupabaseClient, code: string | undefined) {
  if (!code) return null;
  const { data } = await admin.from('plans').select('id, interval').eq('paystack_plan_code', code).maybeSingle();
  return data;
}

Deno.serve(async req => {
  const body = await req.text();
  if (!(await signatureValid(body, req.headers.get('x-paystack-signature')))) return json({ error: 'bad signature' }, 401);

  const event = JSON.parse(body);
  const data = event.data ?? {};
  const admin = adminClient();

  switch (event.event) {
    case 'charge.success': {
      // A gift
      const { data: donation } = await admin.from('donations').select('id, amount_minor, currency, status').eq('provider_reference', data.reference).maybeSingle();
      if (donation && donation.status !== 'paid' && Number(data.amount) === Number(donation.amount_minor) && data.currency === donation.currency) {
        await admin.from('donations').update({ status: 'paid', paid_at: data.paid_at ?? new Date().toISOString() }).eq('id', donation.id);
        break;
      }
      // A Partner plan payment: the first one carries our metadata; renewals are matched by customer
      const plan = await planByCode(admin, data.plan?.plan_code);
      if (!plan) break;
      const customer = data.customer?.customer_code;
      const paidAt = new Date(data.paid_at ?? Date.now());
      if (data.metadata?.kind === 'subscription' && data.metadata.parish_id) {
        await admin.from('parish_subscriptions').upsert({
          parish_id: data.metadata.parish_id, plan_id: plan.id, status: 'active', current_period_end: periodEnd(paidAt, plan.interval),
          paystack_customer_code: customer, started_by: data.metadata.user_id ?? null, updated_at: new Date().toISOString(),
        });
      } else if (customer) {
        await admin.from('parish_subscriptions')
          .update({ status: 'active', current_period_end: periodEnd(paidAt, plan.interval), updated_at: new Date().toISOString() })
          .eq('paystack_customer_code', customer).eq('plan_id', plan.id);
      }
      break;
    }
    case 'subscription.create': {
      const plan = await planByCode(admin, data.plan?.plan_code);
      const customer = data.customer?.customer_code;
      if (!plan || !customer) break;
      await admin.from('parish_subscriptions').update({
        paystack_subscription_code: data.subscription_code, paystack_email_token: data.email_token,
        current_period_end: data.next_payment_date ?? undefined, status: 'active', updated_at: new Date().toISOString(),
      }).eq('paystack_customer_code', customer).eq('plan_id', plan.id).is('paystack_subscription_code', null);
      break;
    }
    case 'invoice.payment_failed':
      await admin.from('parish_subscriptions').update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('paystack_subscription_code', data.subscription?.subscription_code ?? data.subscription_code);
      break;
    case 'subscription.not_renew':
      await admin.from('parish_subscriptions').update({ status: 'non_renewing', updated_at: new Date().toISOString() })
        .eq('paystack_subscription_code', data.subscription_code);
      break;
    case 'subscription.disable':
      await admin.from('parish_subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('paystack_subscription_code', data.subscription_code);
      break;
  }
  return json({ received: true });
});
