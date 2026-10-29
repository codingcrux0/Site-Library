# MASTER PROMPT: [SITE NAME], a tested, ranked library of useful websites

> How to use: put the Engineering Master Prompt in this project's custom instructions. Upload THIS file as `PROJECT_SPEC.md`. Fill every [PLACEHOLDER] first. Build one milestone at a time.

---

## 1. YOUR ROLE ON THIS PROJECT
You are the lead engineer, security engineer and product designer building [SITE NAME].
- Follow the Engineering Master Prompt in this project's instructions for all honesty, security, testing, teaching and documentation rules.
- This file is the product spec. If the two conflict: the security floor and honesty rules win. For anything else, ask me.
- I am the owner. I'm a beginner coder. I must be able to explain every part of this site. Teach me as you build.
- Budget: $0. Use free tiers only, and flag every limit or terms issue for me to verify.

## 2. THE PRODUCT IN ONE PARAGRAPH
[SITE NAME] is a free website that lists useful websites sorted by purpose. Every listed site is **tested by me, dated, scored, and comes with "the catch"** (the limit, paywall, or problem nobody mentions). It launches with ONE category, **Frontend Components** (UI component libraries and sites like these), and adds categories one at a time later. Anyone can use it without an account. Signing in is optional and only for saving lists and preferences, rating, and giving feedback. It is also my personal library of tools, and it feeds my build-in-public X account (@Adicrux).

**Audience:** beginner-to-intermediate builders, students and indie developers, global (US/UK/EU) and Indian.

**Why it beats other directories (our edge, protect it):**
1. Tested, not just listed. Every entry has a real test by me, with a date.
2. "The catch" on every entry. Honest limits, not marketing copy.
3. Two separate scores: **my score** (my test) and **community score** (users). Never mixed.
4. Live freshness: dead links are caught, "still accurate?" votes, a public Graveyard and a monthly changelog.
5. Same-task tests: I build the same small thing with each library so people can compare real results.

## 3. GOALS, NON-GOALS, SUCCESS
**Goals for V1:** a fast, trustworthy, beautiful first category that people bookmark and return to; a site I can explain end to end; content I can turn into X posts.

**Non-goals for V1:** making money, covering "every site possible", social network features, an AI chatbot.

