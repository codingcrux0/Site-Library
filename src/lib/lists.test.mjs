// Tests for the named-list rules (src/lib/lists.ts): what a list may be called, and how lists that come from the network are checked
// before the page shows them. The same rules are enforced again in the database (supabase/lists.sql). Run with: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LIST_MAX, LIST_NAME_MAX, cleanListName, isListId, parseLists } from "./lists.ts";

const sql = readFileSync(new URL("../../supabase/lists.sql", import.meta.url), "utf8");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("a good name is accepted and tidied: trimmed, spaces folded", () => {
  const good = cleanListName("  For   my startup  ");
  assert.equal(good.ok, true);
  assert.equal(good.name, "For my startup");
});

test("the limits are the same numbers as in the database", () => {
  assert.equal(LIST_MAX, 10);
  assert.equal(LIST_NAME_MAX, 40);
  assert.match(sql, new RegExp(`between 1 and ${LIST_NAME_MAX}`));
  assert.match(sql, new RegExp(`>= ${LIST_MAX}`));
});

test("empty, spaces-only and too long names are refused with a plain sentence", () => {
  for (const bad of ["", "   ", "​​"]) {
    const result = cleanListName(bad);
    assert.equal(result.ok, false, JSON.stringify(bad));
    assert.match(result.error, /name/);
  }
  assert.equal(cleanListName("a".repeat(LIST_NAME_MAX)).ok, true);
  const long = cleanListName("a".repeat(LIST_NAME_MAX + 1));
  assert.equal(long.ok, false);
  assert.match(long.error, /40 characters or fewer/);
});

test("anything that is not text is refused", () => {
  for (const bad of [null, undefined, 42, {}, [], true]) assert.equal(cleanListName(bad).ok, false, String(bad));
});

test("invisible and control characters are removed (no hidden text, no direction tricks)", () => {
  const result = cleanListName("Work‮\u0000 tools\n");
  assert.equal(result.ok, true);
  assert.equal(result.name, "Work tools");
});

test("'Saved' is taken (it is the list of every bookmark), in any letter case", () => {
  for (const name of ["Saved", "saved", " SAVED "]) {
    const result = cleanListName(name);
    assert.equal(result.ok, false, name);
    assert.match(result.error, /Saved/);
  }
  assert.equal(cleanListName("Saved for later").ok, true);
  assert.match(sql, /'saved'/i);
});

test("a name already in use is refused, ignoring letter case, but a list may keep its own name", () => {
  const taken = cleanListName("work tools", ["Work Tools", "Reading"]);
  assert.equal(taken.ok, false);
  assert.match(taken.error, /already have a list/);
  assert.equal(cleanListName("Reading list", ["Work Tools", "Reading"]).ok, true);
  // Renaming list "Reading" to "reading" (only the capitals change) passes because the caller leaves its own name out of the list.
  assert.equal(cleanListName("reading", ["Work Tools"]).ok, true);
});

test("markup is kept as the characters it is: the page shows a name as text and never as markup", () => {
  const result = cleanListName("<b>bold</b>");
  assert.equal(result.ok, true);
  assert.equal(result.name, "<b>bold</b>");
});

test("isListId accepts a lowercase uuid and nothing else", () => {
  assert.equal(isListId(A), true);
  const withLetters = "abcdef12-abcd-4bcd-8bcd-abcdef123456";
  assert.equal(isListId(withLetters), true);
  for (const bad of ["", "abc", withLetters.toUpperCase(), `${A}x`, "<script>", null, 5, undefined]) assert.equal(isListId(bad), false, String(bad));
});

test("parseLists joins lists and their websites, oldest list first, and drops anything unbelievable", () => {
  const lists = parseLists(
    [
      { id: B, name: "Second", created_at: "2026-11-12T00:00:00Z" },
      { id: A, name: "  First  ", created_at: "2026-11-11T00:00:00Z" },
      { id: "nope", name: "Bad id", created_at: "2026-11-11T00:00:00Z" },
      { id: A.replace("1111", "3333"), name: "", created_at: "2026-11-11T00:00:00Z" },
      { id: A.replace("1111", "4444"), name: 5, created_at: "2026-11-11T00:00:00Z" },
      null,
      "text",
    ],
    [
      { list_id: A, site_id: "originkit" },
      { list_id: A, site_id: "layro" },
      { list_id: A, site_id: "originkit" }, // twice: shown once
      { list_id: A, site_id: "<script>" }, // bad site id
      { list_id: B, site_id: "layro" },
      { list_id: "99999999-9999-4999-8999-999999999999", site_id: "ghost" }, // belongs to no list
      null,
    ],
  );
  assert.deepEqual(lists, [
    { id: A, name: "First", sites: ["originkit", "layro"] },
    { id: B, name: "Second", sites: ["layro"] },
  ]);
});

test("parseLists never returns more than 10 lists, and bad input gives an empty answer", () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    name: `List ${i}`,
    created_at: `2026-11-11T00:00:${String(i).padStart(2, "0")}Z`,
  }));
  assert.equal(parseLists(rows, []).length, 10);
  for (const bad of [null, undefined, {}, "x", 5]) assert.deepEqual(parseLists(bad, bad), [], String(bad));
});
