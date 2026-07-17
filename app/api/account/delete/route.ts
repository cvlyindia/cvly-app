export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    // Require the user to type their own email as a real confirmation step —
    // this is an irreversible action, and a single click is too easy to hit by
    // accident on a page that also has other buttons nearby.
    const { confirmEmail } = await req.json();
    if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== (user.email ?? '').toLowerCase()) {
      return NextResponse.json({ error: 'Email confirmation did not match.' }, { status: 400 });
    }

    const admin = createAdminClient();
    // Every table referencing auth.users uses ON DELETE CASCADE, so this one
    // call is genuinely sufficient — scans, credits, tracker jobs, career
    // reviews, subscriptions, and credit purchases are all removed with it,
    // not just the login itself.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Could not delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
