-- Run this once in Supabase → SQL Editor → New Query → paste → Run

-- rewritten_resume used to store plain text; it now stores structured JSON
-- (name, contact, experience, education, skills) so a real templated document
-- can be generated from it. Converting the column type to jsonb.
--
-- Any existing rows saved before this change have plain text in this column,
-- not JSON — those can't be cast to jsonb, so this sets them to null instead
-- of failing the whole migration. Only affects old saved rewrites; nothing else.
alter table scans
  alter column rewritten_resume type jsonb
  using (
    case
      when rewritten_resume ~ '^\s*[\{\[]' then rewritten_resume::jsonb
      else null
    end
  );
