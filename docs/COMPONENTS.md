# COMPONENTS.md

## Intake table
| Name | File | Purpose | Framework | License | Dependencies | Accessibility | Performance cost | Security red flags |
|---|---|---|---|---|---|---|---|---|
| Hero | `src/components/ui/hero.tsx` | Top of a page: statement, one action, one link | React + TS | Provided by owner; source/license not stated. **Owner to verify.** | React, `hero-utils/cx`, `hero-utils/icons` (we wrote both; the icon comes from lucide-react) | Good: link not button for the second path, film never autoplays on reduced motion/phones, 44px toggle hit area | **Zero JS on our page**: rendered to HTML at build time | None: no raw HTML injection, no external scripts |
| Skiper 39 (crowd canvas) | `src/components/ui/skiper39.tsx` | Decorative walking crowd under the hero | React + TS + GSAP | Free for personal and commercial use, **attribution to Skiper UI required** (credited in the footer). Owner to read the Terms at skiper-ui.com. Illustrations: Open Peeps (believed CC0, **verify at openpeeps.com**). GSAP: free standard license, including commercial use; it bans building a competing visual animation builder (not our case). | gsap 3.15.0, lucide-react | Original: no reduced-motion support, no pause, canvas exposed to screen readers. **Fixed** (see below) | ~30 KB gzipped JS (GSAP + component) + ~64 KB React runtime + 372 KB image, loaded only when scrolled into view (`client:visible`) | Original loaded its image from a third-party CDN (cdn.21st.dev), which leaks visitor IPs and depends on their uptime. **Fixed: image self-hosted** at `public/images/open-peeps-crowd.png` |

| Skiper 31 (scroll text animation) | `src/components/ui/text-scroll-animation.tsx` | Sentence assembles letter by letter as you scroll, then framework logos slide in | React + TS + motion (framer-motion) | Skiper UI free component (same attribution as Skiper 39, already in footer). Logos: Simple Icons 16.36.0 (CC0). The brands are trademarks of their owners; showing them to mean "components for these frameworks" is generally OK, but **owner to verify each brand's logo guidelines** | motion 14.7.1, lenis 1.3.27 (page-wide smooth scroll) | Original: letters read one by one by screen readers, mid-word line breaks on phones, no reduced-motion support. **Fixed** | 41.5 KB gzipped (motion in its lighter LazyMotion form) + Lenis 5.3 KB, loaded when scrolled near (`client:visible`; Lenis on page load) | Original loaded 6 logos (Discord, Figma, Framer, GitHub, MongoDB, Notion) from cdn.21st.dev under the caption "integrate with your fav tech stack", which would be **misleading** for us. **Replaced** with self-hosted framework logos (checked: no scripts inside the SVGs) |

| Stacked sections ("smooth-scroll" demo) | `src/components/ui/stacked-sections.tsx` | Full-screen boxes that stack as you scroll; used for the category boxes | React + TS + Tailwind (CSS only) | Supplied by the owner; source and license not stated. **Owner to verify.** | `lucide-react` (arrow and image icons). Dropped the original's `lenis/react` | Real h3 headings and a named section; faint grid and placeholder picture hidden from screen readers; contrast of text on all four tints is 6.6:1 or better (calculated). Entrance animation is off under "reduce motion" | **No React JavaScript** (no `client:*` directive). Entrance effect: ~0.4 KB CSS + a 0.5 KB script | None: no raw HTML injection; links come from our own config file |
| Text block animation (supplied, GSAP) | **not used as supplied**: recreated as `src/styles/reveal.css` + `src/scripts/reveal-on-scroll.ts` | A black bar sweeps across text and reveals it | (was React + GSAP SplitText + ScrollTrigger + `@gsap/react`) | GSAP is free to use since 3.13; component license not stated. **Owner to verify.** | none new | Off under "reduce motion" | The GSAP version would add ScrollTrigger 17.6 KB + SplitText 3.6 KB gzipped (measured) plus a new package. The CSS version adds about 1 KB | None |

