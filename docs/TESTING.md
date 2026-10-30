# TESTING.md

Status: **plan only (M0).** No tests exist yet, and no test tools are installed.

## Proposed tools (each needs your approval before install)
| Tool | Tests what | Why this one |
|---|---|---|
| Vitest (npm 5.0.5 as of 2026-10-28) | Small logic: quiz rules, score totals, CSV validation | Fast, works with Astro/Vite |
| Supabase permission tests | RLS: wrong user, logged out, privilege escalation | Proves the permission table really holds |
| Playwright (npm 1.64.1) | End-to-end flows in real browsers, incl. mobile sizes | Free, multi-browser |
| axe (via Playwright) | Accessibility problems | Industry standard (verify package choice) |
| Lighthouse | Performance, Core Web Vitals | Free, from Google |
| npm audit + gitleaks + Dependabot | Vulnerable packages, leaked secrets | Free |
| OWASP ZAP baseline scan | Missing headers, common web issues | Free dynamic scan (verify current tooling) |

**Catch:** Supabase's local dev setup needs Docker, which isn't installed. The other route is running permission tests against the free **dev** Supabase project. We decide in M1.

## Must-have negative tests (from the security floor)
- User B reads or edits user A's private list, preferences or rating: must fail.
- Logged-out user writes anything except submissions/reports: must fail.
- Normal user calls admin actions or reads drafts/private_notes: must fail.
- Second rating on the same entry: must update, never duplicate.
- XSS payloads in feedback, list names, display names: shown as plain text.
- Oversized input, empty input, emoji/Hindi text, double-submit.
- Outbound redirect with a URL in the query string: must not redirect there.
- Repeated requests: rate limit kicks in.

## Verification log
### 2026-10-28: landing page
| Check | Result |
|---|---|
| `astro check` | 0 errors, 0 warnings, 0 hints (11 files) |
| `tsc --noEmit` | exit code 0 |
| `astro build` | 1 page built, static output |
| `npm audit` | 0 vulnerabilities |
| Install scripts | none unreviewed (`fsevents` denied) |
| Third-party requests on page load | none (checked the built HTML) |
| Browser console | no messages (headless Chrome) |
| Visual check, headless Chrome screenshots | desktop 1440px, tablet 768px, phone 390px (in a 390px frame, because headless Chrome on Mac has a minimum window width) |
| Reduced motion (`--force-prefers-reduced-motion`) | crowd frozen, button shows "play" |
| JS sizes (gzipped) | React runtime 64.3 KB, crowd + GSAP 29.6 KB, Astro island loader 3.0 KB, CSS 5.2 KB. Hero: 0 KB |

### 2026-10-28: scroll animation + crowd head fix
A throwaway Chrome DevTools-protocol script (`/tmp/shots/cdp.mjs`, not in the repo, no dependencies) set exact screen sizes, scrolled like a person, toggled reduced motion and collected console errors.

| Check | Result |
|---|---|
| `tsc --noEmit` / `astro check` / build / `npm audit` | exit 0 / 0 errors / complete / 0 vulnerabilities |
| Laptop 1440×900: crowd heads | not cut off; figures start below the caption line |
| Laptop: text and logos mid-scroll and centred | animate mid-scroll, fully assembled when centred |
| Phone 390×844 (true mobile emulation) | page width = 390 (no sideways scroll); text on one line; logos in a 3×2 grid; heads not cut off |
| Reduced motion | **bug found and fixed**: letters were frozen scattered (server HTML style kept on hydration). Now a plain still version; Lenis off; crowd frozen with play button |
| Console (all runs) | no errors or warnings |

### 2026-10-29: after renaming the folder to `Product-projects`
| Check | Result |
|---|---|
| `npm run check` (failed before the rename) | exit 0; 0 errors, 0 warnings, 0 hints (13 files) |
| `npm run build` | exit 0, 1 page built |
| `npm audit` | 0 vulnerabilities |
| `npm run dev` (broken before) | `/`, `/@vite/client`, crowd image all 200; Chrome 1440×900: crowd draws, heads not cut off, scroll text animates, Lenis on, no console errors or warnings |
| Old path through the shortcut | resolves to the new folder; git status unchanged (18 untracked, 0 commits) |
| Preview | http://localhost:4321 returns 200 with the latest build |

### 2026-10-29: longer scroll text + category boxes
| Check | Result |
|---|---|
| `npm run check` / `npm run build` / `npm audit` | exit 0 · 0 errors, 0 warnings, 0 hints / complete / 0 vulnerabilities |
| New JavaScript from the boxes | none (no new file in `dist/_astro`) |
| External addresses in the built page | only plain links (Skiper UI, Open Peeps, X); nothing is loaded from outside |
| Chrome 1440×900 | 3 new sentences assemble; boxes stack with the next sliding over the previous; no console errors |
| Chrome 390×844 (phone emulation) | page width 390, no sideways scroll; sentences wrap between words |
| Chrome 1366×640 (short laptop) | box content fits |
| Reduced motion | text shown still, Lenis off, boxes unchanged |
| Button look | checked with a **temporary** link, then reverted (0 matches of the test link in the built page) |
| Text contrast on the 4 tints | calculated: 6.6:1 or better (body), 4.9:1 or better (small labels) |
| Rough grep for secrets | only the words "design tokens"; **not a real scan** (gitleaks not approved) |

