# CONTEXT.md

Read this and `project_spec.md` at the start of every task. Update this file at the end of every task.

## Project goal
A free, tested, ranked library of useful websites. V1 has one category, Frontend Components. Full spec: `project_spec.md`.

## Where the files are (2026-10-29)
All notes are in `docs/` (this file, `project_spec.md`, ARCHITECTURE, DECISIONS, SECURITY, TESTING, INCIDENT, COMPONENTS, `research_template.csv`). The root holds `README.md` (hosting steps first), `wrangler.jsonc`, `package.json`, `src/`, `public/`, `scripts/`, `.github/`. GitHub repo: **private**, `codingcrux0/Site-Library` (pushed 2026-10-29, 2 commits, in sync). Push access is a repo-only deploy key (`~/.ssh/site-library-deploy`, set in this repo's git config); nothing else on GitHub is reachable from this Mac. Next: deploy to Cloudflare (README, "Host it on Cloudflare").

## Glitch, crowd start and phone load (2026-10-29, newest of all, D24)
The word glitched over the back-to-top button was a real bug (server-made HTML had no opacity on its layers); fixed and checked. The crowd now starts loading earlier and in parallel with its picture (3.6 s to 3.1 s on slow 3G in my test), and phones draw at most 45 walkers (`PHONE_FIGURES`). **The phone lag itself could not be reproduced in a test browser; owner to confirm on a real phone.**

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
5. Landing page polish before launch: security headers (`public/_headers` with CSP; Astro inlines small scripts, so the CSP needs hashes, see D7), favicon, real site name, Lighthouse + axe numbers.
6. Then back to milestone order: M1 (data model, RLS, admin login with MFA, CSV import).
7. In parallel: owner tests entries and fills `research_template.csv` (keep real exports in `private/`).
