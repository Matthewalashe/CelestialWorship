# Going live: setup checklist

The app works without any of this: hymns, the Bible, the Order of Service, devotion, the reader and
music, children's stories, quizzes and maps, the library and the church calendar.
These steps switch on the shared features: accounts, parishes, articles, prayer requests, giving,
the Partner plan, livestreams, pictures and push alerts.

## 1. Database (Supabase)

1. In the Supabase dashboard → SQL editor, run the migrations **in order** (or `supabase db push`):
   1. `supabase/migrations/20261022000000_community.sql` — accounts, parishes, articles, prayer, events, giving
   2. `supabase/migrations/20261023000000_hardening.sql` — server-side rules (names, publishing, https links, shepherds only write articles)
   3. `supabase/migrations/20261024000000_games.sql` — weekly quiz leaderboard
   4. `supabase/migrations/20261025000000_partner_plan_live.sql` — Partner plan, livestreams, following, reader support
   5. `supabase/migrations/20261026000000_media.sql` — profile photos and banners, parish logos, covers and galleries (Storage buckets), rate limits
   6. `supabase/migrations/20261027000000_church_structure.sql` — parish levels (cathedral, circuit, state,
      province, regional… headquarters), ownership and affiliation, sister parishes and branches; shepherds'
      ranks, offices and church records (birth, baptism, rank, investiture, education, travels…); parishes
      authenticating their shepherds; the Library (`library` bucket); **parish claims with evidence**
      (private `evidence` bucket) — a moderator approves a claim in Moderation, which publishes or updates the
      parish with the claimant's contact, makes them its verified administrator or shepherd, and sets their parish
2. Make yourself an admin:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR EMAIL');
   ```
3. Auth → Providers: enable Email (and Google if wanted). Set the Site URL to the app's address.
4. Realtime is used for the operator's "another device as the screen" — it is on by default.
5. **Partner plan prices** are placeholders (₦5,000 a month, ₦50,000 a year). Create the two plans in
   the Paystack dashboard (Products → Plans), then:
   ```sql
   update public.plans set amount_minor = 500000, paystack_plan_code = 'PLN_…' where id = 'partner_monthly';
   update public.plans set amount_minor = 5000000, paystack_plan_code = 'PLN_…' where id = 'partner_yearly';
   ```
   To give a parish the plan without payment (e.g. the headquarters):
   ```sql
   insert into public.parish_subscriptions (parish_id, plan_id, status, current_period_end)
   values ('<parish id>', 'partner_yearly', 'active', now() + interval '1 year');
   ```

## 2. Edge Functions

Deploy everything in `supabase/functions`:

```sh
supabase functions deploy banks payout-account init-payment verify-payment paystack-webhook \
  subscribe manage-subscription live-notify bible-proxy push-subscribe send-reminders
```

Secrets (`supabase secrets set NAME=value`):

| Secret | For |
|---|---|
| `APP_ORIGIN` | The app's URL, e.g. `https://celestialworship.vercel.app` |
| `PAYSTACK_SECRET_KEY` | Gifts and the Partner plan (platform Paystack account) |
| `PLATFORM_PERCENTAGE` | Platform's share of each gift, e.g. `0` or `2.5` |
| `PAYSTACK_FEE_BEARER` | `account` (platform pays fees) or `subaccount` (parish pays) |
| `API_BIBLE_KEY` | NKJV / NLT / AMP / NIV through API.Bible |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push reminders and live alerts (`npx web-push generate-vapid-keys`) |
| `CRON_SECRET` | Any long random string; protects send-reminders |

Then:
- Paystack dashboard → Settings → Webhooks: `https://<project>.supabase.co/functions/v1/paystack-webhook`
  (it handles gifts, subscription payments, renewals, failed payments and cancellations).
- Schedule reminders every 5 minutes (needs pg_cron + pg_net): see the commented `cron.schedule`
  statement at the end of the community migration. The same job announces broadcasts 15 minutes ahead.

## 3. App environment (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Already set (also read by `middleware.ts` for sharing previews) |
| `VITE_VAPID_PUBLIC_KEY` | Same public key as above |
| `VITE_BIBLE_PROXY_URL` | `https://<project>.supabase.co/functions/v1/bible-proxy` |
| `VITE_API_BIBLE_VERSIONS` | JSON of version → API.Bible id, e.g. `{"nkjv":"…","nlt":"…","amp":"…"}` (add `"niv"` only with Biblica's permission) |

Sharing previews (`middleware.ts`) and the preview pictures (`api/og.tsx`) run on Vercel automatically.

## 4. Content that needs people

- **2027 Bible lessons** → `public/data/lessons.json` (the 2026 calendar ends on 31 December).
- **Constitution**: the app shows excerpts. Publishing the full text needs the Board of Trustees' permission.
- **Bibeli Mimọ (1900)**: 491 of 1,189 chapters are verified. A cleaner scan or volunteer proofreading
  (`data-src/yo1900_report.json` lists every chapter left out and why) would complete it.
- **Hymns**: 36 are flagged where the printed layout was irregular; hymns 172 and 674 are cited in
  the Order of Service but are not in the source hymnal. Only 73 hymns have sol-fa, so only those play as tunes.
- **Egun and French hymn texts** come through the contribution and review flow; publishing printed
  translations needs the publisher's permission.
- **Interface translations** live in `public/i18n/{yo,fr,egun}.json`, keyed by the English text. French
  and Yorùbá cover the whole interface and should be read by native speakers; **Gungbe (Egun) has only a few
  words so far** and falls back to French — it needs a Gun speaker. After changing the app's text run
  `node scripts/i18n.cjs wrap` (wraps new text in `tr()`) and `node scripts/i18n.cjs extract` (lists what each
  language is missing).
- **Parishes from the Bible-lessons booklet**: the 2026 PDF supplied holds only the lesson tables. Send the
  booklet's parish pages to add them; today's list is the Church's published worldwide list (2005–2012).
- **Children's stories**: the 54 retellings (`data-src/stories_original.py`) are worth a read by a
  shepherd and a Sunday-school teacher.

## 5. Before each deploy

```sh
npm run build                       # typecheck + lint + unit tests + build
npx vite preview --port 4173 &
python tests/e2e/smoke.py tests/e2e/out
python tests/e2e/flows.py tests/e2e/out
python tests/e2e/a11y.py
```

## Rebuilding data

| Command | Rebuilds |
|---|---|
| `python scripts/build_hymns.py --report` | `public/data/hymns.json` from the PDF extract |
| `python scripts/build_yoruba1900.py` | `public/data/bible/yo1900/` from the 1900 scan |
| `python scripts/normalize_services.py` | Order of Service clean-up (references, fixed hymns) |
| `python data-src/constitution_1980.py` | `public/data/constitution.json` |
| `python scripts/build_daily_verses.py` | 366 verses of the day |
| `python scripts/build_maps.py <Natural Earth folder>` | `public/data/maps/` (Bible-lands maps) |
| `python scripts/build_stories.py <lathbury.txt> <cache>` | Children's stories and pictures (needs Pillow) |
| `python scripts/build_sitemap.py` | `public/sitemap.xml` |
| `python scripts/build_parishes.py` | `public/data/parishes_listed.json` from `data-src/parishes_listed.py` |
| `python scripts/build_bible_fr.py` | `public/data/bible/fr/` (Louis Segond 1910) |
