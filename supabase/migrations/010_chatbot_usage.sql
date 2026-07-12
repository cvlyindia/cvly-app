-- Run this once in Supabase → SQL Editor → New Query → paste → Run

create table if not exists chatbot_usage (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz default now()
);

create index if not exists chatbot_usage_ip_hash_created_at_idx on chatbot_usage (ip_hash, created_at);

alter table chatbot_usage enable row level security;

-- This table only ever stores an IP hash and a timestamp for rate-limit bookkeeping —
-- no per-user ownership concept, nothing sensitive. Needs open insert/select policies
-- so the server route (using the anon-key client, not a service role) can actually
-- read and write it — RLS with zero policies would silently block even our own code.
drop policy if exists "Anyone can log chatbot usage" on chatbot_usage;
create policy "Anyone can log chatbot usage"
  on chatbot_usage for insert
  with check (true);

drop policy if exists "Anyone can read chatbot usage for rate limiting" on chatbot_usage;
create policy "Anyone can read chatbot usage for rate limiting"
  on chatbot_usage for select
  using (true);