### 2026-10-29: header, new pages, box animation, cleanup
| Check | Result |
|---|---|
| `npm run check` / `npm run build` / `npm audit` | exit 0, 0 errors, 0 warnings, 0 hints / 3 pages built / 0 vulnerabilities |
| Gzipped size, before to after | JS 144.0 to 143.9 KB, CSS 6.5 to 6.9 KB, HTML 6.3 to 7.1 KB (HTML grew from the 4 boxes' markup and the 0.5 KB inline script) |
| Chrome 1440×900 | boxes alternate sides; mid-animation shot shows the bar sweep and the picture sliding in; no console errors |
| Chrome 390×844, 360×640 (small phone), 1366×640 (short laptop) | content fits in one screen; no sideways scroll |
| Replay test | `data-in` went false, true, false, true as I scrolled to a box, back to the top, and to the box again |
| Reduced motion | nothing hidden (`ready` flag never set, opacities 1), Lenis off |
| Frame times, scrolling the whole page at about 2400 px/s | laptop and phone (even with the CPU slowed 4x and 6x): 161 and 156 frames, every one 16.7 ms, 0 frames over 33 ms |
| Is that test able to fail? | yes: with a deliberate 40 ms stall per frame it reported 84 slow frames, worst 50 ms |
| Risky patterns in `src` (innerHTML, eval, storage, cookies) | none; every external link has `rel="noopener noreferrer"` |
| Unused files and images | none: every file and image is referenced |

**Caveat on the frame test:** it ran in headless Chrome on this Mac. It shows the page's JavaScript never blocks a frame, but not graphics-chip speed on a real phone. Lighthouse and real devices are still to do.

### 2026-10-29: scroll pause + sign-in page
| Check | Result |
|---|---|
| `npm run check` | 0 errors, 0 warnings, 0 hints (22 files). It caught a real mistake first (React icons take `className`, not `class`), now fixed |
| `npm run build` / `npm audit` | 3 pages built / 0 vulnerabilities |
| Scroll pause (laptop 1440×900) | box 1 stays pinned for 720 px of scrolling before box 2 appears; box 2's entrance starts when its top edge is 15% up. Same on a 390×844 phone |
| Replay | `0000` → `1110` → `0000` → `1100` (boxes reset when scrolled past upwards, play again) |
| Sign-in entrance timeline | panel 0.02 → 1.00 and form likewise within about 0.8 s; heading swept in at 0.8 s; fields staggered; everything done by 1.6 s; nothing visible before it starts |
| Columns move in opposite directions | measured: one −62 px, the other +51 px in 1.5 s |
| Loop has no gap | 61 points of each loop × 2 columns at 1440×900, 768×1024, 1024×1366, 1366×640, 1920×1200: **0 gaps**. Sanity: the old 2-copy setup recreated: **40 of 120 samples had a gap**, so the test can fail |
| Form behaviour | empty submit: blocked by the browser (no message); filled submit and the GitHub button: message shown, address unchanged, no email or password in the URL; localStorage 0, sessionStorage 0, cookies 0 |
| Layout | 1440×900, 1366×640, 768×1024, 390×844, 360×640: fits one screen, no sideways scroll, panel hidden below 768 px; no console errors |
| Reduced motion | columns still, text and fields visible, home boxes unhidden, Lenis off |
| Frame times | sign-in with columns moving: 239 frames, worst 16.8 ms, none over 33 ms (also at CPU 6× slower). Home page full scroll: 215 frames (laptop) and 207 (phone at 4×): worst 16.8 ms, none over 33 ms |
| Bug found by eye and fixed | fades poked out of the panel's rounded corners (zoomed screenshot); fixed by rounding the fades |
| Outside requests / risky patterns | none in the built sign-in page; none in the new files |
| JS sent | unchanged at 143.9 KB gzipped in total; the sign-in page loads no React. CSS 6.9 → 7.5 KB |
| POST without JavaScript | the local preview server answers 200 (it serves the page for any method). **Not checked on Cloudflare.** Either way nothing is in the URL and nothing is stored |

### 2026-10-29: counter, header, sign-in views, pause change
| Check | Result |
|---|---|
| `npm run check` / `npm run build` / `npm audit` | 0 errors, 0 warnings, 0 hints / 3 pages built / 0 vulnerabilities |
| Counter server, on a separate port with a throwaway file | GET returns the total; POST adds 1; a second POST within 2 s is not counted; POST with a foreign `Origin` or `Sec-Fetch-Site: cross-site` returns 403; DELETE and PUT return 405; restart keeps the number; a damaged or negative data file stops the server (it never resets to 0) |
| Path tricks | `/..%2fpackage.json` returns 404 with the guard, and **200 with the guard deleted** (so the test can fail); dot-dot, encoded dot-dot, null byte, bad encoding all return 404 and the server stays up; the server listens on 127.0.0.1 only |
| Page counts once per load | after one page load: 1 API call, total +1; a page left open 69 s made 2 calls (1 count + 1 refresh) |
| Live refresh | open page showed 998, three outside visits were added, after the 60 s refresh it showed 1,001 and gained a digit column, no console errors |
| Rolling digits | last digits roll up to the real number in about 1.1 s after a fade-in; they land on the exact digits |
| Counter without a server (plain preview, 404) | no pill shown, no crash; the only console line is the browser's own note about the 404 |
| Reduced motion | the pulsing dot stops; digits land on the right numbers; nothing hidden |
| X logo | link goes to https://x.com/Adicrux with `rel="noopener noreferrer"`; hover grows it and shows a glow (screenshot); label hidden below 640 px |
| Header fit | no sideways scroll at 1440, 1366, 390, 360 and 320 px wide; header height 76 px at all sizes |
| Box pause at 30% | box 1 stays pinned for 270 px of scrolling (laptop) and 253 px (phone) before box 2 appears; entrance starts as the next box's top edge rises; replay `0000` → `1111` → `0000` → `1100` |
| Sign-in views | switch correctly; heading stays in place; real Enter key submits in the reset view; create account: `new-password`, 8-character minimum (with real typing "abc" is blocked, 10 characters passes); password cleared on switching; no address change |
| Sign-in message | first version landed below the visible area on short windows (648 px bottom on a 640 px screen). Now pinned to the bottom, inside the screen at 1440×900, 1366×640, 360×640 and 320×568; disappears by itself after 7 s |
| A test that was wrong | setting a password by script skipped the minimum-length rule (browsers only check typed text). Redone with real typing |
| Frame times | home page, whole-page scroll: laptop 181 frames, phone at CPU 4× and 6×: 175 frames each; worst 16.8 ms, none over 33 ms. Idle while the counter rolls in (CPU 4×): 239 frames, worst 16.8 ms. Sign-in with columns moving (CPU 6×): 240 frames, worst 16.8 ms. Sanity: with a deliberate stall, 90 slow frames were reported |
| Bundle | JavaScript 143.9 → 155.5 KB gzipped (+11.6 KB); CSS 8.4 KB; home HTML 7.7 KB; with `domMax` it would have been 169.1 KB |
| Risky patterns / outside addresses | none in the new files; built pages contain only the plain links (X, Skiper UI, Open Peeps) |

### 2026-10-29: unique-visitor cookie ("people visited")
| Check | Result |
|---|---|
| `npm run check` / `npm run build` | 0 errors, 0 warnings, 0 hints / 3 pages built |
| New browser (no cookie) | counted (+1) and given `visited=1; Max-Age=31536000; Path=/; HttpOnly; SameSite=Lax` |
| Same browser again | not counted, no new cookie |
| Lookalike cookies (`notvisited=1`, `visited=2`, `visited=1x`, `xvisited=1`, empty) | all treated as new browsers: counted, given a real cookie |
| Several cookies, one of them `visited=1` | recognised, not counted |
| GET | never counts, never sets a cookie |
| Other website (`Origin: evil`, `Sec-Fetch-Site: cross-site`) | 403, no cookie |
| Two cookie-less requests within 2 s | only the first counts; the second gets no cookie (so it counts next time) |
| Over https (`X-Forwarded-Proto: https`) | cookie gains `Secure` |
| Real Chrome | one cookie, value 1, HttpOnly, SameSite Lax, about a year; `document.cookie` empty (page scripts can't see it); one API call per load; plain reload adds nothing; clearing cookies then loading counts once more |
| Header fit with the longer label "people visited" | no sideways scroll and no overlap at 1440, 768, 390, 360 and 320 px wide |
| Old count | 11 page loads kept in `.data/visits.loads-before-cookies.json`; new count started at 0 |

### 2026-10-29: scenes, copy, capitals, sentence size
| Check | Result |
|---|---|
| `npm run check` / `npm run build` / `npm audit` | 0 errors, 0 warnings, 0 hints / 3 pages built / 0 vulnerabilities |
| Owner's recording reviewed | 25 s, 2940×1912 at 60 fps; 16 frames viewed. Findings: "1 people visited" (wrong for 1), the scroll sentence far too big, empty picture boxes, placeholder text. All addressed |
| Home boxes at 1440×900 | all four scenes render and animate; the scan highlight, toggle, share card and tiles seen mid-animation |
| Heading wrap | "pick" sat alone on a line; fixed with balanced wrapping |
| Sign-in panel at 1440×900 and 768×1024 | 8 feature cards with titles and lines; scenes mid-animation; label "What's being built" |
| Score meters | measured: fill, hold about 5 s, fade, repeat (a screenshot caught the reset moment, which looked like a bug but was not) |
| Gaps in the loop | 3 copies: 0 gaps in 120 samples at each of 1440×900, 768×1024, 1024×1366, 1366×640, 1920×1200, 820×1180, 1180×820. Sanity: 2 copies on a 1024×1366 window: 35 of 120 samples had a gap, so the test can fail |
| Animations running | sign-in: 122 with 4 copies, 92 with 3. Home boxes: paused before the box is visible, running when it is |
| Reduced motion | 0 animations on both pages; 0 scene parts hidden |
| Frame times (worst) | sign-in: 16.8 ms at CPU 1×, 4×, 6× and at 1920×1200; home page whole-page scroll: laptop at 1× and 6×: 16.8 ms, none over 33 ms; phone at 4×: first run had 2 frames of about 133 ms, then 5 reruns (4× and 6×, with and without scenes) had none: treated as a one-off, not reproducible |
| Phones (390×844, 360×640, 320×568) | no sideways scroll; scene fits its box (letterboxed on the short ones) |
| Capitals and size | computed style: the four scroll sentences are 48 px, text-transform none; "People visited" first; "Or with email"; hero pill capitalised |
| Risky patterns, outside addresses, unused CSS | none; only the plain links (X, Skiper UI, Open Peeps); one dead class found and removed |
| Bundle | JavaScript unchanged at 155.4 KB; CSS 8.4 → 10.3 KB; sign-in HTML 6.3 KB gzipped, home 8.3 KB |

**Not tested:** real phones and low-powered graphics chips, Safari, Firefox (container-query units and `translate` need recent versions), Lighthouse, axe. A real video of the demo.

**Not tested (earlier entry):** whether the cookie needs consent (that is a legal question, COOKIE GATE), and the hosted version.

**Not tested (earlier entry):** the hosted counter (there is none yet), Cloudflare's behaviour, real phones, Safari and Firefox, Lighthouse, axe, a real secret scan (gitleaks not approved).

**Not done yet:**
- Automated tests (there's no logic worth unit-testing on this page yet).
- Lighthouse / Core Web Vitals numbers.
- An axe accessibility scan.
- Real devices and Safari/Firefox.
- A secret scan (gitleaks not approved yet).
- Security headers (`_headers` file).

## Automation
All of the above runs in GitHub Actions on every push (set up in M1).

## 2026-10-29: lag fix, new categories, dead-code sweep
| Check | Result |
|---|---|
| `npm run check` (+ `tsc --noUnusedLocals --noUnusedParameters`) | 0 errors, 0 warnings, 0 hints; nothing unused |
| `npm run build` / `npm audit` | 3 pages / 0 vulnerabilities |
| JS / CSS (gzip) | 155.4 → 150.4 KB / 10.1 KB |
| Scroll delay after one wheel tick (Chrome, 2x pixels) | Lenis: 580 ms of gliding, only 50 of 100 px delivered. Now: 0 ms, full distance |
| Animations running at the last box | 20 → 7 |
| `data-covered` going down and back up (boxes at 3299, 4469, 5639, 6809) | `0000, 1000, 1100, 1110` down; `1110, 1100, 1000, 0000` up |
| Reduced motion | 0 animations, 0 hidden scene parts |
| Phones 390 / 320 | no sideways scroll |
| Sign-in | 92 animations running (unchanged), no errors |
| New scenes | looked at in screenshots (terminal, task board, chat); a card landing 5% low was found and fixed |
| **Frame times** | **Not measurable today**: this test Chrome is capped at 30 fps even on a blank page, so every frame reads 33 ms. I can not claim a 60 fps number. Real laptop/phone feel must be checked by the owner. |
| Bug in my own test | the scroll-to-box helper cannot target "sticky" boxes (they report top 0); used fixed scroll positions instead |

## 2026-10-29: sign-in panel and counter
| Check | Result |
|---|---|
| Sign-in panel, 15 s of samples every 100 ms | both columns move every sample (4.9 to 5.7 px and 4.0 to 4.7 px per 100 ms), 0 stalls |
| Hover over the panel | both tracks still "running", 0 paused animations |
| Counter, throwaway server on port 4399 | robot UA: 0; curl: 0; one browser: 1; same browser again: 1; second browser: 2; cross-site POST: 403 |
| Real server after reset | `GET /api/visits` gives 1; a headless Chrome load of the home page left it at 1 |
| `npm run check` / build | 0 errors, 0 warnings, 0 hints / 3 pages |
| Not tested | seeing the panel on the owner's real screen; Low Power Mode behaviour; two real devices |

## 2026-10-29: counter with no cookie (D22)
| Check | Result |
|---|---|
| Unit tests (`npm test`, written first, failed first) | 10 of 10 pass: robots, same-site, brake (burst, refuse, recover), GET never counts, person counts, robot not, cross-site 403, brake refuses, brake only used by real counts, other methods 405 |
| Worker in Cloudflare's local runtime (`wrangler dev`) | GET 0; person +1; refresh +1 (by design); headless robot +0; curl +0; cross-site 403; PUT 405; `/api/other` 404; **0 cookies set**; answer headers nosniff, no-store, frame, referrer |
| 8 simultaneous page loads | total rose by exactly 8 (no lost counts) |
| Flood of 40 requests | total rose by 10 (the brake held) |
| Real Chrome (user agent set to a normal browser) on the Worker | pill shows "Page views 1"; server total 1 after one load; `document.cookie` empty; console clean |
| Pages and files vs the Worker | 4 pages/files: 0 Worker runs. Unknown addresses: they do run the Worker (accepted) |
| `_headers` on the local Worker setup | nosniff, frame, referrer, permissions on pages; one-year cache on `/_astro/` files |
| Local server (throwaway, port 4399) | person 1, refresh 2, robot 2, cross-site 403, PUT 405, 0 cookies; real data file untouched |
| `wrangler deploy --dry-run` | bindings found: `PAGE_VIEWS` (Durable Object), `ASSETS` |
| Built pages vs the previous commit | sign-in and list pages byte-identical; home page differs only by the counter's script filename |
| `npm run check` / `npm audit` | 0 errors, 0 warnings, 0 hints / 0 vulnerabilities |
| **Not tested** | the real deployment, the free daily limits being hit, real traffic, Safari/Firefox |

## 2026-10-29: phone scroll-up lag and back-to-top button (D23)
| Check | Result |
|---|---|
| Phone test (390x844, touch, 4x slower CPU) scrolling up from the end with the address bar moving | Could not tell `dvh` from `lvh`: this test browser shrinks every viewport unit when its window shrinks. Numbers were the same before and after (22 layouts); a single 167 ms stall in the first run did not repeat (33 ms), so it is **not** claimed as evidence |
| Same without the address bar moving | smooth: 6 layouts, worst frame gap 17 ms |
| Grid without the CSS mask vs the old version | 4 boxes at laptop and phone size: biggest difference 3 to 5 of 255; 0 pixels differ by more than 6 except an animation on another frame (145 px) |
| Back-to-top: mouse hover | opens 60 to 200 px; closes on leaving |
| Back-to-top: keyboard focus, then Enter | opens; scrolls from y=7374 to 0 in 1441 ms; focus moves to the header link |
| Back-to-top: mouse click / finger tap (touch emulation) | to the top in 1.4 s / 2.0 s; after the tap the button is closed again |
| Back-to-top with "reduce motion" | jumps to the top in 103 ms (no smooth scroll) |
| Console / sideways scroll | no errors; no sideways scroll at 1440, 820, 390, 320 |
| `npm run check`, `npm test`, `npm audit` | 0 errors, 0 warnings, 0 hints / 10 of 10 / 0 vulnerabilities |
| Other pages | sign-in and list pages differ from the previous build only by the stylesheet's file name |
| JS (gzip) | 150.4 to 152.6 KB (+2.2 KB, loaded at the end of the page only) |
| **Not tested** | a real phone (iPhone or Android), the real address bar, Safari, Firefox, the button on a real touch screen |

## 2026-10-29: back-to-top glitch, crowd start, phone load (D24)
| Check | Result |
|---|---|
| Glitch reproduced (phone size, button's script blocked) | before: "Back" drawn over the click icon, dot grey; after: clean black dot with the icon only |
| Server-made HTML of the button | before: no opacity on the layers; after: `opacity:1` (icon), `0` (words), `0` (arrow) |
| Crowd first drawn, fast 3G + 4x CPU, compressed server, 3 runs each | old 3578 / 3585 / 3600 ms; new 3092 / 3104 / 3109 ms. Low-priority hint vs none: no difference (3.10 s), kept low |
| Crowd first drawn, 4G + 4x CPU (uncompressed server) | 1202 ms to 981 ms |
| Crowd graphics work over 4 s (trace, computer's GPU, 3 runs) | GPUTask about 190 ms to 111 / 150 / 138 ms; FireAnimationFrame about 207 ms to 79 / 111 / 107 ms |
| Whole-page scroll sweep, phone size, 4x and 6x CPU | no long tasks, no frame over 40 ms, about 1 s of total work (before and after: nothing to compare, nothing was slow here) |
| WebP instead of the PNG | rejected: 630 KB at best quality against 380 KB |
| Crowd after the change | full and normal at 390 and 1440 wide; pause stops it (0 pixels change), play restarts it; resize 1440 to 390 to 1440 redraws |
| Button script loads before the button is reached | yes (loaded while the button was 300px below the screen) |
| Back-to-top suite (desktop, phone, reduced motion) | hover/focus open, Enter/click/tap scroll to top (1.4 s / 2.0 s; 102 ms with reduce motion); console clean |
| `npm run check`, `npm test`, `npm audit`, gitleaks | 0 errors, 0 warnings, 0 hints / 10 of 10 / 0 vulnerabilities / no leaks |
| JS (gzip) | 152.6 KB (unchanged) |
| **Not tested** | a real phone (the lag itself), real Safari/Firefox, the live Cloudflare site, the effect of the cache rule on Cloudflare |

## 2026-10-29: logo, favicon and link preview (D25)
| Check | Result |
|---|---|
| Images made | `og-image.png` 1200x630 (48 KB), `apple-touch-icon.png` 180x180, `favicon.ico` with 16/32/48 px pictures, `favicon.svg` |
| Looked at | the tick at 16, 32, 48 px on light and dark tab colours (crisp, corners see-through); the 180 px home-screen icon; the card at full size |
| Built pages (home, sign-in, list) | each has `og:image` (full address), width/height/alt, `twitter:card = summary_large_image`, `canonical`, favicon and `apple-touch-icon` links; `og:url` differs per page |
| Files served by a local compressing server | `/og-image.png` 200 image/png; `/apple-touch-icon.png` 200 image/png; `/favicon.ico` 200 image/x-icon; `/favicon.svg` 200 image/svg+xml |
| `npm run check`, `npm test`, `npm audit`, gitleaks | 0 errors, 0 warnings, 0 hints / 10 of 10 / 0 vulnerabilities / no leaks |
| **Not tested** | the card in real X, WhatsApp, Slack or Discord (they fetch it only from the live site); Safari/Firefox tab icons; the old-preview caching behaviour |

## 2026-10-29: why the crowd is slow to appear, phone picture (D26)
| Check | Result |
|---|---|
| Live site, desktop 1440, no throttle, cache off | crowd first drawn 5345 ms; HTML arrives about 2.2 s; stylesheet 1.6 s for 11 KB; picture about 100 KB/s |
| `curl` timings from the owner's Mac | site: connect 0.28 to 1.3 s, first byte 1.2 to 4.8 s, served from MRS; cloudflare.com: connect 0.08 s, BOM; Vercel and GitHub Pages sites: connect 0.11 to 0.21 s |
| Test link (480 ms round trip, 150 KB/s), crowd first drawn, 3 runs each | no picture preload 6347 ms; with preload 4725 to 4747 ms; plus inline stylesheet 4643 to 4666 ms; plus script preloads 4639 to 4674 ms (the last two not kept) |
| Picture formats | lossless WebP 91%, lossy WebP 120 to 161%, AVIF 76 to 91% (with visible loss), fewer colours 71 to 94%: none kept |
| Phone picture vs the original figures | 45 figures, 180,521 bytes (47%), 0 pixels differ; file rebuilt by `make-phone-crowd.py` is byte-identical |
| Phone, test link, crowd first drawn, 2 runs each | before 4746 / 4707 ms; after 3574 / 3576 ms |
| Pictures downloaded | phone: only the phone picture (180,821 B over the network); desktop: only the full picture (380,868 B) |
| Looked at | phone and desktop crowd: full and normal; pause stops it (0 pixels change), play restarts it; desktop to phone width to desktop, and phone to desktop width: redrawn, no errors |
| Crowd graphics work, phone size, over 4 s (3 runs) | GPUTask 148 / 118 / 126 ms, FireAnimationFrame 116 / 98 / 95 ms (originally about 190 / 207) |
| Fresh copy of GitHub's latest commit: `npm clean-install`, `npm run build`, `wrangler deploy --dry-run` | builds; dry run reads 32 files including `og-image.png` (so the unchanged logo on the live site is a stuck or failed Cloudflare build, not the code) |
| `npm run check`, `npm test`, `npm audit`, gitleaks | 0 errors, 0 warnings, 0 hints / 10 of 10 / 0 vulnerabilities / no leaks |
| **Not tested** | a real phone; the live site after this change; why Cloudflare routes workers.dev via Marseille for this location; other places' speeds |

## 2026-10-29 (later): script chain and inline stylesheet (D26)
| Check | Result |
|---|---|
| Live site, desktop, no throttle, 4 runs, after the phone picture shipped | first draw 7920 / 27380 / 8541 / 21882 ms; in run 1 the picture was done at 4.2 s but a 3.7 KB script took 4.5 s (jumpy route); run 4 the picture alone took 17.6 s. The route is unreliable right now, so single live numbers mean little |
| Home page: baseline (live) vs new, 480 ms / 150 KB/s link, 3 runs each | 4719 / 4744 / 4741 ms vs 4663 / 4668 / 4658 ms (about the same: the picture dominates) |
| Same, 1000 ms / 300 KB/s link, 3 runs each | 5574 / 5573 / 5569 ms vs 3832 / 3847 / 3854 ms (31% faster) |
| Built home page | 9 `modulepreload` links (crowd, counter and what they import), 0 stylesheet links; sign-in and list pages: no preload links, stylesheet inline |
| Scripts downloaded at load | only the crowd's and the counter's; the text animation and back-to-top scripts are still loaded later |
| Page sizes (gzip), before to after | home 9.4 to 19.7 KB, sign-in 6.6 to 16.9 KB, list 1.8 to 12.1 KB (the stylesheet is now inside each page); JS 152.6 to 152.7 KB |
| Button with its script blocked | still a clean black dot with only the click icon |
| Back-to-top suite (desktop, phone, reduced motion), console on phone and desktop | all pass; no errors |
| `npm run check`, `npm test`, `npm audit`, gitleaks | 0 errors, 0 warnings, 0 hints / 10 of 10 / 0 vulnerabilities / no leaks |
| **Not tested** | a real phone; the live site's speed after this change (the route varies too much to compare single runs); other browsers |


## 2026-10-30: list page (D27)
| Check | Result |
|---|---|
| Page-number tests, written first | failed with "module not found" before the code; after: 6 of 6 pass (few pages, none, start, middle, end, wider window, out-of-range page, same length for 8, 9, 20 and 100 pages) |
| `npm test` | 16 of 16 (10 counter tests + 6 page-number tests) |
| `npm run check` | 0 errors, 0 warnings, 0 hints (39 files) |
| Local preview (`npm run dev`), desktop 1440, phone 390, narrow 320, reduced motion | tabs switch and the blob lands exactly on the chosen tab (blob 169 px / 105 px = tab 169 px / 105 px); Top scored puts the highest score first; page numbers `1 2 3 4 5 … 20` to `1 … 4 5 6 … 20` to `1 … 16 17 18 19 20`; Previous disabled on page 1, Next disabled on page 20 ("Showing 153 to 160 of 160"); Frontend Components filters, the three "Coming next" categories are disabled and do nothing; "My lists" shows the placeholder and hides the page numbers; phone sidebar button opens and closes; no sideways scrolling at 320, 390 or 1440; console clean in all four runs |
| Keyboard | End goes to the last tab, ArrowRight wraps to the first, Home goes to the first; focus follows |
| Reduced motion | the goo filter computes to `none` (it is `url(#gooey-tabs-filter)` otherwise) |
| Bug found and fixed | on a 320 px phone the Previous and Next arrows were cut off at the edges (buttons centred inside a too-narrow box); fixed with smaller buttons under 360 px and no centring of overflow |
| Bug found and fixed | the "Layout preview" banner also showed on the "My lists" tab, where there are no rows |
| Built site (what goes live) | 3 pages; no demo text in any file (0); `/websites` shows the empty state, count 0, disabled Previous and Next; with the script blocked the page looks the same as with it |
| Home and sign-in pages | sign-in identical apart from the inlined stylesheet; home identical apart from the inlined stylesheet and the preload list (one small shared script split in two: 9 to 10 links). Home preloaded JavaScript 149,876 to 150,023 bytes gzipped |
| Sizes (gzip) | home 19.6 to 20.7 KB, sign-in 16.8 to 17.8 KB, list page 12.1 to 17.5 KB (page + stylesheet); all JavaScript 156.1 to 162.0 KB (the new page's script only loads on `/websites`) |
| `npm audit`, gitleaks (commits, and the working files with `--no-git`) | 0 vulnerabilities; no leaks either way |
| **Not tested** | a real phone (the goo filter's smoothness on a weak chip is unknown); Safari and Firefox (SVG filters on HTML are well supported but not checked here); a screen reader; the live site (nothing was pushed); keyboard focus rings by eye |

## 2026-10-30 (later): type a page number into the dots (D27)
| Check | Result |
|---|---|
| `parsePage` tests, written first | failed with "does not provide an export named parsePage"; after: 10 of 10 in the file (digits, spaces, leading zeros, too big, zero, one page, empty, letters, minus, decimal, exponent, non-ASCII digits, null, a 400-digit number) |
| Browser, desktop 1440, phone 390, narrow 320 | clicking the first dots opens the box with focus in it; letters and symbols are dropped; 12 + Enter goes to page 12 with focus on that button; 99 + Enter goes to page 20; 0 + Enter goes to page 1; empty Enter keeps the box open (`aria-invalid`); Escape closes it and returns focus to the dots; clicking away closes it; the second dots work too; console clean; the page never scrolls sideways |
| Seen on screen | box matches the buttons' height on desktop and phone |
| `npm run check`, `npm test`, `npm audit`, gitleaks | see the end of this round in the report |
| **Not tested** | a real phone's on-screen number keyboard (it should show digits because of `inputMode="numeric"`); a screen reader; Safari and Firefox |

## 2026-10-30 (later still): Go back link, no How we test, Oldest tab (D27)
| Check | Result |
|---|---|
| Oldest tab (demo rows) | first row: All and Newest = Example website 1 (30 Oct 2026); Oldest = Example website 160 (24 May 2026); Top scored = Example website 115; Oldest on the last page starts with Example website 8 (23 Oct 2026), as it should |
| Sidebar | links are Go back (/), Home (/), Sign in (/sign-in); the text "How we test" is not in the sidebar |
| Bug found and fixed | five tabs do not fit on a phone and the strip scrolls; on 320 px the blob of "My lists" was clipped away (white text on white), on 390 px it was cut at the edge. Layer width is now the strip's full scroll width and the chosen tab is scrolled into view. After the fix: the blob and the chosen tab are the same size and place (318 px / 74 px) and fully visible at 390 and 320 px; seen on screen |
| Regression: tabs, pages, categories, keyboard, reduced motion, typing a page number, at 1440, 390 and 320 px | all as before; console clean; no sideways scrolling of the page |
| **Not tested** | a real phone; Safari and Firefox; a screen reader |

## 2026-10-30 (later): all four categories, type filter, header search (D28)
| Check | Result |
|---|---|
| Tests, written first | `src/lib/search.test.mjs` failed with "module not found" before any code; after: 19 of 19 pass (words in name, summary, category and tags; every word must match; category, any-of tags and words together; the input list is not changed; ghost completion: shortest match, capitals, exact, none, across a space; suggestions only from existing entries; tag counts; tag file has unique words and real categories; real entries follow the rules; demo rows: 160, 40 per category, known tags, none twice on a row) |
| `npm test` | 39 of 39 (10 counter + 10 page-number + 19 search) |
| `npm run check` | 0 errors, 0 warnings, 0 hints (44 files) |
| Browser (localhost, demo rows), desktop 1440, phone 390, narrow 320 | all four categories show "40 sites" and offer only their own types (21, 18, 10, 10); "rea" shows a faint "ct" (colour is the text colour at 35% opacity), Tab accepts it (box = "react", 6 sites, every row has React, focus stays in the box), Escape and the clear button empty it (160 sites); "exa" suggests "mple website 1" and the right arrow accepts; Tab with no suggestion moves focus on |
| Filter panel | opens with focus in its search box; "cs" lists CSS and Tailwind CSS; a nonsense word shows "No type matches that."; ticking CSS and Java gives 12 sites and every shown row has one of them; the panel stays open while ticking; Escape closes it and returns focus to the button; clicking elsewhere closes it; removing a chip updates the list |
| Empty and edge states | no match shows "No sites match your search and types." and a button that clears both; ticking React then switching to AI Tools drops the chip; typing while on "My lists" jumps to "All sites"; the filter button is hidden on "My lists" |
| Header | box sits top right (1440: 984 to 1272 px); on 390 and 320 it fills the room next to the logo; "How we test" is hidden under `sm`; the page never scrolls sideways; console clean in all three |
| Seen on screen | ghost text, open filter panel (also at 320 px, it fits), chips, and the live-style empty page |
| Bug found and fixed | at 320 px the panel's search hint was cut off ("React or CS"); shortened to "Search types" |
| Test-script slips (not product bugs) | my old list test counted every `li` as a row (rows now hold tag labels); a selector matched the icon instead of the ghost layer |
| Regression: tabs, goo blob, page numbers, typing a page number, keyboard, reduced motion, phone menu | all as before at 1440, 390, 320 and with reduced motion |
| Built site (what goes live) | 3 pages; 0 files contain demo text; `/websites` shows counts of 0, the honest "Nothing is listed yet" (also per category), no suggestions while typing, all types with count 0 in the filter; the header spot is in the HTML |
| Scripts blocked (built page, phone) | readable page; the filter button and search spot do nothing until the script loads |
| Size | the list page's script went from about 6.3 KB to 8.8 KB gzipped (loads only on `/websites`) |
| `npm audit`, gitleaks (commits, and working files with `--no-git`) | 0 vulnerabilities; no leaks either way |
| **Not tested** | a real phone (typing, the on-screen keyboard's Search key, the ghost text lining up with other fonts); Safari and Firefox (including the hidden browser "x" in search boxes and `:has()` highlight on tick rows); a screen reader (the ghost is hidden from it on purpose, and I did not add a spoken "N results"); the live site (nothing is pushed) |

## 2026-10-30 (later still): developer toolbar off, audit of supplied code (D29)
| Check | Result |
|---|---|
| Toolbar | before: the dark Astro toolbar showed on localhost only; the built site had 0 files with it. After `devToolbar: { enabled: false }` and a dev-server restart: 0 toolbar elements in a real browser, page and list work as before, console clean |
| Audit: source | one network call (the counter, `/api/visits`, same site); no analytics, tracking, cookies, storage, `eval`, `innerHTML`, external scripts, iframes or fonts; unknown hosts (`gxuri.me`, `codepen.io`) are credit text in code comments only |
| Audit: built files | no outside `<script>`, `<link>`, `<iframe>` or `<img>` (only the site's own canonical link); two inline scripts, both Astro's own, with no outside addresses; outside names in the JS and CSS are comment or message text, not requests |
| Credits left in on purpose | Skiper UI and Open Peeps in the home footer (licence / illustration credit): owner to decide |
| `npm run check`, `npm test`, build, gitleaks | 0/0/0; 39 of 39; 3 pages, 0 files with demo text; no leaks |
| **Not tested** | the live site (nothing is pushed); other computers' browser extensions (they can add their own bars; that is outside the site) |

## 2026-10-30 (later): colour wheel and dark mode (D30)
Tests were written first (`src/lib/theme.test.mjs`, 28 tests); the first run failed because the code did not exist. As a check that the tests can fail, the safety margin was lowered on purpose and 2 contrast tests failed; it was restored.
| Check | Result |
|---|---|
| `npm test` | 67 of 67 pass (was 39). The new 28 cover: hex reading and refusing rubbish (`url(x)`, 8 digits, `#fff;color:red`), colour round trips, contrast values, 2,015 picked colours (15 awkward ones such as white, black, grey, yellow, plus 2,000 random) each giving every text colour at least 4.5:1 on every surface and white-on-accent at least 4.5:1 (also on hover), focus ring at least 3:1, hue kept, grey stays grey; saved-choice reading; the head script run against a fake page (nothing saved, a palette, dark, rubbish and injected names or `url()` values refused, blocked storage); the dark palette in the real `global.css` (every variable defined, text at least 4.5:1, same page colour as the script); no `bg-white` or `text-white` left in pages and components |
| `npm run check` | 0 errors, 0 warnings, 0 hints (48 files) |
| Real browser, 1440 px, home and list | picker opens (focus goes into it), preset, drag on the square and hue bar, typed hex (bright yellow), Escape closes and returns focus, click outside closes, dark on, wheel greyed with its note, reload keeps the choice and the head script had applied it BEFORE the page's scripts ran, back to light brings the colour back, Reset restores the original (nothing left in storage). Real text contrast measured on the live page: default 5.78 minimum; pink 4.71; dragged colour 6.73; yellow 4.67; dark 7.55. Console clean |
| Phone 390 px and 320 px | picker fully on screen, no sideways scroll, same contrast results (violet 5.7, dark 7.55), home, four category boxes, crowd, steps, footer, list with filter and search, and sign-in checked in violet and in dark |
| Keyboard only | Tab reaches the colour button, Enter opens it with focus on the colour square, arrow keys change the colour, Tab moves through the picker, Escape closes and returns focus, Enter on the moon switches dark |
| Reduced motion | no page fade (0 s), all dock transitions off |
| Normal motion | 120 ms after the switch the page colour is half-way (rgb 116,117,119), after 800 ms it is the dark colour, the fade class is removed again |
| Scripts blocked | no dock buttons (not dead), pages render, no sideways scroll |
| Found and fixed | focus did not move into the picker at once (it is still hidden for the first frame; now a 50 ms wait); the crowd's pause button sat under the dock; on phones the centred dock covered the "My lists" tab and the filter arrow (now bottom-right below 1280 px) |
| Build, audit, scan | 3 pages built; `npm audit` 0 vulnerabilities; gitleaks no leaks (commits and files); no outside host in the new code; 0 files with demo rows ("Example website"); 0 Co-Authored-By lines; `package.json` differs from the last commit only by the test glob (no dependency added) |
| Sizes (gzip) | home 22.4 KB (was 21.2), list page 19.2 KB (was 17.8), sign-in 19.4 KB (was 18.3); new dock script 6.7 KB, loaded when idle; list script unchanged (8.6 KB) |
| **Not tested** | a real phone; Safari and Firefox (only Chrome); a screen reader; the live site (nothing is pushed); the crowd's frame rate in dark (no filter is used, so none is expected to change, but it was not measured); landscape phones (the picker scrolls if too tall, not seen); the contrast tool skips text over gradients and pictures, and the tab pill (white text on the pill reads 1.06 in the tool because the pill is a separate layer; it is visibly correct in the screenshots) |

## 2026-10-30 (later still): the colour changes the whole page (D30 update)
Tests first again: 4 new tests were written and failed (page not tinted, black swatch, shielding missing, X button colours missing), then the code was changed.
| Check | Result |
|---|---|
| `npm test` | 72 of 72 pass (was 67). New: a colourful pick tints the page, boxes and borders (200+ picks); the tint grows with how colourful the pick is; white, grey, black and the black swatch keep a pure white page; the page stays bright (at least 13:1 against black) and text very dark for 2,015 colours; all text contrast rules (at least 4.5:1 on all four light surfaces) still hold with the stronger tints; the shielded cards and the X button's own variables exist in light and dark |
| `npm run check` | 0 errors, 0 warnings, 0 hints |
| Real browser, 1440 px, 6 picks (blue, pink, yellow, green, navy, the black swatch) | page colour: rgb(217,224,255), (255,217,234), (255,251,220), (215,255,230), (234,243,255), and pure white for the black swatch. In every pick the X button (black / white), the category card (colours, title, button) and the sign-in cards kept exactly their default computed colours. Real text contrast on the home page: 5.59, 4.71, 4.67, 4.78, 6.63, 6.63 (minimum 4.5). Dark mode still turns the cards dark and the page dark. Console clean |
| Not tested | see the previous table; also the list page reading of 1.06 to 1.46 comes from the tool misreading the white text on the active tab pill (a separate layer), as before |

## 2026-10-30 — dark mode: the category pictures (mini screens)

| Check | Result |
|---|---|
| Problem found by the owner | In dark mode the mini screens in the category boxes lost their labels ("To do", "Doing", "Done") and bars: their text colour followed dark mode (light) but their cards are white. |
| Fix | `.sc` (the mini screens) re-declares the light palette in `src/styles/global.css`, like `[data-keep-palette]`. The boxes around them and all other text stay dark. |
| `npm test` | 73 of 73 pass. New test: the light palette is declared on `.sc` and the dark palette does not reach it. Watched it fail without the fix (a mutation check). An older shielding test read the wrong selector (it passed by accident); the lookup was fixed for both. |
| Real browser, dark, 1440 px, all 4 boxes + sign-in showcase | text contrast minimum 7.55 in every box; console clean; screenshots read by eye. The Dev Tools terminal is a dark picture by design, so it sits dark on a dark box (visible, with a border). |
| Not tested | a real phone, Safari, Firefox |
