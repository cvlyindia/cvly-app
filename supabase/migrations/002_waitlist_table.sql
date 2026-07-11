-- Run this once in Supabase → SQL Editor → New Query → paste → Run

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;

-- Anyone can join the waitlist (no auth required — this is a public signup form)
create policy "Anyone can join the waitlist"
  on waitlist for insert
  with check (true);
