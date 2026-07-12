-- Run this once in Supabase → SQL Editor → New Query → paste → Run

alter table scans add column if not exists rewritten_resume text;
alter table scans add column if not exists cover_letter text;
alter table scans add column if not exists interview_questions jsonb;
alter table scans add column if not exists practiced_questions jsonb default '[]'::jsonb;
