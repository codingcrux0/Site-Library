# Questions for the qualified professional (2026-11-11)

Bring these three drafts: `PRIVACY-POLICY-DRAFT.md`, `TERMS-AND-AGE-RULE-DRAFT.md` and this list. The site is a free, non-commercial directory run by one person in India; it plans accounts via Google and GitHub sign-in, and private bookmarks.

## Data the system holds (from the code, 2026-11-11)
| What | Where | Who can see it |
|---|---|---|
| Email, sign-in ID, provider name, last sign-in time | Supabase (AWS Tokyo), only for people who sign in | The person; the owner as database operator |
| Bookmarks (website ID, date) | Supabase, locked so each person sees only their own | Same |
| Session token | The person's own browser (local storage) | The person |
| Colour and dark-mode choice | The person's own browser only | The person |
| A single page-view total | Cloudflare Durable Object | The owner. No cookie, IP or ID is kept |
| Request details (IP etc.) | Cloudflare as host, Supabase as provider | Those companies, under their policies |

## What we need decided
1. **Is the 18+ rule with a tick-box enough** under India's DPDP Act, and does it also satisfy the EU/UK if visitors from there are allowed?
2. **Which laws apply** to a free site run from India that anyone in the world can open? What is the minimum to do for DPDP, and for GDPR if we do not target the EU?
3. **Cross-border transfer:** data is stored in Japan with a US-headquartered provider (Supabase) and sign-in via Google and GitHub. What must the policy say?
4. **Consent and notice:** does the sign-in screen need a link to the policy and a consent line (not only the age tick)? Do we need a cookie banner (we use only local storage that the person's own choice or sign-in needs, no tracking)?
5. **Rights and deletion:** what must "delete my account" cover, including Supabase backups and logs, and how fast must we answer a request? Do we need a named grievance contact under DPDP?
6. **Breach duty:** what do we have to do, and how fast, if the database leaks?
7. **Reviews and ratings (later):** who is liable for what users write? Takedown process, and the wording for "Scores are the owner's reviews, not tests".
8. **Listing other businesses** with scores and "the catch" text: any defamation or fair-comment risk, and wording to reduce it?
9. **Operator identity:** do we publish a legal name and address, and does it matter whether it is a person or a registered business?

## Before real people sign in (owner's checklist)
- [ ] Reviewer has approved the policy and terms, and the owner has published them as pages and linked them in the footer and on `/sign-in`.
- [ ] "Delete my account" and a way to export bookmarks are built and tested.
- [ ] The age tick is built (after the reviewer says how).
- [ ] A second Supabase project exists for real people; the region is confirmed.
- [ ] Two-step login is on for GitHub, Google, Supabase and Cloudflare.
- [ ] The site is built with `PUBLIC_ACCOUNTS_OPEN=1` only after all the boxes above are ticked.
