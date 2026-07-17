import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importJobFromUrl } from '@/lib/importJob';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

function mockHtmlResponse(html: string, ok = true, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok,
    status,
    text: async () => html,
  });
}

describe('importJobFromUrl — input validation', () => {
  it('rejects an invalid URL before ever fetching', async () => {
    await expect(importJobFromUrl('not a url')).rejects.toThrow('valid URL');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-http(s) protocol', async () => {
    await expect(importJobFromUrl('ftp://example.com/job')).rejects.toThrow('http/https');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('importJobFromUrl — structured JobPosting schema (the good path)', () => {
  it('extracts real structured data when a page provides valid JobPosting schema', async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@type': 'JobPosting',
      description: 'We are looking for a Senior Backend Engineer with 5+ years of experience in distributed systems, Python, and PostgreSQL. Remote-friendly, competitive salary.',
    })}</script></head><body>irrelevant nav noise here</body></html>`;
    mockHtmlResponse(html);

    const result = await importJobFromUrl('https://example.com/jobs/123');

    expect(result.source).toBe('structured');
    expect(result.description).toContain('Senior Backend Engineer');
    expect(result.description).not.toContain('irrelevant nav noise');
  });
});

describe('importJobFromUrl — LinkedIn login-wall detection (the real fix)', () => {
  it('refuses to import from a LinkedIn URL when no structured data is found, rather than returning scraped navigation noise', async () => {
    // A realistic approximation of what LinkedIn actually serves an
    // unauthenticated/bot request: no JobPosting schema, mostly login-wall
    // and navigation text.
    const html = `<html><body>
      Agree & Join LinkedIn By clicking Continue to join or sign in, you agree to LinkedIn's User Agreement.
      Jobs People Learning
      Influencer Marketing Executive
      Similar jobs
      People also viewed
    </body></html>`;
    mockHtmlResponse(html);

    await expect(importJobFromUrl('https://www.linkedin.com/jobs/view/12345')).rejects.toThrow('LinkedIn requires sign-in');
  });

  it('does not apply the LinkedIn-specific refusal to a non-LinkedIn URL, even with similar generic noise', async () => {
    const html = `<html><body>${'x'.repeat(200)} Some job board navigation and footer text that is long enough to pass the length check.</body></html>`;
    mockHtmlResponse(html);

    const result = await importJobFromUrl('https://example.com/careers/123');
    expect(result.source).toBe('text'); // falls through to generic scrape, not rejected
  });
});

describe('importJobFromUrl — generic fallback for non-LinkedIn pages', () => {
  it('falls back to visible text when no structured data exists', async () => {
    const html = `<html><body>${'A senior product manager role requiring strong analytical skills and cross-functional leadership. '.repeat(5)}</body></html>`;
    mockHtmlResponse(html);

    const result = await importJobFromUrl('https://example.com/careers/456');

    expect(result.source).toBe('text');
    expect(result.description).toContain('product manager');
  });

  it('rejects when the extracted text is too short to be a real job description', async () => {
    mockHtmlResponse('<html><body>short</body></html>');
    await expect(importJobFromUrl('https://example.com/careers/789')).rejects.toThrow('Couldn\'t pull enough text');
  });

  it('surfaces a clear error when the page itself cannot be reached', async () => {
    mockHtmlResponse('', false, 404);
    await expect(importJobFromUrl('https://example.com/gone')).rejects.toThrow('404');
  });
});
