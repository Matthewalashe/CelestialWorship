# Going live: setup checklist

The app works without any of this (hymns, Bible, Order of Service, devotion, library, quizzes,
church calendar observances). These steps switch on the shared features.

## 1. Database (Supabase)

1. In the Supabase dashboard → SQL editor, run `supabase/migrations/20261022000000_community.sql`
   (or `supabase db push` with the CLI).
2. Make yourself an admin:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR EMAIL');
   ```
3. Auth → Providers: enable Email (and Google if wanted). Set the Site URL to the app's address.
4. Realtime is used for the Operator's "another device as the screen" — it is on by default.

## 2. Edge Functions

Deploy everything in `supabase/functions`:

```sh
supabase functions deploy banks payout-account init-payment verify-payment paystack-webhook \
  bible-proxy push-subscribe send-reminders
```

Secrets (`supabase secrets set NAME=value`):

| Secret | For |
|---|---|
| `APP_ORIGIN` | The app's URL, e.g. `https://celestialworship.vercel.app` |
| `PAYSTACK_SECRET_KEY` | Online giving (platform Paystack account) |
| `PLATFORM_PERCENTAGE` | Platform's share of each gift, e.g. `0` or `2.5` |
| `PAYSTACK_FEE_BEARER` | `account` (platform pays fees) or `subaccount` (parish pays) |
| `API_BIBLE_KEY` | NKJV / NLT / AMP / NIV through API.Bible |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push reminders (`npx web-push generate-vapid-keys`) |
| `CRON_SECRET` | Any long random string; protects send-reminders |

Then:
- Paystack dashboard → Settings → Webhooks: `https://<project>.supabase.co/functions/v1/paystack-webhook`
- Schedule reminders (SQL editor, needs pg_cron + pg_net extensions): see the commented
  `cron.schedule` statement at the end of the migration.

## 3. App environment (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Already set |
| `VITE_VAPID_PUBLIC_KEY` | Same public key as above |
| `VITE_BIBLE_PROXY_URL` | `https://<project>.supabase.co/functions/v1/bible-proxy` |
| `VITE_API_BIBLE_VERSIONS` | JSON of version → API.Bible id, e.g. `{"nkjv":"…","nlt":"…","amp":"…"}` (add `"niv"` only with Biblica's permission) |

## 4. Content that needs people

- **2027 Bible lessons** → `public/data/lessons.json` (the 2026 calendar ends on 31 December).
- **Constitution**: the app shows excerpts. Publishing the full text needs the Board of Trustees' permission.
- **Bibeli Mimọ (1900)**: 491 of 1,189 chapters are verified. A cleaner scan or volunteer proofreading
  (`data-src/yo1900_report.json` lists every chapter left out and why) would complete it.
- **Hymns**: 36 are flagged where the printed layout was irregular; hymns 172 and 674 are cited in
  the Order of Service but are not in the source hymnal.
- **Yorùbá interface strings** (`src/i18n/index.ts`) should be checked by a native speaker.

## 5. Before each deploy

```sh
npm run build                       # typecheck + unit tests + build
npx vite preview --port 4173 &
python tests/e2e/smoke.py tests/e2e/out
python tests/e2e/flows.py tests/e2e/out
```

## Rebuilding data

| Command | Rebuilds |
|---|---|
| `python scripts/build_hymns.py --report` | `public/data/hymns.json` from the PDF extract |
| `python scripts/build_yoruba1900.py` | `public/data/bible/yo1900/` from the 1900 scan |
| `python scripts/normalize_services.py` | Order of Service clean-up (references, fixed hymns) |
| `python data-src/constitution_1980.py` | `public/data/constitution.json` |
| `python scripts/build_daily_verses.py` | 366 verses of the day |
| `python scripts/build_sitemap.py` | `public/sitemap.xml` |
