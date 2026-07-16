import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/razorpay', () => ({ getRazorpayClient: vi.fn(), getPlanId: vi.fn() }));
vi.mock('@/lib/metaCapi', () => ({ sendCapiEvent: vi.fn().mockResolvedValue(undefined), getClientIpForCapi: vi.fn().mockReturnValue('1.2.3.4') }));

import { createClient } from '@/lib/supabase/server';
import { getRazorpayClient, getPlanId } from '@/lib/razorpay';
import { sendCapiEvent } from '@/lib/metaCapi';
import { POST } from '@/app/api/billing/create-subscription/route';

const mockCreateClient = vi.mocked(createClient);
const mockGetRazorpayClient = vi.mocked(getRazorpayClient);
const mockGetPlanId = vi.mocked(getPlanId);

function fakeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: (key: string) => (key === 'referer' ? 'https://cvly.in/pricing' : key === 'user-agent' ? 'test-agent' : null) },
  } as unknown as NextRequest;
}

function mockSupabaseWithUser(user: { id: string; email?: string } | null) {
  const fakeSupabase = { auth: { getUser: async () => ({ data: { user } }) } };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPlanId.mockReturnValue('plan_test123');
});

describe('POST /api/billing/create-subscription', () => {
  it('rejects an invalid billing cycle before touching auth or Razorpay', async () => {
    const res = await POST(fakeRequest({ cycle: 'weekly' }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('requires login — no anonymous subscription creation path exists', async () => {
    mockSupabaseWithUser(null);
    const res = await POST(fakeRequest({ cycle: 'monthly' }));
    expect(res.status).toBe(401);
  });

  it('creates a real subscription with the user_id in notes, so the webhook can later identify whose subscription this is', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    const mockCreate = vi.fn().mockResolvedValue({ id: 'sub_new123' });
    mockGetRazorpayClient.mockReturnValue({ subscriptions: { create: mockCreate } } as unknown as ReturnType<typeof getRazorpayClient>);

    const res = await POST(fakeRequest({ cycle: 'monthly' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscriptionId).toBe('sub_new123');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      plan_id: 'plan_test123',
      notes: { user_id: 'user-1' },
    }));
  });

  it('fires InitiateCheckout using the new subscription ID as event_id — this must match what the client fires at the same moment', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    mockGetRazorpayClient.mockReturnValue({
      subscriptions: { create: vi.fn().mockResolvedValue({ id: 'sub_abc999' }) },
    } as unknown as ReturnType<typeof getRazorpayClient>);

    await POST(fakeRequest({ cycle: 'yearly' }));

    expect(sendCapiEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'InitiateCheckout',
      eventId: 'sub_abc999',
    }));
  });

  it('returns a clean error if Razorpay itself fails, rather than a raw stack trace', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockGetRazorpayClient.mockReturnValue({
      subscriptions: { create: vi.fn().mockRejectedValue(new Error('Razorpay API unavailable')) },
    } as unknown as ReturnType<typeof getRazorpayClient>);

    const res = await POST(fakeRequest({ cycle: 'monthly' }));
    expect(res.status).toBe(500);
  });
});
