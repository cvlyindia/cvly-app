-- Run this once in Supabase → SQL Editor → New Query → paste → Run

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
  created_at timestamptz default now()
);

alter table scans enable row level security;

create policy "Users can view their own scans"
  on scans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scans"
  on scans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own scans"
  on scans for delete
  using (auth.uid() = user_id);
