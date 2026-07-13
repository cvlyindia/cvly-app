# Cvly — Executive Audit & Path to Best-in-Class
*Written as CEO, Founder, CTO, and COO would each actually assess this — July 2026*

This is the honest, consolidated state of the product: what's genuinely strong, what's
broken, and exactly what closes the gap between "impressive AI-assisted build" and
"the best resume tool in the market." Findings from every audit this session, plus
new ones found while writing this, all in one place.

---

## Executive summary — read this part even if nothing else

Cvly's actual product depth is real and underrated. The technical execution — structural
DOCX parsing, real templated resume output, resume-grounded interview answers, a genuine
anti-fabrication discipline enforced in every prompt — is not what a weekend AI clone
produces. That was never the weak point.

**Two things found today are genuinely serious and need action before anything else:**

1. **Interview Prep (the most-marketed feature) may be timing out in production right now.**
   Vercel's default function timeout is 5-10 seconds; the feature is described in your own
   UI as taking ~20. Fixed the code side today (explicit `maxDuration` on every AI route) —
   but you must confirm which Vercel plan is active. If it's Hobby, this was likely failing
   silently for real users, and Hobby also legally prohibits commercial use once you have a
   pricing page. **Check this today, not this week.**
2. **No revenue path exists.** Razorpay is deferred. Every user right now costs money and
   generates zero. This is the single biggest gap between "good product" and "real business."

Everything else in this document is real, but less urgent than those two.

---

## 1. Development & Architecture (CTO)

**Fixed this session:**
- All 8 AI-calling routes now have explicit `maxDuration` — was silently relying on
  platform defaults
- `scans`, `saved_jobs`, `career_reviews` had zero indexes on `user_id` — the actual column
  every real query filters by. Fixed (migration 012). Invisible today, would have quietly
  degraded every page load as data grew.
- Anonymous access to `score`/`rewrite`/`cover-letter`/`interview-prep` was completely
  unmetered — the single biggest cost-exposure risk found across every audit this session.
  Fixed with real per-IP rate limiting.
- 3 defense-in-depth security gaps (routes relying on RLS alone, no app-level filter backup)
- Dead code, unsafe-to-rerun migration, a stale demo page underselling the product

**Still real, still unresolved:**
- **Zero automated tests.** Every single verification in this entire build has been manual —
  real, but manual, and it doesn't scale. Before any real growth, this needs at minimum:
  integration tests on the credit system (the one piece of logic that directly controls
  cost), and smoke tests on all AI routes.
- **No error monitoring.** Production is a black box. Sentry (free tier is generous) is a
  half-day integration that turns "a user emails you angry" into "you know before they do."
- **Gemini model is an unpinned alias** (`gemini-flash-latest`). Google can silently change
  what this points to. Low urgency, real risk.
- **No caching layer anywhere.** Every Dashboard load re-fetches everything fresh. Fine at
  current scale, a real cost/latency lever once usage grows.
- **No CI/CD pipeline** — every deploy is a manual `git push` with no automated check gate
  before it goes live. A pre-push GitHub Action running `tsc` + `eslint` is cheap insurance.

---

## 2. Design & Emotional Experience (Head of Design)

**Fixed this session (across three separate design passes):**
- The score reveal — the single highest-stakes emotional moment — was buried below utility
  buttons. Now leads, with a dynamic headline that responds to the actual score.
- Dashboard had almost no motion (4 animation touches on the whole daily-use page). Now has
  a full cascading entrance sequence plus real ambient life.
- Mission completion and interview-practice completion were dead ends with zero
  acknowledgment. Both now have real moments.
- Chatbot looked generic. Rebuilt with a real typing indicator, avatar, online status,
  entrance animation — the actual signals that make a chat widget feel alive.
- Sophisticated ambient background system (drifting gradient mesh, not decorative GIFs) on
  homepage and Dashboard specifically — restrained motion, the technique behind why
  Stripe/Linear feel expensive.
- Login page was a dead end with no way back to the homepage.

**Still worth doing:**
- The rest of the homepage below the hero (trust section, comparison table, FAQ) hasn't had
  the same "make it feel alive" pass the hero and Dashboard got — worth a dedicated look.
- No dark mode. Not urgent, but every major competitor and every "serious tool" comparison
  point (Linear, Notion, Vercel) has one.
