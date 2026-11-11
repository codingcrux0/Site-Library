// Sign in with Google or GitHub: the plain rules, so they can be tested without a browser. Tests: src/lib/auth.test.mjs. Plan: docs/AUTH-PLAN.md.
// There are no passwords anywhere on this site: Google or GitHub proves who the person is, and Supabase keeps the session.
export { SUPABASE_URL } from "../config/supabase.ts";

/** The only two ways to sign in, in the order the buttons show them. */
export const PROVIDERS = ["google", "github"] as const;
export type Provider = (typeof PROVIDERS)[number];

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

/** What the sign-in page does when it opens: nothing special, finish a sign-in that just came back, or say that it did not work. */
export type Return = { kind: "none" } | { kind: "returning" } | { kind: "failed"; message: string };

/**
 * Reads the address the provider sends the person back to. A refusal never copies the provider's own words onto the page (they could be
 * anything): the message is always this fixed sentence.
 */
export function readReturn(search: string): Return {
  const params = new URLSearchParams(search);
  if (params.has("error") || params.has("error_description") || params.has("error_code")) {
    return { kind: "failed", message: "Sign-in did not finish, and nothing was saved. Please try again." };
  }
  if (params.has("code")) return { kind: "returning" };
  return { kind: "none" };
}
