// The written-review rules, as plain functions (so they can be tested without a browser or a database).
// Tests: src/lib/reviews.test.mjs. The same rules are enforced again in the database (supabase/reviews.sql), because the page can be
// edited by anyone: the database really decides, this file only gives people a friendly message first and checks what comes back.
import { isSiteId } from "./bookmarks.ts";

/** Fewest and most characters in a review. Must equal the numbers in supabase/reviews.sql. */
export const REVIEW_MIN = 10;
export const REVIEW_MAX = 600;

/** The most reviews shown for one website in the panel. */
export const REVIEWS_SHOWN = 50;

/**
 * A web address in a review: "http://", "https://", "www.", or a word ending in a common address ending (.com, .io ...).
 * Reviews are plain text, so a link can never be used to advertise. The very same pattern is in supabase/reviews.sql (a test checks that).
 */
export const LINK_PATTERN = /(https?:\/\/|www\.|[a-z0-9]\.(com|net|org|io|in|co|app|dev|me|ly|xyz|info|ai)([^a-z]|$))/i;

export type CleanReview = { ok: true; text: string } | { ok: false; error: string };

/** Tidy what the person typed and check it. Returns the text to save, or one plain sentence saying what to change. */
export function cleanReview(value: unknown): CleanReview {
  if (typeof value !== "string") return { ok: false, error: "Please write your review first." };
  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    // Invisible and control characters can hide text or flip its direction; only the line break stays.
    .replace(/[\p{Cc}\p{Cf}]/gu, (character) => (character === "\n" ? character : ""))
    .replace(/ {2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const length = [...text].length;
  if (length < REVIEW_MIN) return { ok: false, error: `Please write at least ${REVIEW_MIN} characters.` };
  if (length > REVIEW_MAX) return { ok: false, error: `Please keep it to ${REVIEW_MAX} characters or fewer.` };
  if (LINK_PATTERN.test(text)) return { ok: false, error: "Please leave out web addresses. Reviews are plain text." };
  return { ok: true, text };
}

export type PublicReview = { text: string; date: string };

/** What the public review list sends back, checked again before use: only the text and the day, never a name, at most REVIEWS_SHOWN. */
export function parsePublicReviews(json: unknown): PublicReview[] {
  if (!Array.isArray(json)) return [];
  const reviews: PublicReview[] = [];
  for (const row of json) {
    if (reviews.length >= REVIEWS_SHOWN) break;
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
    const { body, created_at } = row as Record<string, unknown>;
    if (typeof body !== "string" || typeof created_at !== "string") continue;
    const text = body.trim();
    if (text === "" || [...text].length > REVIEW_MAX) continue;
    const day = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(created_at)?.[1];
    if (day) reviews.push({ text, date: day });
  }
  return reviews;
}

export type MyReview = { body: string; approved: boolean };

/** The person's own reviews, keyed by website. `approved` says whether the owner has approved it for everyone to see. */
export function parseMine(json: unknown): Map<string, MyReview> {
  const mine = new Map<string, MyReview>();
  if (!Array.isArray(json)) return mine;
  for (const row of json) {
    if (typeof row !== "object" || row === null) continue;
    const { site_id, body, approved } = row as Record<string, unknown>;
    if (isSiteId(site_id) && typeof body === "string" && body !== "" && typeof approved === "boolean") mine.set(site_id, { body, approved });
  }
  return mine;
}
