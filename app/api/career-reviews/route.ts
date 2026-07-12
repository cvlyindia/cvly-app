import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('career_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const linkedin = data?.find((r) => r.type === 'linkedin') ?? null;
    const portfolio = data?.find((r) => r.type === 'portfolio') ?? null;

    return NextResponse.json({ linkedin, portfolio, all: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
