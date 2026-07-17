import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Pinned to an explicit, stable model — NOT the 'gemini-flash-latest' alias this used
// to be. Google's own docs describe that alias as pointing to "an experimental model
// which will typically not be suitable for production use," and it has already silently
// repointed at least once during this build (per Google's changelog, it moved to
// gemini-3.5-flash on May 19, 2026) with zero code change on our end — the exact risk
// this pin exists to remove. gemini-3.5-flash is the current GA/stable release as of
// this pin; when Google ships a newer stable generation, update this one string
// deliberately rather than being moved automatically and finding out from a support email.
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

/**
 * Transcribes a photographed or scanned resume image to text using Gemini's vision
 * capability. Deliberately Gemini-only, not routed through the Groq/OpenRouter/Cerebras
 * fallback chain — those free-tier text models don't reliably support image input the
 * same way, and a fallback that silently can't actually read the image would be worse
 * than a clear, honest failure telling the person to try a different format.
 */
export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const result = await geminiModel.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType } },
    {
      text: 'This is a photo or scan of a resume. Transcribe every word of text exactly as written, preserving the original structure (line breaks between sections, bullet points). Return ONLY the transcribed text — no commentary, no markdown formatting, no "here is the transcription" preamble. If the image genuinely does not contain a readable resume, respond with exactly: NOT_A_RESUME',
    },
  ]);
  return result.response.text().trim();
}

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
  temperature?: number;
  // Pro/Enterprise only (decided by the calling route, based on the user's actual
  // plan — never guessed here). When true and a fallback provider is configured,
  // races Gemini against the fastest available fallback simultaneously and uses
  // whichever responds successfully first, instead of waiting through Gemini's
  // full response time before ever trying anything else.
  //
  // This is deliberately NOT the default for everyone: Groq/OpenRouter/Cerebras
  // are free-tier providers with real, shared rate limits across all of Cvly's
  // traffic. Racing against them on every single free-tier request would burn
  // through that shared capacity fast, leaving less of it in reserve for the
  // moment it's actually needed — when Gemini is genuinely down for everyone.
  // Reserving racing for Pro keeps the free tier's safety net intact while still
  // giving paying users a real, measurable latency improvement.
  priority?: boolean;
}

async function tryGemini(prompt: string, maxTokens: number, temperature?: number): Promise<string> {
  const result = await geminiModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens, ...(temperature !== undefined ? { temperature } : {}) },
  });
  const text = result.response.text();
  if (text && text.trim()) return text;
  throw new Error('Gemini: empty response');
}

async function tryProvider(provider: FallbackProvider, prompt: string, maxTokens: number, temperature?: number): Promise<string> {
  const client = new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });
  const completion = await client.chat.completions.create({
    model: provider.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    ...(temperature !== undefined ? { temperature } : {}),
  });
  const text = completion.choices[0]?.message?.content;
  if (text && text.trim()) return text;
  throw new Error(`${provider.name}: empty response`);
}

/**
 * Tries Gemini first (the primary, best-quality option), then falls through Groq, OpenRouter,
 * and Cerebras in order — skipping any provider whose API key isn't configured. Every provider
 * after Gemini speaks the same OpenAI-compatible chat-completions format, so one code path
 * covers all three. Returns the first successful response; throws only if every configured
 * provider fails.
 *
 * With `priority: true` (Pro/Enterprise), Gemini and the first available fallback are raced
 * simultaneously instead of tried one after another — see GenerateOptions.priority for why
 * this isn't the default for every request.
 */
export async function generateWithFallback(prompt: string, options?: GenerateOptions): Promise<string> {
  const maxTokens = options?.maxTokens ?? 8192;
  const temperature = options?.temperature;
  const errors: string[] = [];
  const remainingProviders = [...FALLBACK_PROVIDERS];

  if (options?.priority) {
    const raceProviderIndex = remainingProviders.findIndex((p) => p.apiKey);
    if (raceProviderIndex !== -1) {
      const raceProvider = remainingProviders[raceProviderIndex];
      try {
        return await Promise.any([
          tryGemini(prompt, maxTokens, temperature),
          tryProvider(raceProvider, prompt, maxTokens, temperature),
        ]);
      } catch (aggregate) {
        // Both sides of the race failed — record why, then fall through to the
        // normal sequential chain for whatever providers haven't been tried yet.
        // Never a dead end just because the fast path didn't pan out.
        if (aggregate instanceof AggregateError) {
          for (const e of aggregate.errors) errors.push(e instanceof Error ? e.message : String(e));
        }
        remainingProviders.splice(raceProviderIndex, 1); // already tried, don't retry it below
      }
    } else {
      // No fallback configured to race against — priority has nothing to race,
      // just try Gemini alone same as the non-priority path would.
      try {
        return await tryGemini(prompt, maxTokens, temperature);
      } catch (err) {
        errors.push(`Gemini: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }
  } else {
    try {
      return await tryGemini(prompt, maxTokens, temperature);
    } catch (err) {
      errors.push(`Gemini: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  for (const provider of remainingProviders) {
    if (!provider.apiKey) continue; // not configured — skip silently, this is expected until set up
    try {
      return await tryProvider(provider, prompt, maxTokens, temperature);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `${provider.name}: unknown error`);
    }
  }

  throw new Error(`All AI providers failed. (${errors.join(' | ')})`);
}
