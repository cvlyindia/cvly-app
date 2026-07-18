export const maxDuration = 15;

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import type { InterviewCategory } from '@/lib/ai';

export interface ReadinessComponents {
  resumeMatch: number | null;
  linkedinStrength: number | null;
  portfolioQuality: number | null;
  interviewCompletion: number | null; // percentage of generated questions practiced, not a quality score
}

function countQuestions(categories: InterviewCategory[]): number {
  return categories.reduce((sum, c) => sum + c.questions.length, 0);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const { data: latestScan } = await supabase
      .from('scans')
      .select('score, interview_questions, practiced_questions')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestLinkedin } = await supabase
      .from('career_reviews')
      .select('score')
      .eq('user_id', user.id)
      .eq('type', 'linkedin')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestPortfolio } = await supabase
      .from('career_reviews')
      .select('score')
      .eq('user_id', user.id)
      .eq('type', 'portfolio')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let interviewCompletion: number | null = null;
    if (latestScan?.interview_questions) {
      const categories = latestScan.interview_questions as InterviewCategory[];
      const total = countQuestions(categories);
      const practiced = ((latestScan.practiced_questions as string[] | null) ?? []).length;
      interviewCompletion = total > 0 ? Math.round((Math.min(practiced, total) / total) * 100) : null;
    }

    const components: ReadinessComponents = {
      resumeMatch: latestScan?.score ?? null,
      linkedinStrength: latestLinkedin?.score ?? null,
      portfolioQuality: latestPortfolio?.score ?? null,
      interviewCompletion,
    };

    // Average only the pieces that actually exist — someone who hasn't tried
    // LinkedIn review yet shouldn't have their overall readiness dragged down
    // by a component they never attempted, that's a nudge to try it, not a
    // penalty for not having.
    const available = Object.values(components).filter((v): v is number => v !== null);
    const overall = available.length > 0 ? Math.round(available.reduce((a, b) => a + b, 0) / available.length) : null;

    return NextResponse.json({ overall, components });
  } catch (err: unknown) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Could not load readiness score' }, { status: 500 });
  }
}
