/**
 * Turns any caught error into a message that's actually safe and useful to show a
 * user. Several distinct-looking bugs — "Failed to parse AI response as JSON",
 * a raw "[GoogleGenerativeAI Error]: ... 503 Service Unavailable", an
 * "Unexpected token" from trying to parse a non-JSON response — are all really
 * the same underlying problem: internal error text reaching the screen verbatim.
 * This is the one place that stops that, used everywhere an error gets shown.
 *
 * IMPORTANT: this must not hide messages that are already safe. Every route in
 * this app already throws clean, specific, user-facing text in most cases (e.g.
 * "LinkedIn requires sign-in to show full job details..." or "That file is too
 * large"). An earlier version of this function defaulted to a generic fallback
 * for anything that didn't match a known BAD pattern, which had the exact wrong
 * effect: it silently replaced those already-good messages with a useless
 * generic one. The fix is to only intercept messages that actually look like a
 * raw technical leak, and pass everything else through unchanged.
 */
export function friendlyErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!raw) return 'Something went wrong. Please try again.';

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

  // Looks like a raw technical leak that doesn't match a specific pattern above
  // (an SDK's own error format, a stack-trace fragment, an unusually long/dense
  // message) — hide it behind a generic message rather than risk showing it.
  const looksRaw = /\[\w+Error\]|at \w+ \(|node_modules|TypeError:|ReferenceError:/.test(raw) || raw.length > 200;
  if (looksRaw) {
    return 'Something went wrong. Please try again.';
  }

  // Everything else is passed through as-is. By this point nothing matched a
  // known-bad pattern and the message doesn't look like a raw technical leak —
  // this is almost always one of this app's own deliberately-written, already
  // safe, specific messages, and hiding it would make the app less helpful,
  // not more safe.
  return raw;
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
