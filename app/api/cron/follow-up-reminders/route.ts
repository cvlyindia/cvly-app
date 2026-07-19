export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, followUpReminderEmail } from '@/lib/email';

const FOLLOW_UP_AFTER_DAYS = 7;
const MAX_PER_RUN = 50; // safety valve — free Resend tier allows 100/day

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically when
  // the CRON_SECRET env var exists. Anyone else hitting this URL gets a 401.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - FOLLOW_UP_AFTER_DAYS * 86400000).toISOString();

    const { data: jobs, error } = await supabase
      .from('saved_jobs')
      .select('id, user_id, company, role, updated_at')
      .eq('status', 'applied')
      .is('follow_up_emailed_at', null)
      .lt('updated_at', cutoff)
      .limit(MAX_PER_RUN);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sent = 0;
    for (const job of jobs) {
      const { data: userRow } = await supabase.auth.admin.getUserById(job.user_id);
      const email = userRow?.user?.email;
      if (!email) {
        // No email to send to — mark it anyway so it doesn't clog every future run.
        await supabase.from('saved_jobs').update({ follow_up_emailed_at: new Date().toISOString() }).eq('id', job.id);
        continue;
      }

      const daysAgo = Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 86400000);
      const ok = await sendEmail(followUpReminderEmail(email, job.company, job.role, daysAgo));
      // Mark regardless of send outcome: sendEmail already logs failures to Sentry,
      // and retrying a possibly-half-failing email daily against the same user is
      // worse than one missed nudge. One shot per job, by design.
      await supabase.from('saved_jobs').update({ follow_up_emailed_at: new Date().toISOString() }).eq('id', job.id);
      if (ok) sent += 1;
    }

    return NextResponse.json({ sent, considered: jobs.length });
  } catch (err: unknown) {
    Sentry.captureException(err, { tags: { context: 'follow-up-cron' } });
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}
