# Cvly — Project Status

Last updated: July 2026. This file exists so any future session — a new chat, Claude Code,
or anyone else picking this up — has a real written reference instead of needing this whole
conversation history re-explained. Update it when something material changes.

## CRITICAL BUG FIXED — PDF upload was completely broken in production

Anurag reported PDF/photo resume upload failing. Root cause: pdf-parse silently did a
MAJOR version rewrite (v1 -> v2) at some point in this build's history — from a small,
simple wrapper to a completely different package that bundles the entire pdfjs-dist
engine with a class-based API. The old code's `.default` unwrap logic silently returned
something non-callable, so EVERY PDF upload failed with "pdfParse is not a function".

Fixed properly, not just patched:
1. First tried pinning back to the old, simple pdf-parse v1.x API this code was written
   for — confirmed it works on realistic (LibreOffice-generated) PDFs, but then found a
   real compatibility gap: it failed to parse legitimately-generated modern PDFs (tested
   with pdf-lib) due to its ancient, bundled 2018-era pdf.js engine not supporting some
   flate/compression stream. Rejected this fix — too fragile for a production resume tool.
2. Properly adopted pdf-parse v2's real API instead (`new PDFParse({ data: buffer })`,
   `.getText()`), which uses a current, actively-maintained pdf.js engine and correctly
   parsed everything v1 failed on.
3. Hit — and properly fixed, not worked around — a well-documented Next.js/Vercel
   bundling issue this library is known for: `import 'pdf-parse/worker'` before importing
   PDFParse, plus `serverExternalPackages: ["pdf-parse"]` in next.config.ts. Both are
   pdf-parse's own documented fix for this exact scenario. Verified fixed via the actual
   running Next.js dev server hitting the real route, not just an isolated script.

New lib/__tests__/parseResume.test.ts: real, non-mocked tests using genuinely generated
PDF/DOCX buffers (pdf-lib, docx). This is the test class that would have caught the
original bug — the existing route tests mock extractTextFromFile entirely and never
touch the real parsing libraries, which is exactly why 112 passing tests didn't catch a
completely broken PDF pipeline. 119 tests total now.

**Honest limitation**: could not complete a full `next build` in this sandbox due to a
pre-existing, unrelated network restriction (Google Fonts fetch blocked here) that has
affected every build attempt this entire session — confirmed the failure happens only at
the font-fetch step, after bundling succeeds. Dev-server-level testing via the real
Turbopack-compiled route (not an isolated script) is strong evidence, but real Vercel
deployment is the final confirmation needed.

## What Cvly is

AI-powered resume/ATS tool. cvly.in. Next.js 16 + TypeScript + Tailwind v4 + Supabase +
Google Gemini (with a Groq/OpenRouter/Cerebras fallback chain). Hosted on Vercel, GitHub
repo: cvlyindia/cvly-app.

## Live feature set

- ATS Match Score + Parse Safety check (real DOCX/PDF structural inspection, not just AI opinion)
- Resume Rewrite — outputs a real structured, templated DOCX/PDF (not just text), upload-only
  input (no editable/pasteable resume text, to prevent tampering with what gets scored)
- Cover Letter generator
- 100 Interview Questions, each with a STAR hint AND a resume-grounded suggested answer
- LinkedIn Profile review + Portfolio review (paste-based, no scraping)
- Application Tracker (Kanban)
- Job description auto-import from a URL (tries JobPosting schema first, falls back to text)
- Chrome extension v1 (chrome-extension/ folder) — extracts JD from any page, hands off to
  the web tool. NOT yet published to the Chrome Web Store. Needs real multi-site testing.
- AI fallback chain: Gemini -> Groq -> OpenRouter -> Cerebras (lib/aiProviders.ts)
- Chatbot (floating button, replaced WhatsApp) — instant answers for preset questions, real
  AI fallback for anything else, IP-rate-limited (15/hour) since it's the one endpoint with
  no auth at all
