// Where sign-in and bookmarks live: the DEV Supabase project (fake data only; the real-people project comes after the legal gate).
// Both values are PUBLIC on purpose: the address is in every request, and the "publishable" key is the one Supabase designs for browsers.
// It can do nothing the database rules (supabase/bookmarks.sql) do not allow. The SECRET key (sb_secret_...) must NEVER appear anywhere in
// this repository or the built site; a test checks the built files for it.
export const SUPABASE_URL = "https://xqvqsdoxtcgeuwwbfhbg.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_z-MUopQpa5eLQI-LS1BE3w_jl0GOROB"; // gitleaks:allow (a publishable key is public by design; the secret key never goes in the repo)
