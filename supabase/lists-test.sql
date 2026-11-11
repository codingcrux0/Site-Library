-- Proof that the named-list locks work. Run it in the Supabase SQL Editor AFTER supabase/bookmarks.sql and supabase/lists.sql.
-- Same trick as the other tests: it makes two pretend people, tries to break every rule, then ROLLS BACK, so it leaves nothing behind.
-- SUCCESS looks like an error on purpose: the message is "ALL LIST CHECKS PASSED ...". FAILURE is a message that starts with FAIL.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'person-a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'person-b@test.invalid');

-- ---- Person A (signed in) ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.bookmarks (site_id) values ('originkit'), ('layro'), ('third');
insert into public.lists (name) values ('Work');   -- the id and the owner are filled in by the database

do $$ begin
  if (select count(*) from public.lists) <> 1 then raise exception 'FAIL: A should see exactly their own list'; end if;
  if (select user_id from public.lists where name = 'Work') <> '11111111-1111-1111-1111-111111111111' then raise exception 'FAIL: the owner was not filled in by the database'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- A tries to make a list AS person B, to choose the id, or to backdate it
  begin insert into public.lists (user_id, name) values ('22222222-2222-2222-2222-222222222222', 'Sneaky');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could make a list as B'; end if;
  refused := false;
  begin insert into public.lists (id, name) values ('99999999-9999-4999-8999-999999999999', 'Chosen id');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could choose the id of a list'; end if;
  refused := false;
  begin insert into public.lists (name, created_at) values ('Backdated', '2000-01-01');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could set the time of a list'; end if;
end $$;

do $$ declare refused boolean; n text; begin   -- names: the same name in other capitals, "Saved", empty, too long, padded, hidden characters
  foreach n in array array['Work', 'WORK', 'work'] loop
    refused := false;
    begin insert into public.lists (name) values (n);
    exception when unique_violation then refused := true; end;
    if not refused then raise exception 'FAIL: a second list called % was accepted', n; end if;
  end loop;
  foreach n in array array['Saved', 'saved', 'SAVED', '', repeat('a', 41), ' padded', 'padded ', E'tab\there', E'bell\u0007', E'line\nbreak'] loop
    refused := false;
    begin insert into public.lists (name) values (n);
    exception when check_violation then refused := true; end;
    if not refused then raise exception 'FAIL: the list name % was accepted', quote_literal(n); end if;
  end loop;
  insert into public.lists (name) values (repeat('b', 40));   -- the longest allowed
  insert into public.lists (name) values ('Saved for later');   -- not the same as "Saved"
end $$;

do $$ declare refused boolean := false; begin   -- the limit: 3 lists so far, fill up to 10, the 11th must be refused
  for i in 1..(10 - (select count(*) from public.lists)) loop insert into public.lists (name) values ('Extra ' || i); end loop;
  begin insert into public.lists (name) values ('One too many');
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: the 11th list was accepted'; end if;
end $$;

-- a list may hold websites that are bookmarked
insert into public.list_items (list_id, site_id) select id, 'originkit' from public.lists where name = 'Work';
insert into public.list_items (list_id, site_id) select id, 'layro' from public.lists where name = 'Work';

do $$ declare refused boolean := false; begin
  begin insert into public.list_items (list_id, site_id) select id, 'originkit' from public.lists where name = 'Work';
  exception when unique_violation then refused := true; end;
  if not refused then raise exception 'FAIL: the same website was put in a list twice'; end if;
  refused := false;
  begin insert into public.list_items (list_id, site_id) select id, 'not-bookmarked' from public.lists where name = 'Work';
  exception when foreign_key_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a website that is not bookmarked was put in a list'; end if;
  refused := false;
  begin insert into public.list_items (list_id, site_id) select id, '<script>' from public.lists where name = 'Work';
  exception when foreign_key_violation or check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a bad website id was put in a list'; end if;
  refused := false;
  begin insert into public.list_items (list_id, user_id, site_id) select id, '22222222-2222-2222-2222-222222222222', 'third' from public.lists where name = 'Work';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could name another owner for a list item'; end if;
  refused := false;
  begin insert into public.list_items (list_id, site_id) values ('99999999-9999-4999-8999-999999999999', 'third');
  exception when foreign_key_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a website was put in a list that does not exist'; end if;
end $$;

