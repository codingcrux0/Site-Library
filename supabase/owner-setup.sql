-- Make yourself the owner of the review page (/admin/). Run it in the Supabase SQL Editor AFTER supabase/moderation.sql,
-- and only after you have signed in on the site once with the account you want to use (that is what creates the account).
--
-- Step 1: run the first query to see the accounts. Find your own row (the email and the sign-in provider you use).
-- Step 2: copy its id into the second query and run it. The owner is pinned by that ACCOUNT ID, not by an email, so nobody can become the
--         owner by signing up with the same email through another provider.
-- To take the owner away again: delete from public.owners where user_id = '<the id>';

select u.id, u.email, i.provider, u.created_at
from auth.users u
left join auth.identities i on i.user_id = u.id
order by u.created_at;

-- Replace the id below with yours from the list above, then run just this line:
-- insert into public.owners (user_id) values ('00000000-0000-0000-0000-000000000000');