| Login form (supplied) | `src/pages/sign-in.astro` + `src/components/auth/AuthShowcase.astro` + `src/config/showcase.ts` | Split sign-in page: moving picture columns left, form right | Astro + Tailwind (the supplied React markup was rewritten as static Astro; icons from lucide) | Supplied by the owner; source and license not stated. **Owner to verify.** GitHub/Google logos: Simple Icons 16.36.0 (CC0), but the brands are trademarks. **Check Google's and GitHub's button branding rules before real sign-in.** | `lucide-react` (mail and lock icons only); none new | Labelled fields, autocomplete hints, focus rings, notice is announced (`role="status"`). Moving columns: hover pauses, reduced motion stops them; no real pause button yet | **No React JavaScript** on the page. A 0.4 KB inline script shows the notice. Moving columns are CSS transform only | The form is connected to nothing and stores nothing. The supplied version loaded images from a third-party CDN; replaced |

| Back to top (Skiper 3 "Dynamic Toggle", adapted) | `src/components/ui/back-to-top.tsx` | Black dot with a click icon at the page end; opens on hover/focus to "Back to top" + arrow; scrolls to the top. Credit in the footer (Skiper UI free licence) |
| Animated counter (supplied) | `src/components/ui/animated-counter.tsx`, used by `src/components/VisitCounter.tsx` | Rolling-digit number for the live "Page views" count in the header | React + TS + motion | Supplied by the owner; source and license not stated. **Owner to verify.** | motion 14.7.1 (already installed) | Screen readers get the plain number (the rolling digits are hidden from them); reduced motion = digits jump, no pulsing dot | 10.7 KB gzipped (with `domAnimation`; `domMax` would add 13.6 KB). Loaded with `client:idle` | Network input is checked: only a whole number is shown. The component sets no cookie; the server sets one (D15) |

| Animated scenes (ours) | `src/components/scenes/scene.tsx`, `src/styles/scenes.css` | Mini animated screens that fill the picture boxes on the home page and the sign-in panel | React (rendered to static HTML, no hydration) + CSS | Ours; no outside assets. Icons from lucide-react (ISC) | `lucide-react` (already installed) | Decorative: hidden from screen readers; the title and text beside each carry the meaning. Reduced motion: no animation, finished state | +1.9 KB CSS, no JavaScript; only transform and opacity animate; paused until visible on the home page | None: no raw HTML injection, no storage, no outside requests |

