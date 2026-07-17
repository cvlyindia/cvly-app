import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/razorpay', () => ({ getRazorpayClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { getRazorpayClient } from '@/lib/razorpay';
import { GET as getSubscription } from '@/app/api/billing/subscription/route';
import { POST as cancelSubscription } from '@/app/api/billing/cancel-subscription/route';

const mockCreateClient = vi.mocked(createClient);
const mockGetRazorpayClient = vi.mocked(getRazorpayClient);

function mockSupabaseWithUser(user: { id: string } | null, subscriptionRow: unknown = null) {
  const fakeSupabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: subscriptionRow, error: null }),
            }),
          }),
        }),
      }),
    }),
  };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/billing/subscription', () => {
  it('requires login', async () => {
    mockSupabaseWithUser(null);
    const res = await getSubscription();
    expect(res.status).toBe(401);
  });

  it('returns null when the user has no subscription at all', async () => {
    mockSupabaseWithUser({ id: 'user-1' }, null);
    const res = await getSubscription();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.subscription).toBeNull();
  });

  it('returns the real subscription row when one exists', async () => {
    mockSupabaseWithUser({ id: 'user-1' }, {
      razorpay_subscription_id: 'sub_123',
      plan: 'pro',
      status: 'active',
      current_end: '2026-08-17T00:00:00Z',
    });
    const res = await getSubscription();
    const body = await res.json();
    expect(body.subscription.plan).toBe('pro');
    expect(body.subscription.status).toBe('active');
  });
});

describe('POST /api/billing/cancel-subscription', () => {
  it('requires login', async () => {
    mockSupabaseWithUser(null);
    const res = await cancelSubscription();
    expect(res.status).toBe(401);
  });

  it('refuses to cancel when there is no active subscription', async () => {
    mockSupabaseWithUser({ id: 'user-1' }, null);
    const res = await cancelSubscription();
    expect(res.status).toBe(400);
  });

  it('refuses to cancel a subscription that is not currently active (e.g. already cancelled)', async () => {
    mockSupabaseWithUser({ id: 'user-1' }, { razorpay_subscription_id: 'sub_123', status: 'cancelled' });
    const res = await cancelSubscription();
    expect(res.status).toBe(400);
  });

  it('cancels at cycle end, not immediately — the actual customer-friendly behavior this depends on', async () => {
    mockSupabaseWithUser({ id: 'user-1' }, { razorpay_subscription_id: 'sub_123', status: 'active' });
    const mockCancel = vi.fn().mockResolvedValue({});
    mockGetRazorpayClient.mockReturnValue({ subscriptions: { cancel: mockCancel } } as unknown as ReturnType<typeof getRazorpayClient>);

    const res = await cancelSubscription();

    expect(res.status).toBe(200);
    expect(mockCancel).toHaveBeenCalledWith('sub_123', true);
  });

  it('returns a clean error if Razorpay itself fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' }, { razorpay_subscription_id: 'sub_123', status: 'active' });
    mockGetRazorpayClient.mockReturnValue({
      subscriptions: { cancel: vi.fn().mockRejectedValue(new Error('Razorpay unavailable')) },
    } as unknown as ReturnType<typeof getRazorpayClient>);

    const res = await cancelSubscription();
    expect(res.status).toBe(500);
  });
});
