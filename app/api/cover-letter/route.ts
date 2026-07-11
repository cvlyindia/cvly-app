import { NextRequest, NextResponse } from 'next/server';
import { generateCoverLetter } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Resume text and job description are both required' }, { status: 400 });
    }

    const letter = await generateCoverLetter(resumeText, jobDescription);
    return NextResponse.json({ letter });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cover letter generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
