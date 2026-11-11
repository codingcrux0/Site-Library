# CONTEXT.md

Read this and `project_spec.md` at the start of every task. Update this file at the end of every task.

## Project goal
A free, tested, ranked library of useful websites. V1 has one category, Frontend Components. Full spec: `project_spec.md`.

## Where the files are (2026-10-29)
All notes are in `docs/` (this file, `project_spec.md`, ARCHITECTURE, DECISIONS, SECURITY, TESTING, INCIDENT, COMPONENTS, `research_template.csv`). The root holds `README.md` (hosting steps first), `wrangler.jsonc`, `package.json`, `src/`, `public/`, `scripts/`, `.github/`. GitHub repo: **private**, `codingcrux0/Site-Library` (pushed 2026-10-29, 2 commits, in sync). Push access is a repo-only deploy key (`~/.ssh/site-library-deploy`, set in this repo's git config); nothing else on GitHub is reachable from this Mac. Next: deploy to Cloudflare (README, "Host it on Cloudflare").

## Legal drafts written (2026-11-11, newest, D45)
`docs/legal/` holds a privacy policy, terms with the 18+ rule and a question list for a lawyer. Drafts only, not published, not legal advice; the legal gate is still closed. Blockers named in them: delete-my-account, export, the age tick, a second Supabase project.

## Sign-in built, bookmarks database proven (2026-11-11, D44)
`/sign-in` has Google then GitHub buttons (no passwords); the real sign-in is compiled in only with `PUBLIC_ACCOUNTS_OPEN=1`, so the live site still says "Accounts are not open yet" (legal gate). The bookmarks table and its row-level security ran on the dev Supabase project and passed `supabase/rls-test.sql`. Next: the owner makes the Google and GitHub OAuth apps; then a real sign-in test, the bookmark button and view, and the legal gate.

## Six websites and a softer colour wheel (2026-11-10, D41 and D42)
80 websites, 102 placements (UI 32, Motion 18, 3D 7, Video & Audio 10, Design Inspiration 12, Templates & Assets 12, Tools 11); Best for free 36. Added Originkit, Pin UI, Skiper UI, Beautiful UI, Layro and Animmaster Lib (evidence `docs/drafts/grades-2026-11-10.md`). The colour wheel now mixes the pick into white instead of flooding the page with it (`src/lib/theme.ts`). Accounts and bookmarks are still not built: the legal gate comes first (see the login plan given to the owner).

## One row open at a time (2026-10-31, D40)
Hovering a second website's row while the first was still open left both open: a click had left keyboard focus in the first row (and its sign-in prompt) holding it open. Fixed with two small listeners that react to the pointer moving onto a different row; keyboard behaviour unchanged. See D40.

## Four more websites (2026-10-31, D39)
74 websites, 93 placements (UI 27, Motion 15, 3D 7, Video & Audio 10, Design Inspiration 12, Templates & Assets 11, Tools 11); Best for free 31. Added Astryx, BoardUI, Reverse UI and Pryzm from the owner's pasted list; Originkit and Pinui are held back (nothing readable). See D39.

## 13 more websites (2026-10-31, D38)
The list now has 70 websites and 88 placements (UI 24, Motion 14, 3D 7, Video & Audio 10, Design Inspiration 12, Templates & Assets 10, Tools 11). The 13 new ones were found on isthereanytool.app, then read and graded here by `docs/GRADING.md` (D38 has the method and the limits). Best for free shows 30. Open: the owner's yes or no on re-scoring Best for free by what free users can do and how much better each site is than its free rivals.

## Security hardening (2026-10-31, D37)
A Content Security Policy now ships in every page (scripts limited to this site's own and fingerprinted inline ones), plus HSTS, COOP and frame-ancestors headers, robots.txt and a sitemap. Tested in a real browser and with a local flood against the real worker. See D37 for the honest limits. D34 to D37 were pushed live together.

## One grading system, 57 websites, seven categories, drop-in entrance (2026-10-31, D36)
Every website is graded by the rules in `docs/GRADING.md` (evidence in `docs/drafts/grades-2026-10-31.md`). 25 new websites were added (5 sites, 20 GitHub projects), two categories (3D & Graphics, Video & Audio) with new pictures, shared tags (Open source, AI...), and "Best for free" is now exactly the placements whose free-tier mark is 5 (26 websites). The list page drops its words, sidebar, tabs and rows in on arrival (`src/styles/drop.css`, CSS only). Localhost only, NOT pushed (together with D34 and D35). Next: the owner's verdict, then push; Land-book needs a hand check.

## Several categories, Best for free, Top user scored (2026-10-31, D35)
A website can sit in several categories and is judged again in each (`placements` in `src/config/library.ts`, rows built in `src/lib/listings.ts`). New tabs: Top user scored (falls back to our score while nobody has rated) and Best for free (completely free sites only, with their own free score; 6 today, chosen from evidence written in D35). Rows show one cut-off line that opens to the full text on hover. The filter shows only types that exist, with counts. List heading is "Websites worth your time." and the list header no longer has "How we review". Localhost only, NOT pushed (together with D34).

## Real list and five categories (2026-10-31, D34)
The list now holds 32 reviewed websites in five categories (UI Components, Motion & Animation, Design Inspiration, Templates & Assets, Tools & Utilities), drafted from the owner's links (`docs/drafts/batch-01.md`, with 5 links held back). The owner delegated categorising, scoring, descriptions and catches to Claude, so the wording says "reviewed and scored", never "tested by hand". Each row links to its site. Everything is on localhost only, NOT pushed. `npm run dev:demo` shows made-up feedback for design checks. Next: the owner's verdict, then push, then more links.

## Average rating circle and feedback panel (2026-10-31, D33)
Each row shows the average of all users' ratings in a small circle ("4.5 /5", "–" while nobody has rated) left of the star rating, and the hover box has a "See user feedback" button that slides a panel in from the right (average, bars per star, one card per feedback). The real list has no feedback, so the live site shows the empty state; only localhost demo rows have clearly labelled made-up feedback. Nothing saved or sent (no accounts). Not pushed: D31, D32 and D33 are all still local.

## Speed pass (2026-10-31, D32)
The site felt laggy, so it was measured and three causes were fixed with no change to look or function: rows draw one star until hovered or focused (plus `memo` on rows), the sign-in typing bar animates on the graphics chip instead of re-laying-out the page, and colour changes use the browser's View Transition cross-fade instead of a transition on every element. List DOM 2,820 to 1,028 nodes; sign-in idle CPU 23.7% to 0.1%. No debug leftovers were found. Not pushed yet (the working tree also holds D31).

## Website rows, star rating, review, bookmarks (2026-10-31, D31)
Each list row turns into a box on hover and opens the description and "the catch" inside it (it grows only as much as the text needs); the right side has Review, bookmark and a one-star rating that grows to five (Wensity `star-rating`, audited). Accounts are not open, so these only ask for a sign-in and save nothing; a sidebar Bookmarks item shows the sign-in message. Built on localhost only at the time of writing: NOT pushed (the owner asked to see it on localhost first).

## Colour wheel and dark mode (2026-10-30, D30)
A rainbow button opens the supplied picker and one colour restyles the WHOLE page (background, boxes, borders, text, buttons) on the home and list pages (the sign-in page follows the saved choice); the X button, the category cards and the sign-in cards are shielded and keep their own colours (`data-keep-palette`); a moon/sun button switches a smooth dark mode and greys the wheel. Choice saved in this browser only, applied by a head script before the page draws. Rules and tests in `src/lib/theme.ts` / `theme.test.mjs`; dark palette in `global.css`. Backup before the work: `site-library-BACKUP-2026-10-30-before-colour-wheel` (next to the project). Not pushed. Open: licence of the picker (owner to verify), Content-Security-Policy will need the script's hash later.

## All four categories, type filter and header search (2026-10-30, D28)
Dev Tools, Productivity and AI Tools are live in the list (counts, own types, honest empty text). New: "Filter by type" (right of the tabs, dropdown with its own search and tick boxes, any-of), removable chips, and a search box at the top right of the header with grey ghost completion (Tab or right arrow accepts). Each entry now needs `tags` from `src/config/tags.ts` (a test checks them). Demo rows (localhost only) are split 40 per category. **Still nothing pushed.** Next proposed step: saving lists in the browser (no account, "this device only"); then push everything together after the owner has seen it.

## List page, first draft (2026-10-30, D27)
`/websites` is rebuilt: sidebar (categories dropdown), gooey tabs, rows, and your page numbers. **Nothing is pushed: the owner previews it on localhost first (`npm run dev`, then http://localhost:4321/websites).** The live version shows an honest empty state; only `npm run dev` shows 160 labelled demo rows so the whole design (20 pages) can be judged. No new packages: the supplied components were adapted to `motion`, `lucide-react`, `clsx` and `tailwind-merge`. "My lists" is a placeholder; saving lists in the browser (no account) is the next step. The "…" in the page numbers can be clicked to type a page number. **Owner to check the licences of the pasted pagination and sidebar components before the site is shared publicly.**

## Why the crowd is slow, and the phone picture (2026-10-29, newest of all, D26)
Measured from the owner's Mac: the free `workers.dev` address is served from Marseille and is slow to connect (0.3 to 1.3 s), which is most of the "few seconds" wait. Phones now get a smaller crowd picture (180 KB, 45 figures), the stylesheet is inside each page, and a build helper (`scripts/preload-islands.mjs`) preloads the top islands' scripts so they do not wait in a chain. **Cloudflare had not deployed the logo commit 25+ minutes after the push; the owner must look at the build log in the dashboard.** Hosting alternatives are in D26, owner's decision.

## Logo and link preview (2026-10-29, D25)
New tick logo, favicon, phone home-screen icon and a 1200x630 link-preview card, with the tags on every page. The images are re-made with `node docs/brand/make-brand.mjs`. `SITE.url` in `src/config/site.ts` must change when the site gets its own domain. **Owner to check the real preview by posting the link (see D25 for the old-preview caching note).**

## Glitch, crowd start and phone load (2026-10-29, D24)
The word glitched over the back-to-top button was a real bug (server-made HTML had no opacity on its layers); fixed and checked. The crowd now starts loading earlier and in parallel with its picture (3.6 s to 3.1 s on slow 3G in my test), and phones draw 45 walkers (since D26 from a smaller phone picture). **The phone lag itself could not be reproduced in a test browser; owner to confirm on a real phone.**

## Phone scroll fix + back-to-top button (2026-10-29, D23)
Boxes now use `lvh` (and `<body>` `svh`) instead of `dvh`, and the box grid has no CSS mask: both aimed at the phone scroll-up lag. **Not reproduced in a test browser; owner to confirm on a real phone.** New back-to-top button in the footer. Total JS 152.6 KB gzipped.

## Counter (2026-10-29)
The header pill now says **"Page views"** and works **online** and locally with **no cookie** (DECISIONS D22). Code: `worker/` (Cloudflare Worker + Durable Object, rules in `visits-rules.mjs`, 10 tests: `npm test`) and `scripts/local-server.mjs`. It counts page loads, so a refresh counts again; the number online starts at 0. The old unique-browser cookie (D15) is retired.

## Current state (2026-10-28)
- Project folder: `Documents/Anmol/Product-projects/site-library/` (git initialised, branch `main`, **no commits yet**).
- M0 mostly done: stack (D1), threat model (SECURITY.md), docs, `.gitignore`, `research_template.csv`. Framework FINAL: Astro 7 + React islands + Tailwind 4 + shadcn structure (D2, D2a).
- **Landing page built (owner asked: landing first, then the rest step by step; minimalist, bright, white).** Hero (static, 0 JS) + Skiper 39 crowd canvas (self-hosted art, bug-fixed) + "How we test" + footer credits. Verified: type-check, build, audit, screenshots at 3 widths, reduced motion (see TESTING.md).
- 2026-10-28: added Skiper 31 scroll animation below the crowd ("find what works" plus framework logos), Lenis smooth scroll, and fixed crowd heads being cut off on laptop screens. Page order: header, hero, crowd, scroll text, logos, How we test, footer.
- **2026-10-29 (newest of all): sign-in panel no longer pauses, counter reset to 1 and robots ignored (D20).** The 31 came from my own test loads. The local server must be restarted to pick up code changes (`npm run local`).
- **2026-10-29 (newer): lag fix + real categories (D19).** Lenis removed (native scrolling), covered boxes pause, dead code deleted. Boxes 2 to 4 are now Dev Tools, Productivity, AI Tools ("Coming next"). **Owner to confirm AI Tools** (Claude's suggestion). Frame rate could not be measured today (test Chrome capped at 30 fps): owner to feel it on the real machine.
- **2026-10-29 (earlier): every picture box now has an animated mini screen; the words were rewritten to match the product (D16, D17).** Home boxes: Frontend Components, Compare or pick, Save and share, One category at a time. The sign-in panel shows 8 planned features with a "What's being built" label. Sentences all start with a capital; the big scroll sentence went from 72 px caps to 48 px sentence case (D18). **Owner to confirm:** boxes 2 to 4 describe planned features because categories 2 to 4 are undecided.
- **2026-10-29 (earlier): live page-view counter, X logo, sign-in views, shorter box pause.** Home header: X logo with hover glow (left), live "people visited" counter (right; D12, D15). It now counts unique browsers with a cookie, on the owner's instruction. Counter needs `npm run local` (a local server with `/api/visits`); **the hosted version is not built** (needs Cloudflare + a place to store one number). Sign-in has 3 views (sign in, create account, reset password), still connected to nothing (D14). The box pause went 80% → 30% because it felt stuck (D11).
- **2026-10-29 (earlier): sign-in page designed, box scroll pace fixed.** `/sign-in` is now a split page (looping picture columns + form with GitHub/Google/email) but the form is **connected to nothing** (LEGAL GATE; D10). Category boxes now pause 80% of a screen before the next covers them, and their entrance starts earlier (D9). Pictures for the sign-in columns are placeholders in `src/config/showcase.ts`.
- **2026-10-29 (earlier): header, hero, boxes reworked.** Header left = "Follow the build on X". Hero: black button "Browse the list" goes to `/websites` (an honest **empty list**, no entries exist yet) and the arrow link is "Sign in" going to `/sign-in` (**no form**: accounts stay closed behind the LEGAL GATE). Each category box now has a picture side and a words side, alternating, with a CSS entrance animation (DECISIONS.md D7, D8). Pictures are placeholders. Dead code was removed (cleanup log in DECISIONS.md).
- **2026-10-29: scroll text extended and category boxes added.** Page order now: header, hero, crowd, "find what works", logos, 3 more sentences, 4 stacked category boxes, How we test, footer. **All sentences and category text are placeholder; the owner will write the real words.** Category data: `src/config/categories.ts`. Details in DECISIONS.md D6.
- **2026-10-29: folder renamed `Product:projects` → `Product-projects` (owner gave full control).** `npm run ...` and `npm run dev` now work (verified). A shortcut (symlink) named `Product:projects` points to the new folder, so T3 Code and any old links keep working. **Don't delete that shortcut** unless the T3 project is re-pointed to the new path first (DECISIONS.md D5). Running locally at http://localhost:4321 via `npm run preview`.
- Blocked on owner: site name, open questions (spec section 13), open decisions (DECISIONS.md), gitleaks approval, MFA on owner accounts, check the Hero component's license and the Skiper UI Terms.
- Placeholders still empty: site name, domain, same-task test.

## ALWAYS-DO CHECKLIST (every task, never skipped)
1. Restate the task, then threat-model it (hackers and real-user abuse).
2. Write tests first for auth, permissions, data writes and user input.
3. Build one small step at a time.
4. Self-review as attacker, user and maintainer, then fix what you find.
5. Run tests, linter, type-check, build, dependency audit and secret scan. Paste real output, or write "not run" with the command.
6. Re-run the permission tests (cross-user, logged-out, privilege escalation) after any data or auth change.
7. Teach the feature, ask the owner 2 questions, update the docs, and end with the report format.

## HARD GATES (nothing ships past these)
- **COOKIE GATE (no longer triggered, 2026-10-29):** the counter has no cookie now (DECISIONS D22). If a cookie is ever added back (for example to count unique browsers again, D15), a qualified professional must first say whether it needs a consent notice, and the privacy policy must describe it.
- **LEGAL GATE:** no real user accounts until a qualified professional (a lawyer; Claude cannot be one) has reviewed the privacy policy, the 18+ rule, and the India DPDP and EU GDPR notes. Status: NOT DONE.
- **Security floor:** no known high or critical vulnerabilities at launch.
- **Trust rules (spec section 4):** no entry is published unless `tested_by_owner = true` and it has a test date. Never invent facts about a listed site.
- **Launch readiness gate (M9):** verdict must be READY with no blockers.

## Next steps
00. **Go-public checklist (owner asked how to host, 2026-10-29; nothing deployed yet):** (1) owner checks licences of the pasted components (Hero, stacked sections, Skiper UI, login form, AnimatedCounter); (2) approve gitleaks, secret scan, first commit; (3) decide repo public or private; (4) Claude adds `public/_headers` (security headers, CSP with hashes), favicon, real site name; (5) owner creates free Cloudflare + GitHub accounts with MFA, connects the repo (build `npm run build`, output `dist`); (6) launch WITHOUT the counter (page shows nothing when `/api/visits` is missing, and no cookie is set, so the COOKIE GATE is not triggered); (7) hosted counter later, after the lawyer answers the cookie question. Sign-in stays "not open yet" (LEGAL GATE).
0. For the X demo video: run `npm run local`, use a 1440×900 browser window, and decide whether the counter should read a low number (delete `.data/visits.json` to reset it to 0 first, or leave it honest).
1. Owner reviews the landing page (http://localhost:4321, run with `npm run local`, see README) and gives design feedback. **Decide, before going public:** does the unique-visitor cookie need a consent notice (COOKIE GATE)? Ask the lawyer in the same review as the privacy policy.
2. Owner approves gitleaks, then secret scan, then the **first commit**. Nothing is committed yet.
3. Hosted counter: a Cloudflare Pages Function for `/api/visits` + one stored number (D1 or KV), following the contract in DECISIONS.md D12. Needs a Cloudflare account; test it before it goes live.
4. Real sign-in is M1/M4: Supabase Auth, Google/GitHub OAuth apps, redirect allow-list, rate limits. Needs the lawyer review first. Check Google's and GitHub's button branding rules then.
5. Landing page polish before launch: security headers (DONE in D37: CSP with hashes, HSTS, frame-ancestors), favicon, real site name, Lighthouse + axe numbers.
6. Then back to milestone order: M1 (data model, RLS, admin login with MFA, CSV import).
7. In parallel: owner tests entries and fills `research_template.csv` (keep real exports in `private/`).
