-- The owner's review page. Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run. (Run reviews.sql first.)
-- Then run supabase/moderation-test.sql to prove the locks work.
--
-- How it works, in plain words:
--   * The owner is NOT identified by an email, a password or anything the page sends. The owner is one (or a few) account ids in the
--     "owners" table below. Nobody can read or write that table through the site: only the database's own owner can, in the SQL Editor.
--   * Three functions do the owner's work: list the reviews (with who wrote each), approve or hide one, delete one. Each one starts by asking
--     "is the caller an owner?" and refuses everybody else, signed in or not. Signed-out visitors cannot run them at all.
--   * Approving carries the exact text the owner read. If the author edited it in the meantime, the approval is refused (it would otherwise
--     publish words nobody checked).
--   * To add yourself as the owner, see supabase/owner-setup.sql.

create table if not exists public.owners (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- No policy and no grant: through the site, nobody can read or write this table, not even the owner. Only the SQL Editor can change it.
alter table public.owners enable row level security;
revoke all on public.owners from anon, authenticated;

-- "Is the person calling me an owner?" (true or false). It runs with the database owner's rights so it can read the table above.
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.owners where user_id = (select auth.uid()))
$$;

revoke all on function public.is_owner() from public, anon, authenticated;
grant execute on function public.is_owner() to authenticated;

-- Every review, the ones waiting first, then the newest; each with the author's email (the owner may see who wrote it; the Privacy page says so).
create or replace function public.owner_reviews()
returns table (user_id uuid, site_id text, body text, approved boolean, created_at timestamptz, author text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Not allowed' using errcode = 'insufficient_privilege'; end if;
  return query
    select r.user_id, r.site_id, r.body, r.approved, r.created_at, coalesce(u.email, '')::text
    from public.reviews r
    join auth.users u on u.id = r.user_id
    order by r.approved asc, r.created_at desc
    limit 200;
end $$;

revoke all on function public.owner_reviews() from public, anon, authenticated;
grant execute on function public.owner_reviews() to authenticated;

-- Approve (true) or hide (false) one review. It must be the very text the owner read (p_body), or nothing changes and it says so.
create or replace function public.owner_set_review(p_user uuid, p_site text, p_body text, p_approved boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Not allowed' using errcode = 'insufficient_privilege'; end if;
  update public.reviews set approved = p_approved where user_id = p_user and site_id = p_site and body = p_body;
  if not found then raise exception 'That review changed or is gone' using errcode = 'no_data_found'; end if;
end $$;

revoke all on function public.owner_set_review(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.owner_set_review(uuid, text, text, boolean) to authenticated;

-- Delete one review for good.
create or replace function public.owner_delete_review(p_user uuid, p_site text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Not allowed' using errcode = 'insufficient_privilege'; end if;
  delete from public.reviews where user_id = p_user and site_id = p_site;
end $$;

revoke all on function public.owner_delete_review(uuid, text) from public, anon, authenticated;
grant execute on function public.owner_delete_review(uuid, text) to authenticated;
