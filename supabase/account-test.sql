-- Proof that the rating locks and "delete my account" work. Run it in the Supabase SQL Editor AFTER supabase/bookmarks.sql and supabase/account.sql.
-- Same trick as rls-test.sql: it makes two pretend people, tries to break every rule, then ROLLS BACK, so it leaves nothing behind.
-- SUCCESS looks like an error on purpose: the message is "ALL ACCOUNT CHECKS PASSED ...". FAILURE is a message that starts with FAIL.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'person-a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'person-b@test.invalid');

-- ---- Person A (signed in) ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.ratings (site_id, stars) values ('originkit', 5);   -- user_id is filled in by the database
insert into public.bookmarks (site_id) values ('originkit');

do $$ declare refused boolean := false; begin   -- A tries to rate AS person B
  begin insert into public.ratings (user_id, site_id, stars) values ('22222222-2222-2222-2222-222222222222', 'sneaky', 5);
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could rate as B'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- the same website twice
  begin insert into public.ratings (site_id, stars) values ('originkit', 4);
  exception when unique_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a second rating for the same website was accepted'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- 0 stars and 6 stars
  begin insert into public.ratings (site_id, stars) values ('zero', 0);
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: 0 stars was accepted'; end if;
  refused := false;
  begin insert into public.ratings (site_id, stars) values ('six', 6);
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: 6 stars was accepted'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- an id that is not a plain website id
  begin insert into public.ratings (site_id, stars) values ('<script>alert(1)</script>', 3);
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a bad website id was accepted'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- the limit: 1 rated + 499 more = 500, the 501st must be refused
  for i in 1..499 loop insert into public.ratings (site_id, stars) values ('s' || i, 3); end loop;
  begin insert into public.ratings (site_id, stars) values ('one-too-many', 3);
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: the 501st rating was accepted'; end if;
end $$;

-- changing my own rating works, and only the stars can change
update public.ratings set stars = 4 where site_id = 'originkit';
do $$ begin
  if (select stars from public.ratings where site_id = 'originkit') <> 4 then raise exception 'FAIL: A could not change their own rating'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- A tries to move the rating to another website, or to another person
  begin update public.ratings set site_id = 'moved' where site_id = 'originkit';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could change the website of a rating'; end if;
  refused := false;
  begin update public.ratings set user_id = '22222222-2222-2222-2222-222222222222' where site_id = 'originkit';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could hand a rating to B'; end if;
end $$;

-- ---- Person B (signed in) ----
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

do $$ declare changed int; begin
  if (select count(*) from public.ratings) <> 0 then raise exception 'FAIL: B can see A''s ratings'; end if;
  update public.ratings set stars = 1 where site_id = 'originkit';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: B changed A''s rating'; end if;
  delete from public.ratings where site_id = 'originkit';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: B deleted A''s rating'; end if;
end $$;

insert into public.ratings (site_id, stars) values ('originkit', 2);   -- B rates the same website: A gave 4, B gives 2

-- ---- Someone not signed in ----
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ declare refused boolean := false; begin   -- cannot read the ratings table
  begin perform count(*) from public.ratings;
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could read ratings'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- cannot rate
  begin insert into public.ratings (user_id, site_id, stars) values ('11111111-1111-1111-1111-111111111111', 'x', 5);
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could rate'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- cannot run "delete my account"
  begin perform public.delete_my_account();
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could run delete_my_account'; end if;
end $$;

do $$ declare r record; begin   -- CAN read the totals: 2 ratings (4 and 2) for originkit, average 3
  select * into r from public.rating_summary where site_id = 'originkit';
  if r.count is distinct from 2 or r.average is distinct from 3 or r.c2 <> 1 or r.c4 <> 1 or r.c5 <> 0 then
    raise exception 'FAIL: the public totals are wrong (count %, average %)', r.count, r.average;
  end if;
end $$;

-- the totals carry no person (checked as the database owner, who can read the catalogue)
reset role;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'rating_summary' and column_name = 'user_id') then
    raise exception 'FAIL: the public totals contain a user column';
  end if;
end $$;

-- ---- Delete my account: A removes themselves, and everything of theirs goes; B is untouched ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.delete_my_account();

reset role;
do $$ begin
  if exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: A is still there after deleting their account'; end if;
  if exists (select 1 from public.ratings where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: A''s ratings are left behind'; end if;
  if exists (select 1 from public.bookmarks where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: A''s bookmarks are left behind'; end if;
  if not exists (select 1 from auth.users where id = '22222222-2222-2222-2222-222222222222') then raise exception 'FAIL: B was deleted too'; end if;
  if (select count(*) from public.ratings where user_id = '22222222-2222-2222-2222-222222222222') <> 1 then raise exception 'FAIL: B lost their rating'; end if;
end $$;

do $$ begin raise exception 'ALL ACCOUNT CHECKS PASSED (this error is on purpose: it undoes the test people and their ratings)'; end $$;
