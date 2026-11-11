# SECURITY.md

Status: **M0 draft (2026-10-28).** No code exists yet, so every control below is still "not verified". Controls get marked verified only when a test or scan proves them.

---

## 1. What we are protecting (assets)

| # | Asset | Why it matters |
|---|---|---|
| A1 | **Owner admin account** | Whoever controls it can publish anything under your name. This is the most valuable target. |
| A2 | **Trust in the rankings** | The whole edge of the site. Fake scores or edited entries destroy it. |
| A3 | **User personal data** (email, sign-in ID, display name) | Legal duty (DPDP, GDPR) and user trust. |
| A4 | **Private lists and preferences** | Users expect them to stay private. |
| A5 | **Secret keys** (Supabase service key, GitHub tokens) | A leaked service key bypasses ALL database rules. |
| A6 | **Free-tier quota** | If attackers burn it, the site goes down (we pay $0, so the risk is downtime, not a bill, as long as no card is added). |
| A7 | **Domain, hosting and GitHub accounts** | Takeover = full site takeover. |
| A8 | **Your X reputation (@Adicrux)** | Anything shared from the site reflects on you. |

## 2. Who might attack, and how

| Who | Likely attack | What stops it (planned) |
|---|---|---|
| **Phisher targeting you** | Steals your GitHub / Supabase / Google login | MFA on every owner account (passkey or app, not SMS where possible), admin MFA enforced server-side, audit log |
| **Curious user** | Changes an ID in a request to read someone's private list (called **IDOR**: "insecure direct object reference") | Row-level security (**RLS**: database rules that check "does this row belong to you?" on every query), plus tests that try it |
| **Tool maker / competitor** | Fake accounts to boost their score or tank a rival | One rating per user per entry (database constraint), ratings hidden until 5, burst detection, new-account rate limits, owner score shown separately and used by default |
| **Spammer / bot** | Floods suggestions, reports, feedback | Bot check (planned: Cloudflare Turnstile, verify), rate limits per IP and account, everything held for review |
| **Troll** | Abuse in English, Hindi or Hinglish | Word-flag bot that holds (never deletes), first 3 posts held, report button, auto-hide after 3 reports |
| **Scraper** | Copies the entire directory | Rate limits on API routes. Honest note: public pages can always be copied by hand, so this only raises the cost. |
| **Script kiddie** | XSS (injecting script through user text), SQL injection | All user text rendered as plain text, schema validation on the server, Supabase queries are parameterised, strict CSP |
| **Malicious listed site** | A listed site gets hacked or its domain expires and is bought by a bad actor | Weekly link checker, unsafe-site check, `rel="noopener noreferrer"`, hide on flag |
| **Supply-chain attacker** | Malicious npm package | Few dependencies, lockfile committed, `npm audit` in CI, Dependabot alerts, check every new package before adding |
| **Open-redirect abuser** | Uses our domain to send people to phishing pages | Outbound redirect only to the URL stored for that entry ID, never from the query string |

## 3. Data classification

| Level | Data | Protection |
|---|---|---|
| Public | Published entries, scores, tests, live signals, published changelog, public lists, rating aggregates | Readable by all, writable by owner only |
| Internal | Drafts, `private_notes`, submissions, reports, moderation actions, audit log, link-checker results | Owner only (RLS + admin role check) |
| Personal | Email, auth provider ID, display name, individual ratings/feedback tied to a user, IP addresses used for rate limiting | Own user + owner only, minimal retention, never in logs/URLs/analytics |
| Sensitive | None planned. Keep it that way: no phone numbers, no payment data, no IDs. | n/a |
| Secret | Service key, DB password, GitHub tokens | Env vars / secret stores only, never in the browser or the repo |

## 4. Permission table (deny by default; enforced by RLS AND tested)

| Data | Read | Write |
|---|---|---|
| categories, published entries, tests, live signals | everyone | owner only |
| draft entries, private_notes | owner only | owner only |
| profile (display name) | everyone, only where attached to public content | that user |
| preferences | that user | that user |
| private lists + items | that user | that user |
| public lists + items | everyone with the link | that user |
| ratings (individual rows) | that user (own row) + owner | signed-in user, own row, one per entry |
| ratings (aggregates) | everyone, after 5 ratings | computed by the database, nobody writes directly |
| feedback | everyone (approved only); author sees own pending | signed-in user creates own; owner moderates |
| used-for tags, accuracy votes | everyone (aggregates); own rows by that user | signed-in user, own rows |
| submissions, reports | owner only | anyone creates (bot check + rate limit), nobody edits |
| moderation actions, audit log | owner only | system and owner only, append-only |
| changelog | everyone (published) | owner only |

