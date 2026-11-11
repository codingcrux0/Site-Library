// The named-list rules, as plain functions (so they can be tested without a browser or a database).
// Tests: src/lib/lists.test.mjs. The same rules are enforced again in the database (supabase/lists.sql), because the page can be edited by
// anyone: the database really decides, this file only gives people a friendly message first and checks what comes back.
import { isSiteId } from "./bookmarks.ts";

/** The most lists one person can make, and the longest list name. Must equal the numbers in supabase/lists.sql. */
export const LIST_MAX = 10;
export const LIST_NAME_MAX = 40;

/** "Saved" is the list of every bookmark, so no other list may use that name. */
const SAVED = "saved";

/** A list's id is made by the database (a lowercase uuid). */
export const LIST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isListId(value: unknown): value is string {
  return typeof value === "string" && LIST_ID_PATTERN.test(value);
}

export type CleanName = { ok: true; name: string } | { ok: false; error: string };

// One plain line: whitespace becomes single spaces, invisible and direction-changing characters go, and the ends are trimmed.
const tidy = (value: string): string =>
  value
    .replace(/\s+/g, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .trim();

/**
 * Tidy what the person typed and check it. `others` are the names of the person's OTHER lists (leave the list being renamed out, so it
 * may keep its own name). Returns the name to save, or one plain sentence saying what to change.
 */
export function cleanListName(value: unknown, others: readonly string[] = []): CleanName {
  if (typeof value !== "string") return { ok: false, error: "Please give the list a name." };
  const name = tidy(value);
  if (name === "") return { ok: false, error: "Please give the list a name." };
  if ([...name].length > LIST_NAME_MAX) return { ok: false, error: `Please keep the name to ${LIST_NAME_MAX} characters or fewer.` };
  if (name.toLowerCase() === SAVED) return { ok: false, error: "“Saved” already holds all your bookmarks. Please pick another name." };
  if (others.some((other) => other.toLowerCase() === name.toLowerCase())) return { ok: false, error: "You already have a list with that name." };
  return { ok: true, name };
}

export type MyList = { id: string; name: string; sites: string[] };

/**
 * Joins the person's lists with the websites in each, after checking what came back from the network: a bad id, a name that is not
 * believable, a website that is not a website id, one website twice, or an item that belongs to no list is dropped, one row at a time.
 * The oldest list comes first and there are never more than LIST_MAX.
 */
export function parseLists(listRows: unknown, itemRows: unknown): MyList[] {
  if (!Array.isArray(listRows)) return [];
  const found: { list: MyList; made: string }[] = [];
  for (const row of listRows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
    const { id, name, created_at } = row as Record<string, unknown>;
    if (!isListId(id) || typeof name !== "string" || typeof created_at !== "string") continue;
    const clean = cleanListName(name);
    if (clean.ok) found.push({ list: { id, name: clean.name, sites: [] }, made: created_at });
  }
  found.sort((a, b) => (a.made < b.made ? -1 : a.made > b.made ? 1 : 0));
  const lists = found.slice(0, LIST_MAX).map((entry) => entry.list);
  if (!Array.isArray(itemRows)) return lists;
  const byId = new Map(lists.map((list) => [list.id, list]));
  for (const row of itemRows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
    const { list_id, site_id } = row as Record<string, unknown>;
    const list = isListId(list_id) ? byId.get(list_id) : undefined;
    if (list && isSiteId(site_id) && !list.sites.includes(site_id)) list.sites.push(site_id);
  }
  return lists;
}
