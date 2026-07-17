-- 14. Real billing: subscriptions + webhook idempotency
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  razorpay_subscription_id text not null unique,
  razorpay_plan_id text not null,
  plan text not null check (plan in ('pro', 'enterprise')),
  status text not null default 'created' check (status in
    ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired')),
  current_start timestamptz,
  current_end timestamptz,
  -- Tracks whether the Meta CAPI Purchase event has already fired for this
  -- subscription's first successful charge, so a retried/duplicate webhook
  -- delivery can never fire it twice.
  purchase_event_sent boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on subscriptions;
create policy "Users can view their own subscription" on subscriptions for select using (auth.uid() = user_id);

create index if not exists subscriptions_user_id_idx on subscriptions (user_id);
create index if not exists subscriptions_razorpay_id_idx on subscriptions (razorpay_subscription_id);

-- Razorpay explicitly documents that the same webhook event may be delivered more
-- than once (retries on timeout/non-2xx). x-razorpay-event-id is unique per event;
-- recording processed IDs here is what makes the webhook handler safe to receive
-- the same event twice without double-crediting a plan or double-firing a Purchase
-- event to Meta.
create table if not exists webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz default now()
);
-- Only ever touched by the service-role admin client in the webhook route, never
-- by a regular user session — enabling RLS with zero policies correctly
-- default-denies the anon/authenticated roles entirely, while the service role
-- still bypasses RLS as it always does regardless.
alter table webhook_events enable row level security;
