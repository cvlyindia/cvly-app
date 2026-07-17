export const maxDuration = 15;

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, plan, status, current_start, current_end')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ subscription: subscription ?? null });
  } catch (err: unknown) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Could not load subscription status' }, { status: 500 });
  }
}
