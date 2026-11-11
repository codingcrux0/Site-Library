> **SUPERSEDED 2026-11-11 (D46).** The owner chose plain-words pages without a legal review and no 18+ rule. The live pages are `src/pages/privacy.astro` and `src/pages/terms.astro`. This file is kept only in case a reviewer is found later.

# Privacy Policy: DRAFT (2026-11-11)

> **DRAFT. Not legal advice. Not published.** Written by an AI assistant from what the code does today, as input for a qualified lawyer. It must be reviewed, corrected and approved by a qualified professional before real people can sign in (LEGAL GATE). Text in [square brackets] must be filled in by the owner. Every sentence must be TRUE on the day it is published: the table at the end says which sentences depend on features that are not built yet.

**Site Library** is run by [Aditya Rai, India: owner to confirm the exact legal name and whether it is a person or a business]. Contact: [contact email: owner to choose].

## 1. Browsing without an account
- You can use the whole list without signing in.
- **Page-view counter.** The home page asks our server to add one to a single number. We do not store your IP address, a cookie or any ID for this. Only the total is kept.
- **Your colour and dark-mode choice** is kept in your own browser (local storage). It is never sent to us.
- Our website host, **Cloudflare**, handles every request to the site and, like any host, sees technical data such as your IP address to deliver the pages and protect against attacks. We do not receive or keep it. See Cloudflare's own privacy policy: [link, owner to add].
- We use **no advertising, no analytics service and no tracking cookies.** [Owner and reviewer: confirm this stays true.]

## 2. Signing in (only when accounts open)
You sign in with **Google** or **GitHub**. We never see or store a password.
- **What we receive from them:** your email address, a unique sign-in ID and the name of the provider you used. We do not copy your profile picture or name. [Confirm against what Supabase actually stores before publishing.]
- **Why:** to know which saved bookmarks are yours, and to let you sign in again.
- **Google and GitHub** learn that you signed in to Site Library. Their own policies apply to them.
- Sign-in works through **Supabase** (our sign-in and database provider). Your browser keeps a session in local storage so you stay signed in until you sign out.

## 3. Bookmarks
- If you save a website, we store the website's ID and the date, linked to your account. Nobody else can read your bookmarks: the database refuses it (tested). The owner can see them as the person who runs the database. [Reviewer: confirm wording.]
- Limit: 500 bookmarks per person.

## 4. Where your data is stored
Account and bookmark data is stored with Supabase on Amazon Web Services in **Tokyo, Japan (ap-northeast-1)**. [Reviewer: cross-border transfer wording for India and the EU. Owner: confirm the region of the project that real people will use.]

## 5. How long we keep it
Until you delete your account. Then your account and bookmarks are deleted. [Reviewer: Supabase's own backups and logs may keep data for a time; confirm what to say. THE DELETE-MY-ACCOUNT BUTTON IS NOT BUILT YET.]

## 6. Your choices and rights
- **See or export** your data: [method not built yet; for now, email the contact address].
- **Delete** your account and bookmarks: [button not built yet].
- **Complain:** [reviewer: the right authority wording for India (DPDP) and the EU/UK if they apply].

## 7. Children
Accounts are for people **18 or older** (see the Terms). We do not knowingly create accounts for anyone younger. Browsing the list needs no account.

## 8. Changes
We will change this page when what we do changes, and show the date at the top. [Owner: decide whether signed-in people are emailed about major changes.]

## 9. Not covered
Websites we list are other people's sites with their own privacy rules. Links leave Site Library.

---
## Which sentences are true today, and which depend on unbuilt features
| Sentence | Today |
|---|---|
| No cookie, no IP or ID kept for the counter | True (D22, tested) |
| Colour choice stays in the browser | True |
| No analytics, ads or trackers | True (the page may only talk to this site and Supabase; tested) |
| Sign in with Google or GitHub, no password | Built, needs the two OAuth apps |
| Bookmarks private to each person | Database proven on the dev project; bookmark button NOT built |
| Delete my account and bookmarks | **NOT built (blocker)** |
| Export my data | **NOT built (blocker, or say "email us")** |
| Stored in Tokyo | True for the dev project; check the project real people will use |
