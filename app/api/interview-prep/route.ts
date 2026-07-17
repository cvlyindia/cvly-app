export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { generateInterviewPrep } from '@/lib/ai';
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

    const credit = await checkCredits(supabase, user.id, 'interview');
    if (!credit.allowed) {
      return NextResponse.json(
        { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
        { status: 402 }
      );
    }

    // Interview prep is Pro/Enterprise only — gated at generation, not just download.
    // This is also what actually stops a free user from ever seeing the real
    // questions at all (and so copying them via right-click/selection is a
    // non-issue here — there's nothing generated to copy), rather than generating
    // the content and only hiding a download button around it.
    if (credit.plan !== 'pro' && credit.plan !== 'enterprise') {
      return NextResponse.json({ error: 'requires_pro' }, { status: 402 });
    }

    const questions = await generateInterviewPrep(resumeText, jobDescription, credit.plan === 'pro' || credit.plan === 'enterprise');
    await spendCredits(supabase, user.id, 'interview');

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Interview prep generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
