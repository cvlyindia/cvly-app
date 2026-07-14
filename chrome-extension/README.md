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
