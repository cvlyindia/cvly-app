export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { getRazorpayClient, getPlanId } from '@/lib/razorpay';
import { sendCapiEvent, getClientIpForCapi } from '@/lib/metaCapi';

// A finite total_count is required by Razorpay's API even for what's meant to be
// an indefinitely-recurring subscription — there's no "forever" option. 10 years
// of cycles is the practical equivalent of indefinite for a subscription that can
// still be cancelled anytime.
const TOTAL_COUNT: Record<'monthly' | 'yearly', number> = { monthly: 120, yearly: 10 };

export async function POST(req: NextRequest) {
  try {
    const { cycle } = await req.json() as { cycle?: unknown };
    if (cycle !== 'monthly' && cycle !== 'yearly') {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });
    }
    const validCycle: 'monthly' | 'yearly' = cycle;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const planId = getPlanId("pro", validCycle);
    const razorpay = getRazorpayClient();

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: TOTAL_COUNT[validCycle],
      customer_notify: 1,
      // This is how the webhook later knows WHICH Cvly user this subscription
      // belongs to — Razorpay echoes `notes` back on every webhook event for
      // this subscription, so this is the join key between their system and ours.
      notes: { user_id: user.id },
    });

    // Best-effort — never blocks returning the subscription to the client, since
    // InitiateCheckout not firing shouldn't stop someone from actually paying.
    sendCapiEvent({
      eventName: 'InitiateCheckout',
      eventId: subscription.id, // shared with the client-side fbq call for dedup
      eventSourceUrl: req.headers.get('referer') ?? undefined,
      user: {
        email: user.email ?? undefined,
        userId: user.id,
        ip: getClientIpForCapi(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch(() => {});

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Could not start checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
