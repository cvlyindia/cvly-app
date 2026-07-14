import { describe, it, expect } from 'vitest';
import { checkCredits, spendCredits, PLAN_LIMITS, ACTION_COSTS } from '@/lib/credits';
import { createMockSupabase } from './mockSupabase';
import type { SupabaseClient } from '@supabase/supabase-js';

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe('PLAN_LIMITS and ACTION_COSTS — regression guard', () => {
  it('matches the documented daily credit scheme', () => {
    expect(PLAN_LIMITS.free).toBe(10);
    expect(PLAN_LIMITS.pro).toBe(100);
    expect(PLAN_LIMITS.enterprise).toBe(1000);
  });

  it('charges interview prep 3x more than a single generation, everything else 1', () => {
    expect(ACTION_COSTS.score).toBe(1);
    expect(ACTION_COSTS.rewrite).toBe(1);
    expect(ACTION_COSTS.cover).toBe(1);
    expect(ACTION_COSTS.linkedin).toBe(1);
    expect(ACTION_COSTS.portfolio).toBe(1);
    expect(ACTION_COSTS.imageUpload).toBe(1);
    expect(ACTION_COSTS.interview).toBe(3);
  });
});

describe('checkCredits', () => {
  it('allows the action when remaining credits cover the cost', async () => {
    const mock = createMockSupabase([
      { data: { credits_remaining: 5, plan: 'free', credits_reset_at: FUTURE }, error: null },
    ]);
    const result = await checkCredits(mock as unknown as SupabaseClient, 'user-1', 'score');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it('blocks the action when remaining credits are below the cost — the actual money-protecting check', async () => {
    const mock = createMockSupabase([
      { data: { credits_remaining: 0, plan: 'free', credits_reset_at: FUTURE }, error: null },
    ]);
    const result = await checkCredits(mock as unknown as SupabaseClient, 'user-1', 'score');
    expect(result.allowed).toBe(false);
  });

  it('blocks correctly right at the boundary — remaining exactly equal to a multi-credit cost is allowed, one below is not', async () => {
    const mockAtBoundary = createMockSupabase([
      { data: { credits_remaining: 3, plan: 'free', credits_reset_at: FUTURE }, error: null },
    ]);
    const atBoundary = await checkCredits(mockAtBoundary as unknown as SupabaseClient, 'user-1', 'interview');
    expect(atBoundary.allowed).toBe(true);

    const mockBelowBoundary = createMockSupabase([
      { data: { credits_remaining: 2, plan: 'free', credits_reset_at: FUTURE }, error: null },
    ]);
    const belowBoundary = await checkCredits(mockBelowBoundary as unknown as SupabaseClient, 'user-1', 'interview');
    expect(belowBoundary.allowed).toBe(false);
  });

  it('resets to the full plan limit once the daily reset window has passed, and allows the action on the fresh credits', async () => {
    const mock = createMockSupabase([
      // First call: existing row, but its reset time is in the past
      { data: { credits_remaining: 0, plan: 'pro', credits_reset_at: PAST }, error: null },
      // Second call: the reset UPDATE, returning the row with credits restored
      { data: { credits_remaining: 100, plan: 'pro', credits_reset_at: FUTURE }, error: null },
    ]);
    const result = await checkCredits(mock as unknown as SupabaseClient, 'user-1', 'score');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
  });

  it('creates a free-tier row for a brand new user with no existing credits', async () => {
    const mock = createMockSupabase([
      { data: null, error: null }, // no existing row
      { data: { credits_remaining: 10, plan: 'free', credits_reset_at: FUTURE }, error: null }, // after insert
    ]);
    const result = await checkCredits(mock as unknown as SupabaseClient, 'new-user', 'score');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
    expect(result.plan).toBe('free');
  });

  it('fails open (never blocks a real user) if the credits row genuinely cannot be read after creation', async () => {
    const mock = createMockSupabase([
      { data: null, error: null },
      { data: null, error: 'insert failed' },
    ]);
    const result = await checkCredits(mock as unknown as SupabaseClient, 'user-1', 'score');
    expect(result.allowed).toBe(true);
  });
});

describe('spendCredits', () => {
  it('spends via the atomic RPC when it succeeds, without falling back', async () => {
    const mock = createMockSupabase([{ data: null, error: null }]);
    await spendCredits(mock as unknown as SupabaseClient, 'user-1', 'score');
    const rpcCalls = mock.getRpcCalls();
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe('decrement_credits');
    expect(rpcCalls[0].params).toEqual({ p_user_id: 'user-1', p_cost: 1 });
    // No fallback select/update should have happened
    expect(mock.getUpdateCalls()).toHaveLength(0);
  });

  it('falls back to select-then-update if the RPC errors', async () => {
    const mock = createMockSupabase([
      { data: null, error: 'rpc unavailable' }, // rpc fails
      { data: { credits_remaining: 5 }, error: null }, // fallback select
      { data: null, error: null }, // fallback update
    ]);
    await spendCredits(mock as unknown as SupabaseClient, 'user-1', 'score');
    const updateCalls = mock.getUpdateCalls();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toEqual({ credits_remaining: 4 });
  });

  it('never lets credits go negative in the fallback path — the actual invariant that protects against a runaway bill', async () => {
    const mock = createMockSupabase([
      { data: null, error: 'rpc unavailable' },
      { data: { credits_remaining: 0 }, error: null }, // already at zero
      { data: null, error: null },
    ]);
    await spendCredits(mock as unknown as SupabaseClient, 'user-1', 'interview'); // cost 3
    const updateCalls = mock.getUpdateCalls();
    expect(updateCalls[0]).toEqual({ credits_remaining: 0 }); // floored at 0, not -3
  });
});
