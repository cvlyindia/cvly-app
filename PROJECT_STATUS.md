# Cvly — Project Status

Last updated: July 2026. This file exists so any future session — a new chat, Claude Code,
or anyone else picking this up — has a real written reference instead of needing this whole
conversation history re-explained. Update it when something material changes.

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

Closing out the original Phase 1-4 roadmap before starting anything new. The one item still
open: **Phase 3.1, the Chrome extension** — built, handoff mechanism re-verified working after
all subsequent homepage changes, privacy policy and Web Store listing copy now written. Still
needs: real multi-site testing on an actual device (Naukri/LinkedIn/Indeed), a Chrome Web Store
developer account, and submission. See chrome-extension/README.md for the exact checklist.

Once that's closed, next work moves to **ROADMAP.md — Phase II**, a distinct, later chapter
(revenue, reliability, growth, product depth, operations), not a renumbering of Phase 1-4.

## NOT yet built — Phase 3/4 from the roadmap

- 3.2: "We don't fabricate numbers" isn't explicitly marketed anywhere, even though it's true
- 3.3: Anonymous rate limiting — FIXED (was completely unmetered before, now a real per-IP
  daily budget via lib/anonymousLimit.ts). Reopened once, narrowly, when image/photo resume
  upload was added later and its Gemini Vision call wasn't covered — found and closed too.
- 4.1: Automated tests — 40 real tests now (Vitest). Covers lib/credits.ts and
  lib/anonymousLimit.ts (the money-protecting logic) plus lib/formatCheck.ts (Cvly's real
  technical differentiator — structural DOCX/PDF inspection). Verified meaningful, not
  decorative: deliberately broke the source code 4 separate times across both sessions
  (credit boundary check, the floor-at-zero protection, the anonymous budget boundary, the
  table-detection regex) and confirmed each was caught before reverting. `npm test` to run.
  Still needs: the AI routes themselves, a CI gate running this on every push (Phase II).
- 4.2: No error monitoring (Sentry or similar) — production is currently a black box
- 4.3: No delete confirmation dialogs anywhere
- 4.4: No password-login fallback — magic-link + Google + LinkedIn only
- 4.5: Gemini model is an unpinned `gemini-flash-latest` alias
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