- Daily credits: Free 10/day, Pro 100/day (Rs99/mo), Enterprise 1000/day (Rs999/mo)
- Listen-to-results (Web Speech API), share buttons, social links, all zero-cost/zero-dependency
- Google + LinkedIn sign-in buttons on the login page (code is live; needs the provider secrets
  pasted into Supabase's dashboard to actually work end to end — see Pending section below)
- Real favicon (was serving the generic default icon this whole time — fixed and verified)
- /admin dashboard — real users, real security (server-side auth + allowlist gate before any
  data fetch, verified with a real 307-redirect test). Needs SUPABASE_SERVICE_ROLE_KEY and
  ADMIN_EMAILS set in Vercel to actually show data.
- Login page resend cooldown (60s, matches Supabase's own default, disables the resend button
  with a live countdown instead of allowing spam-clicks)

## Important: git push access is NOT automatic across chats

This session's sandbox has a GitHub Personal Access Token already configured in its git
remote — that's the actual mechanism that lets code changes get pushed directly to GitHub,
not a general "Claude has GitHub access" capability. A brand-new chat starts with a
completely empty sandbox and has no way to inherit this. If a new chat says it can't push to
GitHub, that's not a bug — it genuinely doesn't have the credential. For real "just message
me and I'll push the fix" workflows going forward, Claude Code is the correct tool (keeps
persistent git credentials across sessions, not re-established per chat).

## Known architecture tradeoff — read this before touching the scanner

**There are two separate, independent copies of the core scanning tool**: one inline in
app/page.tsx (homepage), one in components/ScannerModal.tsx (shared by Dashboard/History/
Settings/Tracker via DashboardShell). This was a deliberate safety choice — extracting shared
state out of the homepage's already-working tool was judged too risky. Any change to core
scanner behavior (score display, rewrite, cover letter, interview prep) needs to be applied
to BOTH files identically, or they will drift. This has been checked for drift multiple times
and confirmed clean as of this writing, but it's a standing risk every time either file changes.

## Feature flags

`lib/featureFlags.ts` — `PAYWALL_ENABLED = false`. Free-tier download/copy gating exists in
the code (DownloadBar `locked` prop, interview Q&A copy buttons) but is switched off until
Razorpay is actually connected and Pro is purchasable. Flip this one constant to re-enable
all of it at once.

## Database migrations

All 10 files in supabase/migrations/ need to have been run in Supabase's SQL editor, in
order, 001 through 010. Migrations 008 and 009 are guarded to be safe to re-run if unsure
whether they were already applied.

## Current focus

**Deep reliability investigation** (in response to "everything seems broken" — treated as
a real signal, not dismissed). Found the actual root cause behind most of it: zero
Supabase calls anywhere in the app had timeout protection. A hanging (not erroring)
database call — a real possibility given Supabase is hosted in Seoul — would block a
request indefinitely, and critically, the existing "fail open on error" pattern in
checkCredits/checkAnonymousLimit never even saw it, since a hang never throws. This
almost certainly explains "inconsistent scanning, works sometimes" and "different errors
switching tabs" — checkCredits is shared across score, rewrite, cover letter, interview
prep, and both reviews, so one fix protects all of them. New lib/withTimeout.ts, proven
with a deliberately-hanging-promise test showing genuine fallback within a bounded time.

Also found and fixed three more real, specific bugs from the same investigation: an
anonymous user dismissing the sign-in prompt saw a misleading "Upgrade to Pro" message
(should say "sign in free," a different and correct ask); a real race condition where a
genuinely logged-in user acting fast enough right after a page load could be incorrectly
shown the sign-in gate, since `user` starts null until an async session check resolves;
and "purchase should unlock immediately" — the Dashboard never actually polled for the
webhook's async activation after a payment redirect, so it could show stale free-tier
status until a manual refresh.

Investigated but genuinely limited, not a bug to "fix" further: job-URL import for
most modern job boards (confirmed via direct testing) fails because they render content
client-side with JavaScript, which a plain server-side fetch fundamentally cannot see —
already gives a clear, honest error explaining this and recommending direct paste.
Solving this properly would need a headless-browser rendering service, a real, separate
infrastructure decision, not a quick fix.

