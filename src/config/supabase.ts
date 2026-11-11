// Where sign-in, bookmarks and star ratings live: the Supabase project below.
// Both values are PUBLIC on purpose: the address is in every request, and the "publishable" key is the one Supabase designs for browsers.
// It can do nothing the database rules (supabase/bookmarks.sql and supabase/account.sql) do not allow. The SECRET key (sb_secret_...) must NEVER appear anywhere in
// this repository or the built site; a test checks the built files for it.
export const SUPABASE_URL = "https://xqvqsdoxtcgeuwwbfhbg.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z-MUopQpa5eLQI-LS1BE3w_jl0GOROB"; // gitleaks:allow (a publishable key is public by design; the secret key never goes in the repo)

// The one switch for sign-in. true = the Google and GitHub buttons really sign people in. false = they only show "Accounts are not open yet"
// and nothing is sent anywhere (the whole Supabase part is then left out of the built site). The owner chose to open accounts on 2026-11-11
// without a legal review (docs/DECISIONS.md, D46); the privacy page and the terms page are the plain-words defaults written for that.
export const ACCOUNTS_OPEN = true;
