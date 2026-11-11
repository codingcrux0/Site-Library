// The account rules as plain functions, so they can be tested without a browser (src/lib/account.test.mjs):
// how a signed-in person's name and picture are shown, where the browser keeps the sign-in, and how the public star averages
// that arrive from the network are checked before the page believes them. Plan: docs/AUTH-PLAN.md.
import { SUPABASE_URL } from "../config/supabase.ts";
import { isSiteId } from "./bookmarks.ts";

/** Where Supabase's library keeps the sign-in in the browser (localStorage). Same rule as the library: sb-<project name>-auth-token. */
export function storageKeyFor(url: string): string {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}
export const STORAGE_KEY = storageKeyFor(SUPABASE_URL);

/**
 * True when this browser has a saved sign-in. The list page asks this first, so a visitor who never signed in does not download the
 * Supabase library at all. It does not prove the sign-in is still valid: the library checks that when it loads.
 */
export function hasStoredSession(store: Pick<Storage, "getItem"> | null | undefined): boolean {
  try {
    return !!store?.getItem(STORAGE_KEY);
  } catch {
    return false; // storage blocked (private mode, blocked cookies): treat as signed out
  }
}

export type Profile = { name: string; initial: string; avatar: string | null };

// The only picture hosts we ever load from (the CSP allows exactly these two, astro.config.mjs). Exact names: a host that merely STARTS
// with one of them is a different website.
const AVATAR_HOSTS = ["lh3.googleusercontent.com", "avatars.githubusercontent.com"];
const MAX_NAME = 40;

const text = (value: unknown): string => (typeof value === "string" ? value : "");

// One plain line: whitespace becomes single spaces, invisible and direction-changing characters go, and it is cut to MAX_NAME letters.
function cleanName(value: unknown): string {
  return Array.from(
    text(value)
      .replace(/\s+/g, " ")
      .replace(/[\p{Cc}\p{Cf}]/gu, "")
      .trim(),
  )
    .slice(0, MAX_NAME)
    .join("")
    .trim();
}

function safeAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const ok = url.protocol === "https:" && AVATAR_HOSTS.includes(url.hostname) && !url.username && !url.password && !url.port;
    return ok ? url.href : null;
  } catch {
    return null;
  }
}

type SomeUser = { email?: string | null; user_metadata?: Record<string, unknown> | null };

/** What to show for a signed-in person: a name, one letter for when there is no picture, and a safe picture address (or null). */
export function profileOf(user: SomeUser): Profile {
  const meta = user.user_metadata ?? {};
  const name =
    [meta.full_name, meta.name, meta.user_name, meta.preferred_username, text(user.email).split("@")[0]].map(cleanName).find(Boolean) ?? "Account";
  const initial = (Array.from(name)[0] ?? "A").toUpperCase();
  return { name, initial, avatar: safeAvatar(meta.avatar_url) ?? safeAvatar(meta.picture) };
}

/** The public numbers for one website: how many ratings, the average, and how many gave one star ... five stars. */
export type RatingSummary = { count: number; average: number; counts: number[] };

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;

/**
 * Turns the rows from the database's public "rating_summary" view into a map. Rows that are not believable are skipped, one at a time
 * (a bad id, a count that is not a whole number, an average outside 1 to 5, five counts that do not add up to the total), and anything that
 * is not a list gives an empty map. Whatever the network sends, the page never shows a number that cannot be real.
 */
export function parseSummaries(json: unknown): Map<string, RatingSummary> {
  const map = new Map<string, RatingSummary>();
  if (!Array.isArray(json)) return map;
  for (const item of json) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const counts = [row.c1, row.c2, row.c3, row.c4, row.c5];
    if (!isSiteId(row.site_id) || !isCount(row.count) || row.count < 1 || !counts.every(isCount)) continue;
    if (counts.reduce((sum: number, n) => sum + (n as number), 0) !== row.count) continue;
    if (typeof row.average !== "number" || !(row.average >= 1 && row.average <= 5)) continue;
    map.set(row.site_id, { count: row.count, average: row.average, counts: counts as number[] });
  }
  return map;
}
