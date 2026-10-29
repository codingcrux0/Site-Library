// Site-wide facts in one place, so renaming the site later is a one-line change.
export const SITE = {
  // Working name until the owner picks the real one (spec open question 1).
  name: "Site Library",
  description:
    "Useful websites, tested by hand. Every listed site is dated, scored and comes with the catch nobody mentions.",
  xUrl: "https://x.com/Adicrux",
  // Where the site lives. Link previews (X, WhatsApp, Slack...) need FULL addresses, so the preview image is built from this.
  // Change it here when the site gets its own domain, then make a new push.
  url: "https://site-library.codingcrux0.workers.dev",
} as const;
