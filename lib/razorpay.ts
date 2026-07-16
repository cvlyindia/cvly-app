import Razorpay from 'razorpay';

let client: Razorpay | null = null;

/**
 * Lazily-constructed singleton. Not instantiated at module load time so that
 * missing env vars fail loudly at the point of actual use (a real checkout
 * attempt), not silently break every route that happens to import this file.
 */
export function getRazorpayClient(): Razorpay {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured — missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

/** Plan IDs are created once in the Razorpay Dashboard (Subscriptions -> Plans),
 * then referenced here by env var — never hardcoded, since they differ between
 * test and live mode and Anurag may add more plans later without a code change. */
export function getPlanId(plan: 'pro', cycle: 'monthly' | 'yearly'): string {
  const key = `RAZORPAY_PLAN_ID_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  const planId = process.env[key];
  if (!planId) {
    throw new Error(`Missing ${key} — create this plan in the Razorpay Dashboard first`);
  }
  return planId;
}
