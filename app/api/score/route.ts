export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { scoreResume } from '@/lib/ai';
import { createClient } from '@/lib/supabase/server';
import { checkCredits, spendCredits } from '@/lib/credits';
import { checkAnonymousLimit, logAnonymousUsage } from '@/lib/anonymousLimit';
import { getExtensionCorsHeaders } from '@/lib/extensionCors';
import { sendCapiEvent, getClientIpForCapi } from '@/lib/metaCapi';

export async function OPTIONS(req: NextRequest) {
  const cors = getExtensionCorsHeaders(req.headers.get('origin'));
  return new NextResponse(null, { status: cors ? 204 : 403, headers: cors ?? {} });
}

export async function POST(req: NextRequest) {
  // Only actually applies extra headers when the request genuinely comes from the
  // allowlisted extension origin — a normal same-origin request from cvly.in itself
  // gets an empty headers object here, a complete no-op, unaffected either way.
  const cors = getExtensionCorsHeaders(req.headers.get('origin')) ?? {};

  try {
    const { resumeText, jobDescription, leadEventId } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Resume text and job description are both required' }, { status: 400, headers: cors });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // No signup wall to try the tool — but anonymous usage is still real, metered
    // usage of a paid AI API, so it gets a real per-IP daily budget instead of being
    // completely unmetered.
    let anonIpHash: string | null = null;
    let isPro = false;
    if (user) {
      const credit = await checkCredits(supabase, user.id, 'score');
      if (!credit.allowed) {
        return NextResponse.json(
          { error: 'out_of_credits', plan: credit.plan, remaining: credit.remaining, resetAt: credit.resetAt },
          { status: 402, headers: cors }
        );
      }
      isPro = credit.plan === 'pro' || credit.plan === 'enterprise';
    } else {
      const limit = await checkAnonymousLimit(supabase, req, 'score');
      if (!limit.allowed) {
        return NextResponse.json(
          { error: 'Free daily limit reached for this device. Sign in for your own credits, or try again tomorrow.' },
          { status: 429, headers: cors }
        );
      }
      anonIpHash = limit.ipHash;
    }

    const result = await scoreResume(resumeText, jobDescription, isPro);

    if (user) {
      await spendCredits(supabase, user.id, 'score');
    } else if (anonIpHash) {
      await logAnonymousUsage(supabase, anonIpHash, 'score');
    }

    if (leadEventId && !('invalid' in result)) {
      sendCapiEvent({
        eventName: 'Lead',
        eventId: leadEventId,
        eventSourceUrl: req.headers.get('referer') ?? undefined,
        user: {
          email: user?.email ?? undefined,
          userId: user?.id,
          ip: getClientIpForCapi(req),
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      }).catch(() => {});
    }

    return NextResponse.json(result, { headers: cors });
  } catch (err: unknown) {
    Sentry.captureException(err);
    const message = err instanceof Error ? err.message : 'Scoring failed';
    return NextResponse.json({ error: message }, { status: 500, headers: cors });
  }
}
