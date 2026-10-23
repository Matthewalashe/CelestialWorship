# CelestialWorship — work status

Branch: `audit-fixes`. Not deployed. Tested locally: typecheck, lint (hooks + accessibility, zero
warnings), 54 unit tests, 47-route browser smoke test (no errors, no horizontal overflow at phone width)
and 13 end-to-end flows. Rules every change follows: docs/PRINCIPLES.md.

Legend: ✅ done · 🔑 needs something from you (see docs/SETUP.md)

## Requests

| # | Request | Status |
|---|---------|--------|
| 1 | Every audit recommendation | ✅ (see below) |
| 2 | Hymn architecture: spacing, lines, stanzas, numbers | ✅ 457 hymns rebuilt from source, sections, choruses, Amin, gutter numbers |
| 3 | Smarter Hymn Selector | ✅ readings themes, season/occasion, recency, no duplicates, service date |
| 4 | Hymns in Egun and French | ✅ contribution + review flow · 🔑 texts/permission |
| 5 | Bible: KJV default, NIV, NKJV, AMP, NLT | ✅ KJV · 🔑 API.Bible key (NIV also needs Biblica) |
| 6 | Original Yoruba Bible | ✅ Bibeli Mimọ 1900 preview (491 chapters); modern Yoruba with licence notice |
| 7 | Constitution, factions, common ground | ✅ 1980 text excerpts; neutral Our Church page · 🔑 full text permission |
| 8 | History and ideals | ✅ |
| 9 | Order of Service | ✅ inline readings, prescribed hymns pinned, suggestions, print/share |
| 10 | Devotion | ✅ inline readings, ranked hymns, keep-screen-on, completion + streak |
| 11 | Church directory | ✅ parishes & ministries, contact consent, seed headquarters |
| 12 | Public events calendar | ✅ observances + parish events, add to phone calendar |
| 13 | Retention | ✅ streaks, continue, favourites, share cards, weekly preview, reminders |
| 14 | Saves, highlights, drafts, prayers | ✅ My Library, export/import, account backup |
| 15 | Prayer requests | ✅ church / parish / shepherd visibility, moderated |
| 16 | Donations, tithe, offerings | ✅ platform gateway + parish payout accounts · 🔑 Paystack keys |
| 17 | Quizzes (5 kinds) | ✅ sourced and explained |
| 18 | Articles & commentaries | ✅ write, review, publish, comment, share |
| 19 | Auth, onboarding, splash, profile, roles | ✅ incl. independent shepherd; verification by moderators |
| 20 | Parish/ministry admin portal | ✅ details, team roles (shepherd, admin, parochial committee, media, choir), events, prayer requests, giving, appointments, livestream |
| 21 | Independent shepherds: articles, livestream, prayer, giving | ✅ ministry pages |
| 22 | Standard of principles; fix implementation issues | ✅ PRINCIPLES.md, ESLint in the build, accessible dialogs, server-side hardening migration, https-only links, orphaned code removed |
| 23 | Events: Imeko 2026, Pastor’s birthday | ✅ Imeko 21–25 Dec 2026; Pastor Founder 11 Oct; Rev. E. M. Oshoffa 25 Dec (International HQ, Ketu) |
| 24 | Gamified quizzes | ✅ XP, levels, combos, lives, timer, badges, daily challenge with share grid, opt-in weekly leaderboard · 🔑 games migration |
| 25 | Bible map games, old & new maps | ✅ Journey of Jesus, Then & Now, Map Master, Bible Lands Today; parchment / today / both layers |
| 26 | Liturgy and devotion first; minimal, well-structured UI | ✅ five tabs + Menu, quiet Home, settings in Profile |
| 27 | Kindle-style paper reading (Bible, hymns, devotion) | ✅ shared Aa menu, paper / night, book typeface, tap to turn |
| 28 | Children’s Bible stories | ⏳ next |
| 29 | X-style articles feed | ⏳ next |

## Audit items

All done: mobile nav, hidden-on-touch actions, dead links, precache size, wake lock, theme,
notifications (incl. Web Push 🔑 VAPID), hymnal shortcuts, Bible quick jump, operator chorus/keys,
full-screen operator + cross-device screen, schedule single source, 366 daily verses, notes privacy,
analytics batching + error reports, security headers, fonts, sitemap, shared loader, dead code, type
checks and tests in the build.
