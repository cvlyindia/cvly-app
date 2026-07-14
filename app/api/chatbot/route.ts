export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { generateWithFallback } from '@/lib/aiProviders';
import { CVLY_SYSTEM_PROMPT } from '@/lib/chatbotFacts';

const RATE_LIMIT_PER_HOUR = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }
    if (message.length > 500) {
      return NextResponse.json({ error: 'Keep it under 500 characters — this is a chat, not a document.' }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const supabase = await createClient();

    // Real IP-based rate limiting — this endpoint has zero auth, so it's the one
    // genuinely open door on the whole site. Check usage in the last hour before
    // spending any money on a real AI call.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: countError } = await supabase
      .from('chatbot_usage')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', windowStart);

    if (!countError && count !== null && count >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: "You've asked a lot of questions in the last hour — try again shortly, or check the FAQ on the homepage." },
        { status: 429 }
      );
    }

    // Real conversation memory — capped to the last 6 exchanges so a long session
    // doesn't grow the prompt unbounded. Without this, every follow-up question
    // ("and how much does that cost?") had zero idea what it was following up on.
    const recentHistory: { role: string; text: string }[] = Array.isArray(history) ? history.slice(-6) : [];
    const historyBlock = recentHistory.length
      ? `\n\nCONVERSATION SO FAR:\n${recentHistory.map((m) => `${m.role === 'user' ? 'User' : 'You'}: ${m.text}`).join('\n')}`
      : '';

    const prompt = `${CVLY_SYSTEM_PROMPT}${historyBlock}\n\nUSER'S NEW MESSAGE:\n${message.trim()}\n\nAnswer in 2-4 sentences, plainly, as Cvly's help assistant. Use the conversation above for context if there's a follow-up question — don't ignore what was already said.`;
    const answer = await generateWithFallback(prompt, { maxTokens: 300, temperature: 0.3 });

    // Log usage only after a successful call — a failed AI call shouldn't count against the limit.
    await supabase.from('chatbot_usage').insert({ ip_hash: ipHash });

    return NextResponse.json({ answer: answer.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