-- renaming works, and only the name can change
update public.lists set name = 'Work tools' where name = 'Work';
do $$ declare refused boolean := false; begin
  if not exists (select 1 from public.lists where name = 'Work tools') then raise exception 'FAIL: A could not rename their own list'; end if;
  begin update public.lists set name = 'Extra 1' where name = 'Work tools';
  exception when unique_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a rename to a name already in use was accepted'; end if;
  refused := false;
  begin update public.lists set name = 'saved' where name = 'Work tools';
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a rename to "saved" was accepted'; end if;
  refused := false;
  begin update public.lists set user_id = '22222222-2222-2222-2222-222222222222' where name = 'Work tools';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could hand a list to B'; end if;
  refused := false;
  begin update public.lists set id = '99999999-9999-4999-8999-999999999999' where name = 'Work tools';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could change the id of a list'; end if;
  refused := false;
  begin update public.list_items set site_id = 'third';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could change a list item (items are added and removed only)'; end if;
end $$;

-- ---- A signed-out visitor ----
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ declare refused boolean := false; begin
  begin perform count(*) from public.lists; exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could read the lists'; end if;
  refused := false;
  begin perform count(*) from public.list_items; exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could read the list items'; end if;
  refused := false;
  begin insert into public.lists (name) values ('anon list'); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could make a list'; end if;
end $$;

-- ---- Person B (signed in, with their own bookmark of the same website) ----
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.bookmarks (site_id) values ('originkit'), ('third');
do $$ begin
  if (select count(*) from public.lists) <> 0 then raise exception 'FAIL: B could read A''s lists'; end if;
  if (select count(*) from public.list_items) <> 0 then raise exception 'FAIL: B could read A''s list items'; end if;
end $$;
-- B cannot see A's list, so the test (running as the owner for a moment) hands B its id, to prove that even knowing it is not enough
reset role;
select set_config('test.a_list', (select id::text from public.lists where name = 'Work tools'), true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$ declare refused boolean := false; begin
  begin insert into public.list_items (list_id, site_id) values (current_setting('test.a_list')::uuid, 'third');   -- A's list has no 'third' yet
  exception when foreign_key_violation then refused := true; end;
  if not refused then raise exception 'FAIL: B could put a website into A''s list'; end if;
end $$;
update public.lists set name = 'B renames A' where id = current_setting('test.a_list')::uuid;
delete from public.lists where id = current_setting('test.a_list')::uuid;
delete from public.list_items where list_id = current_setting('test.a_list')::uuid;
-- B has their own lists, with their own names, even ones A already uses
insert into public.lists (name) values ('Work tools');

-- ---- Back to A: nothing was changed ----
reset role;
do $$ begin
  if not exists (select 1 from public.lists where name = 'Work tools' and user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: B renamed or deleted A''s list'; end if;
  if (select count(*) from public.list_items where user_id = '11111111-1111-1111-1111-111111111111') <> 2 then raise exception 'FAIL: B changed A''s list items'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- removing a website from a list keeps the bookmark
delete from public.list_items where site_id = 'layro';
do $$ begin
  if exists (select 1 from public.list_items where site_id = 'layro') then raise exception 'FAIL: A could not take a website out of a list'; end if;
  if not exists (select 1 from public.bookmarks where site_id = 'layro') then raise exception 'FAIL: taking a website out of a list removed the bookmark'; end if;
end $$;

-- removing a bookmark takes the website out of every list
delete from public.bookmarks where site_id = 'originkit';
do $$ begin
  if exists (select 1 from public.list_items where site_id = 'originkit') then raise exception 'FAIL: a removed bookmark stayed in a list'; end if;
end $$;

-- deleting a list removes the list and its items, never the bookmarks
insert into public.list_items (list_id, site_id) select id, 'third' from public.lists where name = 'Work tools';
delete from public.lists where name = 'Work tools';
do $$ begin
  if exists (select 1 from public.lists where name = 'Work tools') then raise exception 'FAIL: A could not delete their own list'; end if;
  if exists (select 1 from public.list_items) then raise exception 'FAIL: deleting a list left its items behind'; end if;
  if (select count(*) from public.bookmarks) <> 2 then raise exception 'FAIL: deleting a list removed bookmarks'; end if;
end $$;

-- ---- Deleting the account removes every list and item ----
reset role;
insert into public.list_items (list_id, user_id, site_id) select id, user_id, 'third' from public.lists where user_id = '11111111-1111-1111-1111-111111111111' limit 1;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  if exists (select 1 from public.lists where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: deleting the account left lists behind'; end if;
  if exists (select 1 from public.list_items where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: deleting the account left list items behind'; end if;
  if not exists (select 1 from public.lists where user_id = '22222222-2222-2222-2222-222222222222') then raise exception 'FAIL: deleting A removed B''s list'; end if;
end $$;

do $$ begin raise exception 'ALL LIST CHECKS PASSED (names, limit, owners, bookmarks tie, cascades, no peeking). Nothing was saved.'; end $$;
rollback;
