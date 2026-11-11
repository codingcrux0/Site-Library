-- Proof that the owner's review page is locked to the owner. Run it in the Supabase SQL Editor AFTER supabase/reviews.sql and supabase/moderation.sql.
-- Same trick as the other tests: it makes pretend people (one of them the owner), tries to break every rule, then ROLLS BACK, so it leaves nothing behind.
-- It does not touch the real owners list: the pretend owner exists only inside this test.
-- SUCCESS looks like an error on purpose: the message is "ALL OWNER CHECKS PASSED ...". FAILURE is a message that starts with FAIL.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'person-a@test.invalid'),   -- an ordinary person who writes a review
  ('22222222-2222-2222-2222-222222222222', 'owner@test.invalid'),      -- the pretend owner
  ('33333333-3333-3333-3333-333333333333', 'person-c@test.invalid');   -- another ordinary person
insert into public.owners (user_id) values ('22222222-2222-2222-2222-222222222222');

-- ---- Person A writes a review ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.reviews (site_id, body) values ('originkit', 'Clear and quick, it did what I needed.');

do $$ declare refused boolean; begin   -- an ordinary person can do none of the owner's things
  if public.is_owner() then raise exception 'FAIL: an ordinary person is an owner'; end if;
  refused := false;
  begin perform * from public.owner_reviews(); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: an ordinary person could list every review'; end if;
  refused := false;
  begin perform public.owner_set_review('11111111-1111-1111-1111-111111111111', 'originkit', 'Clear and quick, it did what I needed.', true);
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could approve their own review through the owner function'; end if;
  refused := false;
  begin perform public.owner_delete_review('11111111-1111-1111-1111-111111111111', 'originkit'); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: an ordinary person could delete a review through the owner function'; end if;
  refused := false;
  begin perform count(*) from public.owners; exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: an ordinary person could read the owners table'; end if;
  refused := false;
  begin insert into public.owners (user_id) values ('11111111-1111-1111-1111-111111111111'); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: an ordinary person could make themselves an owner'; end if;
  refused := false;
  begin delete from public.owners; exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: an ordinary person could delete owners'; end if;
end $$;
do $$ begin
  if (select approved from public.reviews where site_id = 'originkit') then raise exception 'FAIL: the review was approved by a person'; end if;
end $$;

-- ---- A signed-out visitor ----
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ declare refused boolean; begin
  refused := false;
  begin perform public.is_owner(); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could ask who is the owner'; end if;
  refused := false;
  begin perform * from public.owner_reviews(); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could list the reviews'; end if;
  refused := false;
  begin perform public.owner_set_review('11111111-1111-1111-1111-111111111111', 'originkit', 'x', true); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could approve a review'; end if;
  refused := false;
  begin perform public.owner_delete_review('11111111-1111-1111-1111-111111111111', 'originkit'); exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could delete a review'; end if;
  refused := false;
  begin perform count(*) from public.owners; exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could read the owners table'; end if;
end $$;

-- ---- The owner ----
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

do $$ declare refused boolean := false; begin
  if not public.is_owner() then raise exception 'FAIL: the owner was not recognised'; end if;
  if (select count(*) from public.owner_reviews()) <> 1 then raise exception 'FAIL: the owner should see the one review'; end if;
  if (select author from public.owner_reviews()) <> 'person-a@test.invalid' then raise exception 'FAIL: the owner cannot see who wrote the review'; end if;
  if (select approved from public.owner_reviews()) then raise exception 'FAIL: the waiting review shows as approved'; end if;
  -- even the owner cannot read the owners table through the site (only the SQL Editor can)
  begin perform count(*) from public.owners; exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: the owners table could be read through the site'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- approving counts only for the exact text that was read
  begin perform public.owner_set_review('11111111-1111-1111-1111-111111111111', 'originkit', 'Some other text than the review has.', true);
  exception when no_data_found then refused := true; end;
  if not refused then raise exception 'FAIL: an approval of different text was accepted'; end if;
  refused := false;
  begin perform public.owner_set_review('11111111-1111-1111-1111-111111111111', 'no-such-site', 'Clear and quick, it did what I needed.', true);
  exception when no_data_found then refused := true; end;
  if not refused then raise exception 'FAIL: an approval of a review that does not exist was accepted'; end if;
end $$;

select public.owner_set_review('11111111-1111-1111-1111-111111111111', 'originkit', 'Clear and quick, it did what I needed.', true);
do $$ begin
  if not (select approved from public.owner_reviews()) then raise exception 'FAIL: the owner could not approve a review'; end if;
end $$;

-- the public list now shows it, with the text and the time and no name
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (select count(*) from public.review_feed) <> 1 then raise exception 'FAIL: an approved review is not on the public list'; end if;
end $$;

-- the author edits it after it was approved: it goes back to waiting and the public list loses it
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.reviews set body = 'Edited after it was approved, so it must wait.' where site_id = 'originkit';
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (select count(*) from public.review_feed) <> 0 then raise exception 'FAIL: an edited review stayed on the public list'; end if;
end $$;

-- the owner approves the NEW text, then hides it again, then deletes it
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select public.owner_set_review('11111111-1111-1111-1111-111111111111', 'originkit', 'Edited after it was approved, so it must wait.', true);
select public.owner_set_review('11111111-1111-1111-1111-111111111111', 'originkit', 'Edited after it was approved, so it must wait.', false);
do $$ begin
  if (select approved from public.owner_reviews()) then raise exception 'FAIL: the owner could not hide a review'; end if;
end $$;
select public.owner_delete_review('11111111-1111-1111-1111-111111111111', 'originkit');
do $$ begin
  if (select count(*) from public.owner_reviews()) <> 0 then raise exception 'FAIL: the owner could not delete a review'; end if;
end $$;

-- ---- Person C (ordinary) is still not an owner, and removing the owner's account removes the owner row ----
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$ begin
  if public.is_owner() then raise exception 'FAIL: person C is an owner'; end if;
end $$;
reset role;
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
do $$ begin
  if exists (select 1 from public.owners where user_id = '22222222-2222-2222-2222-222222222222') then raise exception 'FAIL: deleting the owner account left an owner row behind'; end if;
end $$;

do $$ begin raise exception 'ALL OWNER CHECKS PASSED (only the owner, exact text, hide, delete, no peeking). Nothing was saved.'; end $$;
rollback;
