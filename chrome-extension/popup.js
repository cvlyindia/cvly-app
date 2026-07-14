const extractBtn = document.getElementById('extractBtn');
const extractLabel = document.getElementById('extractLabel');
const spinner = document.getElementById('spinner');
const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');
const openBtn = document.getElementById('openBtn');
const teaser = document.getElementById('teaser');
const scoreBtn = document.getElementById('scoreBtn');
const scoreResult = document.getElementById('scoreResult');
const scoreRingFill = document.getElementById('scoreRingFill');
const scoreNumber = document.getElementById('scoreNumber');
const scoreSummary = document.getElementById('scoreSummary');

const CVLY_ORIGIN = 'https://cvly.in';
const SCORE_RING_CIRCUMFERENCE = 201;

let extractedText = '';

// This function is injected into the ACTIVE TAB's page context via chrome.scripting.executeScript,
// not run in the popup itself — it must be fully self-contained (no references to anything outside
// itself), since it gets serialized and executed inside the page, not here.
function extractJobDescriptionFromPage() {
  function clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  // 1. Structured JobPosting schema — the same SEO metadata search engines read.
  // This works even on JS-heavy pages once they've rendered, since we're reading
  // the live DOM, not a raw server fetch.
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || '');
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const graph = candidate['@graph'] ? candidate['@graph'] : [candidate];
        const nodes = Array.isArray(graph) ? graph : [graph];
        for (const node of nodes) {
          if (node && node['@type'] === 'JobPosting' && node.description) {
            const div = document.createElement('div');
            div.innerHTML = node.description;
            const text = clean(div.textContent);
            if (text.length > 100) return { text: text.slice(0, 6000), source: 'structured' };
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  // 2. Fallback — look for the largest text block among common job-description
  // container patterns. Best-effort only, not guaranteed on every site.
  const selectors = [
    '[class*="job-desc" i]', '[class*="jobdescription" i]', '[id*="job-desc" i]',
    '[class*="description" i]', '[data-testid*="description" i]', 'article', 'main',
  ];
  let best = '';
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const t = clean(el.innerText);
      if (t.length > best.length) best = t;
    });
    if (best.length > 400) break;
  }

  if (best.length < 150) {
    return { text: '', source: 'failed' };
  }

  return { text: best.slice(0, 6000), source: 'text' };
}

function showStatus(kind, message) {
  statusEl.className = `status ${kind}`;
  statusEl.textContent = kind === 'good' ? '' : message;
  if (kind === 'good') {
    const check = document.createElement('span');
    check.className = 'check-icon';
    check.textContent = '✓ ';
    statusEl.appendChild(check);
    statusEl.appendChild(document.createTextNode(message));
  }
  // Force reflow so the pop-in animation retriggers even if this status kind
  // was already shown once — toggling a class off/on doesn't replay a CSS
  // animation without the browser recomputing styles in between.
  void statusEl.offsetWidth;
  statusEl.classList.add('show');
}

function setLoading(loading) {
  extractBtn.disabled = loading;
  spinner.style.display = loading ? 'inline-block' : 'none';
  extractLabel.textContent = loading ? 'Reading this page…' : 'Get job description from this page';
}

// A brief, paced sequence of loading messages — real extraction is often near-instant,
// but flashing straight from "click" to "done" reads as jarring, not fast. This gives
// the moment room to feel like something intelligent is actually happening, the same
// reasoning behind the typing indicator on the main site's chat widget.
const LOADING_STAGES = ['Reading this page…', 'Looking for the job details…', 'Almost there…'];
const MIN_LOADING_MS = 850;

function runLoadingSequence() {
  let stage = 0;
  extractLabel.textContent = LOADING_STAGES[0];
  const interval = setInterval(() => {
    stage = (stage + 1) % LOADING_STAGES.length;
    extractLabel.textContent = LOADING_STAGES[stage];
  }, 380);
  return () => clearInterval(interval);
}

// Checks login state and whether a resume is on file to score against. Deliberately
// fails silently (returns null) on ANY problem — network error, not logged in, CORS
// issue, whatever — since this is a bonus capability layered on top of extraction,
// which already works and must keep working even if this check can't complete.
async function checkExtensionContext() {
  try {
    const res = await fetch(`${CVLY_ORIGIN}/api/extension/context`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.loggedIn && data.resumeText) return data;
    return null;
  } catch {
    return null;
  }
}

async function scoreInstantly(resumeText, jobDescription) {
  const res = await fetch(`${CVLY_ORIGIN}/api/score`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescription }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Scoring failed');
  return data;
}

function renderScoreResult(result) {
  const score = Math.max(0, Math.min(100, result.score ?? 0));
  scoreNumber.textContent = String(score);
  scoreSummary.textContent = result.summary || '';
  scoreResult.classList.add('show');
  // Animate the ring fill on a slight delay so the transition is actually visible,
  // rather than snapping straight to its final value on the same frame it appears.
  scoreRingFill.style.transition = 'none';
  scoreRingFill.style.strokeDashoffset = String(SCORE_RING_CIRCUMFERENCE);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scoreRingFill.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      scoreRingFill.style.strokeDashoffset = String(SCORE_RING_CIRCUMFERENCE * (1 - score / 100));
    });
  });
}

extractBtn.addEventListener('click', async () => {
  statusEl.className = 'status';
  preview.className = 'preview';
  preview.style.display = 'none';
  openBtn.style.display = 'none';
  teaser.classList.remove('show');
  scoreBtn.style.display = 'none';
  scoreResult.classList.remove('show');
  setLoading(true);
  const stopLoadingSequence = runLoadingSequence();
  const startedAt = Date.now();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('Could not find the active tab.');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobDescriptionFromPage,
    });

    // Real extraction is often near-instant — pausing briefly here so the loading
    // sequence gets to actually play out reads as more trustworthy than an instant,
    // jarring flash from click to result.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
    }
    stopLoadingSequence();

    if (!result || !result.text) {
      showStatus('error', "Couldn't find a job description on this page — try copying it manually into Cvly instead.");
      return;
    }

    extractedText = result.text;
    preview.textContent = extractedText;
    preview.style.display = 'block';
    void preview.offsetWidth;
    preview.classList.add('show');

    if (result.source === 'structured') {
      showStatus('good', 'Found it — this looks like a clean extraction.');
    } else {
      showStatus('warn', "Grabbed the largest text block on the page — double check it's actually the job description before checking your resume.");
    }

    teaser.classList.add('show');
    openBtn.style.display = 'block';

    // Silent, best-effort check — never blocks or delays showing the proven
    // "Open in Cvly" path, which is already visible above by this point.
    checkExtensionContext().then((context) => {
      if (context) {
        scoreBtn.style.display = 'flex';
        scoreBtn.onclick = async () => {
          scoreBtn.disabled = true;
          scoreBtn.textContent = 'Scoring…';
          try {
            const result = await scoreInstantly(context.resumeText, extractedText);
            renderScoreResult(result);
            scoreBtn.style.display = 'none';
          } catch {
            showStatus('error', "Couldn't score instantly — you can still open it in Cvly instead.");
          } finally {
            scoreBtn.disabled = false;
            scoreBtn.textContent = '⚡ Score instantly with your last resume';
          }
        };
      }
    });
  } catch (err) {
    stopLoadingSequence();
    showStatus('error', 'Something went wrong reading this page. You can still paste the description directly into Cvly.');
  } finally {
    setLoading(false);
  }
});

openBtn.addEventListener('click', () => {
  if (!extractedText) return;
  const url = `https://cvly.in/?jd=${encodeURIComponent(extractedText)}`;
  chrome.tabs.create({ url });
});
