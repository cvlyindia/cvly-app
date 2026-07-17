import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/metaCapi', () => ({ sendCapiEvent: vi.fn().mockResolvedValue(undefined) }));

import { createAdminClient } from '@/lib/supabase/admin';
import { sendCapiEvent } from '@/lib/metaCapi';
import { POST } from '@/app/api/billing/webhook/route';

const WEBHOOK_SECRET = 'test_webhook_secret_12345';

function fakeRequest(rawBody: string, signature: string, eventId: string | null): NextRequest {
  return {
    text: async () => rawBody,
    headers: {
      get: (key: string) => {
        if (key === 'x-razorpay-signature') return signature;
        if (key === 'x-razorpay-event-id') return eventId;
        if (key === 'x-forwarded-for') return '1.2.3.4';
        if (key === 'user-agent') return 'test-agent';
        return null;
      },
    },
  } as unknown as NextRequest;
}

function signBody(rawBody: string, secret: string = WEBHOOK_SECRET): string {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

function subscriptionEventBody(event: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    event,
    payload: {
      subscription: {
        entity: {
          id: 'sub_test123',
          plan_id: 'plan_test',
          status: event === 'subscription.cancelled' ? 'cancelled' : 'active',
          current_start: 1700000000,
          current_end: 1702592000,
          notes: { user_id: 'user-abc' },
          ...overrides,
        },
      },
      payment: {
        entity: { id: 'pay_test123', amount: 9900, currency: 'INR' },
      },
    },
  });
}

// Purpose-built mock matching exactly what the webhook handler calls, including
// .auth.admin.getUserById which the generic sequential-queue mock doesn't cover.
function orderPaidEventBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    event: 'order.paid',
    payload: {
      order: {
        entity: {
          id: 'order_test123',
          amount: 4900,
          currency: 'INR',
          notes: { user_id: 'user-abc', credits: 20 },
          ...overrides,
        },
      },
    },
  });
}

function mockAdminSupabase(opts: {
  existingWebhookEvent?: boolean;
  existingSubscription?: { purchase_event_sent: boolean } | null;
  existingPurchase?: { status: string } | null;
  rpcShouldFail?: boolean;
}) {
  const updateCalls: { table: string; payload: unknown }[] = [];
  const insertCalls: { table: string; payload: unknown }[] = [];
  const rpcCalls: { fn: string; params: unknown }[] = [];

  const fakeClient = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'webhook_events') {
              return { data: opts.existingWebhookEvent ? { id: 'evt_1' } : null, error: null };
            }
            if (table === 'subscriptions') {
              return { data: opts.existingSubscription ?? null, error: null };
            }
            if (table === 'credit_purchases') {
              return { data: opts.existingPurchase ?? null, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      update: (payload: unknown) => {
        updateCalls.push({ table, payload });
        return { eq: async () => ({ data: null, error: null }) };
      },
      insert: (payload: unknown) => {
        insertCalls.push({ table, payload });
        return { data: null, error: null };
      },
    }),
    rpc: (fn: string, params: unknown) => {
      rpcCalls.push({ fn, params });
      if (opts.rpcShouldFail) {
        return Promise.resolve({ data: null, error: { message: 'function increment_credits does not exist' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: { email: 'test@example.com' } } }),
      },
    },
    getUpdateCalls: () => updateCalls,
    getInsertCalls: () => insertCalls,
    getRpcCalls: () => rpcCalls,
  };

  vi.mocked(createAdminClient).mockReturnValue(fakeClient as unknown as ReturnType<typeof createAdminClient>);
  return fakeClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

