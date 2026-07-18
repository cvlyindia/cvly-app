# Cvly — Phase II: Roadmap to Best-in-Market
*Written as a company would actually sequence it — July 2026*

**This is Phase II — a new chapter, not a continuation of the original Phase 1-4 numbering.**
Phase 1-4 was the foundation build: credibility, table-stakes features, the moat items, and
technical hardening. That chapter isn't fully closed yet — **Phase 3.1 (the Chrome extension)
is still open**, built but never confirmed tested on a real device or submitted to the Chrome
Web Store. That gets finished first. Phase II starts once Phase 1-4 is genuinely done, not
before — sequencing that matters as much as the content below.

Everything audited and fixed so far (Phases 1-4, the technical/design/mobile passes) got
Cvly to a genuinely solid, trustworthy foundation. This is what comes next — not a wishlist,
a sequence. Each phase is ordered because the one before it makes the next one make sense.
Spending on growth before revenue exists, for example, is just spending.

---

## Phase 5 — Revenue (turn it into a business)

Nothing else on this list matters if this doesn't happen. Right now every user is a cost
with no offsetting income.

- ~~**Razorpay integration**~~ FULLY DONE, code AND live. Real Subscriptions API (UPI
  Autopay, RBI pre-debit notifications and invoicing handled by Razorpay's own product,
  not built from scratch), webhook handling with real cryptographic signature
  verification and idempotency, Meta Pixel + Conversions API wired through the same
  funnel. Anurag completed the dashboard setup (Plans, webhook, env vars), confirmed a
  real Pro subscription purchase and a real credit top-up both work end to end with
  actual money, and `PAYWALL_ENABLED` is now `true` in production. Revenue is live.
- **The actual conversion funnel** — DONE. This was the real gap: infrastructure existed
  with no reason for anyone to reach it. Score stays free to try with no account at all;
  Rewrite/Cover Letter/Interview Prep (the tools that fix what Score finds) now require a
  free account — no anonymous path for any of the three. Anonymous scoring itself capped
  to 3/day/device (down from a full 10-credit budget) — enough to compare a couple of
  roles, not enough to run a whole job search without ever signing in. `OutOfCreditsModal`
  now embeds real one-click checkout instead of just linking to another page. A low-credit
  moment (2 or fewer, free plan) now shows a direct, proactive upgrade nudge instead of a
  quiet counter. Trust-badge and chatbot copy updated to stay honest about what's actually
  free vs. what needs an account — "no signup wall" now means "no signup wall to try it,"
  not "everything is anonymous forever."
- ~~Real billing lifecycle beyond first-charge~~ Subscription management from the user's
  side is now real too, not just the webhook side: Settings shows current plan, next
  billing date, and lets a Pro user actually cancel (at cycle end, not immediately - the
  existing webhook already handles the downgrade correctly when Razorpay processes it).
  This was the real substance behind a "navigation feels thin" report - a paying customer
  had genuinely no way to see or manage their own subscription anywhere in the app.
- ~~Credit top-up packs~~ FULLY DONE, code AND live. The three packs already teased on
  the pricing page (20/₹49, 60/₹129, 150/₹299) are now real, one-click purchases via
  Razorpay Orders (not Subscriptions — a separate, one-time-payment product).
  Security-critical piece: the server validates every request against a fixed whitelist
  (lib/topups.ts) rather than trusting any price/credit amount the client sends —
  verified with a real test that deliberately tries to smuggle a tampered price and
  confirms only the real, server-side values are ever used. Credits are added atomically
  via a new increment_credits Postgres function, the same pattern as the existing
  decrement_credits used for spending. Anurag's first live test caught a real bug — the
  webhook was silently failing to actually credit purchases while still reporting
  success, root-caused to two Supabase calls whose errors were never checked (traced to
  a missing database migration on the live project) — found, fixed, and confirmed
  working on a second real payment.
- ~~**One real decision to revisit here**~~ DECIDED. Anurag made the call directly rather
  than wait for usage data — LinkedIn review and Portfolio review moved from free-forever
  to Pro-only, alongside Interview Prep (which was already login-gated but not
  plan-gated). New tier structure: Free/credit-purchase tier gets ATS score, resume
  rewrite, and cover letter (generate + download, no restriction). Pro gets those plus
  Interview Prep, LinkedIn review, and Portfolio review. Free daily credits dropped from
  10 to 5. Gated at generation, not just download — a free user never receives the
  actual Interview Prep/LinkedIn/Portfolio content from the server at all, which is also
  what closes a real copy-paste bypass: locking only a download button while the
  restricted content still renders on the page doesn't actually stop someone from
  selecting and copying it directly. Found and fixed a related real bug while making
  this change: new user signup was silently relying on a database column's own default
  value for starting credits, a second source of truth separate from PLAN_LIMITS that
  had already drifted out of sync once and would have again — fixed to explicitly set
  the value from PLAN_LIMITS on every insert.
- **Also worth building soon**: ~~"Priority processing"~~ DONE. Was sitting as Pro-tier
  teaser copy ("in development") since it was first written — now real. For Pro/Enterprise,
  Gemini and the fastest available fallback provider are raced simultaneously and whichever
  responds successfully first wins, instead of trying them one after another. Free plan
  keeps the existing sequential behavior. Deliberately not the default for everyone: the
  fallback providers are free-tier with real, shared rate limits across all of Cvly's
  traffic — racing on every casual free request would burn through that shared capacity,
  leaving less in reserve for when Gemini is genuinely down for everyone. Verified with
  real tests (not mocked away, unlike everywhere else this function is used) proving the
  race genuinely picks whichever succeeds first in both directions, and that a failed
  faster side correctly falls back to waiting for the slower side rather than giving up.

