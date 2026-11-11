-- Bookmarks: one table, locked so each signed-in person can only ever touch their own rows.
-- Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run. Then run supabase/rls-test.sql to prove the locks work.
-- The same two rules (the id pattern and the limit) are in src/lib/bookmarks.ts, and a test keeps the two copies equal.

create table if not exists public.bookmarks (
  -- Filled in by the database from the signed-in person, so the page can never say "this is somebody else's bookmark".
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  -- A website id from src/config/library.ts: lowercase letters, digits and dashes, 1 to 60 long.
  site_id    text        not null check (site_id ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now(),
  -- One bookmark per website per person (a second one is refused).
  primary key (user_id, site_id)
);

-- Row level security: with this on and no matching rule, nobody can read or write a row.
alter table public.bookmarks enable row level security;

-- Start from nothing, then give back only what is needed. A signed-out visitor (role "anon") gets nothing at all. There is no "update".
revoke all on public.bookmarks from anon, authenticated;
grant select, insert, delete on public.bookmarks to authenticated;

drop policy if exists "read own bookmarks" on public.bookmarks;
drop policy if exists "add own bookmarks" on public.bookmarks;
drop policy if exists "delete own bookmarks" on public.bookmarks;

create policy "read own bookmarks" on public.bookmarks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own bookmarks" on public.bookmarks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own bookmarks" on public.bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));

-- The limit: no more than 500 bookmarks per person, so nobody can fill the free database.
-- (Two inserts at the very same instant could in theory slip a person a few over; that costs nothing and is accepted.)
create or replace function public.bookmarks_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.bookmarks where user_id = new.user_id) >= 500 then
    raise exception 'Bookmark limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists bookmarks_limit on public.bookmarks;
create trigger bookmarks_limit before insert on public.bookmarks
  for each row execute function public.bookmarks_limit();
