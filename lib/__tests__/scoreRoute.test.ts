import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai', () => ({ scoreResume: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));
vi.mock('@/lib/anonymousLimit', () => ({ checkAnonymousLimit: vi.fn(), logAnonymousUsage: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { scoreResume } from '@/lib/ai';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';
import { POST } from '@/app/api/score/route';

const mockCreateClient = vi.mocked(createClient);
const mockScoreResume = vi.mocked(scoreResume);
const mockCheckCredits = vi.mocked(checkCredits);
const mockSpendCredits = vi.mocked(spendCredits);
const mockCheckAnonymousLimit = vi.mocked(checkAnonymousLimit);
const mockLogAnonymousUsage = vi.mocked(logAnonymousUsage);

function fakeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: () => null },
  } as unknown as NextRequest;
}

function mockSupabaseWithUser(user: { id: string } | null) {
  const fakeSupabase = { auth: { getUser: async () => ({ data: { user } }) } };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
  return fakeSupabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/score — input validation', () => {
  it('returns 400 and never touches auth, credits, or the AI when the body is incomplete', async () => {
    const res = await POST(fakeRequest({ resumeText: 'only this' }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockScoreResume).not.toHaveBeenCalled();
  });
});

describe('POST /api/score — logged-in path', () => {
  it('scores and spends exactly one credit on a real success', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockScoreResume.mockResolvedValue({ score: 80, matchedKeywords: [], missingKeywords: [], summary: '', improvements: [] });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(200);
    expect(mockSpendCredits).toHaveBeenCalledTimes(1);
    expect(mockSpendCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'score');
    expect(mockLogAnonymousUsage).not.toHaveBeenCalled();
  });

  it('passes priority=true for a Pro user — the actual thing that makes Priority Processing real, not just marketing copy', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 50, plan: 'pro', cost: 1, resetAt: '' });
    mockScoreResume.mockResolvedValue({ score: 80, matchedKeywords: [], missingKeywords: [], summary: '', improvements: [] });

    await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(mockScoreResume).toHaveBeenCalledWith('resume', 'jd', true);
  });

  it('passes priority=true for an Enterprise user too, not just Pro specifically', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 500, plan: 'enterprise', cost: 1, resetAt: '' });
    mockScoreResume.mockResolvedValue({ score: 80, matchedKeywords: [], missingKeywords: [], summary: '', improvements: [] });

    await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(mockScoreResume).toHaveBeenCalledWith('resume', 'jd', true);
  });

  it('passes priority=false for a free-plan user — the racing behavior is genuinely Pro-exclusive', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockScoreResume.mockResolvedValue({ score: 80, matchedKeywords: [], missingKeywords: [], summary: '', improvements: [] });

    await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(mockScoreResume).toHaveBeenCalledWith('resume', 'jd', false);
  });

  it('blocks with 402 when out of credits, and — critically — never calls the AI at all', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: false, remaining: 0, plan: 'free', cost: 1, resetAt: '2026-01-01' });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('out_of_credits');
    // This is the actual money-protecting invariant: a blocked request must never
    // reach the AI call, or the credit check is pointless — checking cost without
    // enforcing it before spending real money is worse than not checking at all.
    expect(mockScoreResume).not.toHaveBeenCalled();
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('never spends a credit if the AI call itself fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockScoreResume.mockRejectedValue(new Error('All AI providers failed'));

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(500);
    // The actual invariant: don't charge someone for a generation that never happened.
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('still spends the credit when the AI correctly flags garbage input — the real cost was incurred either way', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockScoreResume.mockResolvedValue({ invalid: true, reason: "That's a shopping list, not a resume." });

    const res = await POST(fakeRequest({ resumeText: 'milk, eggs, bread', jobDescription: 'jd' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.invalid).toBe(true);
    expect(mockSpendCredits).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/score — anonymous path', () => {
  it('scores and logs anonymous usage (never spendCredits) for a signed-out visitor', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: true, ipHash: 'abc123', cost: 1 });
    mockScoreResume.mockResolvedValue({ score: 50, matchedKeywords: [], missingKeywords: [], summary: '', improvements: [] });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(200);
    expect(mockLogAnonymousUsage).toHaveBeenCalledWith(expect.anything(), 'abc123', 'score');
    expect(mockSpendCredits).not.toHaveBeenCalled();
    expect(mockScoreResume).toHaveBeenCalledWith('resume', 'jd', false);
  });

  it('blocks with 429 when the anonymous daily budget is exhausted, without calling the AI', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: false, ipHash: 'abc123', cost: 1 });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(429);
    expect(mockScoreResume).not.toHaveBeenCalled();
  });
});
