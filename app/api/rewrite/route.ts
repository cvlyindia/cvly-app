import { NextRequest, NextResponse } from 'next/server';
import { rewriteResume } from '@/lib/ai';
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

    if (user) {
      const credit = await checkCredits(supabase, user.id, 'rewrite');
      if (!credit.allowed) {
        return NextResponse.json(
          { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
          { status: 402 }
        );
      }
    }

    const rewritten = await rewriteResume(resumeText, jobDescription);

    if (user) {
      await spendCredits(supabase, user.id, 'rewrite');
    }

    return NextResponse.json({ rewritten });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rewrite failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
