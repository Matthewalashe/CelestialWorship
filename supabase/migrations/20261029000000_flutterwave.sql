-- Payments move from Paystack to Flutterwave. The payment tables were empty when this ran, so the
-- Paystack-specific columns are replaced by Flutterwave's identifiers.

-- Gifts: Flutterwave's own transaction id, alongside our reference (tx_ref)
alter table public.donations alter column provider set default 'flutterwave';
alter table public.donations add column if not exists provider_transaction_id text;

-- Payout accounts: a Flutterwave subaccount ("RS_…", used at checkout) and its numeric id (used to update it)
alter table public.payout_accounts add column if not exists subaccount_id bigint;
comment on column public.payout_accounts.subaccount_code is 'Flutterwave subaccount (RS_…), set by the payout-account Edge Function';
comment on column public.payout_accounts.bank_code is 'Flutterwave bank code (from the bank list)';

-- Plans: the Flutterwave payment plan, created by the subscribe function the first time it is needed
alter table public.plans drop column if exists paystack_plan_code;
alter table public.plans add column if not exists flutterwave_plan_id bigint;

-- Subscriptions: Flutterwave identifies a subscription by its id and the payer's email
alter table public.parish_subscriptions drop column if exists paystack_subscription_code;
alter table public.parish_subscriptions drop column if exists paystack_customer_code;
alter table public.parish_subscriptions drop column if exists paystack_email_token;
alter table public.parish_subscriptions add column if not exists flutterwave_subscription_id bigint unique;
alter table public.parish_subscriptions add column if not exists payer_email text;
create index if not exists parish_subscriptions_payer_idx on public.parish_subscriptions (payer_email, plan_id);
