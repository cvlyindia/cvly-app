import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/aiProviders', () => ({ generateWithFallback: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { generateWithFallback } from '@/lib/aiProviders';
import { POST } from '@/app/api/chatbot/route';

const mockCreateClient = vi.mocked(createClient);
const mockGenerate = vi.mocked(generateWithFallback);

function fakeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? '1.2.3.4' : null) },
  } as unknown as NextRequest;
}

const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

function mockSupabaseWithUsageCount(count: number | null, countError: unknown = null) {
  const fakeSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ count, error: countError }),
        }),
      }),
      insert: insertSpy,
    }),
  };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  insertSpy.mockResolvedValue({ data: null, error: null });
});

describe('POST /api/chatbot — validation', () => {
  it('returns 400 for an empty message', async () => {
    const res = await POST(fakeRequest({ message: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for a message over 500 characters, before touching the AI', async () => {
    const res = await POST(fakeRequest({ message: 'a'.repeat(501) }));
    expect(res.status).toBe(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('POST /api/chatbot — rate limiting', () => {
  it('blocks with 429 once the hourly limit (15) is reached, never calling the AI', async () => {
    mockSupabaseWithUsageCount(15);
    const res = await POST(fakeRequest({ message: 'What is Cvly?' }));
    expect(res.status).toBe(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('allows the request when under the limit', async () => {
    mockSupabaseWithUsageCount(3);
    mockGenerate.mockResolvedValue('Cvly is a resume tool.');
    const res = await POST(fakeRequest({ message: 'What is Cvly?' }));
    expect(res.status).toBe(200);
  });

  it('fails open (never blocks a real visitor) if the usage-count query itself errors', async () => {
    mockSupabaseWithUsageCount(null, 'connection failed');
    mockGenerate.mockResolvedValue('Cvly is a resume tool.');
    const res = await POST(fakeRequest({ message: 'What is Cvly?' }));
    expect(res.status).toBe(200);
  });

  it('logs usage only after a real success, not on a failed AI call', async () => {
    mockSupabaseWithUsageCount(3);
    mockGenerate.mockRejectedValue(new Error('AI failed'));
    const res = await POST(fakeRequest({ message: 'What is Cvly?' }));
    expect(res.status).toBe(500);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/chatbot — the temperature and conversation-memory fix from a few sessions back', () => {
  it('uses a low temperature specifically, to make the off-topic redirect template reliable rather than improvised', async () => {
    mockSupabaseWithUsageCount(0);
    mockGenerate.mockResolvedValue('Cvly is a resume tool.');
    await POST(fakeRequest({ message: 'What is Cvly?' }));
    const optionsSent = mockGenerate.mock.calls[0][1];
    expect(optionsSent?.temperature).toBe(0.3);
  });

  it('includes prior conversation history in the prompt when provided, so a follow-up question has real context', async () => {
    mockSupabaseWithUsageCount(0);
    mockGenerate.mockResolvedValue('Pro is 100 credits a day.');
    await POST(fakeRequest({
      message: 'and how much does that cost?',
      history: [{ role: 'user', text: 'What is the Pro plan?' }, { role: 'bot', text: 'Pro gives you more daily credits.' }],
    }));
    const promptSent = mockGenerate.mock.calls[0][0];
    expect(promptSent).toContain('What is the Pro plan?');
    expect(promptSent).toContain('and how much does that cost?');
  });

  it('caps history to the last 6 exchanges rather than letting the prompt grow unbounded', async () => {
    mockSupabaseWithUsageCount(0);
    mockGenerate.mockResolvedValue('answer');
    const longHistory = Array.from({ length: 20 }, (_, i) => ({ role: 'user', text: `MESSAGE_MARKER_${i}` }));
    await POST(fakeRequest({ message: 'latest question', history: longHistory }));
    const promptSent = mockGenerate.mock.calls[0][0];
    // Only the last 6 should survive — the earliest ones should not appear in the prompt at all.
    expect(promptSent).not.toContain('MESSAGE_MARKER_0');
    expect(promptSent).toContain('MESSAGE_MARKER_19');
  });
});
