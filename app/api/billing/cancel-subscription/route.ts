export const maxDuration = 15;

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { getRazorpayClient } from '@/lib/razorpay';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json({ error: 'No active subscription found to cancel.' }, { status: 400 });
    }

    const razorpay = getRazorpayClient();
    // true = cancel at the end of the current billing cycle, not immediately —
    // the standard, customer-friendly pattern: no further charges, but Pro
    // access continues until the period already paid for actually ends.
    await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id, true);

    return NextResponse.json({ cancelled: true });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { context: 'cancel-subscription' } });
    const message = err instanceof Error ? err.message : 'Could not cancel subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
