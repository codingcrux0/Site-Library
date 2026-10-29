# ARCHITECTURE.md

Status: **planned (M0).** Nothing is built yet.

## The big picture

```
                 VISITOR'S BROWSER
   pre-rendered HTML pages + small interactive "islands"
   (search, saves, ratings, quiz)
        |                         |
        | static pages            | sign-in, ratings, lists
        v                         v
  CLOUDFLARE PAGES            SUPABASE
  (hosts the built site,      - Auth (Google, GitHub, magic link)
   security headers,          - Postgres database
   Pages Functions for        - Row-level security = the real
   the redirect route and       permission checks
   form handling)             - Storage (test screenshots)
        ^                         ^
        | rebuild on publish      | service key (server-side only)
        |                         |
            GITHUB ACTIONS (scheduled jobs)
            - weekly link checker
            - live signals (repo activity)
            - unsafe-site check
            - encrypted DB backup
```

## Where things run
| Part | Runs in | Can see secrets? |
|---|---|---|
| Public pages | Browser (built ahead of time) | No. Only the public "anon" key, which is safe ONLY because RLS is on |
| Admin dashboard | Browser + Supabase, owner role + MFA checked in the database | No service key in the browser |
| Outbound redirect, form handling | Cloudflare Pages Functions | Only what each function needs |
| Scheduled jobs | GitHub Actions | Service key, stored in GitHub encrypted secrets |

## The page-view counter (built 2026-10-29, local only)
Browser (home page) -> `POST /api/visits` once per load (counted only if it has no cookie), then `GET` once a minute -> a server that keeps one number.
- Today the server is `scripts/local-server.mjs` (your computer only). Hosted version: a Cloudflare Pages Function plus one stored number, **not built yet**.
- The contract, and the rules the server must keep, are in DECISIONS.md D12. It counts unique browsers (not people): the first visit gets a `visited=1` cookie and is counted; later visits are not. See D15.

## Planned data tables (from spec section 8; finalised in M1)
categories, entries, tags, entry_tags, same_task_tests, live_signals, profiles, preferences, lists, list_items, ratings, feedback, used_for_tags, accuracy_votes, submissions, reports, moderation_actions, changelog_entries, admin_audit_log.

Proposed additions (to discuss in M1):
- `admins` table (or a role claim) so "is this the owner?" is checked in the database, not the UI.
- `rate_limit_events` for per-IP/per-account limits on forms.
- A database view for rating aggregates that only shows averages once an entry has 5+ ratings.

## Environments
- **dev**: Supabase project #1, fake data only.
- **prod**: Supabase project #2, real data.
- No separate staging (the free plan allows 2 active projects).
