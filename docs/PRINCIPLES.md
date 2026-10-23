# Principles

Every feature is built and reviewed against these. Each has a check that can fail a build or a review.

## 1. Faithful and fair content
- **Scripture is quoted, never paraphrased as if it were Scripture.** Bible text comes from a named
  translation with its licence notice. Retellings (children's stories) are labelled as retellings and
  point to the passage.
- **Sources are cited.** History, doctrine and quiz answers name their source (Bible reference,
  Constitution clause, or published source).
- **Neutral between the Church's factions.** Shared beliefs and practice are presented as shared; disputed
  matters are described, not decided. Leaders' events belong to the headquarters that recognises them.
- **Licensed content only.** Nothing is copied from sources whose terms forbid it (e.g. jw.org,
  copyrighted Bible translations, other apps' hymn texts). Open licences are honoured, including
  attribution and share-alike.

## 2. Privacy and safety (Nigeria Data Protection Act 2023 / GDPR spirit)
- **Local first.** Personal notes, prayers and highlights stay on the device unless the person backs
  them up to their own account.
- **Least data.** Only what a feature needs is collected; phone numbers and birthdays are optional and
  private by default; analytics carry no names, emails or content.
- **Consent for public contact details.** Parishes choose to publish phone/email.
- **People are who the server says they are.** Display names on shared content are set by the database
  from the author's profile, not by the client.

## 3. Security (OWASP ASVS level 1, OWASP Top 10)
- **The server decides.** Every rule (who may publish, moderate, see giving records) is enforced by Row
  Level Security and triggers, never only by hiding buttons.
- **No secrets in the app.** Payment, push and Bible-licence keys live in Edge Function secrets.
- **Money is verified with the provider** for the exact amount and currency before it is marked paid.
- **Untrusted text is never HTML.** User content renders as text or through the safe Markdown renderer;
  user links must be `https:`.
- **Abuse is bounded.** Posts and requests have length limits and rate limits; reports can hide content
  quickly; moderators have a queue.

## 4. Accessible to everyone (WCAG 2.2 AA)
- Works with a screen reader: every control has a name; dialogs are labelled; state is announced.
- Readable: body text ≥ 16px option, contrast ≥ 4.5:1, text can be enlarged without breaking layout.
- Touch first: actions reachable without hover; targets ≥ 44 × 44 px where possible.
- No native `alert/confirm/prompt` — they can't be styled, translated or reliably read.
- Motion is optional (`prefers-reduced-motion`).

## 5. Built for the congregation's phones and networks
- **Offline first.** Hymns, the Order of Service, the KJV books already read, the library and quizzes work
  without a connection.
- **Small.** First load ≤ 3 MB precache; each page's JavaScript ≤ 150 kB gzipped; images lazy-loaded.
- **Fast.** Core Web Vitals "good" on a mid-range Android: LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- **Yorùbá alongside English** in content, and in the interface where translated.

## 6. Engineering
- Typed (TypeScript strict), linted (ESLint incl. React hooks and accessibility rules), tested
  (unit + browser flows) — all run in `npm run build`.
- Data is built by scripts from cited sources, with validation that fails loudly.
- One source of truth per fact (e.g. the service schedule), checked by tests.
- Errors are reported (without personal data) and shown to people in plain words.
