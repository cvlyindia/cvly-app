-- Run this once in Supabase → SQL Editor → New Query → paste → Run

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

create policy "Users can view their own saved jobs"
  on saved_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved jobs"
  on saved_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved jobs"
  on saved_jobs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own saved jobs"
  on saved_jobs for delete
  using (auth.uid() = user_id);
