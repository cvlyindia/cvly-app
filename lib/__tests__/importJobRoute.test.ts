import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/importJob', () => ({ importJobFromUrl: vi.fn() }));

import { importJobFromUrl } from '@/lib/importJob';
import { POST } from '@/app/api/import-job/route';

const mockImport = vi.mocked(importJobFromUrl);

function fakeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/import-job', () => {
  it('returns 400 with no URL, never calling the importer', async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('returns 400 if the URL field is not actually a string', async () => {
    const res = await POST(fakeRequest({ url: 12345 }));
    expect(res.status).toBe(400);
  });

  it('passes the URL through to the importer and returns its result on success', async () => {
    mockImport.mockResolvedValue({ description: 'Senior Engineer role...', source: 'structured' });
    const res = await POST(fakeRequest({ url: 'https://example.com/job/123' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockImport).toHaveBeenCalledWith('https://example.com/job/123');
    expect(body.description).toBe('Senior Engineer role...');
  });

  it('returns a 400 with the real error message when the importer fails, rather than a generic 500', async () => {
    mockImport.mockRejectedValue(new Error("Couldn't find a job description on that page"));
    const res = await POST(fakeRequest({ url: 'https://example.com/not-a-job' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Couldn't find a job description on that page");
  });
});
