import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/razorpay', () => ({ getRazorpayClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/razorpay';
import { POST } from '@/app/api/billing/create-order/route';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);
const mockGetRazorpayClient = vi.mocked(getRazorpayClient);

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function mockSupabaseWithUser(user: { id: string; email?: string } | null) {
  const fakeSupabase = { auth: { getUser: async () => ({ data: { user } }) } };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  insertSpy.mockResolvedValue({ data: null, error: null });
  mockCreateAdminClient.mockReturnValue({ from: () => ({ insert: insertSpy }) } as unknown as ReturnType<typeof createAdminClient>);
});

describe('POST /api/billing/create-order — the security-critical whitelist validation', () => {
  it('rejects a packId that does not match any real pack, before touching auth or Razorpay', async () => {
    const res = await POST(fakeRequest({ packId: 'not_a_real_pack' }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects an attempt to smuggle a custom price/credits object instead of a real packId — proves only server-side values are ever used', async () => {
    // Even if a tampered client sends what looks like a full pack object with an
    // attacker-chosen price, the route only ever looks up packId against the
    // server's own whitelist — everything else in the request body is ignored.
    // This specific request has a VALID packId ('small'), so it should succeed —
    // but using the real ₹49/20-credit values, not the attacker's numbers.
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    const mockOrderCreate = vi.fn().mockResolvedValue({ id: 'order_test123' });
    mockGetRazorpayClient.mockReturnValue({ orders: { create: mockOrderCreate } } as unknown as ReturnType<typeof getRazorpayClient>);

    await POST(fakeRequest({ packId: 'small', credits: 999999, priceRupees: 1 }));

    expect(mockOrderCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 4900, // the REAL price (₹49 in paise), never the attacker's ₹1
      notes: { user_id: 'user-1', credits: 20 }, // the REAL credit amount, never 999999
    }));
  });

  it('requires login', async () => {
    mockSupabaseWithUser(null);
    const res = await POST(fakeRequest({ packId: 'small' }));
    expect(res.status).toBe(401);
  });

  it('creates a real order at the correct whitelisted price and records the purchase attempt', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    const mockOrderCreate = vi.fn().mockResolvedValue({ id: 'order_abc' });
    mockGetRazorpayClient.mockReturnValue({ orders: { create: mockOrderCreate } } as unknown as ReturnType<typeof getRazorpayClient>);

    const res = await POST(fakeRequest({ packId: 'large' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.orderId).toBe('order_abc');
    expect(body.credits).toBe(150);
    expect(mockOrderCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 29900 })); // ₹299
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      razorpay_order_id: 'order_abc',
      credits_purchased: 150,
      amount_paise: 29900,
      status: 'created',
    }));
  });

  it('returns a clean error if Razorpay itself fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockGetRazorpayClient.mockReturnValue({
      orders: { create: vi.fn().mockRejectedValue(new Error('Razorpay unavailable')) },
    } as unknown as ReturnType<typeof getRazorpayClient>);

    const res = await POST(fakeRequest({ packId: 'medium' }));
    expect(res.status).toBe(500);
  });
});
