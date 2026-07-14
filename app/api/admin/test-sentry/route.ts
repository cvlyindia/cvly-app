import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/adminAuth';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'not_authorized' }, { status: 401 });
  }

  const testError = new Error(
    `TEST ERROR — deliberate Sentry verification, triggered by admin (${user.email}) at ${new Date().toISOString()}. Safe to ignore/resolve in Sentry.`
  );

  const eventId = Sentry.captureException(testError);

  // Sentry batches/sends events async — give it a moment before this serverless
  // function's execution ends, or the event can be dropped before it's actually sent.
  await Sentry.flush(2000);

  return NextResponse.json({
    sent: true,
    eventId,
    message: 'Test error sent to Sentry. Check your Sentry dashboard — it should appear within a minute or two, tagged with "TEST ERROR".',
  });
}
