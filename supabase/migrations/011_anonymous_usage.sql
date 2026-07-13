-- Run this once in Supabase → SQL Editor → New Query → paste → Run

create table if not exists anonymous_usage (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  action text not null,
  cost int not null,
  created_at timestamptz default now()
);

create index if not exists anonymous_usage_ip_hash_created_at_idx on anonymous_usage (ip_hash, created_at);

alter table anonymous_usage enable row level security;

-- Same reasoning as chatbot_usage: this table only ever stores an IP hash, an action
-- name, and a timestamp for rate-limit bookkeeping — nothing sensitive, no per-user
-- ownership concept. Needs open policies so the server route (anon-key client, not
-- service role) can actually read and write it.
drop policy if exists "Anyone can log anonymous usage" on anonymous_usage;
create policy "Anyone can log anonymous usage"
  on anonymous_usage for insert
  with check (true);

drop policy if exists "Anyone can read anonymous usage for rate limiting" on anonymous_usage;
create policy "Anyone can read anonymous usage for rate limiting"
  on anonymous_usage for select
  using (true);
