import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai', () => ({ rewriteResume: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));
vi.mock('@/lib/anonymousLimit', () => ({ checkAnonymousLimit: vi.fn(), logAnonymousUsage: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { rewriteResume } from '@/lib/ai';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';
import { POST } from '@/app/api/rewrite/route';

const mockCreateClient = vi.mocked(createClient);
const mockRewrite = vi.mocked(rewriteResume);
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

describe('POST /api/rewrite', () => {
  it('returns 400 with an incomplete body, touching nothing else', async () => {
    const res = await POST(fakeRequest({ resumeText: 'only this' }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('logged in with credits: rewrites and spends exactly one rewrite credit', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockRewrite.mockResolvedValue({ name: 'Jane', contact: '', summary: '', experience: [], education: [], skills: [] });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(200);
    expect(mockSpendCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'rewrite');
  });

  it('out of credits: blocks with 402 and never calls the AI', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: false, remaining: 0, plan: 'free', cost: 1, resetAt: '' });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(402);
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  it('never spends a credit if the AI call fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockRewrite.mockRejectedValue(new Error('AI failed'));

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(500);
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous: rewrites and logs anonymous usage, never spendCredits', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: true, ipHash: 'hash1', cost: 1 });
    mockRewrite.mockResolvedValue({ name: 'Jane', contact: '', summary: '', experience: [], education: [], skills: [] });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(200);
    expect(mockLogAnonymousUsage).toHaveBeenCalledWith(expect.anything(), 'hash1', 'rewrite');
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous over budget: blocks with 429, never calls the AI', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: false, ipHash: 'hash1', cost: 1 });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(429);
    expect(mockRewrite).not.toHaveBeenCalled();
  });
});
