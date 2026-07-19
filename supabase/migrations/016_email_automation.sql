-- Email automation idempotency columns.
-- welcomed_at: set once when the welcome email is sent, so it can never double-send.
-- follow_up_emailed_at: set when a follow-up reminder goes out for an applied job,
-- so each job gets at most one nudge.

alter table user_credits add column if not exists welcomed_at timestamptz;
alter table saved_jobs add column if not exists follow_up_emailed_at timestamptz;
