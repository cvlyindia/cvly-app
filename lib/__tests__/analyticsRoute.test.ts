import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/analytics/route';

const mockCreateClient = vi.mocked(createClient);

function mockSupabase(opts: {
  user: { id: string } | null;
  plan?: string;
  scans?: { score: number; created_at: string }[];
  jobs?: { status: string }[];
}) {
  const fakeSupabase = {
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from: (table: string) => {
      if (table === 'user_credits') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan: opts.plan ?? 'free' }, error: null }) }) }) };
      }
      if (table === 'scans') {
        return { select: () => ({ eq: () => ({ order: async () => ({ data: opts.scans ?? [], error: null }) }) }) };
      }
      if (table === 'saved_jobs') {
        return { select: () => ({ eq: async () => ({ data: opts.jobs ?? [], error: null }) }) };
      }
      return {};
    },
  };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/analytics', () => {
  it('requires login', async () => {
    mockSupabase({ user: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('requires Pro — a free user is blocked even with real scan/job data', async () => {
    mockSupabase({ user: { id: 'user-1' }, plan: 'free', scans: [{ score: 80, created_at: '2026-01-01' }] });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(402);
    expect(body.error).toBe('requires_pro');
  });

  it('allows Enterprise too, not just Pro specifically', async () => {
    mockSupabase({ user: { id: 'user-1' }, plan: 'enterprise', scans: [], jobs: [] });
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('returns real score history in order for a Pro user', async () => {
    mockSupabase({
      user: { id: 'user-1' },
      plan: 'pro',
      scans: [{ score: 60, created_at: '2026-01-01' }, { score: 85, created_at: '2026-02-01' }],
      jobs: [],
    });
    const res = await GET();
    const body = await res.json();
    expect(body.scoreHistory).toEqual([
      { date: '2026-01-01', score: 60 },
      { date: '2026-02-01', score: 85 },
    ]);
  });

  it('counts the funnel cumulatively — a job at "interview" counts toward "applied" too, the actual logic that makes conversion rates meaningful', async () => {
    mockSupabase({
      user: { id: 'user-1' },
      plan: 'pro',
      scans: [],
      jobs: [
        { status: 'saved' },
        { status: 'applied' },
        { status: 'interview' }, // implies applied too
        { status: 'offer' },     // implies applied AND interview too
      ],
    });
    const res = await GET();
    const body = await res.json();
    expect(body.funnel).toEqual({
      saved: 4,      // every job started as saved
      applied: 3,    // applied, interview, offer all passed through this stage
      interview: 2,  // interview, offer
      offer: 1,      // offer only
    });
  });

  it('handles zero jobs and zero scans gracefully, not as an error', async () => {
    mockSupabase({ user: { id: 'user-1' }, plan: 'pro', scans: [], jobs: [] });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.funnel).toEqual({ saved: 0, applied: 0, interview: 0, offer: 0 });
    expect(body.scoreHistory).toEqual([]);
  });
});
