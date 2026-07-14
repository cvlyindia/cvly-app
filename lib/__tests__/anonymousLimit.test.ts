import { describe, it, expect } from 'vitest';
import { checkAnonymousLimit, getClientIp } from '@/lib/anonymousLimit';
import { createMockSupabase } from './mockSupabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

function fakeRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: { get: (key: string) => headers[key] ?? null },
  } as unknown as NextRequest;
}

describe('getClientIp', () => {
  it('reads the real IP from x-forwarded-for, the header Vercel actually sets and protects from spoofing', () => {
    const req = fakeRequest({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
    expect(getClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip if x-forwarded-for is absent', () => {
    const req = fakeRequest({ 'x-real-ip': '198.51.100.9' });
    expect(getClientIp(req)).toBe('198.51.100.9');
  });

  it('falls back to a safe default if neither header exists, rather than crashing', () => {
    const req = fakeRequest({});
    expect(getClientIp(req)).toBe('unknown');
  });
});

describe('checkAnonymousLimit — the fix for the biggest cost-exposure risk found in this build', () => {
  it('allows the request when cumulative usage plus the new cost is within the daily budget', async () => {
    const mock = createMockSupabase([{ data: [{ cost: 3 }, { cost: 2 }], error: null }]); // 5 spent already
    const req = fakeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const result = await checkAnonymousLimit(mock as unknown as SupabaseClient, req, 'score'); // +1
    expect(result.allowed).toBe(true); // 5 + 1 = 6, under the 10 budget
  });

  it('blocks the request once cumulative usage plus the new cost would exceed the daily budget — this is the actual protection', async () => {
    const mock = createMockSupabase([{ data: [{ cost: 5 }, { cost: 4 }], error: null }]); // 9 spent already
    const req = fakeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const result = await checkAnonymousLimit(mock as unknown as SupabaseClient, req, 'interview'); // +3
    expect(result.allowed).toBe(false); // 9 + 3 = 12, over the 10 budget
  });

  it('allows exactly at the boundary — spent + cost equal to the budget is still allowed, one more is not', async () => {
    const mockAtBoundary = createMockSupabase([{ data: [{ cost: 9 }], error: null }]);
    const req = fakeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const atBoundary = await checkAnonymousLimit(mockAtBoundary as unknown as SupabaseClient, req, 'score'); // +1 = 10
    expect(atBoundary.allowed).toBe(true);

    const mockOverBoundary = createMockSupabase([{ data: [{ cost: 10 }], error: null }]);
    const overBoundary = await checkAnonymousLimit(mockOverBoundary as unknown as SupabaseClient, req, 'score'); // +1 = 11
    expect(overBoundary.allowed).toBe(false);
  });

  it('allows a brand new IP with zero prior usage', async () => {
    const mock = createMockSupabase([{ data: [], error: null }]);
    const req = fakeRequest({ 'x-forwarded-for': '9.9.9.9' });
    const result = await checkAnonymousLimit(mock as unknown as SupabaseClient, req, 'interview');
    expect(result.allowed).toBe(true);
  });

  it('fails open on a database error rather than blocking a real visitor for our own infra hiccup', async () => {
    const mock = createMockSupabase([{ data: null, error: 'connection failed' }]);
    const req = fakeRequest({ 'x-forwarded-for': '1.2.3.4' });
    const result = await checkAnonymousLimit(mock as unknown as SupabaseClient, req, 'score');
    expect(result.allowed).toBe(true);
  });

  it('hashes the same IP identically every time — required for the daily-usage lookup to actually find prior usage', async () => {
    const mock1 = createMockSupabase([{ data: [], error: null }]);
    const mock2 = createMockSupabase([{ data: [], error: null }]);
    const req = fakeRequest({ 'x-forwarded-for': '5.5.5.5' });
    const result1 = await checkAnonymousLimit(mock1 as unknown as SupabaseClient, req, 'score');
    const result2 = await checkAnonymousLimit(mock2 as unknown as SupabaseClient, req, 'score');
    expect(result1.ipHash).toBe(result2.ipHash);
  });

  it('never stores the raw IP — the hash must not simply equal the plaintext address', async () => {
    const mock = createMockSupabase([{ data: [], error: null }]);
    const req = fakeRequest({ 'x-forwarded-for': '5.5.5.5' });
    const result = await checkAnonymousLimit(mock as unknown as SupabaseClient, req, 'score');
    expect(result.ipHash).not.toBe('5.5.5.5');
    expect(result.ipHash).toHaveLength(64); // sha256 hex digest length
  });
});
