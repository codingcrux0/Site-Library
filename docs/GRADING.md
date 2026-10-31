# How every website is graded

One set of rules, used for every website, so two sites with the same evidence get the same marks. Written 2026-10-31 (D36).
The marks are my judgement from reading, not hands-on use. Every mark below says what evidence it needs. When the evidence is missing, the mark says so (3) instead of guessing high or low.
The data is in `src/config/library.ts`; `src/lib/library-data.test.mjs` checks the maths (marks add up, tags exist, free score matches the free mark). The per-site evidence is in `docs/drafts/grades-2026-10-31.md`.

## The four marks (1 to 5 each, the score is their sum, 4 to 20)

### 1. Quality: how well it does its job, inside THIS category
Start from the evidence, then move at most ONE step up or down with a written reason.
- **A website with a public GitHub repository:** start from its stars. 5 = 20,000 or more. 4 = 2,000 to 19,999. 3 = 200 to 1,999. 2 = 50 to 199. 1 = under 50.
- **A website with no repository:** start at 3.
- **One step up** for clear breadth or depth (a very large catalogue, complete documentation, creators credited on every item).
- **One step down** for a clear weakness (a missing credit or licence, thin or partial content, a narrow scope for this category, a tool that can run arbitrary code).
- If both apply they cancel. The result is always 1 to 5.
- Stars are a rough guide to use and trust, not to quality of craft, which is why the step up and down exist.

### 2. Free tier: what you get without paying
- **5** = everything is free: no paid plan, no membership, no limit and no account found on the pages read (or an open-source licence with nothing paid next to it).
- **4** = a substantial free core with optional paid extras, or a small, clearly stated limit.
- **3** = usable free but with real limits (daily caps, locked sections), or the terms are not shown.
- **2** = mostly paid, with a small free sample.
- **1** = nothing free.

### 3. Beginner ease: how fast a beginner gets value
- **5** = opens in the browser or installs like a normal app, nothing to configure.
- **4** = one command or one copy-paste, and the docs show how (basic web knowledge needed).
- **3** = you set up a framework or build step first, or the setup steps are not shown.
- **2** = the command line plus extras: a GPU, model downloads, compiling, specialist knowledge.
- **1** = experts only.

### 4. Freshness: how recently it was updated
The newest date the site or its repository reports: a repository's last push, a site's sitemap `lastmod`, or a server `Last-Modified` header (a rebuild can move these, so they show activity, not proof of new content).
- **5** = within 30 days. **4** = within 6 months (or the site itself says it adds items daily and shows 2026 content). **3** = within a year, or no date could be found. **2** = within 2 years. **1** = older, or archived.
- Dates are measured from the day of the review (`checkedOn`).

## Best for free (a separate score)
A placement has a free score **exactly when its Free tier mark is 5**. The wording on the site is "found no paid plan, no membership and no usage limit", never "guaranteed". Its four free marks:
1. **Quality**: the same number as the quality mark.
2. **No strings**: 5 = no account, ads, sponsors, tracking or watermark in the way; 4 = sponsor or job-board entries on the page; 3 = sponsored placements throughout, or usage tracking on by default.
3. **Clear terms**: 5 = a permissive licence (MIT, Apache, BSD, ISC, Zlib) or reuse terms stated plainly; 4 = clear but with conditions (GPL, LGPL, a licence with exceptions); 3 = stated but unusual; 2 = no reuse terms stated; 1 = restrictive.
4. **Freshness**: the same number as the freshness mark.
The tab sorts by this free score. A website that is free in one category is free in all of them.

## Category rules
- Five questions decide the category, in order: what is it FOR, who uses it, what do you get, what do you do with it, and where would a visitor look first.
  - **UI Components**: pieces for building an interface (component libraries, control panels).
  - **Motion & Animation**: libraries, packs and galleries about how things move on a screen.
  - **3D & Graphics**: 3D engines, rendering, physics, effects and 3D tools.
  - **Video & Audio**: making, editing, converting, recording or analysing video, audio and speech.
  - **Design Inspiration**: galleries and collections to learn from.
  - **Templates & Assets**: things you download or paste in: templates, prompts, backgrounds, icons, fonts.
  - **Tools & Utilities**: anything else that does a job for you (online tools, apps, directories, AI tools).
- Every website has ONE main category (its first placement). It gets a second (or third) only when a real part of what it offers belongs there, and that placement is graded on its own: quality is judged for that category's purpose, so the same site can score differently in each.
- A second placement is never a copy of the first (the tests check that).

## Tag rules
- 1 to 5 tags per placement, from `src/config/tags.ts`: mostly the category's own group plus the shared ones (Open source, AI, Copy and paste, Python, Command line, Desktop app). At most one tag from another category.
- A tag must be true of the website in that category and come from evidence (its own pages or repository). "Open source" only when a repository licence says so; a source-available licence (such as Remotion's) is NOT open source.
- Use the same word for the same thing everywhere (three.js, not "Three" or "threejs").

## What this system does not do
- It does not measure real-world quality by use. It does not know a site's future. Stars and update dates move; marks are re-checked when a site is re-reviewed.
- Paid-only sites are graded the same way and score low on Free tier on purpose. That is information, not a punishment.
