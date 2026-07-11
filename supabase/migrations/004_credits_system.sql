-- Run this once in Supabase → SQL Editor → New Query → paste → Run

create table if not exists user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  credits_remaining int not null default 5,
  credits_reset_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz default now()
);

alter table user_credits enable row level security;

create policy "Users can view their own credits"
  on user_credits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credits row"
  on user_credits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own credits"
  on user_credits for update
  using (auth.uid() = user_id);