## Phase 6 — Reliability (earn the right to scale)

The unglamorous list. This is what separates "impressive project" from "company an investor
would actually trust with more users."

- ~~**Sentry** — error monitoring~~ DONE (Phase 4.2). Code-side wired into all four
  runtimes plus explicit capture in every route's catch block. Anurag confirmed the
  live pipeline works via the admin test-error button.
- ~~**Automated tests**, starting with the credit system and rate-limiting~~ DONE.
  224 tests across 26 files — credits, rate-limiting, format-check, all AI parsing,
  the priority-racing logic, every API route's orchestration, the real PDF/DOCX
  parsing pipeline, webhook signature verification, and the reliability timeout
  layer, among others.
- ~~**Pin the Gemini model**~~ DONE (Phase 4.5). Pinned to `gemini-3.5-flash`,
  confirmed via Google's own changelog that the old alias had already silently
  repointed once during this build.
- ~~**CI/CD**~~ DONE. `.github/workflows/ci.yml` — type-check, lint, and the full test
  suite run on every push/PR to main, so a bad deploy gets caught before it's live.
- ~~**One-page incident response runbook**~~ DONE. `RUNBOOK.md`.
- **Verify the database backup actually restores** — Supabase does automatic backups on
  paid tiers, but "a backup exists" and "a backup works" are different claims until
  tested. **Still open — needs Anurag, requires actual Supabase dashboard access.**
- Basic uptime monitoring (UptimeRobot's free tier is enough to start). **Still open —
  needs Anurag, requires creating an external account.**

## Phase 7 — Growth & Distribution (become known, not just good)

Only after Phase 5 exists, so growth spending has revenue to justify it against.

- **Chrome extension**: real multi-site testing (Naukri, LinkedIn, Indeed) and actual
  Chrome Web Store submission — it's been built and sitting untested since Phase 3.1
- ~~**Say the depth out loud**~~ DONE. The "Two things we refuse to fake" homepage
  section already covers this — the real structural DOCX inspection and the enforced
  no-fabrication discipline, both stated explicitly, not left implicit.
- ~~**SEO content**~~ DONE, 16 real guides live at `/guides` — deliberately reached a
  set target rather than an open-ended stream. Covers every major stage of a job
  search (resume format, mistakes, quantifying achievements, freshers, career changers,
  LinkedIn, cover letters, portfolios, three classic interview questions, employment
  gaps, layoffs specifically, notice period, resume vs CV, resume length) and gives
  every Pro feature (Interview Prep, LinkedIn review, Portfolio review) real coverage,
  which was a genuine gap when this started. Quality held consistent throughout — real,
  specific advice, not thin filler, same no-fabrication standard as the product itself.
- ~~**A public changelog**~~ DONE. `/changelog`, linked from the homepage footer and the
  dashboard sidebar — real, curated entries only, honest general timeframes rather than
  invented precise dates.
- **Real testimonials from real early users** — nothing converts skeptics faster than
  someone who isn't the founder saying it worked. Still open — needs actual users first,
  not something to build ahead of having them.

## Phase 8 — Product Depth (widen the moat, don't just match competitors)

This is where "best in market" stops being about feature parity and starts being about
owning something nobody else does.

- ~~**Tie the tools together**~~ DONE. Save a job directly from a scan result into the
  Tracker — a small "Save to Tracker" button appears next to Download/Share once a scan
  has saved, asking for company + role (deliberately not AI-guessed from the job
  description — a wrong guessed company name would be exactly the kind of thing this
  product's own no-fabrication standard argues against). From the Tracker side, any card
  linked to a scan now shows "View scan" and "Prep for interview" links straight back to
  it, reusing the existing `?resume=X&tab=Y` restore mechanism rather than building a
  parallel one. The scan_id link is verified server-side against the requesting user
  before being allowed — a client-supplied ID doesn't get trusted blindly.
- **A unified readiness score** — one number combining resume match, LinkedIn strength,
  portfolio quality, and interview prep completion. Nobody in this market does this;
  everyone else sells the pieces separately
- Resume version history — compare two rewrites side by side, see what actually changed
- Once someone reaches "Offer" status in the Tracker, that's a natural, honest next step:
  offer/negotiation guidance grounded in what they actually have, not generic advice

## Phase 9 — Operational Maturity

Comes later because it matters more once there are real users and real money to protect.

- A real support triage process, not just "the chatbot and an email exist"
- A DPDP Act compliance review specifically — real user data, India-focused product,
  this needs a deliberate pass, not an assumption
- Revisit Terms/Privacy as the feature set keeps growing faster than the legal pages have
- First hire, once Phase 5 makes that a real conversation instead of a hypothetical

---

## The honest synthesis

"Best in market" isn't one feature away. It's five things compounding at once: the
technical depth that's already genuinely real (parse-safety inspection, no-fabrication
discipline), revenue that lets that depth get reinvested instead of just subsidized,
reliability that earns the right to have more users depend on it, distribution that
actually gets it in front of people, and the shipping pace this whole build has already
proven — sustained, not as a one-time sprint.

The competitors being laughed about aren't better at AI. They're older, better funded, and
more visible. Every phase above closes one of those three gaps — not the AI gap, because
that one was never real.
