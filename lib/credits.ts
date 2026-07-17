import { SupabaseClient } from '@supabase/supabase-js';
import { sendCapiEvent } from './metaCapi';

export const PLAN_LIMITS: Record<string, number> = {
  free: 5,
  pro: 100,
  enterprise: 1000,
};

export const ACTION_COSTS = {
  score: 1,
  rewrite: 1,
  cover: 1,
  interview: 3, // heavier Gemini call — larger output, longer generation
  linkedin: 1,
  portfolio: 1,
  imageUpload: 1, // real Gemini Vision call for OCR-transcribing a photographed resume
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
 * Also resets credits if the daily reset window has passed.
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
      // Explicitly set credits_remaining from PLAN_LIMITS rather than relying on
      // the database column's own default value - that default is a second,
      // easy-to-forget source of truth for this number, separate from
      // PLAN_LIMITS, and the two can silently drift out of sync (exactly what
      // happened when the free-tier limit changed here without a matching
      // schema update). This is the single place that should ever decide it.
      .insert({ user_id: userId, credits_remaining: PLAN_LIMITS.free })
      .select('*')
      .single();

    // Fires exactly once per real user, right at the one moment that reliably
    // means "this is a brand new Cvly account" — not threaded through email/IP
    // since checkCredits is called from many existing routes and this keeps
    // that surface unchanged. external_id (hashed user ID) alone is enough
    // for this event to still count as a valid CAPI signal.
    sendCapiEvent({
      eventName: 'CompleteRegistration',
      eventId: `signup_${userId}`,
      user: { userId },
    }).catch(() => {});

    return created;
  }

  // Daily reset check
  if (new Date(existing.credits_reset_at) <= new Date()) {
    const { data: reset } = await supabase
      .from('user_credits')
      .update({
        credits_remaining: PLAN_LIMITS[existing.plan] ?? PLAN_LIMITS.free,
        credits_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
  const { error } = await supabase.rpc('decrement_credits', { p_user_id: userId, p_cost: cost });

  if (error) {
    // Fallback for the window before migration 013 has been run, or if the RPC
    // is ever unavailable — same select-then-update as before, just not the default path.
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
}
