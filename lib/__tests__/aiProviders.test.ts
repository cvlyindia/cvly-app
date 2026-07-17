import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();
const mockChatCompletionsCreate = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function (this: unknown) {
    return { getGenerativeModel: () => ({ generateContent: mockGenerateContent }) };
  }),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    return { chat: { completions: { create: mockChatCompletionsCreate } } };
  }),
}));

function delayed<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function delayedReject(err: Error, ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(err), ms));
}

function geminiResponse(text: string) {
  return { response: { text: () => text } };
}

function openaiResponse(text: string) {
  return { choices: [{ message: { content: text } }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GROQ_API_KEY', 'test-groq-key');
});

describe('generateWithFallback — priority racing genuinely picks whichever succeeds first', () => {
  it('when Gemini is faster than the fallback, Gemini\'s result wins', async () => {
    mockGenerateContent.mockReturnValue(delayed(geminiResponse('Gemini fast response'), 10));
    mockChatCompletionsCreate.mockReturnValue(delayed(openaiResponse('Fallback slow response'), 200));

    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt', { priority: true });

    expect(result).toBe('Gemini fast response');
  });

  it('when the fallback is faster than Gemini, the fallback\'s result wins — the actual proof this is a real race, not a preference', async () => {
    mockGenerateContent.mockReturnValue(delayed(geminiResponse('Gemini slow response'), 200));
    mockChatCompletionsCreate.mockReturnValue(delayed(openaiResponse('Fallback fast response'), 10));

    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt', { priority: true });

    expect(result).toBe('Fallback fast response');
  });

  it('if the faster side fails, still waits for and returns the slower side\'s success rather than giving up', async () => {
    mockGenerateContent.mockReturnValue(delayedReject(new Error('Gemini overloaded'), 10));
    mockChatCompletionsCreate.mockReturnValue(delayed(openaiResponse('Fallback eventually succeeds'), 100));

    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt', { priority: true });

    expect(result).toBe('Fallback eventually succeeds');
  });

  it('falls through to any remaining, untried fallback providers if BOTH race participants fail', async () => {
    mockGenerateContent.mockReturnValue(delayedReject(new Error('Gemini down'), 10));
    // First call (Groq, the one raced) fails; the code should then move on to
    // try the next configured provider sequentially rather than giving up.
    mockChatCompletionsCreate
      .mockReturnValueOnce(delayedReject(new Error('Groq also down'), 10))
      .mockReturnValueOnce(Promise.resolve(openaiResponse('Second fallback provider saves it')));

    vi.stubEnv('OPENROUTER_API_KEY', 'test-openrouter-key');
    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt', { priority: true });

    expect(result).toBe('Second fallback provider saves it');
  });

  it('with priority true but no fallback provider configured at all, just uses Gemini alone', async () => {
    mockGenerateContent.mockReturnValue(Promise.resolve(geminiResponse('Gemini only, no race possible')));

    vi.stubEnv('GROQ_API_KEY', '');
    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt', { priority: true });

    expect(result).toBe('Gemini only, no race possible');
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });
});

describe('generateWithFallback — default (non-priority) behavior is unchanged: sequential, Gemini first', () => {
  it('tries Gemini first and never even calls a fallback provider if Gemini succeeds', async () => {
    mockGenerateContent.mockReturnValue(Promise.resolve(geminiResponse('Gemini sequential success')));

    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt'); // no priority flag at all

    expect(result).toBe('Gemini sequential success');
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it('falls through to the fallback sequentially, only after Gemini genuinely fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini failed'));
    mockChatCompletionsCreate.mockReturnValue(Promise.resolve(openaiResponse('Sequential fallback response')));

    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    const result = await generateWithFallback('prompt');

    expect(result).toBe('Sequential fallback response');
  });

  it('throws a clear, combined error only when every configured provider genuinely fails', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini down'));
    mockChatCompletionsCreate.mockRejectedValue(new Error('Groq down'));

    vi.resetModules();
    const { generateWithFallback } = await import('@/lib/aiProviders');
    await expect(generateWithFallback('prompt')).rejects.toThrow('All AI providers failed');
  });
});
