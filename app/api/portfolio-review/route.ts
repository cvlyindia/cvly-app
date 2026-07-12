import { NextRequest, NextResponse } from 'next/server';
import { reviewPortfolio } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';

export async function POST(req: NextRequest) {
  try {
    const { portfolioText } = await req.json();

    if (!portfolioText || portfolioText.trim().length < 50) {
      return NextResponse.json({ error: 'Paste more of your portfolio — project descriptions, case studies, or work samples.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const credit = await checkCredits(supabase, user.id, 'portfolio');
    if (!credit.allowed) {
      return NextResponse.json(
        { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
        { status: 402 }
      );
    }

    const result = await reviewPortfolio(portfolioText);
    await spendCredits(supabase, user.id, 'portfolio');

    await supabase.from('career_reviews').insert({
      user_id: user.id,
      type: 'portfolio',
      input_text: portfolioText.slice(0, 5000),
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
