// The Razorpay integration code is built (real subscriptions, webhook handling,
// Meta CAPI Purchase tracking) — but this stays false until the Razorpay Dashboard
// setup is actually complete: Plans created (RAZORPAY_PLAN_ID_PRO_MONTHLY/YEARLY),
// webhook registered and RAZORPAY_WEBHOOK_SECRET set. Flipping this before that
// setup is done would lock free users out of downloads with no working way to
// actually pay — worse than the current state. Flip manually once a real test
// purchase has gone through cleanly end to end.
export const PAYWALL_ENABLED = false;