Change from the spec: individual rating rows are readable only by their author and the owner, while everyone sees aggregates. That stops people from profiling who rated what.

## 5. Security controls checklist

OWASP Top 10 and OWASP ASVS (target Level 2) are the checklists. **Verify the current versions on owasp.org.** Mapping each ASVS requirement starts in M1, when there is code to check.

| Area | Control | Status |
|---|---|---|
| A. Auth | Managed auth (Supabase Auth), no passwords stored by us | not verified |
| A. Auth | MFA required for admin, checked server-side | not verified |
| A. Auth | Magic links single-use and short-lived | not verified |
| A. Auth | Same message for known and unknown emails | not verified |
| A. Auth | Rate limits on sign-in | not verified |
| B. Sessions | HttpOnly/Secure cookies or documented token storage, sign out of all devices | not verified |
| C. Authz | RLS on every table, deny by default, permission tests | not verified |
| D. Input | Server-side schema validation, plain-text rendering, no open redirect | not verified |
| E. Data | HTTPS + HSTS, minimal data, export + delete, backups tested | not verified |
| F. Secrets | `.env` in .gitignore before first commit | **done** (file exists; verify before first commit) |
| F. Secrets | Secret scanner | gitleaks run before every push (working tree and history: no leaks, 2026-10-31) |
| G. Browser | CSP, HSTS, X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy | **done 2026-10-31 (D37)**: checked in a real browser and by tests; live headers verified after the push |
| H. Abuse | Bot check + rate limits on public forms | not verified |
| I. Supply chain | Lockfile, audit, Dependabot | not verified |
| J. Logging | Security event logging, audit log, INCIDENT.md | INCIDENT.md drafted |
| L. Owner accounts | MFA on GitHub, Cloudflare, Supabase, domain, email | **you must do this** |

## 6. Known risks (accepted or open)
- **Sign-in page (updated 2026-10-29):** `/sign-in` now has a form and GitHub/Google buttons, but they are **connected to nothing**: no request is sent, nothing is stored (checked: 0 localStorage, 0 sessionStorage, 0 cookies, address unchanged). `method="post"` stops a no-JavaScript submit from putting the password in the URL. Real sign-in only after the legal gate. **When it is built, it must have:** OAuth through Supabase with a redirect allow-list (no open redirects), rate limits and lockout, no user-enumeration messages ("wrong email or password" only), MFA for admins, and the permission tests re-run.

| Risk | Status |
|---|---|
| Page-view counter can be inflated by anyone (a script that sends the right headers) | **Accepted.** It is a vanity number. The rules (`worker/visits-rules.mjs`) refuse other websites, skip robots by name, and a brake for the whole counter allows at most 10 counts a second, so a flood grows it slowly. A determined person with a script can still raise it. Never use it as evidence. It also shares Cloudflare's free 100,000 requests a day: anyone can use that up, which hides the counter for the day but not the pages |
| Page-view counter: privacy (D22) | **No cookie, nothing about the visitor stored** (no IP address, no ID): one whole number only. This replaced the unique-visitor cookie on 2026-10-29, so the COOKIE GATE is no longer triggered. Still describe the counter in the privacy policy (M8) and ask the lawyer |
| `scripts/local-server.mjs` is not hardened for the internet | **By design.** It listens on 127.0.0.1 only and is for local use. Never deploy it. It blocks path tricks, wrong methods and cross-site increments, and refuses to start on a damaged data file |
| Supabase Free pauses after 1 week of inactivity | Open. The weekly link-checker job queries the DB, but what counts as "activity" is unclear in the docs. Verify. |
| Supabase Free has no automatic backups | Open. We must run our own encrypted backup job (planned for M1/M6). |
| Only 2 free Supabase projects | Accepted. So: dev + prod, no separate staging. |
| GitHub Actions schedules in public repos stop after 60 days of no repo activity | Open. A private repo avoids this but has limited free minutes (verify). |
| Legal review of privacy policy, 18+ rule, DPDP/GDPR | **Blocking gate.** See CONTEXT.md. |

- **Supabase advisor (D50):** the "Security Definer View" errors on `rating_summary` and `review_feed` and the "Signed-in users can execute SECURITY DEFINER function" warnings are deliberate, each with its reason in D50. If the Advisors tab shows anything else, it is new: read it and tell me.
