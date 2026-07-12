-- Run this once in Supabase → SQL Editor → New Query → paste → Run

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

create policy "Users can view their own career reviews"
  on career_reviews for select
  using (auth.uid() = user_id);

create policy "Users can insert their own career reviews"
  on career_reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own career reviews"
  on career_reviews for delete
  using (auth.uid() = user_id);
