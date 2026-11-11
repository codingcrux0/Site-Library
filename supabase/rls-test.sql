-- Proof that the bookmark locks work. Run it in the Supabase SQL Editor AFTER supabase/bookmarks.sql.
-- It makes two pretend people, tries to break every rule, and then ROLLS BACK, so it leaves nothing behind (no users, no bookmarks).
-- SUCCESS looks like an error on purpose: the message is "ALL BOOKMARK CHECKS PASSED ...". (Ending with an error is what makes the database
-- undo everything, and the editor only shows the last thing that happened.) FAILURE is a message that starts with FAIL. Nothing is saved either way.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'person-a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'person-b@test.invalid');

-- ---- Person A (signed in) ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.bookmarks (site_id) values ('originkit'), ('layro');   -- user_id is filled in by the database

do $$ begin
  if (select count(*) from public.bookmarks) <> 2 then raise exception 'FAIL: A should see exactly their own 2 bookmarks'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- A tries to save a bookmark AS person B
  begin
    insert into public.bookmarks (user_id, site_id) values ('22222222-2222-2222-2222-222222222222', 'sneaky');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could save a bookmark for B'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- the same website twice
  begin insert into public.bookmarks (site_id) values ('originkit');
  exception when unique_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a duplicate bookmark was accepted'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- an id that is not a plain website id
  begin insert into public.bookmarks (site_id) values ('<script>alert(1)</script>');
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a bad id was accepted'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- the limit: 2 saved + 498 more = 500, the 501st must be refused
  for i in 1..498 loop insert into public.bookmarks (site_id) values ('s' || i); end loop;
  begin insert into public.bookmarks (site_id) values ('one-too-many');
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: the 501st bookmark was accepted'; end if;
end $$;

-- ---- Person B (signed in) ----
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

do $$ declare removed int; begin
  if (select count(*) from public.bookmarks) <> 0 then raise exception 'FAIL: B can see A''s bookmarks'; end if;
  delete from public.bookmarks where site_id = 'originkit';
  get diagnostics removed = row_count;
  if removed <> 0 then raise exception 'FAIL: B deleted A''s bookmark'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- nobody can edit a bookmark (there is no update)
  begin update public.bookmarks set site_id = 'changed';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: an update was allowed'; end if;
end $$;

-- ---- Someone not signed in ----
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ declare refused boolean := false; begin
  begin perform count(*) from public.bookmarks;
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could read bookmarks'; end if;
end $$;

-- ---- Deleting a person removes their bookmarks ----
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  if (select count(*) from public.bookmarks where user_id = '11111111-1111-1111-1111-111111111111') <> 0 then
    raise exception 'FAIL: deleting a person left their bookmarks behind';
  end if;
end $$;

do $$ begin raise exception 'ALL BOOKMARK CHECKS PASSED (this error is on purpose: it undoes the test people and bookmarks)'; end $$;
