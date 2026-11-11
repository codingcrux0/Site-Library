-- Proof that the written-review locks work. Run it in the Supabase SQL Editor AFTER supabase/reviews.sql.
-- Same trick as account-test.sql: it makes two pretend people, tries to break every rule, then ROLLS BACK, so it leaves nothing behind.
-- SUCCESS looks like an error on purpose: the message is "ALL REVIEW CHECKS PASSED ...". FAILURE is a message that starts with FAIL.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'person-a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'person-b@test.invalid');

-- ---- Person A (signed in) ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.reviews (site_id, body) values ('originkit', 'Clear and quick, it did what I needed.');   -- user_id is filled in by the database

do $$ begin   -- a new review always waits for the owner
  if (select approved from public.reviews where site_id = 'originkit') then raise exception 'FAIL: a new review was approved by itself'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- A tries to write AS person B
  begin insert into public.reviews (user_id, site_id, body) values ('22222222-2222-2222-2222-222222222222', 'sneaky', 'Written in the name of B.');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could write a review as B'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- A tries to approve their own review while writing it
  begin insert into public.reviews (site_id, body, approved) values ('self-approved', 'Approving myself right away.', true);
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could approve their own review when writing it'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- the same website twice
  begin insert into public.reviews (site_id, body) values ('originkit', 'A second review of the same website.');
  exception when unique_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a second review for the same website was accepted'; end if;
end $$;

do $$ declare refused boolean := false; text_ text; begin   -- too short, too long, a bad website id
  begin insert into public.reviews (site_id, body) values ('short', 'Too short');
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a 9 character review was accepted'; end if;
  refused := false;
  begin insert into public.reviews (site_id, body) values ('long', repeat('a', 601));
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a 601 character review was accepted'; end if;
  insert into public.reviews (site_id, body) values ('exactly-600', repeat('a', 600));   -- the largest allowed
  refused := false;
  begin insert into public.reviews (site_id, body) values ('<script>alert(1)</script>', 'A bad website id should fail.');
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: a bad website id was accepted'; end if;
end $$;

do $$ declare refused boolean; t text; begin   -- web addresses of every kind
  foreach t in array array[
    'Great, see https://example.org for more', 'Great, see http://example.org for more', 'Great, see www.example.org for more',
    'Great, see example.com for more', 'Great, see EXAMPLE.COM/page for more', 'Great, see my-site.io for more', 'Great, see mysite.app for more'
  ] loop
    refused := false;
    begin insert into public.reviews (site_id, body) values ('links', t);
    exception when check_violation then refused := true; end;
    if not refused then raise exception 'FAIL: a review with a web address was accepted: %', t; end if;
  end loop;
  -- ordinary writing is not caught by mistake
  insert into public.reviews (site_id, body) values ('fine-1', 'It works with Next.js and Node.js really well.');
  insert into public.reviews (site_id, body) values ('fine-2', 'Rated 4.5 out of 5. Fast and simple.');
end $$;

do $$ declare refused boolean := false; begin   -- the limit: 4 written so far + 'exactly-600' = 4, fill up to 100, the 101st must be refused
  for i in 1..(100 - (select count(*) from public.reviews)) loop insert into public.reviews (site_id, body) values ('s' || i, 'Filling up to the limit.'); end loop;
  begin insert into public.reviews (site_id, body) values ('one-too-many', 'This is the hundred and first.');
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: the 101st review was accepted'; end if;
end $$;

-- changing my own review works, and only the text can change
update public.reviews set body = 'Changed my mind: still good, a bit slow.' where site_id = 'originkit';
do $$ begin
  if (select body from public.reviews where site_id = 'originkit') <> 'Changed my mind: still good, a bit slow.' then raise exception 'FAIL: A could not change their own review'; end if;
end $$;

do $$ declare refused boolean := false; begin   -- A tries to approve, to move, or to hand over the review
  begin update public.reviews set approved = true where site_id = 'originkit';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could approve their own review'; end if;
  refused := false;
  begin update public.reviews set site_id = 'moved' where site_id = 'originkit';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could move a review to another website'; end if;
  refused := false;
  begin update public.reviews set user_id = '22222222-2222-2222-2222-222222222222' where site_id = 'originkit';
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: A could hand a review to B'; end if;
  refused := false;
  begin update public.reviews set body = 'Now with a link: example.com' where site_id = 'originkit';
  exception when check_violation then refused := true; end;
  if not refused then raise exception 'FAIL: an edit that added a web address was accepted'; end if;
end $$;

-- ---- The owner approves A's review (this is the box you tick in the dashboard; the dashboard runs as the owner, not as a person) ----
reset role;
update public.reviews set approved = true where site_id = 'originkit';

-- ---- A signed-out visitor ----
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ declare refused boolean := false; begin   -- cannot read the table, cannot write
  begin perform count(*) from public.reviews;
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could read the reviews table'; end if;
  refused := false;
  begin insert into public.reviews (site_id, body) values ('anon', 'A signed-out visitor writing a review.');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception 'FAIL: a signed-out visitor could write a review'; end if;
end $$;

do $$ begin   -- but the public list shows approved reviews, only
  if (select count(*) from public.review_feed) <> 1 then raise exception 'FAIL: the public list should hold exactly the one approved review, it holds %', (select count(*) from public.review_feed); end if;
  if (select body from public.review_feed) <> 'Changed my mind: still good, a bit slow.' then raise exception 'FAIL: the public list shows the wrong text'; end if;
  -- and it has no column that says who wrote it
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'review_feed' and column_name not in ('site_id', 'body', 'created_at')) then
    raise exception 'FAIL: the public list has a column beyond site_id, body and created_at';
  end if;
end $$;

-- ---- Person B (signed in) ----
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

do $$ begin   -- B cannot see, change or delete A's review
  if (select count(*) from public.reviews) <> 0 then raise exception 'FAIL: B could read A''s reviews'; end if;
end $$;
update public.reviews set body = 'B tries to rewrite what A said.' where site_id = 'originkit';
delete from public.reviews where site_id = 'originkit';

-- ---- Back to A: nothing was changed, and a changed text goes back to waiting ----
reset role;
do $$ begin
  if (select body from public.reviews where user_id = '11111111-1111-1111-1111-111111111111' and site_id = 'originkit') <> 'Changed my mind: still good, a bit slow.' then raise exception 'FAIL: B changed or deleted A''s review'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
update public.reviews set body = 'Edited after it was approved, so it must wait.' where site_id = 'originkit';
reset role;
do $$ begin
  if (select approved from public.reviews where site_id = 'originkit') then raise exception 'FAIL: an edited review stayed approved'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (select count(*) from public.review_feed) <> 0 then raise exception 'FAIL: an edited review stayed visible to the public'; end if;
end $$;

-- ---- Deleting my own review works; deleting the account removes every review ----
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
delete from public.reviews where site_id = 'originkit';
do $$ begin
  if exists (select 1 from public.reviews where site_id = 'originkit') then raise exception 'FAIL: A could not delete their own review'; end if;
end $$;
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  if exists (select 1 from public.reviews where user_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FAIL: deleting the account left reviews behind'; end if;
end $$;

do $$ begin raise exception 'ALL REVIEW CHECKS PASSED (rules, limit, approval, no names, cascade). Nothing was saved.'; end $$;
rollback;
