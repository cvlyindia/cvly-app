import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai', () => ({ reviewLinkedInProfile: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { reviewLinkedInProfile } from '@/lib/ai';
import { checkCredits, spendCredits } from '@/lib/credits';
import { POST } from '@/app/api/linkedin-review/route';

const mockCreateClient = vi.mocked(createClient);
const mockReview = vi.mocked(reviewLinkedInProfile);
const mockCheckCredits = vi.mocked(checkCredits);
const mockSpendCredits = vi.mocked(spendCredits);

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

function mockSupabaseWithUser(user: { id: string } | null) {
  const fakeSupabase = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({ insert: insertSpy }),
  };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  insertSpy.mockResolvedValue({ data: null, error: null });
});

describe('POST /api/linkedin-review', () => {
  it('returns 400 for profile text under the minimum length, before ever checking auth', async () => {
    const res = await POST(fakeRequest({ profileText: 'too short' }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 401 when not logged in — the actual thing that makes this route different from score/rewrite/cover-letter, which all allow anonymous use', async () => {
    mockSupabaseWithUser(null);
    const res = await POST(fakeRequest({ profileText: 'a'.repeat(60) }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe('not_logged_in');
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('logged in with credits: reviews, spends one linkedin credit, and saves the result to career_reviews', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockReview.mockResolvedValue({ score: 70, summary: 'Decent.', strengths: [], improvements: [] });

    const res = await POST(fakeRequest({ profileText: 'a'.repeat(60) }));

    expect(res.status).toBe(200);
    expect(mockSpendCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'linkedin');
    expect(insertSpy).toHaveBeenCalledTimes(1);
    expect(insertSpy.mock.calls[0][0]).toMatchObject({ user_id: 'user-1', type: 'linkedin', score: 70 });
  });

  it('out of credits: blocks with 402 and never calls the AI', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: false, remaining: 0, plan: 'free', cost: 1, resetAt: '' });

    const res = await POST(fakeRequest({ profileText: 'a'.repeat(60) }));

    expect(res.status).toBe(402);
    expect(mockReview).not.toHaveBeenCalled();
  });

  it('never spends a credit or saves a review if the AI call fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockReview.mockRejectedValue(new Error('AI failed'));

    const res = await POST(fakeRequest({ profileText: 'a'.repeat(60) }));

    expect(res.status).toBe(500);
    expect(mockSpendCredits).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
