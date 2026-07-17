-- 15. Credit top-up packs: purchase tracking + atomic increment
create table if not exists credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_order_id text not null unique,
  credits_purchased int not null,
  amount_paise int not null,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz default now()
);
alter table credit_purchases enable row level security;

drop policy if exists "Users can view their own credit purchases" on credit_purchases;
create policy "Users can view their own credit purchases" on credit_purchases for select using (auth.uid() = user_id);

create index if not exists credit_purchases_user_id_idx on credit_purchases (user_id);

-- Mirrors decrement_credits: a single atomic round-trip rather than a
-- read-current-value-then-write-new-value from application code, which would be a
-- genuine race condition under concurrent requests (e.g., a webhook retry landing
-- at the same moment as another top-up) — two reads of the same starting value
-- followed by two writes would silently lose one of the top-ups.
create or replace function increment_credits(p_user_id uuid, p_amount int)
returns void
language sql
as $$
  update user_credits
  set credits_remaining = credits_remaining + p_amount
  where user_id = p_user_id;
$$;
