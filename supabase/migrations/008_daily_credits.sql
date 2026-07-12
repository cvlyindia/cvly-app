-- Run this once in Supabase → SQL Editor → New Query → paste → Run

-- Bring any existing users onto the new daily scheme right away, instead of making
-- them wait out their old 30-day reset window.
update user_credits set
  credits_remaining = case plan
    when 'free' then 10
    when 'pro' then 100
    when 'enterprise' then 1000
    else 10
  end,
  credits_reset_at = now() + interval '1 day';

-- New signups going forward get the new defaults directly from the table.
alter table user_credits alter column credits_remaining set default 10;
alter table user_credits alter column credits_reset_at set default (now() + interval '1 day');
