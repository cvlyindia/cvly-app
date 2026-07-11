-- Run this once in Supabase → SQL Editor → New Query → paste → Run
-- Extends the existing waitlist table to support Pro and Enterprise interest separately

alter table waitlist add column if not exists plan text default 'pro';
alter table waitlist add column if not exists company text;
