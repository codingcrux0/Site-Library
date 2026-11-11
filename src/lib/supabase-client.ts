// The one Supabase client. It is created only when someone signs in or comes back from signing in, and the library is loaded then
// ("import()" below), so no other page downloads it. PKCE is the safe browser flow: the sign-in code in the address is useless without
// the secret the browser made at the start. Plan: docs/AUTH-PLAN.md.
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../config/supabase";

async function create() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  });
}

let client: ReturnType<typeof create> | undefined;

export function getSupabase() {
  client ??= create();
  return client;
}
