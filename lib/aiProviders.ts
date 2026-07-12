import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Alias auto-points to current gen, avoids breakage when Google retires a specific version.
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

interface FallbackProvider {
  name: string;
  apiKey: string | undefined;
  baseURL: string;
  model: string;
}

// Model names are the most volatile part of any free-tier provider — several independent
// sources (checked at build time) documented free catalogs changing without notice, in one
// case shrinking from ~12 models to 2 between checks a few months apart. These defaults were
// current as of build time; override via env vars if a provider retires one without warning,
// rather than needing a code change.
const FALLBACK_PROVIDERS: FallbackProvider[] = [
  {
    name: 'Groq',
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  {
    name: 'OpenRouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  },
  {
    name: 'Cerebras',
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1',
    model: process.env.CEREBRAS_MODEL || 'gpt-oss-120b',
  },
];

interface GenerateOptions {
  maxTokens?: number;
}

/**
 * Tries Gemini first (the primary, best-quality option), then falls through Groq, OpenRouter,
 * and Cerebras in order — skipping any provider whose API key isn't configured. Every provider
 * after Gemini speaks the same OpenAI-compatible chat-completions format, so one code path
 * covers all three. Returns the first successful response; throws only if every configured
 * provider fails.
 */
export async function generateWithFallback(prompt: string, options?: GenerateOptions): Promise<string> {
  const maxTokens = options?.maxTokens ?? 8192;
  const errors: string[] = [];

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    const text = result.response.text();
    if (text && text.trim()) return text;
    errors.push('Gemini: empty response');
  } catch (err) {
    errors.push(`Gemini: ${err instanceof Error ? err.message : 'unknown error'}`);
  }

  for (const provider of FALLBACK_PROVIDERS) {
    if (!provider.apiKey) continue; // not configured — skip silently, this is expected until set up

    try {
      const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });
      const completion = await client.chat.completions.create({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      });
      const text = completion.choices[0]?.message?.content;
      if (text && text.trim()) return text;
      errors.push(`${provider.name}: empty response`);
    } catch (err) {
      errors.push(`${provider.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  throw new Error(`All AI providers failed. (${errors.join(' | ')})`);
}
