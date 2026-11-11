-- Written reviews. Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run. (Run bookmarks.sql and account.sql first.)
-- Then run supabase/reviews-test.sql to prove the locks work.
--
-- How it works, in plain words:
--   * A signed-in person writes ONE review per website (10 to 600 characters, plain text, no web addresses). They can change or delete it.
--   * A new or changed review is HIDDEN until the owner approves it: Table Editor > reviews > tick the "approved" box on the row.
--     (A person can never tick that box themselves: the database does not let them touch it.)
--   * Approved reviews are shown to everyone WITHOUT a name, through the view at the bottom (it has no user column at all).
--   * Deleting an account removes its reviews too (the table cascades).
-- The id and length rules equal src/lib/bookmarks.ts and src/lib/reviews.ts. The link pattern equals LINK_PATTERN in src/lib/reviews.ts.

create table if not exists public.reviews (
  -- Filled in by the database from the signed-in person, so the page can never say "this review is somebody else's".
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  site_id    text        not null,
  body       text        not null,
  approved   boolean     not null default false,
  created_at timestamptz not null default now(),
  -- One review per website per person; writing again means changing the text (an update).
  primary key (user_id, site_id),
  constraint reviews_site_id_ok check (site_id ~ '^[a-z0-9-]{1,60}$'),
  constraint reviews_length_ok check (char_length(body) between 10 and 600),
  constraint reviews_no_links check (body !~* '(https?:\/\/|www\.|[a-z0-9]\.(com|net|org|io|in|co|app|dev|me|ly|xyz|info|ai)([^a-z]|$))')
);

alter table public.reviews enable row level security;

-- Start from nothing, then give back only what is needed. A signed-out visitor (role "anon") gets nothing on this table.
-- An insert may set the website and the text and nothing else (so not "approved"); an update may change the text and nothing else.
revoke all on public.reviews from anon, authenticated;
grant select, delete on public.reviews to authenticated;
grant insert (site_id, body) on public.reviews to authenticated;
grant update (body) on public.reviews to authenticated;

drop policy if exists "read own reviews" on public.reviews;
drop policy if exists "add own reviews" on public.reviews;
drop policy if exists "change own reviews" on public.reviews;
drop policy if exists "delete own reviews" on public.reviews;

create policy "read own reviews" on public.reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own reviews" on public.reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "change own reviews" on public.reviews
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own reviews" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()));

-- Two guards: no more than 100 reviews per person (nobody can fill the free database), and a new or CHANGED text always goes back to
-- "waiting for the owner", even if the review was approved before.
create or replace function public.reviews_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.reviews where user_id = new.user_id) >= 100 then
      raise exception 'Review limit reached' using errcode = 'check_violation';
    end if;
    new.approved := false;
  elsif new.body is distinct from old.body then
    new.approved := false;
  end if;
  return new;
end $$;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.reviews_guard();

create index if not exists reviews_feed_idx on public.reviews (site_id, created_at desc) where approved;

-- ---- The public list: only APPROVED reviews, only the website, the text and the time. NO user column, so nobody can tell who wrote what. ----
-- This view runs with the owner's rights (that is how it can show everyone's approved rows). Anyone, signed in or not, may read it.
create or replace view public.review_feed as
  select site_id, body, created_at
  from public.reviews
  where approved;

revoke all on public.review_feed from public, anon, authenticated;
grant select on public.review_feed to anon, authenticated;