- History, Settings, and Tracker are functionally solid but visually the least developed
  pages in the app — deliberately left plain during the animation pass since they're
  data-dense, but "plain" and "underdeveloped" aren't the same thing, worth a targeted pass.

---

## 3. Functionality & Mechanism (Head of Product)

**Genuinely ahead of Jobscan/Rezi/Teal/Enhancv on:**
- Real structural parse-safety detection (they mostly rely on AI opinion, not actual file
  inspection)
- Resume-grounded interview answers (100 questions AND real, tailored suggested answers —
  most competitors give generic question banks)
- The explicit no-fabrication discipline, enforced in every generation, not just claimed
- A genuinely more generous free tier than any of them (LinkedIn review, portfolio review,
  and a real application tracker, all free)

**Genuinely behind, and worth closing:**
- No password login fallback if magic-link email has a bad day (mitigated by Google/LinkedIn
  now existing, but still a gap)
- Job description auto-import is best-effort only, fails silently on JS-heavy sites without
  the Chrome extension installed
- The Tracker doesn't integrate with the scanner at all yet — no "save this job from a scan
  directly into the tracker" flow, which is an obvious missing connective feature
- No resume version history / A-B comparison between two rewrites

---

## 4. Testing, Debugging & Reliability (QA / Head of Engineering)

- Every fix in this entire build has been verified manually — real verification, genuinely
  rigorous, but a human bottleneck, not a system
- No load testing has ever been done — nobody knows what happens at 100 concurrent users
- No synthetic monitoring (a simple uptime ping every few minutes would have caught the
  interview-prep timeout risk found today, automatically, months ago)
- Recommend, in order: (1) Sentry for error visibility, (2) a handful of integration tests
  on the credit and rate-limiting logic specifically since that's the code directly
  protecting your bank account, (3) a basic uptime monitor (UptimeRobot free tier is enough
  to start)

---

## 5. Operations (COO)

This lens hasn't been applied yet this session, and it's worth naming directly:
- **No documented incident response process.** If the site goes down at 2am, what happens?
  Right now, nothing until Anurag notices.
- **No database backup/disaster-recovery verification.** Supabase does automatic backups on
  paid tiers, but has this ever actually been tested — could you restore from one today if
  you needed to?
- **No support SLA or triage process**, even informally. The chatbot and email exist, but
  there's no answer to "what happens if 50 people email in the same day."
- **No changelog or public-facing "what's new."** Given how fast this ships, a simple public
  changelog is free marketing — it visibly demonstrates the pace competitors can't match.

---

## Phase 3 & Phase 4 — the sections that have been "not started" the whole time

These were flagged repeatedly across this build and never executed. Being direct: this is
where "impressive project" becomes "defensible business," and it's overdue.

### Phase 3 — Build the actual moat

| # | Item | Status | What it actually takes |
|---|---|---|---|
| 3.1 | Chrome extension | ✅ v1 built | Needs real multi-site testing (Naukri, LinkedIn, Indeed) and Chrome Web Store submission — you were going to test this and never confirmed back |
| 3.2 | Market the no-fabrication position explicitly | ❌ Still unstated anywhere | One real homepage section: "We open your actual file and check its structure — not just ask an AI to guess." Say the depth out loud. Half a day of work, meaningfully changes first impressions. |
| 3.3 | Anonymous rate limiting | ✅ Fixed today | Was the single biggest financial risk in the whole product |

### Phase 4 — The foundation a real investor would actually check

| # | Item | Status | What it actually takes |
|---|---|---|---|
| 4.1 | Automated tests | ❌ Zero exist | Start with credit-system and rate-limit logic specifically — that's the code protecting real money |
| 4.2 | Error monitoring | ❌ Not set up | Sentry, half a day |
| 4.3 | Delete confirmations | ❌ Still one-click | An hour of work across History/Tracker/Settings |
| 4.4 | Password login fallback | ⚠️ Partially mitigated | Google/LinkedIn OAuth now exist as backups; a real password option is still not there |
| 4.5 | Pin the Gemini model | ❌ Still an unpinned alias | Change one string once Google publishes stable version identifiers |

**The honest read**: Phase 3 and 4 aren't hard. They're not glamorous, which is exactly why
they keep losing to visible feature work. Every item above is measured in hours to a few
days, not weeks. The reason "big names" feel more trustworthy isn't that their AI is better
— it's that they've done this unglamorous list. Closing it is the fastest path to actually
beating them, not just looking like you might.
