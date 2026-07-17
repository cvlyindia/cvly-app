import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { POST } from '@/app/api/account/delete/route';

const mockCreateClient = vi.mocked(createClient);
const mockCreateAdminClient = vi.mocked(createAdminClient);

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function mockSupabaseWithUser(user: { id: string; email?: string } | null) {
  const fakeSupabase = { auth: { getUser: async () => ({ data: { user } }) } };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteUser.mockResolvedValue({ error: null });
  mockCreateAdminClient.mockReturnValue({ auth: { admin: { deleteUser: mockDeleteUser } } } as unknown as ReturnType<typeof createAdminClient>);
});

describe('POST /api/account/delete', () => {
  it('requires login', async () => {
    mockSupabaseWithUser(null);
    const res = await POST(fakeRequest({ confirmEmail: 'anything' }));
    expect(res.status).toBe(401);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('blocks deletion when the confirmation email does not match the account email — the actual safety check this feature depends on', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    const res = await POST(fakeRequest({ confirmEmail: 'someone-else@example.com' }));
    expect(res.status).toBe(400);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('blocks deletion when no confirmation email is provided at all', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('matches case-insensitively, since email casing is not meaningful here', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'Jane@Example.com' });
    const res = await POST(fakeRequest({ confirmEmail: 'jane@example.com' }));
    expect(res.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
  });

  it('deletes the auth user on a genuine confirmed match — cascading deletes handle the rest via ON DELETE CASCADE, no extra table cleanup needed here', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    const res = await POST(fakeRequest({ confirmEmail: 'jane@example.com' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(mockDeleteUser).toHaveBeenCalledWith('user-1');
  });

  it('returns a clean error if the admin deletion call itself fails', async () => {
    mockSupabaseWithUser({ id: 'user-1', email: 'jane@example.com' });
    mockDeleteUser.mockResolvedValue({ error: { message: 'Supabase admin API unavailable' } });

    const res = await POST(fakeRequest({ confirmEmail: 'jane@example.com' }));
    expect(res.status).toBe(500);
  });
});