| Pagination (supplied, adapted) | `src/components/ui/pagination.tsx` + `src/lib/page-range.ts` | The Previous / page numbers / Next row under the list | React + TS + Tailwind | Supplied by the owner; source and license not stated. **Owner to verify.** | `lucide-react` (already installed). Dropped `class-variance-authority` | Labelled nav, `aria-current="page"` on the current page, "More pages" for the dots, focus rings, disabled Previous and Next at the ends | About 1.5 KB of the list page's script | None: no raw HTML injection |
| Sidebar (supplied, adapted) | `src/components/ui/sidebar.tsx` | Left navigation of the list page; the base for the other pages | React + TS + Tailwind | Supplied by the owner; source and license not stated. **Owner to verify.** | `lucide-react`. Dropped `framer-motion`, `@base-ui/react`, `@tabler/icons-react` | Labelled groups, links or buttons, `aria-current`, the dropdown has `aria-expanded` and hides closed items with `inert`; reduced motion removes the transitions | About 2 KB; the dropdown animates with CSS only | None |
| Gooey tabs (ours) | `src/components/ui/gooey-tabs.tsx` | Tab strip with a stretching black blob | React + TS + an SVG filter | Ours; no outside code | none | Real tab list: arrow keys, Home, End, `aria-selected`, linked to its panel; no filter under reduced motion | About 2 KB; the filter covers only the small tab strip | None |
| Search box with ghost text (ours) | `src/components/ui/search-box.tsx` + `src/lib/search.ts` | Header search that shows the rest of your word in faint grey | React + TS + Tailwind | Ours; no outside code | none | Labelled input, `aria-autocomplete="inline"`, ghost hidden from screen readers, Escape clears, Tab or right arrow accepts | Tiny; the matching is plain functions | Ghost is off if the text is wider than the box; screen reader not tested |
| Type filter (ours) | `src/components/library/TypeFilter.tsx` + `src/config/tags.ts` | "Filter by type" button with a panel: search box, tick boxes, counts | React + TS + Tailwind | Ours; no outside code | none | Real checkboxes, `aria-expanded`, Escape returns focus to the button, closes on outside click or focus | Tiny | Safari and Firefox not tested |
| Colour picker (supplied, adapted) | `src/components/ui/color-picker.tsx` | The colour square, hue bar, HEX/RGB/HSL boxes, eyedropper and presets inside the colour wheel | React + TS + Tailwind | Supplied by the owner; source and license not stated. **Owner to verify.** | `lucide-react`. Dropped `@tabler/icons-react`, `@base-ui/react` (popup), the opacity bar and the kit's data attributes | Sliders have labels, values and arrow / Home / End / Page keys; boxes labelled; presets are real buttons with `aria-pressed`; transitions off under reduced motion | Part of the 6.7 KB gz dock script (loads when idle) | None found (D29 audit): no network, storage or tracking; the eyedropper is a browser feature |
| Colour wheel and dark switch (ours) | `src/components/ThemeDock.tsx` + `src/lib/theme.ts` | Two floating buttons: colour picker popup and dark mode | React + TS | Ours; no outside code | none | Buttons labelled, `aria-expanded` / `aria-pressed`, popup is a labelled dialog that is `inert` while closed, Escape returns focus, the wheel says why it is off in dark | 6.7 KB gz, `client:idle`; a 1 KB inline head script | Saves only to this browser; the head script accepts only known names and `#rrggbb` |

### Checklist when the owner sends outside code (D29)
Before using it: search for external URLs and hosts; `fetch`, beacons, WebSocket, cookies, storage; `eval`, `innerHTML`, injected `<script>` or `<style>`; "powered by", "made with", watermark or credit text; floating badges, toolbars or widgets; then check the BUILT files too. Remove whatever the site does not need and report it. A credit the licence requires stays (and the owner is told).

### What we changed in the components
**Hero:** code unchanged. It shipped without its CSS and helpers, so we added:
- `hero-utils/cx.ts` (class joiner).
- `hero-utils/icons.tsx` (lucide `ArrowRight`).
- `src/styles/hero.css` (all `rr-hero__*` and `rr-btn*` styles, built from the tokens).

**Skiper 39:** fixes are listed at the top of the file:
- Reduced motion starts frozen.
- Pause/play button.
- Stops animating when off-screen.
- No crowd reset on mobile scroll.
- Clean unmount.
- Smaller figures on phones.
- Pixel ratio capped at 2.
- Skips the 4 figures holding knives.
- `w-full` instead of `w-screen`.
- Removed Next.js `"use client"`.

The caption "Croud Canvas" became "Built for builders".

**Skiper 39 update (2026-10-28):** heads were cut off on laptop-height screens. The figure size now comes from the canvas height, so the tallest figure (its height + 150px set back + 10px bounce) always fits. The canvas also starts below the caption line, so figures never cover it.

**Skiper 31:** the full change list is at the top of the file. In short:
- Lenis was removed on 2026-10-29 (DECISIONS D19): the page uses the browser's own scrolling.
- Reduced motion shows a plain still version. It's checked after page load, so it doesn't clash with the server's HTML.
- The sentence is read once by screen readers, and words don't break mid-word.
- Much less scroll distance than the original 210vh blocks.
- Black on white, using our tokens.
- The duplicate third block is removed.
- Copy changed to "find what works" and "{ for the stack you already use }".

