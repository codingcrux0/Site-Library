# AUTH-PLAN.md: sign-in with Google and GitHub, and bookmarks

Status: **UPDATE 2026-11-11 (D46): accounts are open, features built (bookmarks, ratings, name and picture, sign out, delete, export). The legal gate was waived by the owner; see the last progress entry. The rest of this file is the original plan and earlier steps.** The dev Supabase project exists (public address https://xqvqsdoxtcgeuwwbfhbg.supabase.co, not a secret). The owner approved "Google and GitHub sign-in, no passwords". The LEGAL GATE still applies: accounts do not go live for real people until the privacy policy and the age rule are done (CONTEXT.md).
Builds on D1 (Cloudflare + Supabase) and SECURITY.md. Where this file and SECURITY.md differ, this one is newer for sign-in.

## What gets built (and what does not)
- **Sign in with Google** and **Sign in with GitHub**. Nothing else: no passwords, no email links, no "reset password".
- **Bookmarks:** a signed-in person can save and remove websites. Only they can see their own.
- The existing Review, star and bookmark buttons (EntryActions.tsx) then do their real job. Reviews and ratings are NOT part of this step.
- **Design change to flag:** `/sign-in` today shows a form with email and password views. With Google and GitHub only, those views and the "create account" and "reset" wording go. It becomes two buttons and one honest line. The owner must approve the new look before it is built.

## What is stored
Only what Supabase Auth keeps by default (an ID, the email the provider gives, the provider name, the last sign-in time) plus one table of bookmarks. No passwords exist, so none can leak. No profile photo or name is copied by us.

## Threat model (assets: A3 personal data, A4 private lists, A5 keys, A6 quota, A8 reputation)
| # | Threat | How it would happen | Control | How it is checked |
|---|---|---|---|---|
| T1 | A user reads or changes someone else's bookmarks (IDOR) | Edits the user ID in a request | Row-level security: a row is visible only when `user_id = auth.uid()`; the insert rule checks the same | Tests with two test users: user B reads, inserts and deletes user A's row and must be refused |
| T2 | Service key leaks to the browser | Key pasted into front-end code or committed | The browser only ever gets the public anon key (safe by design, useless without RLS). The service key is never used here at all | gitleaks, a grep of `dist/` for the service key name, `.env` ignored |
| T3 | Login CSRF or a stolen sign-in code (OAuth redirect abuse) | Attacker tricks the browser into finishing THEIR sign-in, or intercepts the code | The PKCE flow (Supabase's default for browsers) plus a redirect allow-list holding only our own address | Supabase dashboard setting checked and written down; test that a foreign redirect URL is refused |
| T4 | Session token stolen by script injection (XSS) | Any injected script can read localStorage | Strict CSP already ships (D37); user text is always rendered as plain text; `connect-src` adds ONLY our Supabase address | CSP test updated and run; try a script in a test string and confirm it is shown as text |
| T5 | Account takeover through the provider | Phished Google or GitHub account | Not ours to fix, but we say so plainly and the owner's own accounts use two-step login. We never auto-merge accounts by email alone | Written in the privacy text; the owner's checklist |
| T6 | Bot floods bookmarks or sign-ins | Script hits the API | Supabase rate limits on auth, a per-user cap on bookmarks (for example 500) enforced in the database, and a one-row-per-site unique rule | Test that the 501st insert and a duplicate are refused |
| T7 | Quota burn (A6) | Many sign-ups | Free tier only, no card on file; the static pages never wait on Supabase, so the site stays up if it fails | Page loads tested with Supabase unreachable |
| T8 | Bookmarks keep growing after a user leaves | No deletion path | A "Delete my account" action that removes the user and their rows (cascade) | Test that deleting the user leaves no rows |
| T9 | Fake "signed in" look in the browser | Person edits the page to show the signed-in state | Cosmetic only; every action is decided by the database rules, never by the page | Test: the API call is refused without a valid session even if the button is shown |

Not covered here (said plainly): a compromise of Supabase, Google or GitHub themselves; a hacked owner device. Nothing is "unhackable".

## Design
1. **Where it runs:** the static site stays static. Sign-in uses the Supabase JavaScript client in the browser (the PKCE flow). No new Worker routes, no cookies set by us.
2. **One new dependency:** `@supabase/supabase-js` (not yet added; needs the owner's yes). Loaded only on pages that need it (sign-in and the list page after the user opts in), so the home page stays as fast as today.
3. **Database:** one table `bookmarks(user_id uuid default auth.uid(), site_id text, created_at, primary key (user_id, site_id))`, RLS on, three rules (select, insert, delete own rows only), no update. A check keeps `site_id` short and plain, and the per-user cap.
4. **Site ids** come from `library.ts`. A bookmark of an id that no longer exists is simply not shown.
5. **UI:** signed out, the buttons show today's sign-in prompt. Signed in, the bookmark button toggles, a "Bookmarks" view in the sidebar lists them, and the account shows a sign-out and delete-account action.
6. **Failure is quiet:** if Supabase is down, the list still works and the bookmark button says it could not save.

## Tests first (written and seen to FAIL before any code)
1. RLS tests against a throwaway Supabase project: T1, T6 and T8 above (two test users).
2. A unit test for the pure parts (id check, cap message, list merge).
3. CSP test: `connect-src` allows our Supabase address and nothing wider; the policy still blocks inline script.
4. Build test: `dist/` contains no service key and no `.env` value.
5. A real-Chrome run on the built site with a test user: sign in, bookmark, reload, sign out, confirm the list is gone, and the XSS string is shown as text.

## What the owner must do (only you can)
1. Make **two** Supabase projects, dev (fake data) and prod, on the free plan with no card. (Already the plan in ARCHITECTURE.md.)
2. Register a **Google** OAuth app and a **GitHub** OAuth app, using the callback address Supabase shows. Follow each provider's sign-in button branding rules.
3. Hand me the keys through the secret request tool, never in chat. Only the OAuth client secrets go into the Supabase dashboard; the repo gets the public URL and the anon key only.
4. Turn on two-step login on Supabase, Google, GitHub and Cloudflare.
5. **LEGAL GATE:** privacy policy, age rule and the DPDP/GDPR notes reviewed by a qualified person before real people sign in.

## Order of work
1. Owner: approve the new `/sign-in` look, the one dependency, and the two Supabase projects. 2. Me: write the failing tests. 3. Me: build against the dev project with test users. 4. Me: self-review, scans, the real-browser run. 5. Owner: legal gate, then switch the prod project on.

## Not verified yet
Everything above is a plan. No control is marked verified. Supabase's current limits, redirect settings and rate limits must be read from its docs on the day of building, not assumed.

## Progress log
- **2026-11-11, step 1 (database side).** The owner approved the two-button `/sign-in` page and `@supabase/supabase-js`, and made the dev project. Written test-first: `src/lib/bookmarks.ts` (id rule, limit, list merge) with `src/lib/bookmarks.test.mjs` (5 tests, failed first, then passed; they also check the page and database rules stay equal), `supabase/bookmarks.sql` (table, row-level security, no access for signed-out visitors, no update, 500 limit) and `supabase/rls-test.sql` (two pretend people try to break every rule, then everything is rolled back).
  **Not yet run:** the SQL has NOT been run against the real project, so T1, T6 and T8 are still unverified. The owner runs `bookmarks.sql`, then `rls-test.sql`, and sends the result.
  **Not yet added:** the library, the `/sign-in` page change, the CSP address, the publishable key. These come with the sign-in step.
- **2026-11-11, step 2 (database proven, sign-in built, gate closed).**
  - **Database:** `bookmarks.sql` and `rls-test.sql` were run against the dev project (psql, through a one-use connection string the owner supplied through the secret tool). The test passed ("ALL BOOKMARK CHECKS PASSED"), left 0 rows and 0 test users, and failed correctly when the lock was removed (RLS off: "A could save a bookmark for B"; read granted to signed-out visitors: "a signed-out visitor could read bookmarks"). The live API also answers a signed-out read of `bookmarks` with "permission denied". So T1, T6 (limit, duplicate, bad id) and T8 (deleting a person removes their bookmarks) are now VERIFIED on the dev project.
  - **Sign-in:** `/sign-in` keeps its look with two buttons, Google then GitHub (no email, no password). `src/lib/auth.ts` (provider allow-list, reading the return address), `src/lib/supabase-client.ts` (lazy, PKCE), `src/scripts/auth-form.ts`, the CSP now allows this one Supabase address. `@supabase/supabase-js` 2.119.0 added (exact, `npm audit`: 0 vulnerabilities).
  - **LEGAL GATE kept:** the real sign-in is compiled in only when the site is built with `PUBLIC_ACCOUNTS_OPEN=1`. The live build leaves it out completely (no Supabase code is shipped); the buttons show "Accounts are not open yet".
  - **Checked in real Chrome (built site):** gate closed, a click shows the notice and sends 0 requests to Supabase; gate open, a click goes to `/auth/v1/authorize?provider=google` with `code_challenge_method=s256` (PKCE); 0 CSP violations, 0 page errors, no password or email box. The Supabase library is its own 216 KB file loaded only on `/sign-in`.
  - **Still to do:** (1) the owner makes the Google and GitHub OAuth apps and enables them in the dev Supabase project (both providers currently answer "provider is not enabled"); (2) the redirect allow-list in Supabase gets the sign-in address; (3) a real sign-in test; (4) the bookmark button, the Bookmarks view, sign-out and delete-account; (5) the legal gate; (6) a second Supabase project for real people.
- **2026-11-11, step 3 (accounts opened, D46).** The owner made both OAuth apps, switched Email off in Supabase and chose to open accounts without a legal review (no lawyer, no 18+ rule, plain-words pages). Built: the single `ACCOUNTS_OPEN` switch, `/privacy/` and `/terms/`, the signed-in sidebar (name and picture from Google or GitHub only, CSP allows exactly those hosts), bookmark button and view, star ratings (own rating shown, public totals-only view, no names), download my data, sign out, delete my account (`delete_my_account()`), `supabase/account.sql` and `account-test.sql`. **Not built:** written reviews (public text needs moderation and a naming decision); two-step login is the owner's to turn on; a second Supabase project (the one project is now the live one).
  **Owner still has to:** run `supabase/account.sql` then `account-test.sql` in the SQL Editor; in Supabase set Site URL and the two Redirect URLs; publish the Google app and add the Privacy and Terms links on its consent screen; try both sign-ins for real.
- **2026-11-11, step 4 (D47).** My lists is the real saved list; Clear my rating; written reviews (hidden until the owner approves; no name shown) with `supabase/reviews.sql` and `reviews-test.sql`. Owner also has to run those two files, and then tick `approved` on reviews they accept (Supabase > Table Editor > reviews).

