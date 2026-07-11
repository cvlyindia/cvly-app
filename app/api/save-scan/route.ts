import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Not logged in — silently skip saving, scoring still works
      return NextResponse.json({ saved: false, reason: 'not_logged_in' });
    }

    const body = await req.json();
    const { resumeText, jobDescription, score, summary, matchedKeywords, missingKeywords, improvements } = body;

    const { error } = await supabase.from('scans').insert({
      user_id: user.id,
      resume_text: resumeText,
      job_description: jobDescription,
      score,
      summary,
      matched_keywords: matchedKeywords,
      missing_keywords: missingKeywords,
      improvements,
    });

    if (error) throw error;

    return NextResponse.json({ saved: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save scan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
