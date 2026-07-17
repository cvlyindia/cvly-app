export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendCapiEvent } from '@/lib/metaCapi';
import { PLAN_LIMITS } from '@/lib/credits';

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  notes?: { user_id?: string };
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  currency: string;
  email?: string;
  notes?: { user_id?: string };
}

interface RazorpayOrderEntity {
  id: string;
  amount: number;
  currency: string;
  notes?: { user_id?: string; credits?: number | string };
}

export async function POST(req: NextRequest) {
  // CRITICAL: must be the raw, unparsed body. Razorpay's own docs explicitly warn
  // that re-serializing a parsed body (JSON.stringify(req.body)) produces a
  // different byte sequence than what was actually signed — this is the single
  // most common way this exact integration breaks, silently, for everyone.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  const eventId = req.headers.get('x-razorpay-event-id');
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'missing_signature_or_secret' }, { status: 400 });
  }

  let isValid: boolean;
  try {
    isValid = validateWebhookSignature(rawBody, signature, webhookSecret);
  } catch (err) {
    Sentry.captureException(err, { tags: { context: 'razorpay-webhook-signature' } });
    return NextResponse.json({ error: 'signature_verification_failed' }, { status: 400 });
  }

  if (!isValid) {
    // Deliberately no detail in the response — an attacker probing this endpoint
    // learns nothing about why their forged signature failed.
    Sentry.captureMessage('Razorpay webhook: invalid signature received', { level: 'warning' });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const body = JSON.parse(rawBody);
  const event: string = body.event;
  const supabase = createAdminClient();

  // Idempotency: Razorpay explicitly documents that the same event may be
  // delivered more than once (retries on timeout or a non-2xx response).
  // Without this check, a retried delivery could double-fire a Purchase event
  // to Meta or reprocess a cancellation twice.
  if (eventId) {
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    switch (event) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.pending':
      case 'subscription.halted':
      case 'subscription.cancelled':
      case 'subscription.completed': {
        const sub: RazorpaySubscriptionEntity = body.payload.subscription.entity;
        await handleSubscriptionEvent(supabase, event, sub, body.payload.payment?.entity as RazorpayPaymentEntity | undefined, req);
        break;
      }
      case 'order.paid': {
        const order: RazorpayOrderEntity = body.payload.order.entity;
        await handleOrderPaidEvent(supabase, order, req);
        break;
      }
      default:
        // Unhandled event types are fine to ignore — Razorpay sends many event
        // types beyond what this integration currently acts on.
        break;
    }

    if (eventId) {
      await supabase.from('webhook_events').insert({ id: eventId, event_type: event });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { context: 'razorpay-webhook-processing', event } });
    // Still return 200 — the signature was valid and the event is real, a
    // processing bug on our end shouldn't cause Razorpay to keep retrying
    // indefinitely. The Sentry capture above is what makes this visible.
    return NextResponse.json({ received: true, processingError: true });
  }
}

async function handleSubscriptionEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: string,
  sub: RazorpaySubscriptionEntity,
  payment: RazorpayPaymentEntity | undefined,
  req: NextRequest
) {
  const userId = sub.notes?.user_id;
  if (!userId) {
    Sentry.captureMessage('Razorpay webhook: subscription has no user_id in notes', {
      level: 'error',
      extra: { subscriptionId: sub.id },
    });
    return;
  }

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id, purchase_event_sent')
    .eq('razorpay_subscription_id', sub.id)
    .maybeSingle();

  const statusRow = {
    user_id: userId,
    razorpay_subscription_id: sub.id,
    razorpay_plan_id: sub.plan_id,
    plan: 'pro' as const,
    status: sub.status,
    current_start: sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null,
    current_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (existingSub) {
    await supabase.from('subscriptions').update(statusRow).eq('razorpay_subscription_id', sub.id);
  } else {
    await supabase.from('subscriptions').insert(statusRow);
  }

  // Reflect the plan onto user_credits — this is the table every AI route
  // actually checks against, so this is what makes the upgrade real.
  if (sub.status === 'active') {
    await supabase
      .from('user_credits')
      .update({ plan: 'pro', credits_remaining: PLAN_LIMITS.pro, credits_reset_at: new Date(Date.now() + 86400000).toISOString() })
      .eq('user_id', userId);
  } else if (sub.status === 'cancelled' || sub.status === 'halted' || sub.status === 'expired') {
    await supabase
      .from('user_credits')
      .update({ plan: 'free', credits_remaining: PLAN_LIMITS.free })
      .eq('user_id', userId);
  }

  // Fire Purchase to Meta exactly once — on this subscription's first
  // successful activation, never on renewal charges. Renewals are a real
  // signal worth having eventually, but firing Purchase on every renewal
  // would inflate Meta's "new customer" signal with existing customers,
  // which actively degrades ad-optimization quality rather than helping it.
  const alreadySent = existingSub?.purchase_event_sent ?? false;
  if (!alreadySent && sub.status === 'active') {
    const { data: userRow } = await supabase.auth.admin.getUserById(userId);
    const email = userRow?.user?.email;

    await sendCapiEvent({
      eventName: 'Purchase',
      eventId: sub.id, // must match the client-side Purchase event fired at checkout success
      user: {
        email: email ?? undefined,
        userId,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim(),
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
      value: payment ? payment.amount / 100 : undefined, // Razorpay amounts are in paise
      currency: payment?.currency ?? 'INR',
    });

    await supabase.from('subscriptions').update({ purchase_event_sent: true }).eq('razorpay_subscription_id', sub.id);
  }
}

async function handleOrderPaidEvent(
  supabase: ReturnType<typeof createAdminClient>,
  order: RazorpayOrderEntity,
  req: NextRequest
) {
  const userId = order.notes?.user_id;
  const credits = order.notes?.credits ? Number(order.notes.credits) : undefined;

  if (!userId || !credits) {
    Sentry.captureMessage('Razorpay webhook: order.paid missing user_id or credits in notes', {
      level: 'error',
      extra: { orderId: order.id },
    });
    return;
  }

  const { data: purchase } = await supabase
    .from('credit_purchases')
    .select('id, status')
    .eq('razorpay_order_id', order.id)
    .maybeSingle();

  // Defensive: even though webhook_events already guards against reprocessing the
  // same delivery, this is a second, independent layer against ever double-crediting
  // the same order specifically — cheap insurance on the one operation here that
  // actually adds real value to someone's account.
  if (purchase?.status === 'paid') return;

  await supabase
    .from('credit_purchases')
    .update({ status: 'paid' })
    .eq('razorpay_order_id', order.id);

  await supabase.rpc('increment_credits', { p_user_id: userId, p_amount: credits });

  const { data: userRow } = await supabase.auth.admin.getUserById(userId);
  const email = userRow?.user?.email;

  // Every top-up is a genuine, distinct purchase — no "first time only" restriction
  // here the way subscription renewals have. Each one is real revenue Meta should
  // legitimately see as a Purchase event.
  await sendCapiEvent({
    eventName: 'Purchase',
    eventId: order.id,
    user: {
      email: email ?? undefined,
      userId,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim(),
      userAgent: req.headers.get('user-agent') ?? undefined,
    },
    value: order.amount / 100,
    currency: order.currency,
  });
}

