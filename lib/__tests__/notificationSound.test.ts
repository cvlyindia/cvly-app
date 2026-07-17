import { describe, it, expect } from 'vitest';
import { playReplyChime } from '@/lib/notificationSound';

describe('playReplyChime', () => {
  it('never throws when called in a non-browser environment (no window/AudioContext)', () => {
    // This test runs in Node (vitest environment: 'node'), so `window` genuinely
    // doesn't exist here — this proves the function degrades safely rather than
    // crashing, the same as it would in a browser that blocks/lacks audio.
    expect(() => playReplyChime()).not.toThrow();
  });
});
