export const maxDuration = 15;

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';

export interface ScoreHistoryPoint {
  date: string;
  score: number;
}

export interface ApplicationFunnel {
  saved: number;
  applied: number;
  interview: number;
  offer: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const { data: credits } = await supabase
      .from('user_credits')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (credits?.plan !== 'pro' && credits?.plan !== 'enterprise') {
      return NextResponse.json({ error: 'requires_pro' }, { status: 402 });
    }

    const { data: scans } = await supabase
      .from('scans')
      .select('score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const scoreHistory: ScoreHistoryPoint[] = (scans ?? []).map((s) => ({
      date: s.created_at,
      score: s.score,
    }));

    const { data: jobs } = await supabase
      .from('saved_jobs')
      .select('status')
      .eq('user_id', user.id);

    // A job's current status implies it passed through every earlier stage —
    // someone marked "interview" necessarily applied first. Counting
    // cumulatively (reached-at-least-this-stage) is what makes this a real
    // funnel with meaningful conversion rates between stages, not just a
    // snapshot of where jobs currently sit.
    const funnel: ApplicationFunnel = {
      saved: (jobs ?? []).length,
      applied: (jobs ?? []).filter((j) => ['applied', 'interview', 'offer'].includes(j.status)).length,
      interview: (jobs ?? []).filter((j) => ['interview', 'offer'].includes(j.status)).length,
      offer: (jobs ?? []).filter((j) => j.status === 'offer').length,
    };

    return NextResponse.json({ scoreHistory, funnel });
  } catch (err: unknown) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Could not load analytics' }, { status: 500 });
  }
}
