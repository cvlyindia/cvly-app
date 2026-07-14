import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai', () => ({ generateInterviewPrep: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));
vi.mock('@/lib/anonymousLimit', () => ({ checkAnonymousLimit: vi.fn(), logAnonymousUsage: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { generateInterviewPrep } from '@/lib/ai';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';
import { POST } from '@/app/api/interview-prep/route';

const mockCreateClient = vi.mocked(createClient);
const mockGenerate = vi.mocked(generateInterviewPrep);
const mockCheckCredits = vi.mocked(checkCredits);
const mockSpendCredits = vi.mocked(spendCredits);
const mockCheckAnonymousLimit = vi.mocked(checkAnonymousLimit);
const mockLogAnonymousUsage = vi.mocked(logAnonymousUsage);

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body, headers: { get: () => null } } as unknown as NextRequest;
}

function mockSupabaseWithUser(user: { id: string } | null) {
  const fakeSupabase = { auth: { getUser: async () => ({ data: { user } }) } };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/interview-prep', () => {
  it('returns 400 with an incomplete body', async () => {
    const res = await POST(fakeRequest({ resumeText: 'only this' }));
    expect(res.status).toBe(400);
  });

  it('uses the correct "interview" action for both the credit check and the spend — not copy-pasted from a sibling route', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 10, plan: 'free', cost: 3, resetAt: '' });
    mockGenerate.mockResolvedValue([]);

    await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(mockCheckCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'interview');
    expect(mockSpendCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'interview');
  });

  it('out of credits: blocks with 402 and never calls the AI (the heaviest, most expensive call to guard)', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: false, remaining: 2, plan: 'free', cost: 3, resetAt: '' });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(402);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('never spends a credit if generation fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 10, plan: 'free', cost: 3, resetAt: '' });
    mockGenerate.mockRejectedValue(new Error('AI failed'));

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(500);
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous: generates and logs anonymous usage with the correct action, never spendCredits', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: true, ipHash: 'hash1', cost: 3 });
    mockGenerate.mockResolvedValue([]);

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(200);
    expect(mockCheckAnonymousLimit).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'interview');
    expect(mockLogAnonymousUsage).toHaveBeenCalledWith(expect.anything(), 'hash1', 'interview');
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous over budget: blocks with 429, never calls the AI', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: false, ipHash: 'hash1', cost: 3 });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
