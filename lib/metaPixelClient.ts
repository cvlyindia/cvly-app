'use client';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Pixel event with an explicit event ID. The eventID here MUST be the
 * exact same string later sent as event_id in the matching server-side CAPI
 * call, or Meta cannot deduplicate the two and will count the conversion
 * twice — this is the single most common mistake in Pixel+CAPI setups.
 */
export function trackPixelEvent(
  eventName: 'Lead' | 'CompleteRegistration' | 'InitiateCheckout' | 'Purchase',
  eventId: string,
  params?: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, params ?? {}, { eventID: eventId });
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** _fbp is set by the Pixel script itself; _fbc is set when a visitor arrives
 * via a Meta ad click (fbclid in the URL). Neither exists until the Pixel
 * has loaded, so callers should tolerate undefined here. */
export function getMetaCookies(): { fbp?: string; fbc?: string } {
  return { fbp: readCookie('_fbp'), fbc: readCookie('_fbc') };
}