**Real bug-fix batch from live testing** (post-launch): fixed raw technical errors leaking
to users (a shared friendlyErrorMessage/safeParseJson layer now used everywhere - directly
fixes the "Failed to parse AI response as JSON" and raw Google API 503 errors reaching the
screen verbatim), client-side file validation before upload (type + a real 4MB limit, since
Vercel's actual serverless body limit is a hard 4.5MB platform ceiling my own route's higher
check could never see past), a blank Interview Prep tab after dismissing the upgrade modal
(now a real persistent empty state), LinkedIn job-URL import returning navigation noise
instead of a job description (LinkedIn serves a login-walled page to unauthenticated
requests - now detected and refused with a clear message instead of silently returning
garbage), self-serve account deletion (typed-email-confirmation flow, cascading deletes
via the existing ON DELETE CASCADE foreign keys), and chatbot fixes (a real "Pro isn't
purchasable yet" stale claim, now correct; real clickable links to actual pages via a new
linkify layer). 196 tests now.

**Phase 5 (Revenue) is fully live, not just built.** Real Razorpay Subscriptions (Pro/
Enterprise via UPI Autopay), real credit top-ups (Razorpay Orders), Meta Pixel + CAPI
tracking, and a genuine conversion funnel (Score free to try, the tools that fix what
Score finds require a free account). Anurag completed the dashboard setup, tested both
purchase paths with real money end to end, and `PAYWALL_ENABLED` is now `true` in
production. One real bug was found and fixed from that live testing — a top-up webhook
that silently failed to credit an account while still reporting success, traced to a
missing database migration on the live project and two unchecked Supabase error results.

**Phase 3.1, the Chrome extension**: built, polished (v1.1.0), extended with real
features (v1.2.0 — in-popup scoring, LinkedIn detection). Still needs: a final
real-device pass on the newest features, a Chrome Web Store developer account, and
submission — none of that has happened yet.

**Phase 6 (Reliability)**: Sentry, tests, model pinning, and CI are done. Two items
still need Anurag directly: verifying a Supabase backup actually restores, and setting
up UptimeRobot.

**Open, not yet decided**: which direction comes next — Phase 7 (Growth & Distribution,
now actually justified since revenue exists), finishing the Chrome extension launch,
Phase 8 (Product Depth), or closing the loop on Meta CAPI verification (never explicitly
confirmed events are landing in Meta Events Manager). See ROADMAP.md for the full detail
on each.

## Phase 3/4 from the roadmap — all done

- 3.2: DONE. "Two things we refuse to fake" — a dedicated homepage section explicitly
  marketing the no-fabrication discipline and the real structural DOCX/PDF inspection,
  replacing what used to be one buried bullet in a data-privacy list.
- 3.3: Anonymous rate limiting — FIXED (was completely unmetered before, now a real per-IP
  daily budget via lib/anonymousLimit.ts). Reopened once, narrowly, when image/photo resume
  upload was added later and its Gemini Vision call wasn't covered — found and closed too.
- 4.1: Automated tests — 112 real tests across 13 files (Vitest). Full coverage now:
  lib/credits.ts and lib/anonymousLimit.ts (money-protecting logic), lib/formatCheck.ts
  (Cvly's real technical differentiator), lib/ai.ts (all 6 AI functions' prompt/parsing
  logic, including the truncated-JSON salvage recovery), and route-level integration tests
  for all 9 API routes (score, rewrite, cover-letter, interview-prep, linkedin-review,
  portfolio-review, chatbot, import-job, extract-text) — verifying the orchestration/wiring
  itself, not just the logic within each piece. Verified meaningful 8 separate times by
  deliberately breaking real code (a missing `return` that would have let an out-of-credits
  request reach a real billed AI call; a MIME type silently dropping out of a protected
  set; a removed auth check; a removed temperature setting; among others) and confirming
  the right test caught each one before reverting. `npm test` to run. Not covered:
  lib/resumeTemplate.ts and the internals of lib/importJob.ts (lower-risk, presentational/
  scraping logic, not money or security paths), and no UI/component-level tests exist yet.
  No CI gate running this automatically on every push yet (Phase II).
