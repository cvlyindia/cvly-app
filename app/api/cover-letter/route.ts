export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetter } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Resume text and job description are both required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let anonIpHash: string | null = null;
    if (user) {
      const credit = await checkCredits(supabase, user.id, 'cover');
      if (!credit.allowed) {
        return NextResponse.json(
          { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
          { status: 402 }
        );
      }
    } else {
      const limit = await checkAnonymousLimit(supabase, req, 'cover');
      if (!limit.allowed) {
        return NextResponse.json(
          { error: 'Free daily limit reached for this device. Sign in for your own credits, or try again tomorrow.' },
          { status: 429 }
        );
      }
      anonIpHash = limit.ipHash;
    }

    const letter = await generateCoverLetter(resumeText, jobDescription);

    if (user) {
      await spendCredits(supabase, user.id, 'cover');
    } else if (anonIpHash) {
      await logAnonymousUsage(supabase, anonIpHash, 'cover');
    }

    return NextResponse.json({ letter });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cover letter generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
