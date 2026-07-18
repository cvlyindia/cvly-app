import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/tracker/route';

const mockCreateClient = vi.mocked(createClient);

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function mockSupabase(opts: {
  user: { id: string } | null;
  scanLookupResult?: { id: string } | null;
  insertResult?: { data: unknown; error: unknown };
  jobs?: unknown[];
}) {
  const insertSpy = vi.fn().mockReturnValue({
    select: () => ({
      single: async () => opts.insertResult ?? { data: { id: 'job-1' }, error: null },
    }),
  });

  const fakeSupabase = {
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from: (table: string) => {
      if (table === 'scans') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: opts.scanLookupResult ?? null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'saved_jobs') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: opts.jobs ?? [], error: null }),
            }),
          }),
          insert: insertSpy,
        };
      }
      return {};
    },
    getInsertSpy: () => insertSpy,
  };

  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
  return fakeSupabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/tracker', () => {
  it('requires login', async () => {
    mockSupabase({ user: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the user\'s saved jobs', async () => {
    mockSupabase({ user: { id: 'user-1' }, jobs: [{ id: 'job-1', company: 'Acme' }] });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.jobs).toHaveLength(1);
  });
});

describe('POST /api/tracker', () => {
  it('requires login', async () => {
    mockSupabase({ user: null });
    const res = await POST(fakeRequest({ company: 'Acme', role: 'Engineer' }));
    expect(res.status).toBe(401);
  });

  it('requires both company and role', async () => {
    mockSupabase({ user: { id: 'user-1' } });
    const res = await POST(fakeRequest({ company: 'Acme' }));
    expect(res.status).toBe(400);
  });

  it('saves a job with no scanId — the existing, unchanged baseline behavior', async () => {
    const mock = mockSupabase({ user: { id: 'user-1' } });
    const res = await POST(fakeRequest({ company: 'Acme', role: 'Engineer' }));
    expect(res.status).toBe(200);
    expect(mock.getInsertSpy()).toHaveBeenCalledWith(expect.objectContaining({ scan_id: null }));
  });

  it('links a real scan that genuinely belongs to this user', async () => {
    const mock = mockSupabase({ user: { id: 'user-1' }, scanLookupResult: { id: 'scan-1' } });
    const res = await POST(fakeRequest({ company: 'Acme', role: 'Engineer', scanId: 'scan-1' }));
    expect(res.status).toBe(200);
    expect(mock.getInsertSpy()).toHaveBeenCalledWith(expect.objectContaining({ scan_id: 'scan-1' }));
  });

  it('does NOT link a scanId that does not belong to this user — the actual security check, not blind trust of client input', async () => {
    // The lookup is scoped to user_id too, so a scan belonging to someone else
    // (or a scan ID that doesn't exist at all) simply returns nothing.
    const mock = mockSupabase({ user: { id: 'user-1' }, scanLookupResult: null });
    const res = await POST(fakeRequest({ company: 'Acme', role: 'Engineer', scanId: 'someone-elses-scan' }));
    expect(res.status).toBe(200); // the job still saves, just without the (unverified) link
    expect(mock.getInsertSpy()).toHaveBeenCalledWith(expect.objectContaining({ scan_id: null }));
  });
});