- 4.2: Error monitoring — DONE (code side). @sentry/nextjs installed and wired into all
  four runtimes (client, server, edge, instrumentation), plus app/global-error.tsx for
  React rendering crashes. Critically, every one of the 9 API routes explicitly calls
  Sentry.captureException() inside its catch block — automatic instrumentation alone
  would NOT have caught these, since every route already catches its own errors and
  returns a handled JSON response rather than letting them bubble up uncaught. Verified
  the dev server boots cleanly with the integration in place and the full 112-test suite
  still passes with the real @sentry/nextjs import in every route file. Still needs
  Anurag: create a free Sentry account + Next.js project, then set NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN in Vercel (see .env.local.example for
  where to find each one) — without these, Sentry.init() is a safe no-op and nothing is
  actually being reported yet.
- 4.3: DONE. Real confirmation dialogs on the only two one-click deletes that existed
  (History's saved checks, Tracker's saved applications) — Settings already had no
  self-serve delete button at all (handled honestly via email instead). Built one shared
  ConfirmDialog component rather than two one-off implementations, with specific,
  contextual messages (shows the actual score, or actual company/role, not a generic
  "are you sure?"). Also fixed a related issue found while in there: Tracker's delete
  did a fire-and-forget request with silently swallowed failures — a failed delete would
  leave the UI showing something gone that was still actually in the database. Now
  restores it if the request genuinely fails.
- 4.4: DONE. Real password fallback, added without disrupting the passwordless-first
  positioning. Settings has a new "Backup password" section (any user, however they
  signed in, can opt into setting one via supabase.auth.updateUser) — also fixed the
  Account card there, which hardcoded "Signed in with magic link" even for Google/
  LinkedIn users; now shows the real provider. Login page has a "Have a password set?
  Use it instead" toggle below the magic-link form — stays secondary/opt-in, magic link
  is still the default. Verified Supabase's Email provider supports password auth
  natively alongside magic link with zero extra dashboard configuration needed.
- 4.5: DONE. Pinned to gemini-3.5-flash, replacing the gemini-flash-latest alias.
  Verified this wasn't a theoretical risk before fixing it: per Google's own changelog,
  this exact alias silently repointed to gemini-3.5-flash on May 19, 2026, with zero
  code change on our end — confirming the alias had already changed underneath this
  build at least once already. Single point of change (lib/aiProviders.ts), shared by
  both text generation and the image-OCR vision calls. **Phase 4 (1 through 5) is now
  fully complete.**
- No real revenue path yet — Razorpay deferred, PAYWALL_ENABLED=false, so Pro/Enterprise
  aren't purchasable. This is the top business-level (not code-level) risk right now.

## Pending manual setup — waiting on Anurag, not on Claude

- **Cloudflare + DNS**: done by Anurag — needs a final "site loads correctly" confirmation
- **Resend**: account created, API key obtained — still needs wiring into Supabase's SMTP settings (see instructions given in chat)
- **Google OAuth**: app created, Client ID/Secret obtained — still needs pasting into Supabase → Authentication → Providers → Google, AND the code-side buttons are live (app/login/page.tsx)
- **LinkedIn OAuth**: app created, Client ID/Secret obtained — still needs pasting into Supabase → Authentication → Providers → LinkedIn (OIDC), code-side buttons are live
- **Admin dashboard**: needs SUPABASE_SERVICE_ROLE_KEY (Supabase -> Project Settings -> API
  -> service_role key) and ADMIN_EMAILS (comma-separated allowed emails) added in Vercel
- **Razorpay**: deliberately deferred, not started
- **Cloudflare Email Routing for support@cvly.in**: not yet confirmed done
- Supabase project ref for OAuth callback URLs: `qsiecjkkmzvwypyqskkr`
  (`https://qsiecjkkmzvwypyqskkr.supabase.co/auth/v1/callback`)
- WhatsApp number used in components/ShareButton.tsx's share-to-WhatsApp option — unconfirmed
- Phone/OTP sign-in: deliberately not pursued — no genuinely free option exists in India
  (DLT registration + per-SMS cost either way)

**Security note for whoever picks this up next**: real Google/LinkedIn/Resend credentials were
pasted directly into a claude.ai chat during setup. Recommended to rotate/regenerate all three
once confirmed working, since chat history isn't a secure place to store live secrets long-term.
