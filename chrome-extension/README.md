# Cvly Chrome Extension — v1

## What this does (and deliberately doesn't do)

Click the extension icon on any job posting page → it reads the page and pulls out the job
description → click "Open in Cvly" → your browser opens cvly.in with that description already
filled in, ready to check against your resume.

It does **not** log you in, score anything, or talk to Cvly's servers directly. All of that
still happens on cvly.in itself, exactly as it does today — the extension's only job is getting
the job description out of whatever page you're looking at and into the tool. This was a
deliberate choice: it avoids needing a second login flow inside the extension, avoids needing
to open Cvly's API to cross-origin requests from a `chrome-extension://` origin, and means
nothing about how the actual scoring/credits/auth system works had to change.

## How extraction works

1. **First choice**: looks for `JobPosting` structured data embedded in the page — the same
   SEO metadata search engines read. Most major job boards publish this. Because this runs
   as a real content script inside your actual browser tab, it sees the page *after*
   JavaScript has rendered it — which is genuinely more reliable than the website's own
   "paste a job link" feature, since that fetches the raw HTML server-side and can't see
   anything JavaScript adds afterward.
2. **Fallback**: if there's no structured data, it grabs the largest visible text block from
   common description containers on the page. This is best-effort and won't be perfect on
   every site — the popup tells you honestly when it's using this fallback so you know to
   double-check the extracted text before relying on it.
3. **If neither works**: it says so plainly and suggests copying the description manually.

Verified with simulated DOM tests before shipping (structured-schema extraction, fallback
text extraction, and graceful failure on a page with no real content) — all three passed.
What I could **not** test from this sandbox: an actual Chrome browser loading and running
this extension for real, on a real job board. That needs your hands, not mine.

## How to load it for testing (you'll need to do this — I can't)

1. Open Chrome, go to `chrome://extensions`
2. Turn on **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder from this repo
5. The Cvly icon should appear in your toolbar (you may need to click the puzzle-piece icon
   and pin it)
6. Go to any real job posting (try a few different sites — LinkedIn, Naukri, a company careers
   page) and click the extension icon
7. Click "Get job description from this page," check what it extracted, then "Open in Cvly"
   and confirm it lands on cvly.in with the description pre-filled in the tool

## New: LinkedIn profile review, detected automatically (v1.2.0)

The extension now detects when you're on a LinkedIn profile page (any `linkedin.com/in/...`
URL) and switches modes automatically — instead of "get job description," it offers
"read this profile," then an instant review using the same in-popup flow as job scoring.

Since LinkedIn review always requires a signed-in account (no anonymous path exists for
it on the website either), if you're not logged in when reviewing a profile, the button
becomes "Sign in to Cvly →" instead of failing silently.

**Honest limitation**: LinkedIn's page is React-rendered and lazy-loads sections as you
scroll — this grabs whatever's actually visible in the DOM at the moment you click, not
guaranteed to include Experience or Skills if you haven't scrolled down to them yet. The
extension says so directly rather than pretending it captured everything.

## New: instant in-popup scoring (v1.2.0)

If you're logged into Cvly in the same browser, and you have at least one prior scan
saved, the extension now offers a second option after extracting a job description:
**"Score instantly with your last resume"** — scores it right in the popup, using
your most recent resume, without ever leaving the job posting or opening a new tab.

**This needs one manual setup step before it'll work**: the extension calls cvly.in's
API directly, which requires the specific extension ID to be allowlisted server-side
(a real security boundary — arbitrary extensions can't be allowed to make authenticated
requests using your cookies). To set it up:

1. Load the extension (see below), then go to `chrome://extensions`
2. Find "Cvly — Job Match Checker", copy the ID shown underneath it
3. Add it as `ALLOWED_EXTENSION_IDS` in Vercel's environment variables (see
   `.env.local.example` for the exact format)
4. Redeploy

**If this isn't set up, or if anything about the in-popup scoring fails for any
reason**, the extension falls back to the original "Open in Cvly" flow automatically
and silently — this is a bonus capability layered on top of what already works, not
a replacement for it.

## Known limitations, stated plainly

- Sites that require login to view the job description (some LinkedIn postings behind a
  login wall) won't work — the extension only sees what your browser can see, same as you.
- The fallback text extraction is genuinely best-effort. It will sometimes grab more than
  just the job description (nearby "similar jobs" text, benefits blurbs, etc.) — that's why
  the popup shows you a preview before handing off, so you can bail out and paste manually
  if it looks wrong.
- Not yet published to the Chrome Web Store — this is a locally-loaded developer build for
  testing. Publishing requires a Chrome Web Store developer account ($5 one-time fee), store
  listing assets, and a review process that typically takes a few days.

## Chrome Web Store listing copy — ready to paste in when you submit

**Short description** (132 char limit, this is 117 — verified with an exact character count,
not eyeballed):
> Pull a job description off any posting with one click and check it against your resume on
> Cvly. Free, no signup wall.

**Detailed description:**
> Job hunting means opening dozens of tabs, copying descriptions by hand, and losing track of
> which one you were checking. Cvly's extension skips the copy-paste: click it on any job
> posting, and it pulls out the description automatically — then hands it straight to Cvly to
> check against your resume.
>
> What you get on Cvly, free, no card required: a real ATS match score, a rewritten resume in
> a proper downloadable format, a tailored cover letter, and 100 interview questions with
> answers grounded in your actual experience — not generic AI filler.
>
> The extension itself does one thing: reads the current page only when you click it (never
> in the background), and only sends anything anywhere once you choose to open it in Cvly.
> No login required to use the extension. No data collected beyond what you explicitly send.

**Category**: Productivity
**Privacy policy URL**: https://cvly.in/privacy (the "Chrome extension" section covers this
specifically, added for exactly this submission requirement)

## Before publishing to the Web Store

- [x] Add a proper privacy policy page — done, see the "Chrome extension" section at
      cvly.in/privacy, added specifically for this requirement
- [x] Listing copy written and character-counted — see above
- [ ] Test on at least Naukri, LinkedIn, and Indeed with real job postings — still needs a
      real device, this is the one thing that can't be done from a sandbox
- [ ] Create a Chrome Web Store developer account ($5 one-time) at
      chrome.google.com/webstore/devconsole
- [ ] Capture screenshots for the listing (1280x800 or 640x400) showing the popup in action
      on a real job posting — needs the real-device testing pass to happen first
- [ ] Consider a "Copy instead" button for when extraction fails, so there's always a
      working path forward — not yet built, flagged as a possible follow-up
