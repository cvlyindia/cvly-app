-- Run this once in Supabase → SQL Editor → New Query → paste → Run

-- spendCredits() used to do a SELECT then an UPDATE — two separate network round-trips
-- for every single credit-consuming action, on every request. This does the same
-- read-modify-write atomically inside Postgres itself, in one round-trip from the API.
create or replace function decrement_credits(p_user_id uuid, p_cost int)
returns void
language sql
as $$
  update user_credits
  set credits_remaining = greatest(0, credits_remaining - p_cost)
  where user_id = p_user_id;
$$;
