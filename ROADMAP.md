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

- **Razorpay integration** — UPI Autopay for Pro/Enterprise (both prices are well under the
  ₹15,000 threshold where it's frictionless and RBI-compliant by default)
- Real billing lifecycle, not just "charge once": renewal, cancellation, failed-payment
  retry, the RBI-mandated pre-debit notification
- Flip `PAYWALL_ENABLED` back on once Pro is actually purchasable
- Credit top-up packs — already teased as "coming soon" on the pricing page, build it for real
- **One real decision to revisit here**: Tracker/LinkedIn review/Portfolio review were
  deliberately kept free-forever earlier in this build, as a trust-building, competitive-
  advantage call made pre-revenue. Once there's real usage data, revisit whether that's
  still right, or whether a mid-tier makes sense. Don't relitigate it blind — decide with data.

## Phase 6 — Reliability (earn the right to scale)

The unglamorous list. This is what separates "impressive project" from "company an investor
would actually trust with more users."

- **Sentry** — error monitoring. Production is currently a black box; this is the single
  highest-leverage half-day of work left on the list
- **Automated tests**, starting with the credit system and rate-limiting logic specifically
  — that's the code directly protecting real money, not the code most fun to test
- **CI/CD** — a GitHub Action running `tsc` + `eslint` + tests before anything merges,
  so a bad deploy gets caught before it's live, not after
- **Pin the Gemini model** once Google publishes a stable version identifier instead of
  the current unpinned `gemini-flash-latest` alias
- **Verify the database backup actually restores** — Supabase does automatic backups on
  paid tiers, but "a backup exists" and "a backup works" are different claims until tested
- Basic uptime monitoring (UptimeRobot's free tier is enough to start) and a one-page
  incident response runbook — doesn't need to be sophisticated, needs to exist

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
