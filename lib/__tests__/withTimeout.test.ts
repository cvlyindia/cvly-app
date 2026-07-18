import { describe, it, expect } from 'vitest';
import { withTimeout } from '@/lib/withTimeout';

function neverResolves<T>(): Promise<T> {
  return new Promise(() => {}); // deliberately hangs forever, simulating a stuck network call
}

describe('withTimeout', () => {
  it('resolves with the real value when the promise settles well within the timeout', async () => {
    const result = await withTimeout(Promise.resolve('real value'), 200, 'fallback');
    expect(result).toBe('real value');
  });

  it('falls back to the fallback value when the promise genuinely never resolves — the actual bug this fixes', async () => {
    const start = Date.now();
    const result = await withTimeout(neverResolves<string>(), 100, 'fallback');
    const elapsed = Date.now() - start;

    expect(result).toBe('fallback');
    // Should resolve close to the timeout window, not hang indefinitely and not
    // resolve suspiciously instantly either (which would suggest it's not really
    // waiting for anything).
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(500);
  });

  it('falls back to the fallback value when the promise rejects, not just when it hangs', async () => {
    const result = await withTimeout(Promise.reject(new Error('boom')), 200, 'fallback');
    expect(result).toBe('fallback');
  });

  it('does not wait the full timeout when the promise resolves quickly — the fast path stays fast', async () => {
    const start = Date.now();
    await withTimeout(Promise.resolve('fast'), 5000, 'fallback');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200); // nowhere near the 5s timeout ceiling
  });
});
