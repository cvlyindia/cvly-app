import crypto from 'crypto';
import * as Sentry from '@sentry/nextjs';

const GRAPH_API_VERSION = 'v21.0';

/**
 * Meta requires em/ph/external_id to be normalized (lowercase, trimmed) and
 * SHA-256 hashed before sending — sending plaintext PII would violate Meta's
 * own data-use policy. fbp/fbc/IP/user-agent must NOT be hashed — they're
 * Meta's own session identifiers, not user PII, and hashing them breaks
 * Meta's ability to match a server event back to the browser session it
 * came from.
 */
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export interface CapiUserData {
  email?: string;
  userId?: string; // hashed into external_id
  ip?: string;
  userAgent?: string;
  fbp?: string; // raw _fbp cookie value, never hashed
  fbc?: string; // raw _fbc cookie value, never hashed
}

export interface CapiEventInput {
  eventName: 'PageView' | 'Lead' | 'CompleteRegistration' | 'InitiateCheckout' | 'Purchase';
  eventId: string; // MUST exactly match the Pixel's eventID for this same action, or dedup fails
  eventSourceUrl?: string;
  user: CapiUserData;
  value?: number;
  currency?: string; // ISO 4217, e.g. 'INR'
}

/**
 * Sends one event to Meta's Conversions API. Deliberately never throws —
 * this is a marketing/attribution side-effect, not core business logic.
 * A Meta outage or a bad token must never be able to break a real checkout
 * or a real resume scan. Failures are logged to Sentry (so they're visible
 * and fixable) but always swallowed here.
 */
export async function sendCapiEvent(input: CapiEventInput): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    // Not configured — a safe no-op, same pattern as Sentry's DSN check.
    return;
  }

  const userData: Record<string, string | string[]> = {};
  if (input.user.email) userData.em = [sha256(input.user.email)];
  if (input.user.userId) userData.external_id = [sha256(input.user.userId)];
  if (input.user.ip) userData.client_ip_address = input.user.ip;
  if (input.user.userAgent) userData.client_user_agent = input.user.userAgent;
  if (input.user.fbp) userData.fbp = input.user.fbp;
  if (input.user.fbc) userData.fbc = input.user.fbc;

  const eventPayload: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    user_data: userData,
  };
  if (input.eventSourceUrl) eventPayload.event_source_url = input.eventSourceUrl;
  if (input.value !== undefined || input.currency) {
    eventPayload.custom_data = {
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
    };
  }

  const body: Record<string, unknown> = { data: [eventPayload], access_token: accessToken };
  // Optional — set META_TEST_EVENT_CODE temporarily while verifying in Events
  // Manager's Test Events tab, remove once confirmed working so real events
  // don't keep routing to test mode.
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      Sentry.captureMessage(`Meta CAPI event failed: ${input.eventName}`, {
        level: 'warning',
        extra: { status: res.status, body: errText },
      });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { context: 'meta-capi' } });
  }
}

/** Reads client IP the same way lib/anonymousLimit.ts does, for consistency. */
export function getClientIpForCapi(req: Request): string | undefined {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? undefined;
}
