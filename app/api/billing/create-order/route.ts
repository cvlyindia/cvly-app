export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRazorpayClient } from '@/lib/razorpay';
import { getTopUpPack } from '@/lib/topups';

export async function POST(req: NextRequest) {
  try {
    const { packId } = await req.json();

    // The ONLY place the actual price/credit amount comes from is this lookup —
    // never from anything the client sent. A tampered request can select which
    // of the three real packs it wants, never invent a fourth one.
    const pack = getTopUpPack(packId);
    if (!pack) {
      return NextResponse.json({ error: 'Invalid top-up pack' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const razorpay = getRazorpayClient();
    const amountPaise = pack.priceRupees * 100;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `topup_${user.id.slice(0, 8)}_${Date.now()}`,
      // Echoed back on the order.paid webhook — this is how the webhook knows
      // WHO to credit and HOW MANY credits, without trusting anything the
      // client says at that point either.
      notes: { user_id: user.id, credits: pack.credits },
    });

    // Record the purchase attempt now, before payment — the webhook updates this
    // row to 'paid' on success rather than inserting a fresh one, giving a
    // complete record even for orders that were created but never completed.
    const admin = createAdminClient();
    const { error: purchaseInsertError } = await admin.from('credit_purchases').insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      credits_purchased: pack.credits,
      amount_paise: amountPaise,
      status: 'created',
    });

    if (purchaseInsertError) {
      // Fail loudly here rather than silently opening a checkout that can never
      // actually be credited — if this insert fails (e.g. the credit_purchases
      // table or its migration hasn't been applied to this database yet), the
      // webhook's own increment_credits call will hit the exact same problem
      // later, except invisibly, after someone has already paid real money.
      Sentry.captureException(new Error(`credit_purchases insert failed: ${purchaseInsertError.message}`), {
        tags: { context: 'create-order' },
        extra: { orderId: order.id, userId: user.id },
      });
      return NextResponse.json({ error: 'Could not start checkout — please try again in a moment' }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: amountPaise,
      credits: pack.credits,
    });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Could not start checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
