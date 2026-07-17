export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { generateCoverLetter } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Resume text and job description are both required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const credit = await checkCredits(supabase, user.id, 'cover');
    if (!credit.allowed) {
      return NextResponse.json(
        { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
        { status: 402 }
      );
    }

    const letter = await generateCoverLetter(resumeText, jobDescription, credit.plan === 'pro' || credit.plan === 'enterprise');
    await spendCredits(supabase, user.id, 'cover');

    return NextResponse.json({ letter });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Cover letter generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
