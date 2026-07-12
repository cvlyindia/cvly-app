export interface JobImportResult {
  description: string;
  source: 'structured' | 'text';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Looks for schema.org JobPosting structured data embedded in the page's own HTML —
 * the same machine-readable data search engines read for job listing SEO. This is
 * publicly published metadata, not an authenticated or scraped data source, and it's
 * far more reliable than trying to guess at visible page layout.
 */
function extractJobPostingSchema(html: string): string | null {
  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const graph = candidate['@graph'] ?? [candidate];
        for (const node of Array.isArray(graph) ? graph : [graph]) {
          if (node['@type'] === 'JobPosting' && node.description) {
            return stripHtml(String(node.description));
          }
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function importJobFromUrl(url: string): Promise<JobImportResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('That doesn\'t look like a valid URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https links are supported.');
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CvlyBot/1.0; +https://cvly.in)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Couldn't reach that page (${res.status}).`);
  }

  const html = await res.text();

  const structured = extractJobPostingSchema(html);
  if (structured && structured.length > 100) {
    return { description: structured, source: 'structured' };
  }

  // Fall back to generic visible text — best-effort only. Many job boards render
  // content client-side with JavaScript, which a plain server-side fetch can't see,
  // so this will sometimes come back too short or empty. That's a real limitation,
  // not a bug — the caller should tell the user to paste the description directly
  // when that happens, not pretend it worked.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const text = stripHtml(bodyMatch ? bodyMatch[1] : html);

  if (text.length < 150) {
    throw new Error('Couldn\'t pull enough text from that page — it may need a login, or load content with JavaScript we can\'t see. Paste the description directly instead.');
  }

  // Generic pages often carry a lot of nav/footer noise; cap length so we're not
  // sending an entire page's boilerplate into the JD field.
  return { description: text.slice(0, 6000), source: 'text' };
}
