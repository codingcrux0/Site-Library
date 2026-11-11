-- Named lists. Run this ONCE in the Supabase dashboard: SQL Editor > New query > paste > Run. (Run bookmarks.sql first.)
-- Then run supabase/lists-test.sql to prove the locks work.
--
-- How it works, in plain words:
--   * "Saved" is the person's bookmarks (the bookmarks table, unchanged). Named lists are extra groupings of SAVED websites.
--   * A signed-in person makes up to 10 lists (a name of 1 to 40 characters), renames them, deletes them, and puts saved websites in them.
--   * A website can only be in a list while it is bookmarked: removing the bookmark takes it out of every list (the table cascades).
--   * Deleting a list removes only the list and its membership rows. The bookmarks themselves stay.
--   * Lists are PRIVATE: nobody else can read them, and there is no public view of them at all.
--   * Deleting an account removes its lists too (the tables cascade).
-- The limits equal src/lib/lists.ts, and a test keeps the two copies equal.

create table if not exists public.lists (
  -- Made by the database, so the page cannot choose it.
  id         uuid        primary key default gen_random_uuid(),
  -- Filled in by the database from the signed-in person, so the page can never say "this list is somebody else's".
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now(),
  -- One plain line of 1 to 40 characters, no hidden characters, and not the name "Saved" (that is the list of every bookmark).
  constraint lists_name_ok check (char_length(name) between 1 and 40 and name = btrim(name) and name !~ '[[:cntrl:]]'),
  constraint lists_name_not_saved check (lower(name) <> 'saved'),
  -- Lets a list item point at a list AND its owner together (see list_items below).
  constraint lists_id_user_unique unique (id, user_id)
);

-- Two lists of one person cannot share a name (capital letters do not make a new name).
create unique index if not exists lists_name_unique on public.lists (user_id, lower(name));

create table if not exists public.list_items (
  list_id    uuid        not null,
  user_id    uuid        not null default auth.uid(),
  site_id    text        not null,
  created_at timestamptz not null default now(),
  primary key (list_id, site_id),
  -- The list must be the same person's list, and the website must be one of the same person's bookmarks. The database checks both itself,
  -- so even a page that has been edited cannot put somebody's website into somebody else's list.
  constraint list_items_list_fk foreign key (list_id, user_id) references public.lists (id, user_id) on delete cascade,
  constraint list_items_bookmark_fk foreign key (user_id, site_id) references public.bookmarks (user_id, site_id) on delete cascade
);

create index if not exists list_items_bookmark_idx on public.list_items (user_id, site_id);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;

-- Start from nothing, then give back only what is needed. A signed-out visitor (role "anon") gets nothing on either table.
-- A new list may set its name and nothing else; a rename may change the name and nothing else; an item may set the list and the website.
revoke all on public.lists from anon, authenticated;
revoke all on public.list_items from anon, authenticated;
grant select, delete on public.lists to authenticated;
grant insert (name) on public.lists to authenticated;
grant update (name) on public.lists to authenticated;
grant select, delete on public.list_items to authenticated;
grant insert (list_id, site_id) on public.list_items to authenticated;

drop policy if exists "read own lists" on public.lists;
drop policy if exists "add own lists" on public.lists;
drop policy if exists "change own lists" on public.lists;
drop policy if exists "delete own lists" on public.lists;
drop policy if exists "read own list items" on public.list_items;
drop policy if exists "add own list items" on public.list_items;
drop policy if exists "delete own list items" on public.list_items;

create policy "read own lists" on public.lists
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own lists" on public.lists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "change own lists" on public.lists
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own lists" on public.lists
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "read own list items" on public.list_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "add own list items" on public.list_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "delete own list items" on public.list_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- The limit: no more than 10 lists per person. (A list holds only bookmarked websites, and bookmarks are limited to 500, so the items are
-- limited too: nobody can fill the free database.) Two inserts at the very same instant could in theory slip a person one over; that costs nothing.
create or replace function public.lists_limit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.lists where user_id = new.user_id) >= 10 then
    raise exception 'List limit reached' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists lists_limit on public.lists;
create trigger lists_limit before insert on public.lists
  for each row execute function public.lists_limit();
