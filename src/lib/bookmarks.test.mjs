// Tests for the bookmark rules (src/lib/bookmarks.ts) and for keeping them the same as the database rules (supabase/bookmarks.sql).
// Run with: npm test. The database rules themselves are tested by supabase/rls-test.sql (run in the Supabase SQL editor).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ENTRIES } from "../config/library.ts";
import { MAX_BOOKMARKS, SITE_ID_PATTERN, isSiteId, keepKnown } from "./bookmarks.ts";

const sql = readFileSync(new URL("../../supabase/bookmarks.sql", import.meta.url), "utf8");

test("every website in the list has an id the bookmark rule accepts", () => {
  for (const entry of ENTRIES) assert.ok(isSiteId(entry.id), `${entry.id} would be refused`);
});

test("isSiteId refuses anything that is not a short plain id", () => {
  for (const bad of ["", "A", "has space", "under_score", "dot.dot", "<script>", "a/b", "x".repeat(61), null, undefined, 5, {}, ["a"]]) {
    assert.equal(isSiteId(bad), false, String(bad));
  }
  for (const good of ["a", "21st-dev", "x".repeat(60)]) assert.equal(isSiteId(good), true, good);
});

test("the id rule in the page code is the same as the one in the database", () => {
  assert.ok(sql.includes(`'${SITE_ID_PATTERN.source}'`), `supabase/bookmarks.sql must contain the pattern ${SITE_ID_PATTERN.source}`);
});

test("the bookmark limit in the page code is the same as the one in the database", () => {
  assert.ok(sql.includes(`>= ${MAX_BOOKMARKS}`), `supabase/bookmarks.sql must stop at ${MAX_BOOKMARKS}`);
});

test("keepKnown drops saved ids that are no longer in the list, and repeats, and keeps the order", () => {
  const known = new Set(["a", "b", "c"]);
  assert.deepEqual(keepKnown(["c", "gone", "a", "c", "b"], known), ["c", "a", "b"]);
  assert.deepEqual(keepKnown([], known), []);
  assert.deepEqual(keepKnown(["x"], known), []);
});
