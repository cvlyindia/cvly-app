import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email, plan, company } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('waitlist').insert({
      email: email.trim().toLowerCase(),
      plan: plan === 'enterprise' ? 'enterprise' : 'pro',
      company: company?.trim() || null,
    });

    if (error) {
      // Unique constraint violation just means they already joined — treat as success
      if (error.code === '23505') {
        return NextResponse.json({ joined: true, already: true });
      }
      throw error;
    }

    return NextResponse.json({ joined: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
