# INCIDENT.md: what to do when something goes wrong

Status: **draft (M0).** Exact click-paths get filled in once the services are set up. Steps marked "verify" must be checked against current provider docs.

## Golden rules
1. Stay calm and write down the time and what you saw.
2. Contain first (stop the damage), then fix, then explain.
3. A leaked secret must be **rotated**. Deleting the commit is not enough, because it stays in git history and copies.

## 1. A secret leaked (key in a commit, screenshot, chat)
1. Rotate it in the provider dashboard (Supabase API keys / GitHub tokens / Cloudflare tokens). Verify the steps in each provider's docs.
2. Update the new value in GitHub Actions secrets and Cloudflare env vars.
3. Check the provider logs for use of the old key.
4. Note it in this file's log below.

## 2. Someone may have got into the admin account
1. Change the password / revoke sessions on GitHub, Google and Supabase.
2. Re-enrol MFA and check for any MFA device you don't recognise.
3. Review `admin_audit_log` for actions you didn't do; revert them.
4. Rotate all secrets (section 1).

## 3. Force everyone to log out
Use Supabase's session revocation (verify the current method in the Supabase Auth docs before you need it).

## 4. Take the site down safely
Roll back to a previous deployment in Cloudflare Pages, or deploy a static "maintenance" page. Verify the steps in the Cloudflare docs.

## 5. Restore from backup
To be written once the backup job exists (M1/M6). A restore MUST be tested before launch.

## 6. Locked out of your own admin account
- Store MFA recovery codes offline (paper or password manager) **now**, for GitHub, Google, Cloudflare and Supabase.
- Keep a second sign-in method on the critical accounts.

## 7. Personal data was exposed
- Contain it, then **get legal advice quickly.** Breach-notification rules have deadlines. GDPR requires notifying the supervisory authority within 72 hours in many cases, and India's DPDP Act also has notification duties. Verify the exact requirements with a qualified professional.

## Incident log
| Date | What happened | What we did |
|---|---|---|
| | | |
