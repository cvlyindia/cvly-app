import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { ACTION_COSTS, type CreditAction } from '@/lib/credits';

// Same daily budget as the logged-in free plan (see PLAN_LIMITS.free in lib/credits.ts) —
// anonymous visitors get a fair amount of real trial usage without a signup wall, while a
// scripted loop hitting these endpoints hits a real, enforced ceiling instead of running an
// unbounded bill with zero revenue behind it.
const ANONYMOUS_DAILY_BUDGET = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export interface AnonymousLimitResult {
  allowed: boolean;
  ipHash: string;
  cost: number;
}

/**
 * Checks (but does not log) whether an anonymous request is within the daily budget.
 * Call logAnonymousUsage separately, only after the AI call actually succeeds — same
 * pattern as checkCredits/spendCredits for logged-in users, so a failed generation
 * never costs an anonymous visitor any of their budget either.
 */
export async function checkAnonymousLimit(
  supabase: SupabaseClient,
  req: NextRequest,
  action: CreditAction
): Promise<AnonymousLimitResult> {
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const cost = ACTION_COSTS[action];

  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('anonymous_usage')
    .select('cost')
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart);

  if (error) {
    // Fail-open on our own infra hiccup, same philosophy as checkCredits — don't punish
    // a real visitor because a query failed on our end.
    return { allowed: true, ipHash, cost };
  }

  const spent = (data ?? []).reduce((sum, row) => sum + row.cost, 0);
  return { allowed: spent + cost <= ANONYMOUS_DAILY_BUDGET, ipHash, cost };
}

export async function logAnonymousUsage(supabase: SupabaseClient, ipHash: string, action: CreditAction) {
  await supabase.from('anonymous_usage').insert({ ip_hash: ipHash, action, cost: ACTION_COSTS[action] });
}
