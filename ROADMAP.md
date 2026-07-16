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

- ~~**Razorpay integration**~~ DONE (code side). Real Subscriptions API (UPI Autopay,
  RBI pre-debit notifications and invoicing handled by Razorpay's own product, not built
  from scratch), webhook handling with real cryptographic signature verification and
  idempotency, Meta Pixel + Conversions API wired through the same funnel. Built live,
  no test-mode buffer, verified with real crypto tests including deliberately breaking
  the signature check to confirm the tests would catch a forged webhook. **Still needs
  Anurag**: create Plans in Razorpay Dashboard, register the webhook, add env vars,
  do one real test purchase, then manually flip `PAYWALL_ENABLED`.
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
- Real billing lifecycle beyond first-charge: renewal, cancellation, failed-payment retry
  are handled by the webhook; what's NOT built yet is active dunning/win-back messaging
  for a failed renewal specifically.
- Credit top-up packs — already teased as "coming soon" on the pricing page, still not built.
- **One real decision to revisit here**: Tracker/LinkedIn review/Portfolio review were
  deliberately kept free-forever earlier in this build, as a trust-building, competitive-
  advantage call made pre-revenue. Once there's real usage data, revisit whether that's
  still right, or whether a mid-tier makes sense. Don't relitigate it blind — decide with data.
- **Also worth building soon**: "Priority processing" has been sitting as Pro-tier teaser
  copy ("in development") since it was first written — a real, qualitative reason to
  upgrade beyond just more credits, and not yet actually built.

## Phase 6 — Reliability (earn the right to scale)

The unglamorous list. This is what separates "impressive project" from "company an investor
would actually trust with more users."

- ~~**Sentry** — error monitoring~~ DONE (Phase 4.2). Code-side wired into all four
  runtimes plus explicit capture in every route's catch block. Anurag confirmed the
  live pipeline works via the admin test-error button.
- ~~**Automated tests**, starting with the credit system and rate-limiting~~ DONE
  (Phase 4.1). 119 tests across 15 files — credits, rate-limiting, format-check,
  all AI parsing, every API route's orchestration, and the real PDF/DOCX parsing
  pipeline (added after a real production bug there).
- ~~**Pin the Gemini model**~~ DONE (Phase 4.5). Pinned to `gemini-3.5-flash`,
  confirmed via Google's own changelog that the old alias had already silently
  repointed once during this build.
- **CI/CD** — a GitHub Action running `tsc` + `eslint` + tests before anything merges,
  so a bad deploy gets caught before it's live, not after. **Still open.**
- **Verify the database backup actually restores** — Supabase does automatic backups on
  paid tiers, but "a backup exists" and "a backup works" are different claims until
  tested. **Still open — needs Anurag, requires actual Supabase dashboard access.**
- Basic uptime monitoring (UptimeRobot's free tier is enough to start) and a one-page
  incident response runbook. **Runbook: buildable now. Monitoring: needs Anurag to
  create the account.**

## Phase 7 — Growth & Distribution (become known, not just good)

Only after Phase 5 exists, so growth spending has revenue to justify it against.

- **Chrome extension**: real multi-site testing (Naukri, LinkedIn, Indeed) and actual
  Chrome Web Store submission — it's been built and sitting untested since Phase 3.1
- **Say the depth out loud**: the real structural DOCX inspection, the enforced
  no-fabrication discipline — both are true and both are still unstated anywhere on the
  homepage. This is free credibility currently left on the table
- **SEO content**: guides targeting real job-search queries, tuned for the Indian market
  specifically (India-specific ATS conventions, salary/notice-period norms) — most
  competitors are US-centric and don't bother with this, which is a real opening
- **A public changelog** — free marketing that visibly demonstrates a shipping pace
  competitors can't match, which has been true throughout this entire build
- **Real testimonials from real early users** — nothing converts skeptics faster than
  someone who isn't the founder saying it worked

## Phase 8 — Product Depth (widen the moat, don't just match competitors)

This is where "best in market" stops being about feature parity and starts being about
owning something nobody else does.

- **Tie the tools together**: save a job directly from a scan into the Tracker — right now
  they're three separate tools (scanner, tracker, interview prep) that happen to share a
  login, not one continuous workflow
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
