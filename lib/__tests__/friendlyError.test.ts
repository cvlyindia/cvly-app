import { describe, it, expect } from 'vitest';
import { friendlyErrorMessage } from '@/lib/friendlyError';

describe('friendlyErrorMessage — known bad patterns get intercepted', () => {
  it('maps a raw Google API 503 error to a clean, friendly message', () => {
    const raw = "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [503 Service Unavailable] This model is currently experiencing high demand.";
    expect(friendlyErrorMessage(new Error(raw))).toBe('Our AI provider is experiencing high demand right now. Please try again in a minute.');
  });

  it('maps a JSON parse failure to a clean message, not the raw technical text', () => {
    expect(friendlyErrorMessage(new Error('Failed to parse AI response as JSON'))).not.toContain('JSON');
  });

  it('maps an "Unexpected token" parse crash to a clean message', () => {
    const raw = `Unexpected token 'R', "Request En"... is not valid JSON`;
    expect(friendlyErrorMessage(new Error(raw))).not.toContain('Unexpected token');
  });

  it('maps a payload-too-large error to a clean message', () => {
    expect(friendlyErrorMessage(new Error('413 Request Entity Too Large'))).toContain('too large');
  });
});

describe('friendlyErrorMessage — the actual regression this replaced: must NOT hide the app\'s own already-safe messages', () => {
  it('passes through the LinkedIn login-wall message unchanged — this is the exact real bug reported', () => {
    const ownMessage = "LinkedIn requires sign-in to show full job details to automated requests, so we can't reliably import from a LinkedIn link. Please copy the job description text directly and paste it in instead.";
    expect(friendlyErrorMessage(new Error(ownMessage))).toBe(ownMessage);
  });

  it('passes through a plain, short "That file is too large" style message unchanged', () => {
    const ownMessage = 'That file is too large — resumes are usually well under 10MB.';
    expect(friendlyErrorMessage(new Error(ownMessage))).toBe(ownMessage);
  });

  it('passes through a plain "not a valid URL" message unchanged', () => {
    expect(friendlyErrorMessage(new Error("That doesn't look like a valid URL."))).toBe("That doesn't look like a valid URL.");
  });

  it('passes through a plain, short scanned-PDF explanation unchanged', () => {
    const ownMessage = "We couldn't find real, selectable text in that file — it may be a scanned image saved as a PDF.";
    expect(friendlyErrorMessage(new Error(ownMessage))).toBe(ownMessage);
  });
});

describe('friendlyErrorMessage — genuinely unrecognized raw technical errors still get hidden', () => {
  it('hides a raw stack-trace-shaped error', () => {
    const raw = 'TypeError: Cannot read properties of undefined (reading \'foo\')\n    at Object.<anonymous> (/app/node_modules/some-lib/index.js:42:10)';
    const result = friendlyErrorMessage(new Error(raw));
    expect(result).not.toContain('node_modules');
    expect(result).not.toContain('TypeError');
  });

  it('hides an unusually long, dense error message even without a specific known pattern', () => {
    const raw = 'x'.repeat(250);
    expect(friendlyErrorMessage(new Error(raw))).toBe('Something went wrong. Please try again.');
  });

  it('handles a completely empty error gracefully', () => {
    expect(friendlyErrorMessage(new Error(''))).toBe('Something went wrong. Please try again.');
  });
});