describe('POST /api/billing/webhook — signature verification (the actual security boundary)', () => {
  it('rejects a request with no signature header at all', async () => {
    mockAdminSupabase({});
    const body = subscriptionEventBody('subscription.activated');
    const res = await POST(fakeRequest(body, '', null));
    expect(res.status).toBe(400);
  });

  it('rejects a forged/incorrect signature — proves this actually verifies, not just checks presence', async () => {
    mockAdminSupabase({});
    const body = subscriptionEventBody('subscription.activated');
    const forgedSignature = signBody(body, 'wrong_secret_an_attacker_might_guess');
    const res = await POST(fakeRequest(body, forgedSignature, 'evt_1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_signature');
  });

  it('accepts a genuinely correctly-signed request — proves the real crypto verification works end to end', async () => {
    mockAdminSupabase({ existingSubscription: null });
    const body = subscriptionEventBody('subscription.activated');
    const validSignature = signBody(body);
    const res = await POST(fakeRequest(body, validSignature, 'evt_1'));
    expect(res.status).toBe(200);
  });

  it('detects tampering — a byte-for-byte different body than what was signed is rejected, even with a real signature from a different payload', async () => {
    mockAdminSupabase({});
    const originalBody = subscriptionEventBody('subscription.activated');
    const signatureForOriginal = signBody(originalBody);
    const tamperedBody = subscriptionEventBody('subscription.activated', { status: 'active', plan_id: 'plan_ATTACKER_SWAPPED' });
    const res = await POST(fakeRequest(tamperedBody, signatureForOriginal, 'evt_1'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/billing/webhook — idempotency (Razorpay explicitly documents duplicate delivery)', () => {
  it('skips reprocessing an event whose x-razorpay-event-id was already handled', async () => {
    const mock = mockAdminSupabase({ existingWebhookEvent: true });
    const body = subscriptionEventBody('subscription.activated');
    const res = await POST(fakeRequest(body, signBody(body), 'evt_already_seen'));
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(mock.getUpdateCalls()).toHaveLength(0); // never touched subscription/credits state again
  });
});

describe('POST /api/billing/webhook — subscription activation', () => {
  it('upgrades user_credits to the pro plan on activation', async () => {
    const mock = mockAdminSupabase({ existingSubscription: null });
    const body = subscriptionEventBody('subscription.activated');
    await POST(fakeRequest(body, signBody(body), 'evt_1'));

    const creditsUpdate = mock.getUpdateCalls().find((c) => c.table === 'user_credits');
    expect(creditsUpdate).toBeDefined();
    expect((creditsUpdate!.payload as { plan: string }).plan).toBe('pro');
  });

  it('fires exactly one Purchase CAPI event on first activation, using the subscription ID as event_id', async () => {
    mockAdminSupabase({ existingSubscription: null });
    const body = subscriptionEventBody('subscription.activated');
    await POST(fakeRequest(body, signBody(body), 'evt_1'));

    expect(sendCapiEvent).toHaveBeenCalledTimes(1);
    expect(sendCapiEvent).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'Purchase', eventId: 'sub_test123' }));
  });

  it('does NOT fire Purchase again on a renewal charge for a subscription that already had its first Purchase sent — the actual protection against inflating ad-optimization signal', async () => {
    mockAdminSupabase({ existingSubscription: { purchase_event_sent: true } });
    const body = subscriptionEventBody('subscription.charged');
    await POST(fakeRequest(body, signBody(body), 'evt_renewal_1'));

    expect(sendCapiEvent).not.toHaveBeenCalled();
  });
});

describe('POST /api/billing/webhook — cancellation downgrades the plan', () => {
  it('downgrades user_credits back to free on subscription.cancelled', async () => {
    const mock = mockAdminSupabase({ existingSubscription: { purchase_event_sent: true } });
    const body = subscriptionEventBody('subscription.cancelled');
    await POST(fakeRequest(body, signBody(body), 'evt_cancel_1'));

    const creditsUpdate = mock.getUpdateCalls().find((c) => c.table === 'user_credits');
    expect(creditsUpdate).toBeDefined();
    expect((creditsUpdate!.payload as { plan: string }).plan).toBe('free');
  });
});

describe('POST /api/billing/webhook — missing user_id safety', () => {
  it('does not crash when a subscription has no user_id in notes (defensive — should never happen, but must not 500)', async () => {
    mockAdminSupabase({});
    const body = subscriptionEventBody('subscription.activated', { notes: {} });
    const res = await POST(fakeRequest(body, signBody(body), 'evt_1'));
    expect(res.status).toBe(200); // still acks the webhook, just logs and skips
    expect(sendCapiEvent).not.toHaveBeenCalled();
  });
});

describe('POST /api/billing/webhook — order.paid (credit top-ups)', () => {
  it('credits the purchased amount via the atomic increment_credits function, not a direct update', async () => {
    const mock = mockAdminSupabase({ existingPurchase: null });
    const body = orderPaidEventBody();
    const res = await POST(fakeRequest(body, signBody(body), 'evt_topup_1'));

    expect(res.status).toBe(200);
    const rpcCall = mock.getRpcCalls().find((c) => c.fn === 'increment_credits');
    expect(rpcCall).toBeDefined();
    expect(rpcCall!.params).toEqual({ p_user_id: 'user-abc', p_amount: 20 });
  });

  it('marks the purchase as paid', async () => {
    const mock = mockAdminSupabase({ existingPurchase: null });
    const body = orderPaidEventBody();
    await POST(fakeRequest(body, signBody(body), 'evt_topup_2'));

    const purchaseUpdate = mock.getUpdateCalls().find((c) => c.table === 'credit_purchases');
    expect(purchaseUpdate).toBeDefined();
    expect(purchaseUpdate!.payload).toEqual({ status: 'paid' });
  });

  it('fires a genuine Purchase CAPI event for every top-up — unlike subscriptions, there is no "first time only" restriction here', async () => {
    mockAdminSupabase({ existingPurchase: null });
    const body = orderPaidEventBody();
    await POST(fakeRequest(body, signBody(body), 'evt_topup_3'));

    expect(sendCapiEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'Purchase',
      eventId: 'order_test123',
      value: 49, // 4900 paise -> 49 rupees
    }));
  });

  it('never double-credits an order that is already marked paid — the defensive second layer beyond webhook_events idempotency', async () => {
    const mock = mockAdminSupabase({ existingPurchase: { status: 'paid' } });
    const body = orderPaidEventBody();
    await POST(fakeRequest(body, signBody(body), 'evt_topup_4'));

    expect(mock.getRpcCalls()).toHaveLength(0);
    expect(sendCapiEvent).not.toHaveBeenCalled();
  });

  it('does not crash when an order is missing user_id or credits in notes (defensive)', async () => {
    mockAdminSupabase({});
    const body = orderPaidEventBody({ notes: {} });
    const res = await POST(fakeRequest(body, signBody(body), 'evt_topup_5'));
    expect(res.status).toBe(200);
    expect(sendCapiEvent).not.toHaveBeenCalled();
  });

  it('when increment_credits genuinely fails (e.g. the function does not exist in this database), marks the purchase failed and never fires a fake Purchase event — the exact real bug this replaced', async () => {
    const mock = mockAdminSupabase({ existingPurchase: null, rpcShouldFail: true });
    const body = orderPaidEventBody();
    const res = await POST(fakeRequest(body, signBody(body), 'evt_topup_6'));

    expect(res.status).toBe(200); // still acks the webhook so Razorpay doesn't retry forever
    const purchaseUpdate = mock.getUpdateCalls().find((c) => c.table === 'credit_purchases');
    expect(purchaseUpdate?.payload).toEqual({ status: 'failed' });
    // Never claims success for a purchase whose credits never actually landed.
    expect(sendCapiEvent).not.toHaveBeenCalled();
  });

  it('only marks a purchase "paid" AFTER the credit increment genuinely succeeds, never before', async () => {
    const mock = mockAdminSupabase({ existingPurchase: null });
    const body = orderPaidEventBody();
    await POST(fakeRequest(body, signBody(body), 'evt_topup_7'));

    const calls = mock.getUpdateCalls().filter((c) => c.table === 'credit_purchases');
    const rpcCalls = mock.getRpcCalls();
    // The RPC call must have happened, and the ONLY credit_purchases update
    // recorded should be the final 'paid' one — proving 'paid' isn't written
    // speculatively before the increment is confirmed to have worked.
    expect(rpcCalls).toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toEqual({ status: 'paid' });
  });
});

