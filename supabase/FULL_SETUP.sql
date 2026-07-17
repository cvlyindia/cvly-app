-- Cvly — full database setup, consolidated from migrations 001–013
-- Run this ONCE in Supabase → SQL Editor → New Query → paste this whole file → Run
--
-- This is not a replay of every incremental migration — it builds the final,
-- correct schema directly. A few of the original migrations existed only to
-- fix or convert EXISTING data (e.g., bumping old users onto a new credit
-- scheme, converting an old text column to jsonb) — none of that applies to
-- a fresh database with no rows in it yet, so those steps are skipped here
-- and the tables are just created correctly from the start.

-- ============================================================
-- 1. scans — every resume check, plus its rewrite/cover letter/
--    interview prep once generated
-- ============================================================
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  resume_text text not null,
  job_description text not null,
  score int not null,
  summary text,
  matched_keywords jsonb,
  missing_keywords jsonb,
  improvements jsonb,
  created_at timestamptz default now(),
  rewritten_resume jsonb,
  cover_letter text,
  interview_questions jsonb,
  practiced_questions jsonb default '[]'::jsonb
);

alter table scans enable row level security;

drop policy if exists "Users can view their own scans" on scans;
create policy "Users can view their own scans"
  on scans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own scans" on scans;
create policy "Users can insert their own scans"
  on scans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own scans" on scans;
create policy "Users can delete their own scans"
  on scans for delete
  using (auth.uid() = user_id);

create index if not exists scans_user_id_idx on scans (user_id);
create index if not exists scans_user_id_created_at_idx on scans (user_id, created_at desc);

-- ============================================================
-- 2. waitlist — Pro/Enterprise interest signups
-- ============================================================
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now(),
  plan text default 'pro',
  company text
);

alter table waitlist enable row level security;

drop policy if exists "Anyone can join the waitlist" on waitlist;
create policy "Anyone can join the waitlist"
  on waitlist for insert
  with check (true);

-- ============================================================
-- 3. user_credits — daily credit balance per user
-- ============================================================
create table if not exists user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  credits_remaining int not null default 5,
  credits_reset_at timestamptz not null default (now() + interval '1 day'),
  created_at timestamptz default now()
);

alter table user_credits enable row level security;

drop policy if exists "Users can view their own credits" on user_credits;
create policy "Users can view their own credits"
  on user_credits for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own credits row" on user_credits;
create policy "Users can insert their own credits row"
  on user_credits for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own credits" on user_credits;
create policy "Users can update their own credits"
  on user_credits for update
  using (auth.uid() = user_id);

-- ============================================================
-- 4. saved_jobs — the application tracker (Kanban board)
--    references scans, so scans must already exist (it does, above)
-- ============================================================
create table if not exists saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  status text not null default 'saved' check (status in ('saved', 'applied', 'interview', 'offer')),
  notes text,
  scan_id uuid references scans(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table saved_jobs enable row level security;

drop policy if exists "Users can view their own saved jobs" on saved_jobs;
create policy "Users can view their own saved jobs"
  on saved_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own saved jobs" on saved_jobs;
create policy "Users can insert their own saved jobs"
  on saved_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own saved jobs" on saved_jobs;
create policy "Users can update their own saved jobs"
  on saved_jobs for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own saved jobs" on saved_jobs;
create policy "Users can delete their own saved jobs"
  on saved_jobs for delete
  using (auth.uid() = user_id);

create index if not exists saved_jobs_user_id_idx on saved_jobs (user_id);

-- ============================================================
-- 5. career_reviews — LinkedIn and Portfolio review results
-- ============================================================
create table if not exists career_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('linkedin', 'portfolio')),
  input_text text not null,
  score int not null,
  summary text,
  strengths jsonb,
  improvements jsonb,
  created_at timestamptz default now()
);

alter table career_reviews enable row level security;

drop policy if exists "Users can view their own career reviews" on career_reviews;
create policy "Users can view their own career reviews"
  on career_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own career reviews" on career_reviews;
create policy "Users can insert their own career reviews"
  on career_reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own career reviews" on career_reviews;
create policy "Users can delete their own career reviews"
  on career_reviews for delete
  using (auth.uid() = user_id);

create index if not exists career_reviews_user_id_idx on career_reviews (user_id);

-- ============================================================
-- 6. chatbot_usage — IP-based rate limiting for the floating
--    chat assistant (the one endpoint on the whole site with no
--    login required, so it needs its own abuse protection)
-- ============================================================
create table if not exists chatbot_usage (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz default now()
);

create index if not exists chatbot_usage_ip_hash_created_at_idx on chatbot_usage (ip_hash, created_at);

alter table chatbot_usage enable row level security;

drop policy if exists "Anyone can log chatbot usage" on chatbot_usage;
create policy "Anyone can log chatbot usage"
  on chatbot_usage for insert
  with check (true);

drop policy if exists "Anyone can read chatbot usage for rate limiting" on chatbot_usage;
create policy "Anyone can read chatbot usage for rate limiting"
  on chatbot_usage for select
  using (true);

-- ============================================================
-- 7. anonymous_usage — IP-based rate limiting for anonymous
--    (not-signed-in) scans, rewrites, cover letters, and
--    interview prep — the tool has "no signup wall" by design,
--    but that usage still costs real money per AI call, so it
--    gets a real daily budget instead of being unmetered
-- ============================================================
create table if not exists anonymous_usage (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  action text not null,
  cost int not null,
  created_at timestamptz default now()
);

create index if not exists anonymous_usage_ip_hash_created_at_idx on anonymous_usage (ip_hash, created_at);

alter table anonymous_usage enable row level security;

drop policy if exists "Anyone can log anonymous usage" on anonymous_usage;
create policy "Anyone can log anonymous usage"
  on anonymous_usage for insert
  with check (true);

drop policy if exists "Anyone can read anonymous usage for rate limiting" on anonymous_usage;
create policy "Anyone can read anonymous usage for rate limiting"
  on anonymous_usage for select
  using (true);

-- ============================================================
-- 8. decrement_credits — atomic credit spend, one round-trip
--    instead of a separate read-then-write
-- ============================================================
create or replace function decrement_credits(p_user_id uuid, p_cost int)
returns void
language sql
as $$
  update user_credits
  set credits_remaining = greatest(0, credits_remaining - p_cost)
  where user_id = p_user_id;
$$;

-- ============================================================
-- 9. Real billing: subscriptions + webhook idempotency (Phase 5)
-- ============================================================
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
  purchase_event_sent boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on subscriptions;
create policy "Users can view their own subscription" on subscriptions for select using (auth.uid() = user_id);

create index if not exists subscriptions_user_id_idx on subscriptions (user_id);
create index if not exists subscriptions_razorpay_id_idx on subscriptions (razorpay_subscription_id);

create table if not exists webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz default now()
);
alter table webhook_events enable row level security;

-- ============================================================
-- 10. Credit top-up packs: purchase tracking + atomic increment (Phase 5)
-- ============================================================
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

create or replace function increment_credits(p_user_id uuid, p_amount int)
returns void
language sql
as $$
  update user_credits
  set credits_remaining = credits_remaining + p_amount
  where user_id = p_user_id;
$$;

-- ============================================================
-- Done. 10 tables, all RLS policies, all indexes, 2 functions.
-- ============================================================
