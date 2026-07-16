import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai', () => ({ generateInterviewPrep: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { generateInterviewPrep } from '@/lib/ai';
import { checkCredits, spendCredits } from '@/lib/credits';
import { POST } from '@/app/api/interview-prep/route';

const mockCreateClient = vi.mocked(createClient);
const mockGenerate = vi.mocked(generateInterviewPrep);
const mockCheckCredits = vi.mocked(checkCredits);
const mockSpendCredits = vi.mocked(spendCredits);

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

  it('requires login — Interview Prep is one of the tools gated behind a free account, no anonymous path exists', async () => {
    mockSupabaseWithUser(null);
    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBe('not_logged_in');
    expect(mockGenerate).not.toHaveBeenCalled();
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
});