**Metrics to track privately** (I'll set targets; no baselines exist yet):
- weekly visitors
- returning visitors
- saves and lists created
- shares and stack cards made
- outbound clicks per entry
- ratings count
- "still accurate?" votes

## 4. TRUST RULES (never break)
1. No entry is published unless `tested_by_owner = true` and it has a test date. You may help me draft text, but AI-drafted text stays in DRAFT until I approve it.
2. Never invent facts about a listed site: features, prices, limits, licenses, user counts. Leave fields empty and mark them "owner to verify".
3. My score and the community score are always displayed separately. Rankings default to my score.
4. Never sell rankings. If affiliate or sponsored links are ever added, they are disclosed on the entry and on the Methodology page, use `rel="sponsored"`, and do not affect the score.
5. The whole site works without an account.
6. Collect the minimum personal data (sign-in ID, email, display name). No phone numbers. No ad tracking.
7. Code must stay simple enough for me to explain.

## 5. LAUNCH SCOPE (V1)
- **Category:** Frontend Components.
- **Entries:** target 20+, minimum 10. Every one must be tested.
- **Every feature in section 7** unless it's marked LATER.
- **Category system:** built so more categories can be added later without code changes.

## 6. CONTENT MODEL

### 6.1 Entry fields
| Field | Type | Required | Notes |
|---|---|---|---|
| name | text | yes | |
| slug | text | yes | URL-safe, unique |
| url | url | yes | https only; validated |
| category | ref | yes | |
| one_liner | text ≤ 120 | yes | my own words, never copied |
| best_for | text | yes | e.g. "landing pages", "dashboards" |
| the_catch | text | yes | the honest limit or problem |
| free_limit | text | yes | what's free, in plain words |
| pricing_type | enum | yes | free / freemium / paid / open source |
| license | text | yes | checked on the site by me |
| frameworks | tags | yes | React, Vue, Svelte, plain HTML, etc. |
| styling | tags | yes | Tailwind, CSS, CSS-in-JS, etc. |
| install_type | enum | yes | copy-paste / package install / both |
| my_score_quality | 1–5 | yes | |
| my_score_free_tier | 1–5 | yes | |
| my_score_beginner_ease | 1–5 | yes | |
| my_score_freshness | 1–5 | yes | maintenance and updates |
| my_score_total | 4–20 | auto | sum of the four |
| my_verdict | text | yes | 1–3 sentences in my voice |
| tested_by_owner | bool | yes | must be true to publish |
| tested_on | date | yes | shown publicly |
| last_checked | date | auto/manual | shown publicly |
| same_task_test | ref | optional | see 6.3 |
| status | enum | yes | draft / published / needs_recheck / dead / went_paid / removed |
| status_changed_on | date | auto | |
| is_affiliate | bool | yes | default false; shows disclosure if true |
| private_notes | text | no | **admin-only, never public** |
| repo_url | url | no | for open-source activity signals |

### 6.2 Scoring rubric (shown on the Methodology page)
- Four criteria, 1–5 each: Quality, Free-tier usefulness, Beginner ease, Freshness. Total out of 20.
- Ties are broken by my judgement, explained in my_verdict.
- Every entry shows the score breakdown, not just the total.

### 6.3 Same-task test
- One fixed task per category. For Frontend Components: **[TEST TASK, e.g. "build a responsive 3-tier pricing section with a monthly/yearly toggle"]**.
- Record: time taken, worked out of the box (y/n), friction notes, framework used, and my own screenshot of the result.
- Shown in a Test Gallery and on each entry page.
- At launch, at least my top 5 entries have a test.

### 6.4 Tags and filters
- **Filters:** framework, styling, pricing type, license, install type, has same-task test.
- **Sorts:** my rank (default), community rating, recently checked, newest, free first, A–Z.

## 7. FEATURES (V1), WITH ACCEPTANCE CRITERIA

### 7.1 Public browsing (no login)
- **Home:**
  - what the site is
  - how we test (link to Methodology)
  - the category
  - top-ranked entries
  - recent changes
- **Category page:** ranked list with filters, sorts and instant search. Each card shows name, one-liner, my score, the catch, pricing type, frameworks and last checked.
- **Entry page:**
  - all public fields and the score breakdown
  - my verdict
  - the same-task test
  - the community score (if shown)
  - "used it for" tags
  - approved feedback
  - a "still accurate?" button
  - a visit button
- **Search:** fast, typo-tolerant if practical, keyboard shortcut (Ctrl/Cmd+K).
- **Acceptance:**
  - Filters and sort combine correctly.
  - The URL reflects the filters, so they're shareable.
  - It works on mobile.
  - It works with JavaScript slow or failing gracefully where practical.

### 7.2 Discovery tools
- **Compare:** pick 2–3 entries and see them side by side (all fields and scores).
- **Pick for me:** a 3-question quiz (framework? free only? copy-paste or install?) that returns 3 entries with the reason for each. Simple, readable rules, no AI.
- **Acceptance:** the quiz logic lives in one small, readable file that I can explain.

### 7.3 Accounts (optional)
- **Sign-in methods:** Google, GitHub, email magic link, through a managed auth provider. No passwords stored by us unless the provider handles them securely.
- **Account settings:**
  - display name
  - preferences
  - sign out of all devices
  - export my data
  - delete my account (deletes or anonymizes their ratings and feedback, as stated in the privacy policy)
- **Age line:** terms state accounts are for 18+. Owner must verify the legal basis with a qualified professional.
- **Acceptance:**
  - The same person signing in by two methods doesn't silently create a messy duplicate. Explain how the provider handles linking.
  - Reset and magic-link flows follow the security floor.

### 7.4 Saved lists and preferences
- **Logged out:** saves go into the browser's local storage, with a clear note that they live on this device only.
- **On sign-in:** offer to merge local saves into the account.
- **Lists:**
  - multiple named lists
  - add or remove entries
  - private by default
  - optional public share link
- **Preferences:** default filters (e.g. "React only"), theme (light/dark/system).
- **Acceptance:** a private list is never readable by anyone else. This is tested by trying.

### 7.5 Sharing (X growth loop)
- **Stack card:** a user picks up to 5 entries as "my frontend stack". The site generates a shareable image and link. It shows no personal info unless the user adds a display name.
- **Social preview images:** auto-generated for every entry, category and public list.
- **Share buttons:** copy link and share to X. Never auto-post.
- **Acceptance:** cards render correctly when the link is pasted on X. Verify with X's current card behavior.

### 7.6 Community input
- **Ratings:**
  - sign-in required
  - one rating per user per entry, editable
  - three parts, 1–5 each: Ease, Quality, Free-tier fairness
  - community average hidden until the entry has at least **5** ratings (configurable); show the count and the distribution
  - an optional self-declared "I'm the maker of this site" tag, shown publicly and excluded from the average
- **Written feedback:**
  - sign-in required
  - plain text only
  - length limits
  - no links by default
  - goes through moderation (7.7)
- **"Used it for" tags:** sign-in required, picked from a preset list (no free text, so no moderation is needed).
- **"Still accurate?":**
  - sign-in required
  - Yes / Outdated, plus an optional reason from a preset list (price changed, link dead, feature removed, other)
  - **3** "outdated" votes (configurable) set the entry to needs_recheck for my review. Never auto-change public data.
- **Suggest a site:**
  - no login needed
  - bot check and rate limit
  - no email field
  - goes to my submissions queue
  - never auto-published
- **Report a dead link or unsafe site:**
  - no login needed
  - bot check and rate limit
  - goes to my queue

### 7.7 Moderation
- **Layer 1, word-flag bot:**
  - Scans feedback, list names and display names.
  - It must handle English, Hindi and Hinglish (romanized Hindi), and common misspellings and character swaps.
  - Flagged items are **held, never auto-deleted**.
- **Layer 2:** first **3** posts from any new account are held for review (configurable).
- **Layer 3:**
  - report button on all user content
  - auto-hide after **3** reports (configurable), pending my review
- **Layer 4:** rate limits per account and per IP. Bot check on sign-up and public forms.
- **Moderation queue in admin:** approve / reject / ban, with a reason. Every action is logged.
- **Content rules (on the Terms page):** factual, no abuse, no spam, no personal attacks, no self-promotion without disclosure.

### 7.8 Freshness system
- **Link checker:**
  - a scheduled job, weekly
  - checks every published URL for status and redirects
  - 2 consecutive failures set needs_recheck. **I confirm** before anything is marked dead.
  - polite: low request rate, identifies itself, no content scraping
- **Open-source activity:** for entries with repo_url, fetch last update and basic activity from the official API (verify rate limits and terms). Shown as "live signals", clearly separate from my score.
- **Unsafe-site check:** check listed URLs against a reputable safe-browsing service. Verify its terms, because some restrict commercial use. Flagged entries go to needs_recheck immediately and are hidden until I review.
- **Graveyard page:** entries marked dead or went_paid, with the date and what happened.
- **Changelog page:** a monthly "what changed" log (new, removed, dead, pricing changes, re-tests). You may draft it from data changes; I edit and publish.
- **RSS feed** for the changelog.

### 7.9 Admin dashboard (owner only, MFA required)
- Create, edit, draft and publish entries. Preview before publishing.
- **Import from CSV:** I keep my research in a Google Sheet, so map its columns to entry fields, validate, and show errors before importing.
- Queues: moderation, submissions, dead-link and unsafe reports, needs_recheck.
- Link-checker results, and Graveyard confirmations.
- Changelog editor.
- **"Copy as X thread":** generates a draft thread from a category or a set of entries (ranked, with the catch), in lowercase casual style, for me to edit. Never auto-post.
- **"Weekly tested tool" draft:** picks one recently tested entry and drafts a post for me to edit.
- An audit log of all admin actions.
- private_notes on each entry, visible only here.

### 7.10 Trust and legal pages
- **Methodology:**
  - how I test
  - the scoring rubric
  - the same-task test
  - my score vs community score
  - conflicts of interest
  - affiliate policy
- **Privacy policy:**
  - what we collect
  - why
  - where it's stored
  - how long
  - how to export or delete
  - India DPDP and GDPR notes, marked "owner to verify with a qualified professional"
- **Terms:**
  - 18+ for accounts
  - content rules
  - takedown and contact process
  - no warranty on listed sites
- **Contact / takedown page.**
- **Cookie notice:** only if needed. Prefer essential cookies only and cookieless analytics, so a banner may not be required. Verify for EU and UK users.

### 7.11 Analytics
- Privacy-friendly and cookieless where possible (verify options and free tiers).
- Track: page views, returning visitors (without personal profiles), outbound clicks per entry, saves, shares and quiz uses.
- No selling or sharing data. No ad pixels.

### 7.12 Quality bar
- **Design:**
  - fast, clean, developer-focused
  - mobile-first
  - dark mode
  - delightful but light animations that respect reduced motion
- **Accessibility:** WCAG 2.2 AA (verify).
- **Performance:** Core Web Vitals in the "good" range on mobile (verify current thresholds). Entry and category pages pre-rendered for speed and SEO.
- **SEO:**
  - unique title and description per page
  - semantic HTML
  - structured data where appropriate (verify which types)
  - sitemap
  - clean URLs: `/frontend-components/[slug]`

## 8. DATA MODEL AND PERMISSIONS

**Tables (suggested; propose improvements):**
- categories, entries, tags, entry_tags, same_task_tests
- live_signals
- profiles, preferences, lists, list_items
- ratings, feedback, used_for_tags, accuracy_votes
- submissions, reports, moderation_actions
- changelog_entries, admin_audit_log

**Permission table (deny by default, enforced in database rules AND tested):**

| Data | Read | Write |
|---|---|---|
| categories, published entries, tests, live signals | everyone | owner only |
| draft entries, private_notes | owner only | owner only |
| profile (display name) | everyone (if public content) | that user |
| preferences | that user | that user |
| private lists | that user | that user |
| public lists | everyone (via link) | that user |
| ratings | everyone (aggregates, after threshold) | signed-in user, own row, one per entry |
| feedback | everyone (approved only) | signed-in user creates own; owner moderates |
| used-for tags, accuracy votes | everyone (aggregates) | signed-in user, own rows |
| submissions, reports | owner only | anyone creates (bot check + rate limit) |
| moderation actions, audit log | owner only | system and owner only |
| changelog | everyone (published) | owner only |

## 9. PROJECT-SPECIFIC SECURITY (on top of the Engineering floor)
- **Outbound links:**
  - `rel="noopener noreferrer"`, and `rel="sponsored"` for affiliates
  - If outbound clicks are tracked through a redirect route, it may only redirect to URLs stored for that entry ID. **Never redirect to a URL taken from the query string** (that would be an open redirect).
- **Ratings integrity:** one per user per entry, enforced in the database. Rate-limit new accounts. Detect bursts of ratings on one entry and hold them for review.
- **User text everywhere** (feedback, list names, display names) is rendered as plain text and length-limited.
- **Stack-card and preview images** must be generated safely: no user-controlled HTML rendering, and input length limits.
- **Admin:** separate route, MFA required, owner role checked server-side. Never rely on hidden UI.
- **Rate limits** on search and API routes to stop scraping and abuse of my own site.
- **Scheduled jobs** use least-privilege credentials and never expose keys to the browser.

## 10. TECH DIRECTION
- Propose 2 stack options with trade-offs, then recommend one. Constraints: $0, beginner-explainable, pre-rendered public pages, a managed auth and database service with row-level security, scheduled jobs for link checks.
- Candidates to evaluate (verify current free tiers and terms, don't assume):
  - Cloudflare Pages / Workers for hosting
  - Supabase or Firebase for auth and database
  - GitHub Actions for scheduled jobs
- Use my provided frontend components. Follow the component-intake process in the Engineering Master Prompt: inventory, licenses, red flags, design tokens, then choose and compose.

## 11. MILESTONES (build in order; each ends with a demo, tests, docs, and my understanding check)
| # | Milestone | Done when |
|---|---|---|
| M0 | Setup: repo, environments, docs skeleton, threat model, stack decision, component intake | I approve the stack and threat model; docs exist |
| M1 | Data model, permission rules, admin login with MFA, entry editor, CSV import | Permission tests pass; I can import my sheet |
| M2 | Public pages: home, category (filters, sort, search), entry pages | Pre-rendered, fast, accessible; all filters tested |
| M3 | Compare, Pick-for-me quiz, Test Gallery | Quiz rules readable; compare works on mobile |
| M4 | Accounts, local saves, merge on sign-in, lists, preferences, export, delete | Cross-user access tests fail safely |
| M5 | Ratings, feedback, used-for tags, still-accurate votes, submissions, reports, moderation queue and bot | Abuse tests pass; nothing auto-deletes |
| M6 | Link checker, live signals, unsafe-site check, Graveyard, changelog, RSS | Jobs run on schedule; I confirm before status changes |
| M7 | Sharing: stack cards, social preview images, share buttons, "copy as X thread" | Cards render correctly on X |
| M8 | Legal pages, analytics, SEO, accessibility and performance pass | Measured scores reported |
| M9 | Launch readiness gate (from the Engineering prompt) | Verdict READY, with no blockers |

## 12. LATER (not in V1)
- **V1.5:**
  - next categories (my picks, set 2026-10-29: Dev Tools, Productivity, AI Tools; AI Tools was suggested by Claude, owner to confirm)
  - "notify me" alerts for price changes and dead sites (needs email consent)
  - community picks page
- **V2:**
  - Hindi/Hinglish interface (human-reviewed translations)
  - a public read-only data export (CSV/JSON) with a license I choose
  - an embeddable "listed on [SITE NAME]" badge
  - an AI helper that answers ONLY from our data, cites entries, and says "not in our list" otherwise
- **Money (only after real traffic, always disclosed, never affecting scores):**
  - affiliate links
  - clearly labeled sponsorships
  - a paid "re-test my tool" request queue, where the result is still honest

## 13. OPEN QUESTIONS (ask me these at the start if unanswered)
1. Site name and domain: [SITE NAME], [DOMAIN].
2. My name and face on the site, or a separate brand?
3. The exact same-task test for Frontend Components.
4. Will there be any affiliate links at launch? (Default: none.)

## 14. FIRST MESSAGE
- Confirm in 3 lines that you understand the product, the trust rules and the security floor.
- Then list anything in this spec that is unclear, risky or contradictory.
- Ask the open questions above.
- Propose the M0 plan with 2 stack options.
