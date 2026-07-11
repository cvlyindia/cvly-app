import { NextRequest, NextResponse } from 'next/server';
import { rewriteResume } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Resume text and job description are both required' }, { status: 400 });
    }

    const rewritten = await rewriteResume(resumeText, jobDescription);
    return NextResponse.json({ rewritten });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rewrite failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
