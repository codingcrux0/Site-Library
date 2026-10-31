# DECISIONS.md

Each entry records what we chose, why, and what we gave up. Newest at the bottom.

---

## D1. Stack: Cloudflare Pages + Supabase + GitHub Actions (2026-10-28)
**Status:** chosen. The owner said "go" to the recommended Option A.

**Options compared**
| | A: Cloudflare Pages + Supabase | B: Cloudflare Pages + Firebase |
|---|---|---|
| Database | Postgres (SQL) with row-level security | Firestore (documents) with security rules |
| Filters/sorts/compare | Natural in SQL | Needs extra indexes and workarounds |
| Free tier (checked 2026-10-28) | 2 active projects, 500 MB DB, 50,000 auth MAU, 1 GB storage, 5 GB egress | 1 GiB stored, 50K reads/day, 20K writes/day, 50K MAU |
| Scheduled jobs on free tier | Via GitHub Actions | Cloud Functions are not on the free Spark plan, so also GitHub Actions |
| Big catch | **Paused after 1 week of inactivity; no automatic backups on Free** | Daily read cap; a traffic spike could hit it |

**Why A:** the permission table and filters fit SQL + RLS, and RLS rules are plain SQL that can be tested directly.

**Catches we accept and must handle**
- Pausing: the weekly link-checker queries the DB; if that's not enough, add a small scheduled read. Verify what counts as activity in the Supabase docs.
- Backups: we write our own encrypted backup job. Restore is tested before launch.
- Only 2 free projects: dev + prod. No separate staging.

**Hosting limits (Cloudflare, checked 2026-10-28):** Pages Free gives 500 builds/month, 20,000 files per site, 25 MiB per file. Pages Functions count against Workers Free: 100,000 requests/day and **10 ms CPU per request**. That CPU limit matters for image generation (see D4).

Sources: supabase.com/pricing, developers.cloudflare.com/pages/platform/limits, developers.cloudflare.com/workers/platform/limits, firebase.google.com/pricing, GitHub Actions docs ("events that trigger workflows"). **Re-verify before launch, because free tiers change.**

## D2. Frontend framework: Astro (recommended, PENDING component intake)
**Options**
| | Astro | Next.js |
|---|---|---|
| Pre-rendered pages | Default (static output) | Possible, but the default is server rendering |
| On Cloudflare Pages | Static files, no adapter needed for public pages | Needs an adapter (OpenNext); server rendering is limited by the 10 ms CPU cap |
| Interactive parts | "Islands": small React/Vue/Svelte pieces only where needed | Everything is React |
| Beginner explainability | High: most pages are plain HTML + a little JS | Medium: more concepts (server vs client components) |

**Recommendation:** Astro (current npm version 7.4.2 as of 2026-10-28; verify docs at docs.astro.build). Islands for search, saves, ratings and the quiz. **Final once your components are in, because their framework (React/Vue/etc.) decides the island library.**

**Update 2026-10-28: FINAL, Astro 7 + React islands.** The owner's components are React + TypeScript + Tailwind (shadcn structure), and Astro supports all three.

