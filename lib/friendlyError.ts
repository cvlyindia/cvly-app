/**
 * Turns any caught error into a message that's actually safe and useful to show a
 * user. Several distinct-looking bugs — "Failed to parse AI response as JSON",
 * a raw "[GoogleGenerativeAI Error]: ... 503 Service Unavailable", an
 * "Unexpected token" from trying to parse a non-JSON response — are all really
 * the same underlying problem: internal error text reaching the screen verbatim.
 * This is the one place that stops that, used everywhere an error gets shown.
 */
export function friendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  if (/service unavailable|high demand|503|overloaded|rate limit|429/i.test(raw)) {
    return 'Our AI provider is experiencing high demand right now. Please try again in a minute.';
  }
  if (/unexpected token|is not valid json|failed to parse/i.test(raw)) {
    return 'Something went wrong generating your results. Please try again — if it keeps happening, try a shorter resume or job description.';
  }
  if (/payload too large|request entity too large|413/i.test(raw)) {
    return 'That file is too large. Please keep uploads under 4MB.';
  }
  if (/network|fetch failed|failed to fetch/i.test(raw)) {
    return 'Couldn\'t reach the server — check your connection and try again.';
  }

  // Deliberately not falling through to the raw message here. An error that
  // doesn't match a known pattern is exactly the case most likely to be an
  // internal detail (an API name, a stack fragment, a provider's own wording)
  // that shouldn't reach the screen at all.
  return 'Something went wrong. Please try again.';
}

/** Safely parses a fetch Response as JSON, returning null instead of throwing
 * if the body isn't valid JSON at all — e.g. a platform-level rejection
 * (like Vercel's 413 for an oversized request) that returns plain text, which
 * a bare res.json() call would otherwise throw a confusing parse error on. */
export async function safeParseJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
