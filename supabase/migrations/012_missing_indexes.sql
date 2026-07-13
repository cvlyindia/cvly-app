-- Run this once in Supabase → SQL Editor → New Query → paste → Run

-- scans, saved_jobs, and career_reviews all have their primary key on a generated
-- id column, but every real query filters by user_id instead (History, Dashboard
-- stats, Tracker, the admin dashboard's per-user scan counts). Without an index on
-- user_id, Postgres has to scan the entire table for every one of those queries —
-- invisible at today's scale, but it quietly gets slower as rows accumulate.
create index if not exists scans_user_id_idx on scans (user_id);
create index if not exists saved_jobs_user_id_idx on saved_jobs (user_id);
create index if not exists career_reviews_user_id_idx on career_reviews (user_id);

-- created_at is the actual sort column on every one of these (History and the
-- admin dashboard both order by "most recent first") — a composite index serves
-- both the user_id filter and the created_at sort in a single index scan.
create index if not exists scans_user_id_created_at_idx on scans (user_id, created_at desc);
