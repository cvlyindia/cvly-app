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

## NOT yet built — Phase 3/4 from the roadmap

- 3.2: "We don't fabricate numbers" isn't explicitly marketed anywhere, even though it's true
- 3.3: No real anonymous-user rate limiting on the main scan tool (only the chatbot has this)
- 4.1: Zero automated tests exist — every check in this whole build has been manual
- 4.2: No error monitoring (Sentry or similar) — production is currently a black box
- 4.3: No delete confirmation dialogs anywhere
- 4.4: No password-login fallback — magic-link only
- 4.5: Gemini model is an unpinned `gemini-flash-latest` alias

## Pending manual setup — waiting on Anurag, not on Claude

- **Razorpay**: business KYC in progress (this is the long pole — start it early)
- **Resend**: for transactional email (fixes Supabase's 2-emails/hour magic-link limit)
- **Cloudflare + support@cvly.in**: DNS migration from GoDaddy to Cloudflare, then Email
  Routing for support@cvly.in, then Gmail "send mail as" using Resend's SMTP once that exists
- **Google OAuth**: Google Auth Platform app + client ID/secret, then paste into Supabase
- **LinkedIn OAuth**: LinkedIn Developer app (OIDC product) + client ID/secret, then Supabase
- Supabase project ref for OAuth callback URLs: `qsiecjkkmzvwypyqskkr`
  (`https://qsiecjkkmzvwypyqskkr.supabase.co/auth/v1/callback`)
- WhatsApp number used in components/ShareButton.tsx's share-to-WhatsApp option — unconfirmed
- Phone/OTP sign-in: deliberately not pursued — no genuinely free option exists in India
  (DLT registration + per-SMS cost either way)
