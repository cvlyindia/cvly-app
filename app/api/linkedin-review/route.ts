import { NextRequest, NextResponse } from 'next/server';
import { reviewLinkedInProfile } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const { profileText } = await req.json();

    if (!profileText || profileText.trim().length < 50) {
      return NextResponse.json({ error: 'Paste more of your profile — at least a few sentences to review.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const credit = await checkCredits(supabase, user.id, 'linkedin');
    if (!credit.allowed) {
      return NextResponse.json(
        { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
        { status: 402 }
      );
    }

    const result = await reviewLinkedInProfile(profileText);
    await spendCredits(supabase, user.id, 'linkedin');

    await supabase.from('career_reviews').insert({
      user_id: user.id,
      type: 'linkedin',
      input_text: profileText.slice(0, 5000),
      score: result.score,
      summary: result.summary,
      strengths: result.strengths,
      improvements: result.improvements,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Review failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
