// The Chrome extension calls cvly.in's API directly from its popup, which is a
// cross-origin request (chrome-extension://... calling https://cvly.in). That needs
// explicit CORS permission, and specifically NOT a wildcard — Access-Control-Allow-Origin
// can't be "*" when credentials (cookies) are involved, browsers reject that combination
// outright. So this reflects back a specific, allowlisted extension origin instead.
//
// ALLOWED_EXTENSION_IDS should be set in Vercel as a comma-separated list. While the
// extension is unpublished, this is the temporary ID Chrome assigns to an unpacked local
// load (visible on chrome://extensions once loaded). Once published to the Web Store,
// Chrome assigns a new, permanent ID — that one needs to be added here too, or requests
// from the real published extension will be silently rejected by CORS.

function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_EXTENSION_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => `chrome-extension://${id}`);
}

export function getExtensionCorsHeaders(requestOrigin: string | null): Record<string, string> | null {
  if (!requestOrigin) return null;
  const allowed = getAllowedOrigins();
  if (!allowed.includes(requestOrigin)) return null;

  return {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
