// The bookmark rules, as plain functions (so they can be tested without a browser or a database).
// Tests: src/lib/bookmarks.test.mjs. The same two rules are enforced again in the database (supabase/bookmarks.sql), because the page
// can be edited by anyone: the database is the one that really decides, this file only gives people a friendly message first.

/** Lowercase letters, digits and dashes, 1 to 60 long (every website id in src/config/library.ts fits). Must equal the pattern in bookmarks.sql. */
export const SITE_ID_PATTERN = /^[a-z0-9-]{1,60}$/;

/** The most bookmarks one person can keep. Must equal the number in bookmarks.sql. */
export const MAX_BOOKMARKS = 500;

export function isSiteId(value: unknown): value is string {
  return typeof value === "string" && SITE_ID_PATTERN.test(value);
}

/** From the saved ids, keep the ones still in the list, once each, in the saved order (a website may be removed from the list later). */
export function keepKnown(saved: readonly string[], known: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const id of saved) {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      kept.push(id);
    }
  }
  return kept;
}
