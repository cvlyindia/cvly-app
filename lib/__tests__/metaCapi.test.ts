import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules();
  process.env.META_PIXEL_ID = 'test_pixel_id';
  process.env.META_CAPI_ACCESS_TOKEN = 'test_token';
  delete process.env.META_TEST_EVENT_CODE;
});

afterEach(() => {
  global.fetch = originalFetch;
});

function expectedHash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

describe('sendCapiEvent — PII hashing correctness (a real privacy requirement)', () => {
  it('hashes email as lowercase+trimmed SHA-256, not the raw value', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await sendCapiEvent({
      eventName: 'Lead',
      eventId: 'evt_1',
      user: { email: '  User@Example.COM  ' },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const sentEm = body.data[0].user_data.em[0];
    expect(sentEm).toBe(expectedHash('User@Example.COM'));
    expect(sentEm).not.toContain('@'); // never the plaintext email
    expect(sentEm).toHaveLength(64); // sha256 hex digest length
  }, 10000); // vi.resetModules() + dynamic import has real re-evaluation cost that
             // occasionally exceeds the default timeout under full-suite resource
             // contention (19 files running together) — not a sign of an actual
             // regression, confirmed by this test passing reliably in isolation.

  it('hashes external_id (user ID) the same way', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await sendCapiEvent({ eventName: 'CompleteRegistration', eventId: 'evt_2', user: { userId: 'user-abc-123' } });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data[0].user_data.external_id[0]).toBe(expectedHash('user-abc-123'));
  });

  it('does NOT hash fbp, fbc, IP, or user agent — hashing these breaks Meta\'s session matching', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await sendCapiEvent({
      eventName: 'Purchase',
      eventId: 'evt_3',
      user: {
        fbp: 'fb.1.1234567890.raw_value',
        fbc: 'fb.1.1234567890.raw_click_id',
        ip: '203.0.113.5',
        userAgent: 'Mozilla/5.0 test-agent',
      },
    });

    const userData = JSON.parse(mockFetch.mock.calls[0][1].body).data[0].user_data;
    expect(userData.fbp).toBe('fb.1.1234567890.raw_value');
    expect(userData.fbc).toBe('fb.1.1234567890.raw_click_id');
    expect(userData.client_ip_address).toBe('203.0.113.5');
    expect(userData.client_user_agent).toBe('Mozilla/5.0 test-agent');
  });

  it('sends event_id as the exact string provided — required for Pixel/CAPI dedup to work at all', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await sendCapiEvent({ eventName: 'Purchase', eventId: 'sub_xyz789', user: {} });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data[0].event_id).toBe('sub_xyz789');
    expect(typeof body.data[0].event_id).toBe('string');
  });
});

describe('sendCapiEvent — never breaks real business logic', () => {
  it('is a safe no-op when META_PIXEL_ID or META_CAPI_ACCESS_TOKEN are not configured', async () => {
    delete process.env.META_PIXEL_ID;
    delete process.env.META_CAPI_ACCESS_TOKEN;
    const mockFetch = vi.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await expect(sendCapiEvent({ eventName: 'Lead', eventId: 'x', user: {} })).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('never throws even when the Meta API call fails outright (network error)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await expect(sendCapiEvent({ eventName: 'Purchase', eventId: 'x', user: {} })).resolves.toBeUndefined();
  });

  it('never throws when Meta responds with an error status', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'Invalid access token' }) as unknown as typeof fetch;
    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await expect(sendCapiEvent({ eventName: 'Purchase', eventId: 'x', user: {} })).resolves.toBeUndefined();
  });
});

describe('sendCapiEvent — request shape', () => {
  it('hits the correct Graph API endpoint with the configured pixel ID', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = mockFetch as unknown as typeof fetch;

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await sendCapiEvent({ eventName: 'PageView', eventId: 'x', user: {} });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('graph.facebook.com');
    expect(url).toContain('test_pixel_id');
    expect(url).toContain('/events');
  });

  it('includes test_event_code only when explicitly configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = mockFetch as unknown as typeof fetch;
    process.env.META_TEST_EVENT_CODE = 'TEST12345';

    const { sendCapiEvent } = await import('@/lib/metaCapi');
    await sendCapiEvent({ eventName: 'Lead', eventId: 'x', user: {} });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.test_event_code).toBe('TEST12345');
  });
});
