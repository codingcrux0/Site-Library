// The owner's review page, as plain functions (so they can be tested without a browser or a database). Tests: src/lib/moderation.test.mjs.
// What the database sends back for the owner is checked here again before the page shows it. WHO may see it is decided by the database
// (supabase/moderation.sql: every function refuses anyone who is not the owner), never by this file or the page.
import { SITE_ID_PATTERN } from "./bookmarks.ts";
import { REVIEW_MAX } from "./reviews.ts";

/** The most reviews the owner page lists, newest waiting ones first. Must equal the number in supabase/moderation.sql. */
export const OWNER_ROWS = 200;

const MAX_AUTHOR = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type OwnerReview = { userId: string; siteId: string; body: string; approved: boolean; date: string; author: string };

// One plain line: whitespace becomes single spaces, invisible and direction-changing characters go, and it is cut to MAX_AUTHOR letters.
const oneLine = (value: unknown): string =>
  typeof value !== "string"
    ? ""
    : Array.from(
        value
          .replace(/\s+/g, " ")
          .replace(/[\p{Cc}\p{Cf}]/gu, "")
          .trim(),
      )
        .slice(0, MAX_AUTHOR)
        .join("")
        .trim();

/** Turns the database's answer into rows, dropping anything unbelievable one row at a time. The text is kept exactly as written. */
export function parseOwnerReviews(json: unknown): OwnerReview[] {
  if (!Array.isArray(json)) return [];
  const rows: OwnerReview[] = [];
  for (const item of json) {
    if (rows.length >= OWNER_ROWS) break;
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const { user_id, site_id, body, approved, created_at, author } = item as Record<string, unknown>;
    if (typeof user_id !== "string" || !UUID.test(user_id)) continue;
    if (typeof site_id !== "string" || !SITE_ID_PATTERN.test(site_id)) continue;
    if (typeof body !== "string" || body.trim() === "" || [...body].length > REVIEW_MAX) continue;
    if (typeof approved !== "boolean" || typeof created_at !== "string") continue;
    const day = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(created_at)?.[1];
    if (day) rows.push({ userId: user_id, siteId: site_id, body, approved, date: day, author: oneLine(author) });
  }
  return rows;
}
