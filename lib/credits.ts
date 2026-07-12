import { SupabaseClient } from '@supabase/supabase-js';

export const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 150,
  enterprise: 1000,
};

export const ACTION_COSTS = {
  score: 1,
  rewrite: 1,
  cover: 1,
  interview: 3, // heavier Gemini call — larger output, longer generation
  linkedin: 1,
  portfolio: 1,
} as const;

export type CreditAction = keyof typeof ACTION_COSTS;

export interface CreditStatus {
  allowed: boolean;
  remaining: number;
  plan: string;
  cost: number;
  resetAt: string;
}

/**
 * Gets the user's credit row, creating one with free-tier defaults if it doesn't exist yet.
 * Also resets credits if the monthly reset window has passed.
 */
async function getOrCreateCredits(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { data: created } = await supabase
      .from('user_credits')
      .insert({ user_id: userId })
      .select('*')
      .single();
    return created;
  }

  // Monthly reset check
  if (new Date(existing.credits_reset_at) <= new Date()) {
    const { data: reset } = await supabase
      .from('user_credits')
      .update({
        credits_remaining: PLAN_LIMITS[existing.plan] ?? PLAN_LIMITS.free,
        credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('user_id', userId)
      .select('*')
      .single();
    return reset;
  }

  return existing;
}

/**
 * Checks whether the user has enough credits for the given action.
 * Does NOT deduct — call spendCredits after a successful AI call.
 */
export async function checkCredits(supabase: SupabaseClient, userId: string, action: CreditAction): Promise<CreditStatus> {
  const row = await getOrCreateCredits(supabase, userId);
  const cost = ACTION_COSTS[action];

  if (!row) {
    // Fail-open for logged-in users if the credits row genuinely can't be read/created —
    // never block a paying-intent user due to our own infra hiccup.
    return { allowed: true, remaining: PLAN_LIMITS.free, plan: 'free', cost, resetAt: '' };
  }

  return {
    allowed: row.credits_remaining >= cost,
    remaining: row.credits_remaining,
    plan: row.plan,
    cost,
    resetAt: row.credits_reset_at,
  };
}

/**
 * Deducts credits after a successful AI call. Call this only once the Gemini call has succeeded,
 * so a failed generation doesn't cost the user anything.
 */
export async function spendCredits(supabase: SupabaseClient, userId: string, action: CreditAction) {
  const cost = ACTION_COSTS[action];
  const { data: row } = await supabase
    .from('user_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .maybeSingle();

  if (!row) return;

  await supabase
    .from('user_credits')
    .update({ credits_remaining: Math.max(0, row.credits_remaining - cost) })
    .eq('user_id', userId);
}
