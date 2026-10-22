# CelestialWorship — work status

Branch: `audit-fixes`. Nothing is deployed until it has been tested on this branch.

Legend: ✅ done · 🟡 in progress · ⬜ not started · 🔑 needs something from you (keys, permission, content)

## Requests from the product owner

| # | Request | Status | Notes |
|---|---------|--------|-------|
| 1 | Fix every audit recommendation | 🟡 | See "Audit items" below |
| 2 | Hymn architecture: spacing, lines, stanzas, numbers | ✅ | Rebuilt from the PDF extract (`scripts/build_hymns.py`); 457 hymns, 36 flagged where print layout was irregular |
| 3 | Smarter Hymn Selector | ✅ | Readings themes, season/occasion, recency decay, no duplicates, plan date |
| 4 | Hymns in Egun and French (Igbo/Hausa dropped) | 🟡 🔑 | No public source found except one parish's app (copyrighted). Building contribution + review flow; texts need permission/contributors |
| 5 | Bible: KJV (default), NIV, NKJV, AMP, NLT | ✅ 🔑 | KJV local. Others are copyrighted: they work through API.Bible once a key/proxy is configured (NIV also needs Biblica's permission) |
| 6 | Original Yoruba Bible | ✅ (preview) | Bibeli Mimọ 1900 from the public-domain scan: 491 of 1,189 chapters pass checks. Biblica's modern Yoruba kept, now with its required licence notice |
| 7 | Constitution, factions, common ground | ✅ | Rebuilt from the 1980 Constitution (47 clauses). "Our Church" page: neutral common ground. 🔑 Full text needs Board of Trustees' permission |
| 8 | History and ideals | ✅ | Timeline, vision & mission, sources |
| 9 | Order of Service | ⬜ | |
| 10 | Devotion | ⬜ | |
| 11 | Church directory (address, country, province, shepherd, contact) | 🟡 | Schema + submission + contact consent; seed = 4 headquarters from the Constitution. No scraping of personal contacts |
| 12 | Events calendar (public church calendar) | 🟡 | Schema done; page next |
| 13 | Retention | 🟡 | Streaks, continue reading, favourites, share cards done; Home dashboard next |
| 14 | Saves, highlights, drafts, prayers | ✅ | My Library page |
| 15 | Prayer requests (shared) | ✅ | Moderated wall, visibility church/parish/shepherd, "I prayed", testimonies |
| 16 | Donations, tithe, offerings | 🟡 🔑 | Schema done; page next. Payments need a Paystack key + verify function deployed |
| 17 | Quizzes: Bible, hymn, constitution, geography/history, doctrine | ⬜ | |
| 18 | Articles & commentaries (Bible, lesson, hymn…) | 🟡 | List done; editor + reader next |
| 19 | Auth, onboarding, splash, profile, roles (laity / worker / shepherd / church admin) | ✅ | Shepherd & church admin require verification by moderators |
| 20 | Parish admin portal: calendar, prayer requests, giving, address/links/contact, appointments with shepherd/admins | 🟡 | Appointments schema added; portal page next |

## Audit items still open

- ⬜ Push notifications that work with the app closed (Web Push + Edge Function) 🔑 VAPID keys
- ⬜ Operator page in its own full-screen layout; cross-device display (Supabase Realtime)
- ⬜ Home: computed counts, retention dashboard, weekly lesson preview
- ⬜ Daily verse: 365 verses
- ⬜ One source of truth for service times (dateUtils vs services.json)
- ⬜ Analytics: smaller client, batched events
- ⬜ Security headers for all routes in vercel.json; remove `public/_headers`
- ⬜ Error monitoring hook
- ⬜ Fonts: fewer weights, non-blocking
- ⬜ SEO: hymn pages in sitemap / prerender
- ⬜ Generic data loader
- ⬜ Dead code: python scripts in root, unused AuthGuard
- ⬜ Moderation queue page

## Things only you can provide 🔑

1. Apply `supabase/migrations/*.sql` to the Supabase project, and make your account `admin` in `profiles`.
2. API.Bible key (and Biblica permission for NIV) for NKJV/NLT/AMP/NIV.
3. Paystack (or Flutterwave) keys for online giving.
4. VAPID keys for push notifications.
5. Board of Trustees' permission to publish the full Constitution text.
6. Egun and French hymn texts with permission, or contributors to enter them.
7. 2027 Bible lesson calendar.
8. A native Yorùbá speaker to review interface translations.
