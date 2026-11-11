-- Star ratings and "delete my account". Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- (Run supabase/bookmarks.sql first if you have not. Then run supabase/account-test.sql to prove the locks work.)
-- The id rule is the same as for bookmarks (src/lib/bookmarks.ts). The star numbers the page shows come from the public view below.

-- ---- Ratings: one row per person per website, 1 to 5 stars. Only the person can see or change their own row. ----
create table if not exists public.ratings (
  -- Filled in by the database from the signed-in person, so the page can never say "this rating is somebody else's".
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  site_id    text        not null check (site_id ~ '^[a-z0-9-]{1,60}$'),
  stars      smallint    not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  -- One rating per website per person; rating again means changing the number (an update).
  primary key (user_id, site_id)
);

alter table public.ratings enable row level security;

-- Start from nothing, then give back only what is needed. A signed-out visitor (role "anon") gets nothing on this table.
-- An update may change the number of stars and nothing else (not the owner, not the website).
revoke all on public.ratings from anon, authenticated;
grant select, insert, delete on public.ratings to authenticated;
grant update (stars) on public.ratings to authenticated;

drop policy if exists "read own ratings" on public.ratings;
drop policy if exists "add own ratings" on public.ratings;
drop policy if exists "change own ratings" on public.ratings;
drop policy if exists "delete own ratings" on public.ratings;

create policy "read own ratings" on public.ratings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own ratings" on public.ratings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "change own ratings" on public.ratings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own ratings" on public.ratings
  for delete to authenticated using (user_id = (select auth.uid()));

-- The limit: no more than 500 ratings per person, so nobody can fill the free database.
create or replace function public.ratings_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.ratings where user_id = new.user_id) >= 500 then
    raise exception 'Rating limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists ratings_limit on public.ratings;
create trigger ratings_limit before insert on public.ratings
  for each row execute function public.ratings_limit();

-- ---- The public numbers: per website, how many ratings, the average, and how many gave each star count. ----
-- This view runs with the owner's rights (that is how it can add up everyone's rows), and it has NO user column, so nobody can tell who
-- rated what. Anyone, signed in or not, may read it. It can only ever show totals.
create or replace view public.rating_summary as
  select
    site_id,
    count(*)::int                                  as count,
    round(avg(stars)::numeric, 1)::float8          as average,
    (count(*) filter (where stars = 1))::int       as c1,
    (count(*) filter (where stars = 2))::int       as c2,
    (count(*) filter (where stars = 3))::int       as c3,
    (count(*) filter (where stars = 4))::int       as c4,
    (count(*) filter (where stars = 5))::int       as c5
  from public.ratings
  group by site_id;

revoke all on public.rating_summary from public, anon, authenticated;
grant select on public.rating_summary to anon, authenticated;

-- ---- "Delete my account": a signed-in person removes themselves, and with them every bookmark and rating (those tables cascade). ----
-- It can only delete the person who is calling it (auth.uid()); there is no way to name somebody else. A signed-out visitor cannot run it.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
