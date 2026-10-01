-- Schema for the wedding invitation manager.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
-- Safe to re-run: everything is create-if-not-exists / drop-then-create.

create table if not exists public.families (
  id           uuid primary key default gen_random_uuid(),
  side         text        not null check (side in ('husain', 'zainab')),
  name         text        not null,
  city         text        not null default '',
  phone        text        not null default '',
  members      jsonb       not null default '[]'::jsonb,  -- ["Nani", "Irfan Mamu"]
  member_tags  jsonb       not null default '{}'::jsonb,  -- {"Zoya": ["mehndi"]}
  tag_counts   jsonb       not null default '{}'::jsonb,  -- {"mehndi": 4}
  tags         jsonb       not null default '[]'::jsonb,  -- ["mehndi", "mamera"]
  male_count   integer,
  female_count integer,
  child_count  integer,
  member_count integer,                                   -- legacy untyped total
  gift         boolean     not null default false,
  card_status  text        not null default 'pending',    -- pending|written|delivered
  notes        text        not null default '',
  created_at   timestamptz not null default now()
);

-- Every query filters by side, so index it.
create index if not exists families_side_idx on public.families (side);

alter table public.families enable row level security;

-- The app uses a hardcoded login in the browser, so Postgres cannot verify who
-- is asking. This policy therefore grants the publishable key full access.
-- To make the data private, switch to Supabase Auth and change this to:
--   using (auth.uid() is not null) with check (auth.uid() is not null)
drop policy if exists "app full access" on public.families;
create policy "app full access" on public.families
  for all using (true) with check (true);

-- Emit complete rows on update/delete so live sync stays correct.
alter table public.families replica identity full;

-- Turn on realtime for this table (skipped if already on, so re-runs work).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'families'
  ) then
    alter publication supabase_realtime add table public.families;
  end if;
end $$;
