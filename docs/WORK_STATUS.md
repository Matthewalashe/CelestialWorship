# CelestialWorship — work status

Branch `audit-fixes`. Checked before each deploy: typecheck, lint (React hooks + accessibility, zero
warnings), 79 unit tests, a 62-route browser smoke test at phone width (in English, French, Yorùbá and Egun) (no errors, no sideways
scrolling), 14 end-to-end flows and an axe-core WCAG 2.2 AA check (no serious or critical issues).
Rules every change follows: [PRINCIPLES.md](PRINCIPLES.md). What still needs you: [SETUP.md](SETUP.md).

Legend: ✅ done · 🔑 built, needs a key, permission or the database switched on (SETUP.md)

## Every request, checked against the app

| # | Request | Status | Where |
|---|---|---|---|
| 1 | Audit everything and fix every recommendation | ✅ | See “Audit items” below |
| 2 | Hymn layout: spacing, lines, stanzas, numbers | ✅ 457 hymns rebuilt, sections, choruses, Amin | Hymnal |
| 3 | Smarter hymn selector; hymns must follow the event and the Bible lessons | ✅ rebuilt: the day's occasion from the lessons and the calendar (Harvest, Palm Sunday, Christmas…) leads; the set verses (not whole chapters) are matched in English and in Yorùbá against the hymns' own words; then the slot, recency, no repeats — the same logic on every screen | Plan hymns, Order of Service, Studio, Devotion |
| 4 | Hymns in Egun and French (not Igbo/Hausa) | ✅ contribution + review · 🔑 texts/permission | Hymn page → Translations |
| 5 | Bible: KJV first, NIV, NKJV, AMP, NLT | ✅ KJV offline · 🔑 API.Bible key (NIV also Biblica) | Bible |
| 6 | The original Yorùbá Bible | ✅ Bibeli Mimọ 1900 (491 verified chapters) + Yorùbá Òde-Òní | Bible → version |
| 7 | Constitution; common ground of the factions | ✅ 1980 excerpts; neutral Our Church · 🔑 full text | Learn |
| 8 | History and ideals | ✅ | Learn → Our Church |
| 9 | Order of Service | ✅ readings inline, prescribed hymns, print/share | Service tab |
| 10 | Devotion | ✅ step by step, readings, hymns, keep-screen-on, streak, reading mode, music | Devotion tab |
| 11 | Directory: address, country, province, shepherd, contact | ✅ consent for contacts | Menu → Parishes |
| 12 | Events calendar | ✅ observances + parish events + add to phone calendar | Menu → Events |
| 13 | Imeko 2026, Pastor’s birthday | ✅ Imeko 21–25 Dec 2026; Pastor Founder 11 Oct; Rev. E. M. Oshoffa 25 Dec (International HQ, Ketu) | Events |
| 14 | Retention | ✅ streaks, continue, daily verse, daily challenge, reminders, follows | Home, Quizzes |
| 15 | Saves, highlights, drafts, prayers | ✅ My Library, export/import, account backup | Menu → My Library |
| 16 | Prayer requests | ✅ church / parish / shepherd, moderated, rate-limited | Menu → Prayer requests |
| 17 | Donations, tithes, offerings through our gateway | ✅ Paystack, parish payout accounts · 🔑 keys | Menu → Give |
| 18 | Quizzes: Bible, hymns, Constitution, geography/history, doctrine | ✅ sourced and explained | Learn → Quizzes |
| 19 | Gamified quizzes | ✅ XP, levels, combos, lives, timer, badges, daily challenge with share grid, opt-in leaderboard · 🔑 database | Learn → Quizzes |
| 20 | Map games: where Jesus lived, walked, died; Palestine, Judea, Samaria, Egypt; old and new maps as layers; names today; countries in the Bible | ✅ Journey of Jesus, Then & Now, Map Master, Bible Lands Today; Then/Now/Both layers | Learn → Bible maps |
| 21 | Journey of Paul; the churches he wrote to, then and now | ✅ 24 stops over 4 journeys; 13-letter game + then-and-now list | Learn → Bible maps |
| 22 | Articles in the style of Medium / X Articles, no feed; only shepherds write | ✅ reading list, book typography, Amen, responses, “more from”, commentaries shown under their passage or hymn; only verified shepherds can write (enforced by the database) | Learn → Articles |
| 23 | Auth, onboarding, splash, roles (laity, worker, shepherd, admin), register a church | ✅ incl. independent shepherd and verification | Profile |
| 24 | Churches publish events, take prayer requests and gifts, update address/links/contact, appointments with shepherds and admins | ✅ | Profile → Manage my parish |
| 25 | Independent shepherds: articles, livestream, prayer, gifts | ✅ ministry pages | Directory → Register your ministry |
| 26 | Onboard admins, choir, parochial committee, media, shepherds; bank details | ✅ team roles, payout account verified with the bank | Manage → Team, Giving |
| 27 | Monetise articles, commentaries, livestreams; paid plan required for gifts, monetising and livestreaming | ✅ Partner plan (Paystack subscriptions), enforced by the database; support buttons on articles and broadcasts · 🔑 plan codes and prices | Manage → Plan |
| 28 | Livestreaming to social media | ✅ channels saved once (YouTube channel auto-live, Facebook, Instagram, TikTok, X, Mixlr); multi-platform broadcasts; schedule; go live + alerts to members and followers; reminders 15 min before; share to WhatsApp/Facebook/X/Telegram; Live page, broadcast page, parish page · 🔑 VAPID for alerts | Manage → Livestream, Studio, Live |
| 29 | Children’s Bible stories (My Book of Bible Stories style; both sources; pictures) | ✅ 54 new retellings with questions + 82 classic stories (Lathbury, 1898); 134 pictures (Sweet Publishing, CC BY-SA). JW texts, pictures and animations can’t be used (jw.org terms) | Learn → Bible stories |
| 30 | A standard of principles; find and fix implementation issues | ✅ PRINCIPLES.md; lint, tests and accessibility checks; server-side hardening; https-only links; orphaned code removed | docs/ |
| 31 | Games are secondary; liturgy and devotion first; no clutter; fits every screen | ✅ six tabs, quiet Home, one Menu | Everywhere |
| 32 | Kindle-like monochrome paper reading (devotion, Bible, hymns) | ✅ shared “Aa” menu, paper / night, book typeface, tap-to-turn; stories too | Read button |
| 33 | A structure where nothing has to be searched for | ✅ tabs: Home, Service, Devotion, Hymnal, Bible, Learn; Menu: Worship, Church, Me | Navigation |
| 34 | Learn on the nav bar, quizzes inside | ✅ | Learn tab |
| 35 | Music on/off in devotion and the Bible: hymn music and soulful instrumentals | ✅ Celestial hymn tunes from the hymnal’s sol-fa + 11 public-domain/open recordings, streamed; stops on leaving and during read-aloud | Music button |
| 36 | Sharing previews, SEO, OG images | ✅ per-page titles, descriptions, pictures and structured data at the edge; generated preview cards; sitemap (696 pages) | middleware.ts, api/og.tsx |
| 37 | Parishes add media: images and videos | ✅ logo, cover, gallery (photos resized on the phone, short videos, YouTube/Facebook links) · 🔑 database | Manage → Pictures |
| 38 | Profile photo and banner | ✅ · 🔑 database | Profile |
| 39 | Desktop UI for media, livestreamers and choirs | ✅ Studio: order of service + setlist, one-click stanza projection (arrow keys, blank), sol-fa for the choir, live controls | Desktop opens in Studio |
| 40 | The app must not be heavy | ✅ install under 3 MB; each page under 8 kB gzipped; Bible, stories, pictures, maps and music load only when opened | |
| 42 | Independent shepherds register their ministry as owner or supporter | ✅ | Directory → Register your ministry |
| 43 | Parishes: sister parishes, cathedral / circuit / state / province / regional HQ, private or community, affiliation; add and authenticate their shepherds | ✅ · 🔑 database | Manage → Details, Team |
| 44 | Shepherds: rank, office, headship; background, education, certificates, travels, studentship, stewardships | ✅ public profile page | Profile → Church record |
| 45 | Members: birth in the Church (parish, shepherd), baptism, rank, investiture | ✅ private unless shown | Profile → Church record |
| 46 | App in English, Yorùbá, Egun and French; Bible, hymns and devotion start in that language and change on their own | ✅ whole interface in French and Yorùbá; Egun started (falls back to French); French Bible (Louis Segond 1910) added | Onboarding, Menu, Profile |
| 47 | Ranks, administrative hierarchy and the Church's symbols on one page | ✅ robes for 35 ranks, the structure from the Constitution, emblem, altar, candles, colours | Learn → Ranks, structure & symbols |
| 48 | Calendar includes every public event in the Bible lessons | ✅ | Events |
| 49 | Parishes from the lessons and online, by continent, country, state, town, address, contact, shepherd | ✅ 174 parishes in 15 countries from the Church's published list · 🔑 booklet's parish pages | Menu → Parishes |
| 50 | Library: articles, commentaries, books, outside links | ✅ verified shepherds publish straight away, others are reviewed | Learn → Library |
| 51 | Projector operator: better UI and UX | ✅ sources · slides · LIVE and NEXT monitors, keys 1–9, verse ranges, history | Project to screen |
| 52 | Splash screen and animation | ✅ | First open |
| 53 | Shepherds/admins claim their listed parish with evidence; on approval it takes their contact and they administer it | ✅ · 🔑 database | Directory → Claim this parish; Moderation |
| 41 | Commit and deploy | ✅ app deployed to Vercel · 🔑 database migrations and Edge Functions are applied from your Supabase account (SETUP.md §1–2) | |

## Audit items

All done: mobile navigation, hidden-on-touch actions, dead links, precache size, wake lock, theme,
notifications (incl. Web Push 🔑 VAPID), hymnal shortcuts, Bible quick jump, operator chorus/keys,
full-screen operator + cross-device screen, single source for the service schedule, 366 daily verses,
notes privacy, analytics batching + error reports, security headers, fonts, sitemap, shared loader,
dead code, type checks, lint, accessibility and tests in the build, colour contrast (WCAG AA),
reduced motion, rate limits.