**Skiper 31 update (2026-10-29):** the sentence became a reusable `AnimatedLine`, and `moreLines` adds three more sentences after the logos ("tested by hand", "dated and scored", "with the catch up front"). The wording is placeholder, to be rewritten by the owner. These claims match the spec's promises, but check each one still holds when you rewrite.

**Stacked sections (2026-10-29):**
- Each box is `sticky top-0 h-dvh`, so the next box slides over the previous one.
- The original's `<ReactLenis root>` was removed (Lenis is gone from the project, D19).
- `"use client"` and `forwardRef` were removed (not needed).
- Dark slate and grey boxes became soft tints on white.
- The faint grid is kept, at much lower strength.
- `h-dvh` replaces `h-screen`, which overshoots on phones.
- Data comes from `src/config/categories.ts`. Every box has a black pill button, "Browse the list", that goes to `/websites`.
- **Layout (2026-10-29):** picture on one side, words on the other, swapping sides on every other box. On phones the picture sits above the words. A box with no `image` in the data shows a quiet placeholder frame.
- **Entrance animation:** the picture slides in from its side, the words slide in from the opposite side, and a black bar sweeps across the heading and the paragraph to reveal them. Only `transform` and `opacity` change, so it runs on the graphics chip. It replays when you scroll back up past a box.

**Login form (2026-10-29):** see DECISIONS.md D10 for the full list. In short: React became static Astro; "Remember me", "Forgot password" and "Sign up" removed; third-party images and logo replaced; left image became two looping columns (4 copies each, cards from `showcase.ts`).

**Stacked sections update (2026-10-29):** each box except the last now has an 80%-of-a-screen pause under it, and the entrance starts earlier (D9).

**Animated counter (2026-10-29):** see DECISIONS.md D12. The pasted code had a typo (`10* * places`) that would not compile; fixed. "use client" removed. `motion.span` became `m.span` inside `LazyMotion`.

**Header (2026-10-29):** X logo with a hover grow-and-glow, and a slot on the right (D13).

**Sign-in (2026-10-29):** three views: sign in, create account, reset password (D14).

**Demo files** were used as reference and not copied. The landing page is the real usage, so the demos would be dead code.

**Unsplash images:** not used. Neither component needs photos, and hotlinking Unsplash would add a third-party request.

## Design tokens (`src/styles/global.css`)
- **From the kit:** spacing (`--space-*`), radius (`--radius-*`), motion (`--duration-*`, `--easing-*`), control sizes, system font stack, brand gradients, and a `.dark` theme block.
- **Added by us**, because the kit referenced these but never defined them:
  - The raw palette: `--gray-1..9`, `--blue-4/5/6/10`, `--redrob-black`.
  - The full **light** theme: white surfaces, near-black ink, black primary button, blue focus ring.
- **Contrast:** the lightest text color, `--ink-muted` `#5f6673`, is about 5.8:1 on white (calculated by hand; verify with a contrast checker). WCAG AA needs 4.5:1.
- **Category tints (2026-10-29):** `--tint-sky #e6eefc`, `--tint-sand #f4eee3`, `--tint-sage #e5efe7`, `--tint-lilac #eeeaf7`, used as `bg-tint-*`. Dark text on them is 6.6:1 or better; the smallest grey labels are 4.9:1 or better (calculated by hand; verify with a contrast checker).
- **Tailwind classes from tokens:** `text-ink-primary/secondary/muted/brand`, `bg-surface-base/sunken`, `border-line-subtle/strong`, `outline-focus`.
- **Note:** the kit's `--radius-*` values override Tailwind's default `rounded-*` sizes (for example, `rounded-sm` is 6px, not 4px).
- **Dark mode:** tokens exist but there's no toggle yet (the crowd art is black-on-white, so it needs a dark treatment first).
