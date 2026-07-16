import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { ACTION_COSTS, type CreditAction } from '@/lib/credits';

// A deliberately small taste, not the full product: Rewrite, Cover Letter, and
// Interview Prep now require a free account (see those routes), so this budget only
// covers Score itself (and image-upload OCR). 3 free scores/day is enough to compare
// a couple of roles without commitment, not enough to run a whole job search on
// forever without ever creating an account — that's the actual point of it existing.
const ANONYMOUS_DAILY_BUDGET = 3;
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