## D2a. Landing page setup choices (2026-10-28)
- **Scaffold:** `create-astro` with the official `with-tailwindcss` template. We removed the template's MDX and confetti packages, which we don't use.
- **shadcn structure:** `components.json` (written by `shadcn init`), the `@/*` → `src/*` alias, `src/components/ui/`, and `src/lib/utils.ts`.
  - shadcn's own install step failed: npm 11 blocks install scripts.
  - So we installed only what we use. We **skipped** `radix-ui`, `class-variance-authority`, the Geist font and the `cn` package (it's legitimate, from shadcn-ui, but brand new at v0.5.0). We used the long-proven `clsx` + `tailwind-merge` instead.
- **Install scripts stay blocked:** `fsevents` (an optional macOS file watcher) is denied in `allowScripts`.
- **Dependencies added, with reasons:**
  - `gsap`: the crowd animation needs it.
  - `lucide-react`: icons.
  - `tw-animate-css`: the provided CSS imports it.
  - `clsx` + `tailwind-merge`: the shadcn `cn()` helper.
  - `@astrojs/check` + `typescript` (dev only): type-checking.
- **tsconfig:** no `baseUrl`. TypeScript 6 deprecates it, and `paths` works without it.
- **Hero is static:** it has no `client:*` directive, so it sends zero JS. The crowd uses `client:visible`, so its JS loads only near the viewport.

## D2b. Scroll animation libraries (2026-10-28)
- **motion 14.7.1** (the new name of framer-motion, same team, MIT) for Skiper 31. We use `LazyMotion` + `m`, which measured 54.7 KB → 41.5 KB gzipped.
- **lenis 1.3.27** (MIT) for page-wide smooth scrolling. Options: `autoRaf`, plus `anchors` for smooth in-page links (both checked in the installed type definitions). It's off under reduced motion, and touch scrolling on phones stays native (Lenis default). The CSS `scroll-behavior: smooth` rule was removed, because the two conflict.
- **Trade-off, accepted for now:** the page uses two animation libraries (GSAP for the crowd, motion for the scroll text), about 71 KB gzipped together. Both load only when their section is near the screen. They could be merged into one later if performance numbers ask for it.

## D3. Scheduled jobs: GitHub Actions
Link checker, live signals, unsafe-site check, backups. Facts checked: the shortest interval is every 5 minutes, runs can be delayed at busy times, and in **public** repos schedules are disabled after **60 days** of no repo activity. Public vs private repo is still to decide (see open decisions).

## D4. Image generation (stack cards, social previews): OPEN
The 10 ms CPU limit per Worker request will likely be too tight for generating images on demand. Options to evaluate in M7:
1. Generate entry/category preview images at **build time** (no runtime cost).
2. Draw stack cards **in the browser**.

## D5. Folder renamed `Product:projects` → `Product-projects`, plus a shortcut (2026-10-29)
**Why rename:** the `:` broke two things.
- `npm run ...`: npm adds `<project>/node_modules/.bin` to PATH, and PATH uses `:` to separate entries, so the path was cut in half.
- The dev server: Vite refused to serve files from that path, so the animated parts never loaded.

(Finder shows a `:` in a file name as `/`, so in Finder the old folder looked like "Product/projects".)

**Why the shortcut (symlink `Product:projects` → `Product-projects`):** T3 Code's project, and this Claude session, were opened at the old path. Without the shortcut, they would point at a folder that no longer exists. With it, old paths still work, and tools still see the real, colon-free path. That was tested in a throwaway folder first, then on the real project.

**Checked before renaming:**
- No commits exist yet, and git doesn't store the absolute path.
- No absolute paths in `node_modules` or `package-lock.json` (only in 3 docs and a dev log).
- `Product-projects` didn't already exist.
- Only this project was inside the folder.
- Documents isn't synced by iCloud Drive.
- Claude's memory folder name is the same for both names.

**Verified after:** `npm run check` 0 errors (exit 0), `npm run build` exit 0, `npm audit` 0 vulnerabilities, `npm run dev` serves `/@vite/client` (200) with the crowd drawing and no console errors, git status unchanged.

**Undo:** `cd ~/Documents/Anmol && rm "Product:projects" && mv Product-projects "Product:projects"`. The `rm` deletes only the shortcut, never the files.

**Not touched:** the sibling folders `Startup:business innovation` and `Social manager + planner:guide` also contain `:`. They're outside this project. Rename them the same way only if code ever lives there.

**Removing the shortcut later:** first re-point the T3 Code project to `.../Product-projects`, then delete the shortcut.

## D6. Category boxes: stacking sections, no new dependency (2026-10-29)
- **Choice:** build the supplied stacking-sections effect with CSS `position: sticky` only, rendered as plain HTML. No new package, no extra JavaScript.
- **Not used:** the original's `ReactLenis`. Two Lenis instances on one page would fight each other.
- **Colours:** four soft tints (sky, sand, sage, lilac) chosen to keep the page bright and minimal.
- **Words and links live in `src/config/categories.ts`.** All category text is placeholder.
- **No fake buttons (superseded by D8 the same day):** at first the button appeared only when a category had its own page, and boxes said "Page coming soon". Now a real page exists (`/websites`), so every box has a working button.
- **Trade-off:** each box is one full screen tall, so four boxes make the page about 3,600px longer. If that feels too long, shrink them.
- **Component file name:** `stacked-sections.tsx`, not `smooth-scroll.tsx`, to avoid confusion with `src/scripts/smooth-scroll.ts`, which is the real page-wide smooth scrolling.

## D7. Box entrance animation: CSS, not the supplied GSAP component (2026-10-29)
- **Owner asked for:** the supplied "text block animation" (GSAP SplitText + ScrollTrigger), with words from one side and a picture from the other, alternating per box.
- **Chosen:** the same look, built with CSS keyframes. A 490-byte script (`reveal-on-scroll.ts`) only flips a data attribute when a box scrolls into view, using the browser's IntersectionObserver.
- **Why:** measured cost of the GSAP route is ScrollTrigger 17.6 KB + SplitText 3.6 KB (gzipped) plus a new package (`@gsap/react`). The CSS route is about 1 KB. Lines split by SplitText also go stale when the window is resized or a phone is rotated.
- **What we gave up:** the effect sweeps each heading or paragraph as one block, not line by line. GSAP can do line by line. Tell me if you want it, and what the extra weight is worth.
- **Safe by default:** nothing is hidden until the script runs, and the script does nothing under "reduce motion". So with JavaScript off, or reduced motion on, all the content just shows.
- **Timing, so the animations don't fight:**
  - Lenis smooths the page scroll.
  - The letter animation follows the scroll position.
  - The box entrance plays once, as soon as a box's top edge is 15% up the screen (changed from "half-way up" in D9).
  - Only the crowd draws on every frame, and it pauses when off-screen.
- **CSP note for later:** Astro puts small scripts directly inside the page (the island loader and this reveal script). When we add a Content-Security-Policy, it must allow them (hashes), or we set Astro to always emit them as files.

## D8. Header, sign-in and list pages (2026-10-29)
- **Header:** the site name on the top left was replaced by "Follow the build on X ↗". "How we test" stays on the right. The site name still appears in the tab title and footer.
- **Hero:** the black button is now "Browse the list" (goes to `/websites`). The arrow link is now "Sign in" (goes to `/sign-in`).
- **`/websites`:** the list page, with an honest empty state. **No entries exist yet**, because the trust rule says nothing is listed until it has been tested by hand and dated. Real entries come with M1/M2 (data model, CSV import).
- **`/sign-in`:** a page with **no form**, saying accounts aren't open yet. Reason: the LEGAL GATE (CONTEXT.md). We don't collect any account data until a qualified professional has reviewed the privacy policy, the 18+ rule, and the DPDP and GDPR notes.
- **Every box's button** also goes to `/websites`, so boxes 2 to 4 ("coming later") currently lead to the same empty list. One field in `categories.ts` can change that when category pages exist.

## D9. Scroll pace of the category boxes (2026-10-29)
- **Problem (owner screenshot):** scrolling quickly, the next box covered the previous one before its words had finished arriving.
- **Cause 1:** each box was one screen tall, so box 2 began covering box 1 the moment box 1 was fully in view. **Fix:** every box except the last got a gap under it, so box 1 stays fully in view before box 2 appears. (First 80% of a screen; **shortened to 30% in D11**, because 80% felt stuck.)
- **Cause 2:** the entrance started only once 30% of the words were visible. **Fix:** it now starts when the box's top edge is 15% up the screen, so it runs while the box is still sliding up. The script watches the box itself, which removed the `data-reveal-watch` marker.
- **Not changed:** the stacking effect, the entrance look and length, and Lenis. Measured: at laptop size the pause is 720 px of scrolling; the entrance still replays when scrolling back up.
- **Cost:** the page is longer by the pauses (3 × the pause). Tune the number in `stacked-sections.tsx` (now `mb-[30dvh]`).
- **Not fixed (can't be, by design):** a very hard flick still travels a long way. Lenis's glide is untouched; if that is still too fast, the next lever is Lenis's `wheelMultiplier`.

## D11. The pause under each box: 80% was too long, now 30% (2026-10-29)
- **Owner feedback:** "while scrolling it is getting stuck… it gives the feeling that the website has ended."
- **Cause:** the 80%-of-a-screen pause from D9. For 720 px of scrolling nothing on the page moved.
- **Change:** `mb-[80dvh]` became `mb-[30dvh]` (270 px on a 900 px screen). The earlier start of the entrance (D9, cause 2) stays, and does most of the work of making the words arrive in time.
- **The honest trade-off:** the owner has now complained both ways (too fast, then stuck). A pause is the only lever between "next box covers the words too soon" and "nothing moves". 30% is a middle point, not a proven right answer. It is one number to tune.
- **Not built, if 30% still feels stuck:** let the picture and words drift slowly during the pause so the page always visibly moves. That needs a scroll-linked animation (a little JavaScript, or CSS scroll timelines, which not every browser supports).

## D10. Sign-in page: the design is built, the form is NOT connected (2026-10-29)
- **Built from the supplied login component:** a split page. Left: two columns of picture cards that drift up and down by themselves. Right: the form with GitHub and Google buttons, email and password.
- **Connected to nothing, on purpose.** Accounts stay closed until the LEGAL GATE is passed (CONTEXT.md). `src/scripts/auth-notice.ts` only shows a message ("Nothing you typed was sent or saved"). No cookies, no storage, no network request. The heading says "Accounts are not open yet."
- **Why the form exists at all:** the owner asked for the design now. It is a visual shell; real sign-in is M1/M4 (Supabase Auth + Google/GitHub OAuth, which need a Supabase project and OAuth apps registered, neither of which exists yet).
- **Changes from the supplied code:**
  - Removed "Remember me", "Forgot password?" and "Sign up": they would be dead links, and "remember me" implies a stored login. Add them back when real auth exists.
  - The supplied component loaded its images and the Google logo from `cdn.21st.dev`. Replaced with inline logos (Simple Icons, CC0), so nothing loads from outside.
  - `method="post"`, so even with JavaScript off a submit can never put the email or password in the address bar.
  - Real `<label>`s, `autocomplete` hints, visible focus rings, buttons are `type="button"` so they don't submit.
- **Moving panels:** plain HTML and CSS (no JavaScript, no new package). Only `transform` changes, so it runs on the graphics chip. One column goes up (36 s per loop), the other down (44 s). Hovering pauses them. Reduced motion = still. Hidden on phones (that also stops the animation and image downloads).
- **Seamless loop:** each column holds four identical copies and moves by exactly one copy. Two copies left a gap on tall narrow windows (tablet portrait); a test across 61 points of the loop at 5 window sizes now finds no gap (and finds 40 of 120 with the old 2-copy setup, so the test can fail).
- **Entrance:** the same CSS animation as the category boxes. A new `rv-load` class plays it once on arrival with no script. Panel from the left, form from the right, heading swept in, then the fields one after another. The reduced-motion rule is now inside the CSS itself.
- **Pictures:** first grey placeholders, **replaced on 2026-10-29 by animated feature cards (D16)**. The optional `image` field still works if the owner ever wants real pictures.
- **Chrome quirk found:** the soft top/bottom fades poked out of the panel's rounded corners (they sit on their own graphics layer, which ignores the parent's rounded clip). Fixed by rounding the fades themselves. `clip-path` did not fix it.
- **Known gap:** moving content should ideally have a real pause button (WCAG 2.2.2). Today: reduced-motion only (the hover-to-pause was removed on 2026-10-29, D20). A visible pause button is a possible later addition.

## D12. Live page-view counter in the home page header (2026-10-29)
- **Owner asked for:** the header's top-right to show "the live number of total visits ever since the site was made", using the supplied rolling-digits component.
- **What it counts: SUPERSEDED by D15 (2026-10-29).** It first counted page loads, labelled "page views", then "visits". The owner then chose to count unique browsers with a cookie, labelled "people visited". See D15 for what it counts now.
- **Why no unique count at first:** it needs a cookie, which is tracking and needs a consent and privacy-policy decision. The owner has now decided to do it anyway (D15).
- **Never a fake number.** If the server can't be reached, the pill simply isn't shown. The count starts at 0 when the server first runs.
- **"Live":** the page re-reads the number once a minute while the tab is visible (not a constant connection). Measured: a page left open went 998 → 1,001 after the minute, crossing into 4 digits with no errors. At most 2 requests per minute per open tab keeps it far from Cloudflare's free limits for a small site (verify when hosting).
- **The server side (contract, as changed by D15):** `GET /api/visits` returns `{"total": n}`; `POST /api/visits` counts the browser only if it has no `visited` cookie, then returns `{"total": n}`. Rules the server must keep: refuse a POST that came from another website (check `Sec-Fetch-Site` and `Origin`); allow one count per address every 2 seconds (kept in memory only, never stored); store only the one number (plus the cookie rule in D15); `Cache-Control: no-store`; refuse other methods.
- **Today that server is `scripts/local-server.mjs`: for your computer only** (`npm run local`). It uses only what ships with Node, listens on 127.0.0.1, serves `dist/`, and keeps the number in `.data/visits.json` (git-ignored). Tested: rate limit, cross-site refusal, wrong methods, path tricks (the guard blocks `/..%2fpackage.json`; without it that URL leaked the file, so the test can fail), damaged data file (the server stops rather than reset to 0), restart keeps the number.
- **NOT done: the hosted version.** On Cloudflare Pages this needs a small Pages Function plus a place to store one number (D1 or KV; both have free tiers, to verify). I did not write it: it can't be tested here without a Cloudflare account, and untested code that deploys automatically is a risk. The plain `npm run dev` and `npm run preview` have no `/api/visits`, so they show no counter.
- **Anyone can inflate it** (curl or scripts that don't send the cookie, bots, private windows). It is a vanity number, not evidence of anything. Never use it for decisions or claims like "X thousand people use this".
- **Component:** `animated-counter.tsx` (supplied). Fixed a typo in the paste (`10* * places`), removed `"use client"`, switched to the lighter `m` + `LazyMotion`. The `domMax` set the layout glide needs costs +13.6 KB on every page load, so I used `domAnimation`: a new digit now fades in (999 → 1,000) instead of the others gliding sideways. The unused options of the supplied component (decimals, padding, other grouping, prefix/suffix) were left as supplied.
- **Cost:** +11.6 KB JavaScript in total (143.9 → 155.5 KB gzipped). The counter loads with `client:idle`, so the hero is not delayed, but React and the motion library now load on the home page right after load instead of only when you scroll to the crowd (about 115 KB gzipped at idle).

## D13. Header: X logo with a hover effect, and a slot for the counter (2026-10-29)
- Left: a black circle with the X logo (Simple Icons, CC0; X is a trademark) before "Follow the build on X". On hover or keyboard focus the logo grows to 115% and a soft glow fades in. Only transform and opacity change; the glow is a blurred copy of the circle that fades in, not an animated shadow. No growth for "reduce motion". Below 640 px only the logo shows (the link keeps its name for screen readers).
- Right: `SiteHeader` now has a slot. The home page fills it with the counter. Other pages keep the "How we test" link. (The owner said "top right of the main homepage", so the list page was not changed.)

## D14. Sign-in page: forgot password and create account (2026-10-29)
- **Three views on one card:** sign in, create account, reset password. They switch without leaving the page, with a short fade (0.3 s) and no jump: the card is top-aligned and the heading stays put.
- **Still connected to nothing** (D10, LEGAL GATE). Each view shows its own honest message when you try it ("No email was sent…", "Nothing you typed was sent or saved…"), pinned to the bottom of the screen for 7 seconds. It was first placed under the form, but on a short window it landed below the visible area (found in testing).
- **One submit button, only its words change.** Several submit buttons could leave a hidden, disabled one as the browser's "default button", and pressing Enter would silently do nothing. Tested with the real Enter key in all three views.
- **Rules kept simple:** create account uses `autocomplete="new-password"` and an 8-character minimum (checked with real typing: "abc" is blocked). The sign-in view has no minimum, so it can never lock out an existing password. These are placeholders for the real rules.
- **Not added, on purpose:** an "I am 18 or older" box and a terms/privacy checkbox. The spec's 18+ rule and the policy wording belong to the legal review (LEGAL GATE). Add them after it.
- **Font and colour:** the site's own system font and black/white tokens, with the same tinted notice colour as the category boxes. No new colour or font.
- The password is cleared when switching view, and the hidden password box is disabled in the reset view (a hidden "required" box would silently block submitting).

## D15. Counting unique visitors with a cookie: "people visited" (2026-10-29)
- **Owner's decision (explicit, 2026-10-29):** "save it as people visited and save cookies to store the unique number of people who saw it." This is the tracking choice D12 held back. The NEVER list forbids tracking *I* add unasked; this is the owner's instruction, so it is recorded here as approved.
- **How it works:** the first time a browser opens the home page, the server counts it and sets a cookie named `visited` with the value `1`. Next visits send the cookie, so the server counts nothing and sets nothing. The server stores one whole number. Nothing else.
- **Kept as light as possible:**
  - **No ID.** Every visitor gets the same value, `1`. It cannot tell one visitor from another, so it cannot follow anyone around or build a profile.
  - **HttpOnly** (page scripts cannot read it), **SameSite=Lax** (sent only to our own site), **Secure** whenever the request came over https (a hosted site must be https), one year, `Path=/`.
  - **Set only after a count.** A request refused by the abuse brake gets no cookie, so a real visitor is counted next time.
  - **Only the home page** counts. No other page sets it.
  - Verified in Chrome: one cookie, value 1, HttpOnly, Lax, about a year; `document.cookie` is empty.
- **What the number really is: unique BROWSERS, not people.** A second device, a private window, another browser, or cleared cookies counts again. A shared computer counts once. "People visited" is the owner's wording; it is an estimate, not a census.
- **Counted old numbers:** the earlier count of 11 was page loads (a different measure, mostly the owner's own testing). It was kept as `.data/visits.loads-before-cookies.json` and the new count started at 0.
- **Anyone can still inflate it** by sending requests with no cookie (a script, or clearing cookies), one per 2 seconds per address at most. Still a vanity number.
- **OPEN, a launch gate (CONTEXT.md, COOKIE GATE):** a cookie that is not strictly needed to run the site generally needs the visitor's consent under the EU's ePrivacy rules and GDPR, unless an exemption applies, and India's DPDP Act has notice and consent rules for personal data. Claude cannot say whether this cookie (no ID, no personal data) is exempt. A qualified professional must decide **before the site goes public**: whether a cookie notice or consent banner is needed, and what the privacy policy must say. Locally on this computer it is fine. Options if the answer is "consent needed": add a small banner and count only after "accept", or drop the cookie and go back to counting page loads (`VisitCounter.tsx` and the server each change in a few lines).
- **The hosted version** (not built) must keep the same rules: count only when the cookie is absent, set the cookie with those attributes, and never trust a lookalike (`notvisited=1`, `visited=2` and `visited=1x` are all treated as "no cookie").

## D16. Animated mini screens in every picture box (2026-10-29)
- **Owner asked for:** "in every empty image box add a motion based video or image that is moving and is relevant to the topic", and on the sign-in page "showcase the features of the website".
- **Chosen: scenes drawn with HTML and CSS** (`components/scenes/scene.tsx` + `styles/scenes.css`), not video files. Why: no file to download (a video would be hundreds of KB to MBs each), no licence question (stock footage and illustrations all have terms), nothing to host, crisp at any size, and they match the site's colours. Cost: +1.9 KB CSS, about 1.7 KB more HTML on the home page, no new JavaScript.
- **Ten scenes:** tested, catch, scores, compare, pick, search, lists, stack, components, categories. Each shows one feature from the spec (section 7) using grey "skeleton" bars, so it never states a fact about a real website. The few words in them are the site's own feature names.
- **Home page boxes** (animated mini screens): Frontend Components (a little web page being built), Compare or pick (two tools side by side), Save and share (a stack card), One category at a time (tiles).
- **Sign-in panel** (8 cards, each with a title and one line): Tested by hand, The catch up front, Two separate scores, Compare side by side, Pick for me, Instant search, Save your lists, Share your stack. A label says "What's being built", because none of them is live yet.
- **Speed:** only transform and opacity move (plus one tiny typing bar that changes width). Sizes use container units, so a scene scales to its box with no JavaScript. Home boxes: the animations are paused until the box is on screen (they start with `data-in`). Sign-in: they run continuously and pause when you hover the panel. Reduced motion: no animation at all, every scene rests in its finished state (checked: 0 animations, 0 hidden parts).
- **Loop copies:** the sign-in columns loop with three copies (it was four). Three still leaves no gap at any of 7 window sizes tested (including 1024×1366), and two copies do (35 of 120 samples). Fewer copies = fewer running animations: 122 → 92.
- **Known limits:** the scenes' own words are small on narrow cards (decorative; the real title sits under each card). A very low-powered graphics chip could still struggle with ~90 animations: not testable here.
- **A real video is still possible later** if the owner records one: it would go in `public/`, and `image` would be extended to accept it. Not built, because nothing exists to play yet.

## D17. The words on the home page, rewritten to match the product (2026-10-29)
- **Owner feedback:** "most of the text makes no sense and has no connection to what I'm building."
- **Boxes:** all four had placeholder text ("Category two", "To be written"). Now: 1. Frontend Components (the one real category). 2. "Compare, or let us pick". 3. "Save it. Share it." 4. "One category at a time". Boxes 2 and 3 are **planned v1 features** from the spec (compare 2 to 3 tools, the 3-question "pick for me", saved lists, the shareable top-5 stack card), marked "Coming in v1". Box 4 says more categories follow, marked "Later".
- **A decision for the owner:** the owner's original idea was boxes for categories, but categories 2 to 4 are still undecided (spec: "[CATEGORY 2]…"). Inventing category names would be making up facts, so boxes 2 to 4 describe the product instead. When the real picks exist, they replace these in `src/config/categories.ts` (one data file) and a scene is picked for each.
- **Sign-in cards:** every title and line comes from the spec. No numbers, no claims about listed sites.
- The "How we test" section and the scroll sentences were left as they are: they state the three promises (tested by hand, dated and scored, the catch up front), which are the core of the spec.

## D18. Capital letters and the big scroll sentence (2026-10-29)
- **Rule from the owner: every sentence starts with a capital letter.** Fixed: "People visited" (the label now comes first: "People visited 4,828"), "Or with email", the hero pill ("Now testing: Frontend Components"), the scroll sentences and the logo caption. Eyebrow labels written in capitals by style ("BUILT FOR BUILDERS", "HOW WE TEST") are unchanged: their source text already starts with a capital.
- **Scroll sentence:** was up to 72 px, bold, forced ALL CAPS. Now up to 48 px, sentence case ("Find what works"). The letter fly-in animation is unchanged.

## D19. Lag fix, three real categories, Lenis removed (2026-10-29)
- **Owner feedback:** "the website feels very laggy"; add Dev Tools, Productivity and one more useful category; delete useless code.
- **Categories:** boxes 2 to 4 are now Dev Tools, Productivity and AI Tools (status "Coming next"). Dev Tools and Productivity are the owner's picks; **AI Tools is Claude's suggestion**: free plans and usage limits change fast, which suits "dated, with the catch". Alternatives if the owner prefers: Design Resources, Learning Resources. Each has its own animated scene (terminal, task board, chat). The "Compare, pick, save, share" ideas stay on the sign-in cards (they are features, not categories). The spec's "[CATEGORY 2..4]" line is filled in. **Owner to confirm the third pick.**
- **Lenis (smooth-scroll library) removed.** Measured: one wheel tick kept the page gliding for 580 ms, and every scroll frame was set by JavaScript on the main thread, so any slow moment shows as a stutter. The browser's own scrolling is steered by the graphics thread: 0 ms delay, no JavaScript. Cost: the soft "floaty" glide is gone. To get it back later: `npm i lenis`, `new Lenis({ autoRaf: true })` in a script, and expect the lag back. Smooth in-page links are not needed (no such link on the home page).
- **Pausing what nobody can see:** a box covered by the next box now pauses its animation (`data-covered`, set in reveal-on-scroll.ts). Running animations at the last box: 20 → 7.
- **Removed as dead code:** the Lenis package, its stylesheet and script; the unused "categories" scene and `sc-breathe`; dark-mode block and `dark` variant (never switched on); 18 unused design tokens (spacing, radii, durations, easings, gradients, palette entries). Checked with a script and `tsc --noUnusedLocals`: no other unused files, exports, classes or keyframes found.
- **Bundle:** JavaScript 155.4 → 150.4 KB gzipped.

## D20. Sign-in panel never pauses; counter reset and robots ignored (2026-10-29)
- **Owner feedback:** the left animation "keeps getting stuck and pausing"; the counter said 31 and must be the unique number.
- **Panel:** I removed the hover-to-pause (my own addition: any time the mouse rested on the panel it froze) and sped the drift from about 33 px/s to about 45 px/s, because under one pixel a frame can look jerky. Measured: both columns move every 100 ms sample, no stalls, hovering changes nothing. Not under my control: a laptop in Low Power Mode (the screenshot's battery icon is red) makes Chrome cut animations to 30 fps.
- **Counter, what happened:** the real count was 1 at the start of this session. My own test runs loaded the home page on the real server dozens of times, each from a fresh headless Chrome with no cookie, so each looked like a new person and was counted. That broke the rule "never test against the real counter". Reset to 1 (the owner's own browser); the old file is kept as `.data/visits.before-reset-31.json`.
- **Prevention:** the local server now ignores robots and automated test browsers (a name check: bot, crawler, headless, curl, Playwright, Lighthouse...). They are not counted and get no cookie. Checked with curl on a throwaway server: robot 0, curl 0, one person 1, same person again 1, second person 2, cross-site 403. The hosted version must do the same.
- **Honest limit:** it still counts BROWSERS. Someone on two devices, a private window, or after clearing cookies counts again. A true "unique people" number is impossible without accounts, and accounts wait for the legal gate. A robot that lies about its name would also be counted.

## D21. Hosting on Cloudflare, GitHub repo, and the docs folder (2026-10-29)
- **Host:** Cloudflare "Workers static assets" (config in `wrangler.jsonc`, headers in `public/_headers`). Chosen over Vercel because Vercel's free Hobby plan is for non-commercial personal use only (checked in Vercel's docs). Cloudflare docs checked: static file requests are free; Functions/Workers requests are capped at 100,000 a day on the free plan; D1 free tier is 5 million reads and 100,000 writes a day. Bandwidth limits were NOT found, so "unlimited bandwidth" is not claimed.
- **Deploy:** from the computer (`npx wrangler login`, then `npm run build && npx wrangler deploy`) needs no GitHub access for Cloudflare at all. Git-connected deploys are optional.
- **Repo:** private, under the owner's personal account `codingcrux0`, never in the HolyQuadrinity organisation. The owner did not want any organisation access: the GitHub CLI's approval page listed HolyQuadrinity (an earlier approval of the CLI app carried over), so that login was cancelled and the login is redone only after that access is revoked.
- **How it was pushed (2026-10-29):** a repo-only SSH deploy key with write access (public half added by the owner in the repo's Settings > Deploy keys; private half only at `~/.ssh/site-library-deploy`, mode 600). GitHub's host fingerprint was checked against its docs. A normal login was rejected because organisation access (HolyQuadrinity) is added automatically to broad logins. The repo's real name is `Site-Library` (capital letters); an anonymous request gets 404, so it is private.
- **Secrets:** none exist. `.env*`, `.dev.vars`, `*.pem`, `*.key`, `*.p12` are git-ignored; `.env.example` shows the pattern. gitleaks (installed with Homebrew on 2026-10-29) runs in local pre-commit and pre-push hooks (in `.git/hooks/`, not shared by the repo). CI (`.github/workflows/ci.yml`) runs check, build and audit with read-only permissions.
- **Headers:** only safe standard ones (nosniff, frame, referrer, permissions, long cache for `/_astro/*`). A Content-Security-Policy is still to do (needs hashes for Astro's inline scripts).
- **`wrangler`** was added as a dev dependency (dev only, never sent to visitors; `npm audit` 0 vulnerabilities). Its install scripts (esbuild, workerd) are not approved in `allowScripts`; `wrangler deploy` of static files works without them.
- **Docs folder:** all notes moved to `docs/` with `git mv` (history kept); nothing in the code reads them. The built pages were byte-identical before and after (checked by hash).
- **Counter online:** not built. The page shows no counter and sets no cookie when `/api/visits` is missing, so the COOKIE GATE is not triggered by this launch.
- **Not yet checked by the owner:** licences of the pasted components, before any public link is shared.

## D22. A counter with no cookie that works online ("Page views") (2026-10-29)
- **Owner choice (option C):** no cookie. This replaces the unique-browser cookie of D15 and D12's cookie rules. The label changed from "People visited" to **"Page views"** because without a cookie a refresh counts again; calling it "people" would be false.
- **Where it runs:** online, a Cloudflare Worker (`worker/index.mjs`) that runs ONLY for `/api/*` (`run_worker_first`), plus one Durable Object with SQLite that keeps the number (atomic: simultaneous visitors never overwrite each other). Pages and files never touch the Worker (checked: 0 Worker runs for 4 pages/files). Locally, `scripts/local-server.mjs` gives the same answers.
- **Why a Durable Object:** it is available on the free plan (SQLite only), needs no database to create by hand (created by the `migrations` entry on first deploy), and is strictly one-at-a-time. KV would lose counts when two people load at once. D1 needs a database id created first.
- **Shared rules** (`worker/visits-rules.mjs`, tested): own pages only (`Sec-Fetch-Site`/`Origin`), robots skipped by name, and a brake for the WHOLE counter (10 counts per second; no visitor address is ever kept, so there is nothing personal to store). Cloudflare's per-key Rate Limiting binding was not used: its docs do not say it is free, and it advises against IP keys.
- **Free-plan limits (Cloudflare docs, 2026-10-29):** Workers 100,000 requests a day; Durable Objects 100,000 requests, 100,000 rows written, 5 million rows read a day. If used up, further counter calls fail, the Worker answers 503 or is bypassed, and the page shows no number. Pages are unaffected. **Anyone can use up the allowance by sending requests**; that only hides the counter for the day.
- **Unknown addresses wake the Worker** (checked locally; `not_found_handling: "404-page"` did not stop it, so it was not used). Bots probing random URLs therefore use a little of the allowance. Accepted.
- **Live refresh slowed from 1 minute to 5 minutes** so open tabs use less of the allowance (the home page code is otherwise unchanged).
- **Starts at 0 online.** Never seeded with a made-up number. The local file keeps its old value (1).
- **Tests first:** 10 unit tests for the rules (`npm test`), then real tests of the Worker in Cloudflare's local runtime (`wrangler dev`) and in Chrome. Results in TESTING.md.
- **Not tested:** the real Cloudflare deployment (needs the owner's account), the free daily limits being hit, real traffic.
- **Retired:** the cookie, the per-address 2 s brake (replaced by the whole-site brake), and the COOKIE GATE trigger (CONTEXT.md).

## D23. Phone scroll-up lag, and the back-to-top button (2026-10-29)
- **Owner feedback:** on a phone, scrolling up from the end lags a lot and is buggy. Add a "back to top" component at the end, built from the supplied Skiper "Dynamic Toggle".
- **Most likely cause, fixed:** the category boxes were sized in `dvh`, which changes size every time the phone's address bar slides in or out (it comes back when you scroll up), so every box, and everything that measures them, was laid out again in the middle of the scroll. Now `lvh` (fixed screen height; boxes, their spacing and the picture height cap) and `svh` on `<body>`. The look is the same; while the address bar is showing, a box is a few pixels taller than the visible area.
- **Second cost removed:** each box's grid used a full-size CSS `mask-image`, which makes a phone's graphics chip draw an extra full-screen layer per box. Replaced by a gradient of the box's own colour painted over the lines. Checked against screenshots of the old version at 4 boxes, laptop and phone sizes: biggest difference 3 to 5 out of 255 (rounding), nothing else differs except an animation caught on a different frame.
- **Honest limit:** I could NOT reproduce the lag in a test browser (a desktop browser cannot copy a phone's address bar exactly; when its window shrinks, `lvh` shrinks too), and my first test run's "167 ms stall" was noise, so it is not claimed. The fixes follow how phone browsers define these units and remove known per-frame costs. **Owner to confirm on the real phone**, and say which phone (iPhone or Android) and where it still stutters if it does.
- **Back to top** (`src/components/ui/back-to-top.tsx`, in the footer, `client:visible` so it loads only when reached): a black dot with a "click" icon; a real mouse hover or keyboard focus opens it (same spring as the original) to "Back to top" + an up arrow; a tap on a touch screen goes straight to the top. Smooth scroll, instant with "reduce motion"; focus moves to the top of the page afterwards. Dropped from the original: demo Toggle button, skeleton dots, play icon, blur animations (slow on phones), entrance animation (so it is there even if scripts fail), undefined `bg-foreground` classes. Credit to Skiper UI stays in the footer ("Crowd animation and back-to-top button adapted from Skiper UI"). Size: +2.2 KB gzipped, loaded only at the end of the page.
- **Not changed:** the sign-in page still uses `min-h-dvh` (short page, not scroll-heavy; changing it would add a scrollbar).

## D24. Back-to-top glitch, slow crowd start, phone load (2026-10-29)
- **Owner feedback:** at the page end a word showed glitched on top of the back-to-top button for a few seconds; everything is laggy on phones; the walking crowd takes a while to appear on phones and sometimes on desktop.
- **Glitch, root cause found and reproduced:** the button's three layers (click icon, words, arrow) get their fade from JavaScript, but the HTML the server sends had no opacity on them. Until the button's script loaded, "Back to top" and the arrow were drawn over the click icon (and the arrow's see-through white circle lightened the whole dot to grey). My earlier tests ran after loading, so I missed it. Fix: `initial={false}` on the layers, so the server-made HTML already says opacity 1/0/0. Checked with the script blocked (a slow phone): before = word over the icon, after = clean dot. The button's script also now loads 400px before the button is reached (`client:visible={{ rootMargin }}`), so it works the moment you arrive.
- **Crowd start, root cause found and measured:** a chain of steps one after another: the crowd's script (GSAP) downloads, then it asks for the 380 KB picture, then the picture downloads and unpacks. Fixes: the home page preloads the picture at low priority in parallel (`<link slot="head" rel="preload" as="image" fetchpriority="low">`, via a new `head` slot in `main.astro`); the crowd's script starts 800px before it scrolls into view; the picture is unpacked off the main thread with `img.decode()`; `/images/*` is cached for one day so repeat visits skip the download. Measured on a slowed phone (fast 3G, 4x slower CPU, compressed like Cloudflare): first figure drawn 3.59 s to 3.10 s. The 380 KB picture alone needs about 1.9 s at that speed, so there is a floor; on 4G it appears in about 1 s.
- **Tried and dropped:** WebP for the picture. It came out bigger (630 KB at best quality, against the 380 KB palette PNG).
- **Phone lag, what I could and could not find:** I could not reproduce a slow main thread (no long tasks over a whole 8000px scroll at 4x and 6x slowdown; about 1 s of total work in a trace). The one thing that is plausibly heavy on a weak phone chip is the crowd: about 100 figures drawn 60 times a second, mostly stacked behind each other. On narrow screens (under 640px) at most 45 figures walk at once. (First done as a cap in code; replaced by a smaller phone picture in D26, same 45 figures, fewer bytes.) Measured on a computer's graphics chip, over 4 s: graphics work about 190 ms to about 135 ms, animation-frame work about 207 ms to about 100 ms. **This is not a phone measurement.** Trade-off: a slightly less packed crowd on phones; to undo, see D26.
- **Not changed:** the crowd's drawing code, the picture, the text-scroll animation, the category boxes.

## D25. Logo, favicon and link preview (2026-10-29)
- **Owner feedback:** pasting the link in X showed a small grey default square. Wanted a simple, neat logo matching the site, shown in link previews.
- **Why it was grey:** the pages had no preview image and no Twitter card tag, and the favicon was Astro's default.
- **Logo (owner approved option A of three):** a black rounded square with one bold white check mark ("tested by hand"). Chosen over a three-bar "shelf" (says nothing about testing) and a tick-plus-list (muddy at 16 px). Source: `docs/brand/logo.svg`. Black and white, so it matches the buttons and works on light and dark browser tabs.
- **What ships:** `public/favicon.svg` (the logo), `favicon.ico` (16, 32, 48 px, see-through corners), `apple-touch-icon.png` (180 px, square corners because phones round them themselves, `docs/brand/apple-icon.svg`), `og-image.png` (1200x630 card: white, the faint grid from the category boxes, the logo, "Site Library", the tagline, and the four category tint colours; source `docs/brand/og-card.html`, 48 KB).
- **Tags** in `src/layouts/main.astro` on every page: `og:site_name/url/title/description/image(+width, height, alt)`, `twitter:card = summary_large_image` (+title, description, image, alt), `canonical`, favicon links and `apple-touch-icon`. Preview tags need FULL addresses, so `SITE.url` (`https://site-library.codingcrux0.workers.dev`, in `src/config/site.ts`) is the one setting to change when the site gets its own domain.
- **Re-making the images:** `node docs/brand/make-brand.mjs` (uses the installed Google Chrome, no new dependency; Mac path, can be overridden with `CHROME=`). The card has the name "Site Library" drawn into it, so a rename needs the card text in `og-card.html` changed and the script run again.
- **Known limits:** X, WhatsApp and others keep an old preview of a link they have already seen for a while; a new post of the same link with `?v=2` on the end usually gets a fresh one (not verified against X's current behaviour). Not tested in the real X, WhatsApp or Slack, only the tags and files.

## D26. Why the crowd takes seconds to appear, and the smaller phone picture (2026-10-29)
- **Owner question:** why does the crowd walking animation not load for a few seconds when opening the site?
- **What I measured on the LIVE site from the owner's Mac (no throttling, cache off):** the crowd first drew 5.3 s after the page started. The page's own HTML took about 2.2 s to arrive, then the stylesheet 1.6 s more for 11 KB. Connecting to the site took 0.3 to 1.3 s (cloudflare.com: 0.08 s), the first byte of the HTML 1.2 to 1.6 s (other sites: 0.2 to 0.45 s), and the picture came down at about 100 KB/s. The site was being served from Cloudflare's Marseille data centre (`cf-ray ...-MRS`) while cloudflare.com itself came from Mumbai (`BOM`), and astro.build (also on Cloudflare) from Kolkata (`CCU`). Vercel and GitHub Pages sites connected in 0.11 to 0.21 s. **So most of the wait is the network route to the free `workers.dev` address from this location, not the code.** I do not know why Cloudflare routes it this way (I have not found a Cloudflare statement about it), and these are a few samples from one computer on one afternoon.
- **What the code adds on top of that:** each step waits for the previous one. The browser will not run the page's scripts until the stylesheet has downloaded, then the crowd's script is read and only then asks for the scripts IT needs, and so on, and the crowd also needs the whole 380 KB picture. Tested on a steady link (480 ms round trip, 150 KB/s): without the picture preload the crowd appears at 6.35 s, with it at 4.74 s (D24). On that steady link the picture is the bottleneck, so putting the stylesheet inside the page and preloading the scripts changed almost nothing (4.64 to 4.67 s) and I first did not keep them. **Then live runs showed I was wrong to stop there:** on the real, jumpy route the picture often arrived first (4.2 s in one run) and the crowd still waited for a 3.7 KB script chain (first draw 7.9 s; one run 27 s), because every extra step in the chain can cost seconds. On a link with a long round trip (1000 ms, 300 KB/s) the same two changes took the crowd from 5.57 s to 3.85 s (31% faster, 3 runs each). So both are kept: `build.inlineStylesheets: 'always'` in `astro.config.mjs` (no separate stylesheet to wait for; each page now carries its own ~10 KB compressed copy, so the list page grows from 1.8 KB to 12 KB), and `scripts/preload-islands.mjs`, a small build helper that adds `<link rel="modulepreload">` for every script the TOP-of-page islands (crowd, counter) need, so they download side by side. The lower islands (text animation, back-to-top) still load only near their place. If the helper finds nothing it does nothing.
- **Picture formats tried, none kept:** fewer colours (350 KB near-lossless; 270 KB visibly worse), lossless WebP 346 KB (91%), lossy WebP 456 to 614 KB (bigger), AVIF 288 to 344 KB (loses detail). The PNG is already near its floor.
- **What was built:** phones (under 640px wide) get a second picture, `public/images/open-peeps-crowd-phone.png`: 45 of the 101 figures, copied pixel for pixel (0 pixels differ), 180 KB (47%), about 14 MB instead of 32 MB once unpacked. `skiper39.tsx` picks it by the same width rule as the two preload tags in `index.astro` (`media="(max-width: 639px)"` and `"(min-width: 640px)"`), so each screen downloads one picture. This replaces the 45-figure cap in code. Recipe: `docs/brand/make-phone-crowd.py` (needs Pillow; a helper, not a site dependency). Trade-off: phones always see the same 45 figures (it used to be a random 45 of 101); desktop is unchanged.
- **Result (test link above, phone size):** crowd first drawn 4.73 s to 3.58 s. Graphics work about the same as with the cap (about 100 to 150 ms per 4 s on a computer's chip). Desktop unchanged (still the 380 KB picture).
- **Options NOT taken (owner's decision, money or hosting involved):** (1) accept it; (2) a custom domain on Cloudflare (costs a few dollars a year; I cannot promise it routes differently); (3) host the pages somewhere that was faster from India in my samples (Vercel, GitHub Pages). Moving the pages is possible, but the counter (a Cloudflare Worker with a Durable Object) would have to be rewritten or stay on Cloudflare, and Vercel's free plan is for non-commercial use. Not recommended until there are real visitors to measure.

## D27. The list page: sidebar, gooey tabs, page numbers (2026-10-30, first draft)
- **Owner request:** build the second page (every "Browse the list" button goes to `/websites`): a simple design first, then change it step by step. Use the supplied pagination component for the page numbers, the supplied sidebar as the base for the rest of the pages, add gooey tabs on top and a categories dropdown in the left sidebar. Preview on localhost before anything goes live. Owner gave full permission, asked not to break the original site.
- **Layout:** header as before, then the title; below it, on the left the sidebar (Home, All sites with a count, a Categories dropdown, How we test, Sign in), on the right the gooey tabs (All sites, Newest, Top scored, My lists), the rows, and the page numbers. On phones the sidebar folds behind one button. Colours stay white, light grey and black.
- **No new packages.** The supplied code asked for `framer-motion`, `@base-ui/react`, `@tabler/icons-react` and `class-variance-authority`. The site already has `motion`, `lucide-react`, `clsx` and `tailwind-merge`, so both components were adapted to those. The list of changes is at the top of `ui/pagination.tsx` and `ui/sidebar.tsx`. Cost of this choice: the sidebar's gliding highlight (needs the larger motion bundle) is a plain highlight; collapsed, icon-rail, floating and resizable variants were dropped because nothing uses them. If you want the exact originals, they can be installed later (that adds packages, so it is your call).
- **Gooey tabs** (`ui/gooey-tabs.tsx`, written for the site, no outside component): two black pills behind the labels, one fast and one slow, melted together by an SVG blur-and-contrast filter. The filter touches only the tab strip and is off with "reduce motion". Before the script loads the chosen tab paints its own black background. Arrow keys, Home and End work. One visible flaw: for a fraction of a second the blob passes behind a label that is still dark, so that word is low-contrast while it moves.
- **Honest content:** the real list is `ENTRIES` in `src/config/library.ts` and is EMPTY (the spec: nothing is listed until tested and dated). The live page shows an honest empty state, with the sidebar, tabs and a one-page pagination whose Previous and Next are disabled. `npm run dev` on your computer adds 160 labelled "Layout preview" example rows (`src/config/library-preview.ts`) so the whole design, with 20 pages, can be seen. The build does not contain them (checked: no file in `dist/` has the demo text).
- **Page numbers:** the logic is `src/lib/page-range.ts` with tests written first (`src/lib/page-range.test.mjs`). The supplied demo's version showed different buttons on the server and in the browser (it read the screen width in a hook), and could change length while clicking; the new one is always 7 slots long.
- **"My lists" tab:** a labelled placeholder only. The next step is lists kept in the browser's own storage, with no account (spec 7.4, logged-out saves), with a clear note that they live on this device only. No LEGAL GATE is crossed by the placeholder; real accounts stay closed.
- **Rows show:** name, one line, "The catch", my score (4 to 20, the sum of four 1 to 5 scores, spec section 5) and the test date. The community score is not shown because it does not exist yet; the two are never mixed.
- **Size:** the new page's script is 17.7 KB (about 6 KB gzipped) and loads only on `/websites`; the home page's JavaScript is unchanged (+147 bytes gzipped). The inlined stylesheet grew by about 1 KB gzipped on every page, because the page's new classes are in the one shared stylesheet.
- **Typing a page number (owner request, same day):** clicking a "…" turns it into a small box ("Page"). Enter goes to that page, Escape or clicking away cancels, an empty Enter keeps the box open and marks it invalid. Only digits are kept (letters, minus signs, decimal points and pasted text are dropped), a number that is too big goes to the last page, 0 goes to page 1. After a jump, focus lands on the current page button, because the dots may have moved. Rules: `parsePage` in `src/lib/page-range.ts`, 4 tests written first. Without `onJump` the dots stay a plain, unclickable label, as in the supplied component. On a 320 px phone the number strip scrolls sideways a little while the box is open (the page itself does not).
- **Owner changes after the first look (same day):** (1) the sidebar's top is now a plain "Go back" link with a left arrow (to the home page) instead of the logo and name; the Home item below it stays, so the two go to the same place (say if Home should go). (2) "How we test" is removed from the sidebar (it is still in the page header and on the home page). (3) New "Oldest" tab next to "Newest" (earliest test date first; same-day entries by name). Five tabs are too wide for a phone, so the strip scrolls sideways there and the chosen tab is scrolled into view. **Bug found by this change and fixed:** the blob layer was only as wide as the visible strip, so on a 320 px phone the blob of a scrolled-off tab was cut away and the chosen tab showed white text on white; the layer is now as wide as the whole strip.
- **Not done on purpose:** no entries invented, no saving, no search box yet (added in D28), no sort controls other than the tabs, no footer on this page yet.

## D28. All four categories, the type filter and the header search (2026-10-30)
- **Owner request:** make Dev Tools, Productivity and AI Tools work like Frontend Components; add a filter dropdown on the right, with its own search box, for types of website (React, CSS, Java and many more); add a search box at the top right of the site with grey "ghost" text that completes what you type.
- **Questions answered (design approved in chat):** search lives on the list page only for now (the home page keeps its counter, and nothing is listed yet); picking several types means "any of them".
- **Categories:** all four are clickable in the sidebar and each shows how many sites it holds (a count, instead of "Coming next"). A category with nothing in it shows the same honest text ("Nothing is listed in Dev Tools yet. ..."). The home page boxes still say "Coming next" for three of them, because that is still true for the real list. The demo rows (localhost only) are split 40 / 40 / 40 / 40 across the four.
- **Types:** each entry has `tags` (type words). The vocabulary is one file, `src/config/tags.ts` (about 60 words, grouped per category, every word unique). A test fails if a real entry uses a word that is not in that file, a score outside 4 to 20, an unknown category, a repeated id or a bad date, so a typo cannot reach the live list.
- **Filter by type:** a button at the right of the tab row opens a small panel: a search box, tick boxes with a count per type, and "Clear types". Several ticks = any of them. Only the types of the chosen category are offered, and switching category drops ticks that no longer apply. Chosen types also show as removable chips under the tabs. Each row now shows its types as small labels, so you can see why it matched (not asked for; one quiet line).
- **Search:** `src/components/ui/search-box.tsx`. It looks at name, summary, category and types, every typed word has to appear somewhere (capitals ignored), and it narrows the list together with the tabs, the category and the types. Typing while on "My lists" jumps to "All sites". Matching is "contains", so "rea" also finds "Spreadsheets"; that is deliberate and simple, and it can be tightened to word starts later.
- **Ghost completion:** the faint end of the best suggestion appears right after your text ("rea" shows "ct"). Tab or the right arrow accepts it, Escape clears the box. Suggestions come only from entries that exist (names, categories, types), so the live site suggests nothing while the list is empty. The rule (shortest match first, then alphabetical) is `completionFor` in `src/lib/search.ts`, tested first. The ghost is switched off when the typed text is wider than the box.
- **Where the box lives:** in the header, but the list lives in the React island. The page leaves an empty spot (`id="header-search"`, fixed size so nothing jumps) and the island draws the box into it (a React portal). So the box shares the island's state with no new package and no event plumbing. With scripts blocked the spot stays empty and the filter button does nothing, like the tabs.
- **Search is in the browser, over data already on the page.** Nothing is sent anywhere and nothing is stored. This is the "browser-side" answer to open decision 4 for this size of list; revisit it when the list is large (the whole list is downloaded with the page).
- **Header on phones:** "How we test" hides under the `sm` width so the logo and the box fit on one row down to 320 px.
- **No new packages.** Everything is plain React, the existing icon set and Tailwind.
- **Not done on purpose:** search on the home page, saved searches or filters in the address bar (a shared link does not carry the search yet), word-start matching, saving lists.

## D29. No developer toolbar; audit of supplied code (2026-10-30)
- **Owner request:** remove the dark toolbar at the bottom of the page (it is not for the website), and in future check anything supplied from outside for secret watermarks or unneeded tools and remove them.
- **What it was:** Astro's own developer toolbar. It only appears on `npm run dev` on the owner's computer; the built site never contained it (0 files). It is now switched off in `astro.config.mjs` (`devToolbar: { enabled: false }`); verified in a real browser: 0 toolbar elements.
- **Audit of everything already in the project (source and built files):** the only network call is the page-view counter to the site's own `/api/visits`; no analytics, tracking, cookies, storage, `eval`, `innerHTML`, external scripts, iframes, fonts or images from other hosts. The built page has only Astro's own two inline scripts (island loader and the first-load helper), no outside address in them. Outside names in the built files are text only (the Tailwind licence comment, error messages inside React and GSAP), not requests.
- **Credits that remain, on purpose:** the home page footer credits Skiper UI (its free licence REQUIRES a visible credit) and Open Peeps (the crowd illustrations). They are not watermarks, but they are not ours either: **owner to decide** if they keep these components with the credit, or replace them. Removing the Skiper credit while using its code would break its licence.
- **Standing rule (also saved in memory):** every supplied component or tool is audited once when it arrives: external URLs and hosts, network and storage calls, injected scripts and styles, credit or "made with" text, hidden toolbars or widgets, and the built files too. Unneeded items are removed and the removal is reported.

## D30. Colour wheel and dark mode (2026-10-30)
- **Owner request:** a rainbow/colour icon that opens the supplied colour picker smoothly and recolours the home and list pages; below it a dark-mode switch with a cute icon; dark mode switches the wheel off and the site goes smoothly dark; nothing may break. A backup was made first: `Product-projects/site-library-BACKUP-2026-10-30-before-colour-wheel` (315 files, checked identical, with restore steps). The owner approved the design with the defaults: a lightly tinted page, and floating buttons.
- **How it works:** the site already took every colour from CSS variables. One picked colour is turned into a full set of those variables (`deriveTheme` in `src/lib/theme.ts`): accent (buttons, pills, active tab, links, focus ring), a very light page tint, borders, four category tints and the text colours. **Contrast guard:** the accent is darkened step by step until white text on it is at least 4.5 to 1, and coloured text is checked against the hardest light surface; page and text colours are fixed very light and very dark, so they stay readable for ANY pick (yellow, white, black, grey). A grey pick gives a grey page. "Reset" returns to the original black look.
- **Dark mode:** `html[data-theme="dark"]` in `global.css` defines the same variables again. The wheel's colours are removed while it is on (the wheel button stays visible but greyed, and a tap shows "Colours are off in dark mode."). The picked colour is remembered for when dark mode goes off. First visit is always light (the computer's own dark setting is NOT followed unasked). The browser bar colour (`theme-color`) follows.
- **Smoothness:** the picker fades and scales in about 0.18 s from the button; single jumps (dark switch, preset, typed colour) fade the page colours for about 0.35 s; dragging has no fade (it is already continuous). Everything is off under "reduce motion".
- **Saving:** this browser's local storage only (key `site-library-theme`): no cookie, nothing sent. A tiny script in `<head>` (`THEME_BOOT_SCRIPT`) applies it before the page draws, so there is no flash. It stores the finished palette, so the script needs no colour maths. It only applies the known variable names and plain `#rrggbb` values (a test feeds it hand-edited rubbish). **Note for later:** there is no Content-Security-Policy yet, so the inline script is fine today; when one is added, this script needs its hash (or a nonce).
- **Where the buttons live:** from 1280 px wide: a vertical pair on the right edge, in the empty margin beside the page. Below that there is no margin, and in a phone test the pair covered the "My lists" tab and the filter arrow, so there they sit side by side in the bottom-right corner and the picker opens upwards. They show nothing until their script has loaded (no dead buttons) and load with `client:idle`, so the hero and the crowd are not slowed. They are on the home and list pages. The sign-in page has no buttons, but it follows the saved choice.
- **Changes forced by this (small, visible):** the crowd's pause button moved from the bottom-right to the bottom-left of the crowd (the dock would have covered it); the home footer got extra space at the bottom below 1280 px (so the dock cannot cover the credit links at the end of the page). Hard-coded white boxes and white text on black pills were replaced by variables (`bg-surface-raised`, `bg-action`, `text-action-ink`); a test now fails if `bg-white` or `text-white` creep back into pages or components.
- **Left as they are on purpose:** the little website pictures in the category boxes and on the sign-in page (they are pictures of other websites, so they stay light, also in dark); the crowd (white fills with black outlines read well on dark, no filter needed, so no speed cost).
- **Audit of the supplied picker (D29 rule):** no network calls, no storage, no tracking, no badge or watermark. Only extras: `data-wensity-primitive` attributes (removed) and its packages (`@tabler/icons-react`, `@base-ui/react`, not installed; icons from lucide-react and our own popup instead). The eyedropper is a feature built into some browsers; it sends nothing. The opacity bar was dropped (a see-through site colour makes no sense). **Licence of the picker is not stated: owner to verify.**
- **Cookie gate:** not triggered (nothing is sent; the choice is a preference the user asked for, kept on their device). Mention it in the privacy policy when that is written (LEGAL GATE).

### D30, update the same day: the colour now changes the whole page, not only the buttons
- **Owner request:** the picked colour must switch the entire website (the white behind the page too, with buttons and UI colours adjusted to match), but NOT the logos, the animations, the original category cards and their scroll animation, or the X button.
- **What changed:** the page, the boxes and inputs, the sunken and highlighted areas and all borders now take the picked hue. The tint is a light version of the pick, deeper the more colourful the pick is (pink gives a pink page, blue a blue page). A grey, white or very dark pick, including the black swatch, keeps the original white page. **Why light and not the exact colour:** an exact mid-tone background (a pure red, a mid blue) cannot hold readable text in three strengths, and the owner's design rule is a bright site, so the page uses a light version and the accent keeps the colour (darkened until white text is readable). Choosing a dark colour never flips the site dark; dark is the moon button's job.
- **What stays untouched, and how:** (1) the X button has its own colours (`--logo-bg`, `--logo-ink`), which the wheel never sets; (2) the category cards (home) and the card showcase (sign-in) carry `data-keep-palette`: `global.css` re-declares the original palette on them (the value set on the element wins over the wheel's value on `<html>`), so the cards, their little website pictures, their buttons and their animations look exactly as before. Dark mode still reaches them, on purpose; (3) the crowd, its art and its animation are not touched (only the page colour behind it changes, so it stays seamless); (4) favicon and link-preview picture are files and cannot change. A test fails if the shielding or the X button's own colours are removed.
- **Limit worth knowing:** text inside the scroll sentence animation and the footer follows the page's text colour (a tinted near-black); they are text, not logos.

## Cleanup log (2026-10-29)
Scenes round: removed the empty-picture placeholder frame and its icon, the per-column card shapes, a dead class (`sc-save`) and the fourth loop copy. Counter round: removed the unused exports of the supplied counter (`AnimatedCounter` by name, `Grouping`, `AnimatedCounterProps`) and a backup of the heavier build; `auth-notice.ts` became `auth-form.ts`. Sign-in round (earlier the same day): removed the `data-reveal-watch` marker, the unused `ShowcaseCard` export, and the leftover clip-path attempt. Earlier: deleted the unused `CharacterV3` animation, exports nothing imports (`CrowdCanvas`, `CharacterV1/V2`), the `tw-animate-css` package and its CSS import (no class from it was used), the old header markup, and the "Page coming soon" branch. Kept on purpose: about a dozen unused design-kit variables in `global.css` (about 0.1 KB gzipped, part of the supplied token set), and `hero.tsx` exactly as supplied (it ships zero JavaScript). Other tokens only look unused: Tailwind reads `--color-*`, `--radius-*` and `--font-*` through class names.
Colour wheel round (2026-10-30): removed the supplied picker's opacity bar, popup library, data attributes and the `className`/`style` options nothing used; replaced every hand-written white box or white text with a colour variable; the crowd pause button and the footer were moved only to stay clear of the new buttons.
Search round (2026-10-30): removed the sidebar's unused "disabled" option and styles (all four categories are live now), the `live` flag the page passed for each category, and the old "Coming next" badge in the sidebar.

## Open decisions (owner to answer)
1. Public or private GitHub repo?
2. Account deletion: delete or anonymize ratings and feedback?
3. Analytics tool (cookieless) and whether "returning visitors" is worth a small stored token.
4. Search: browser-side index (fast, but the index can be downloaded) or server search (rate-limitable). (The list page's search is browser-side for now, D28; decide again when the list is large.)
5. Install gitleaks (secret scanner) via Homebrew: approve?
6. ~~Rename the parent folder~~: done, see D5.
7. Real site name (it's "Site Library" for now, set in `src/config/site.ts`). (The favicon and link preview are done: D25.)
 

**D30 follow-up (2026-10-30, dark mode):** the animated mini screens inside the category pictures stay light in dark mode (`.sc` declares the light palette, like `[data-keep-palette]`). They are white cards with dark bars drawn for a light page, so letting dark mode flip their text made the labels invisible. They behave like a screenshot of the site on a dark box.

**D30 follow-up 2 (2026-10-30, dark picks):** a dark pick used to give the original white page (the black swatch meant "back to the original look"). The owner picked `#010411` and said dark colours do not work. Now a pick that is dark enough (white text on it at least 10 to 1, `pickIsDark` in `src/lib/theme.ts`) makes a **dark site in that colour**: the page IS the picked colour, the boxes and borders step up in lightness with the same hue, text is light, buttons are light with dark writing. Ordinary and deep colours such as `#2b52ff` stay on the bright page. The category cards and sign-in cards follow the dark look of the moon button on a dark pick (bright cards would glow on a dark page); the X button, the logos and the mini screens stay as they were. The head script sets `data-tone="dark"` (saved as `tone`) so scrollbars and form controls are dark before the page draws. The black swatch now makes a near-black site. To go back to white: Reset, or any light colour.

## D31. Website rows: hover box, star rating, review, bookmarks (2026-10-31)
**Asked for:** each website on the list shows a description and one shortcoming; the row expands downwards on hover; the right side has a review button and a star rating (the Wensity star rating, one star that grows to five on hover); a bookmark option; a Bookmarks item on the left that needs a sign-in.
**Built:**
- The row keeps its name and types. Hovering it (or tabbing into it) turns it into a box and opens the description and "the catch" (the one shortcoming; the data already had both, `summary` and `theCatch`) inside the row, under the types, in the free space beside the buttons. The box is exactly as tall as it needs to be: a short description grows it only a little (or not at all), a long one grows it more, so there is no blank space. (First version: the description hung in a fixed strip below the row, drawn over the next row. The owner saw blank space around short text, so it was changed to grow in place.) The rows below move down while one is open, by at most the extra height; sweeping the pointer down and up the list in a real browser changed the hovered row only 3 and 4 times, so there is no flicker. Touch screens cannot hover, so there the description and the catch simply stay in the row.
- Right side: Review button, bookmark button and the one-star rating, then "My score" and "Tested on" as before (now side by side). The star is last on its line, with room kept after it, so it grows into empty space and never covers a button.
- Bookmarks: a sidebar item. While accounts are closed it shows "Sign in to see your bookmarks."
- **No accounts yet (legal gate not done), so nothing is stored or sent.** Review, bookmark and picking a star only open a small prompt: "Sign in to ... Accounts are not open yet." with a Sign in link. The rating is fixed at 0, so a rating nobody gave can never appear (no fake reviews). When accounts exist, `EntryActions.tsx` is the one place that changes.
- The Wensity component was installed in a scratch folder first (`--dry-run`, then `--no-install`), read in full and copied byte for byte, then changed in one place (empty star brighter in dark mode). `global.css` got one line, `@custom-variant dark`, so the component's `dark:` classes follow the site's moon button and dark colour picks instead of the computer's own setting.
- "My lists" (this device only, no account) is untouched and still a placeholder. Bookmarks (account) is separate.
**Not built on purpose:** community ratings or reviews (nothing to show yet, and no fake ones); saving to a server.


## D32. Speed pass: less work for the browser (2026-10-31)
**Asked for:** review the code, remove debugging leftovers, test for breaks, make the site less laggy.
**Review:** a search of `src`, `worker` and `public` found no `console.*`, `debugger`, TODO or dead code, so nothing was deleted for that reason. The comments are long on purpose (the owner is learning). No look or behaviour was changed.
**What was slow (measured, not guessed, in headless Chrome, some runs with the CPU slowed 4 times):** (1) each row drew a five-star rating (about 40 small shapes), 8 rows on a page; (2) the typing bar in the sign-in picture animated its WIDTH, which makes the browser re-lay-out the page every frame, forever; (3) every colour or moon change put a transition on every element of the page.
**Fixes:**
- **One star until needed.** A row draws a single star. It draws five only while the pointer or the keyboard is on the star button, and goes back to one 450 ms after it leaves. The screen reader still hears a five-star rating ("0 out of 5 stars"). `EntryRow` and `EntryActions` are wrapped in `memo`, so a search keystroke does not redraw rows whose website did not change.
- **Typing bar moved to the graphics chip.** It now reveals with a sliding cover and a moving cursor (transform and opacity only, `src/styles/scenes.css`). Same look, with two tiny differences found by comparing screenshots: the right end of the bar is square while it is being revealed, and the cursor is about one device pixel thinner.
- **Colour changes cross-fade the whole page** with the browser's View Transitions (`document.startViewTransition`, `crossfade()` in `ThemeDock.tsx`, 0.3 s in `global.css`) instead of a transition on every element. Browsers without it, and people who asked for reduced motion, get an instant change. This replaces the `theme-fade` class mentioned in D30.
**Measured:** list page 2,820 DOM nodes down to 1,028, and 1,822 SVG paths down to 414; memory 27.9 MB to 16 MB. Sign-in page at rest: CPU 23.7% down to 0.1% and style work 11.9% down to 0.0%. Dark switch on the list at 4x slowdown: four to five stalls of 129 to 175 ms down to none (worst frame 67 ms). Home page at 4x: no stalls in colour drag, dark switch or scroll.
**Left as it is:** the home page crowd (GSAP canvas) uses about 10% of one core while it is on screen; it already pauses when scrolled away. Dragging the colour wheel on the list at 4x slowdown still averages about 28 ms a frame because the whole page is re-coloured; fine on a normal computer.

## D33. Average rating circle and the user feedback side panel (2026-10-31)
**Asked for:** the average star rating of every user combined, in a small circle ("4.5/5"), with the star rating just to its right; and a small button in the hover box that opens a right-hand side panel with all the user feedback.
**Built:**
- `src/lib/ratings.ts` (`summarizeFeedback`): count, average to one decimal, and how many gave 1 to 5 stars. Tested first (`ratings.test.mjs`): no feedback gives `null`, never a made-up number; a bad value (0, 6, 3.5, text) is ignored so the average can never leave 1 to 5.
- Row: a 40 px circle "4.5 /5" sits between the bookmark and the star rating (`EntryActions.tsx`). While nobody has rated it shows "–" and reads "no ratings yet" to a screen reader.
- The hover box has a small "See user feedback (3)" button under the catch. It opens ONE panel for the whole page (`FeedbackDrawer.tsx`) that slides in from the right: the website name, the average with stars, a bar for each of 5 to 1 stars, then one card per feedback (initial, name, date, stars, text), cards fading up one after another, and a "Write a review" button at the bottom.
- The panel is built by hand, no new package: `role="dialog"` with `aria-modal`, Tab stays inside, Escape or a click on the dim area closes it, the page behind is locked (no sideways jump), focus goes back to the button that opened it. It moves with transform and opacity only (the bars use scaleX), and respects reduced motion. A website with no feedback shows an honest empty state.
- Data: `Entry.feedback?: Feedback[]` in `src/config/library.ts`. **The real list has none**, so the live site shows "–" everywhere and the empty state. Only the localhost demo rows (`library-preview.ts`) carry example feedback; each line says "made up", the panel says "Layout preview: the feedback below is made up", and a test checks the real list stays empty. The built site does not contain any of it (searched `dist`).
- Still no accounts (legal gate): "Write a review" only asks to sign in; nothing is saved or sent. When accounts exist, the feedback and the average will come from the server (the average must be computed there, from real ratings), and `FeedbackDrawer` / `EntryActions` are the places to change.
- `formatDate` moved to `src/lib/format-date.ts` because two files need it.
