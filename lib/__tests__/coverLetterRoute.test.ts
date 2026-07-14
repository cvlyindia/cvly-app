import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/ai', () => ({ generateCoverLetter: vi.fn() }));
vi.mock('@/lib/credits', () => ({ checkCredits: vi.fn(), spendCredits: vi.fn() }));
vi.mock('@/lib/anonymousLimit', () => ({ checkAnonymousLimit: vi.fn(), logAnonymousUsage: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { generateCoverLetter } from '@/lib/ai';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';
import { POST } from '@/app/api/cover-letter/route';

const mockCreateClient = vi.mocked(createClient);
const mockGenerate = vi.mocked(generateCoverLetter);
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

describe('POST /api/cover-letter', () => {
  it('returns 400 with an incomplete body', async () => {
    const res = await POST(fakeRequest({ jobDescription: 'only this' }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('logged in with credits: generates and spends exactly one cover credit, returning the raw letter text', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockGenerate.mockResolvedValue('Dear Hiring Team, ...');

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.letter).toBe('Dear Hiring Team, ...');
    expect(mockSpendCredits).toHaveBeenCalledWith(expect.anything(), 'user-1', 'cover');
  });

  it('out of credits: blocks with 402 and never calls the AI', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: false, remaining: 0, plan: 'free', cost: 1, resetAt: '' });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(402);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('never spends a credit if generation fails', async () => {
    mockSupabaseWithUser({ id: 'user-1' });
    mockCheckCredits.mockResolvedValue({ allowed: true, remaining: 5, plan: 'free', cost: 1, resetAt: '' });
    mockGenerate.mockRejectedValue(new Error('AI failed'));

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(500);
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous: generates and logs anonymous usage, never spendCredits', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: true, ipHash: 'hash1', cost: 1 });
    mockGenerate.mockResolvedValue('Dear Hiring Team, ...');

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(200);
    expect(mockLogAnonymousUsage).toHaveBeenCalledWith(expect.anything(), 'hash1', 'cover');
    expect(mockSpendCredits).not.toHaveBeenCalled();
  });

  it('anonymous over budget: blocks with 429, never calls the AI', async () => {
    mockSupabaseWithUser(null);
    mockCheckAnonymousLimit.mockResolvedValue({ allowed: false, ipHash: 'hash1', cost: 1 });

    const res = await POST(fakeRequest({ resumeText: 'resume', jobDescription: 'jd' }));

    expect(res.status).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
