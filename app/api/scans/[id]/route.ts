import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_FIELDS: Record<string, string> = {
  rewrittenResume: 'rewritten_resume',
  coverLetter: 'cover_letter',
  interviewQuestions: 'interview_questions',
  practicedQuestions: 'practiced_questions',
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const [key, column] of Object.entries(ALLOWED_FIELDS)) {
      if (key in body) updates[column] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { error } = await supabase.from('scans').update(updates).eq('id', id).eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ updated: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const { error } = await supabase.from('scans').delete().eq('id', id).eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
