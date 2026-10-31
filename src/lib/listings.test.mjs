// Tests for how the list turns websites into rows (src/lib/listings.ts): one website can sit in several categories and is judged in each,
// the tabs sort and filter the rows, and "Top user scored" falls back to our score when nobody has rated. Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { anyRated, arrange, listingsFor, placementCounts } from "./listings.ts";
import { matchesQuery } from "./search.ts";

const placement = (category, tags, score, extra = {}) => ({ category, tags, marks: [score - 3, 1, 1, 1], score, ...extra });
const site = (id, checkedOn, placements, extra = {}) => ({
  id,
  name: id.toUpperCase(),
  url: `https://${id}.example`,
  summary: `${id} words.`,
  theCatch: `${id} catch.`,
  checkedOn,
  placements,
  ...extra,
});
const rate = (...ratings) => ratings.map((rating, i) => ({ id: `f${i}`, author: "x", rating, date: "2026-10-01" }));

const entries = [
  // a: main in UI, also in Motion, where it has its own words, tags and score
  site("a", "2026-10-03", [
    placement("UI", ["React"], 16),
    placement("Motion", ["Loaders"], 12, { summary: "a motion words.", theCatch: "a motion catch." }),
  ]),
  // b: only UI, completely free (a free score judged on its own)
  site("b", "2026-10-01", [placement("UI", ["Vue"], 10, { free: { marks: [2, 5, 4, 3], score: 14 } })]),
  // c: only Motion
  site("c", "2026-10-02", [placement("Motion", ["Loaders", "Gestures"], 18)]),
];

test("placementCounts: counts websites per category, a website counts once in each category it is in", () => {
  const counts = placementCounts(entries);
  assert.equal(counts.get("UI"), 2);
  assert.equal(counts.get("Motion"), 2);
});

test("listingsFor with no category: one row per website, from its main (first) placement", () => {
  const rows = listingsFor(entries, "");
  assert.deepEqual(rows.map((r) => r.entry.id), ["a", "b", "c"]);
  const a = rows[0];
  assert.equal(a.category, "UI");
  assert.equal(a.score, 16);
  assert.equal(a.summary, "a words.");
  assert.deepEqual(a.alsoIn, ["Motion"]);
});

test("listingsFor with no category: the types are all of the website's types, once each", () => {
  const a = listingsFor(entries, "")[0];
  assert.deepEqual(a.tags, ["React", "Loaders"]);
});

test("listingsFor with a category: only the websites in it, each judged as that category's placement", () => {
  const rows = listingsFor(entries, "Motion");
  assert.deepEqual(rows.map((r) => r.entry.id), ["a", "c"]);
  const a = rows[0];
  assert.equal(a.category, "Motion");
  assert.equal(a.score, 12); // not 16: it is judged again inside Motion
  assert.deepEqual(a.tags, ["Loaders"]);
  assert.equal(a.summary, "a motion words.");
  assert.equal(a.theCatch, "a motion catch.");
  assert.deepEqual(a.alsoIn, ["UI"]);
});

test("a placement without its own words uses the website's words", () => {
  const c = listingsFor(entries, "Motion")[1];
  assert.equal(c.summary, "c words.");
  assert.equal(c.theCatch, "c catch.");
});

test("a category nobody is in gives no rows", () => {
  assert.deepEqual(listingsFor(entries, "Tools"), []);
});

test("search text covers the other categories too, and the search uses it", () => {
  const a = listingsFor(entries, "")[0];
  assert.ok(a.text.includes("motion"), "a is also in Motion, so a search for motion finds it");
  assert.equal(matchesQuery(a, "motion"), true);
  assert.equal(matchesQuery(a, "vue"), false);
});

test("arrange 'all': by name", () => {
  assert.deepEqual(arrange(listingsFor(entries, ""), "all").map((r) => r.entry.id), ["a", "b", "c"]);
});

test("arrange 'newest' and 'oldest': by the checked date", () => {
  const rows = listingsFor(entries, "");
  assert.deepEqual(arrange(rows, "newest").map((r) => r.entry.id), ["a", "c", "b"]);
  assert.deepEqual(arrange(rows, "oldest").map((r) => r.entry.id), ["b", "c", "a"]);
});

test("arrange 'top': highest score first, using the score of the category being looked at", () => {
  assert.deepEqual(arrange(listingsFor(entries, ""), "top").map((r) => r.entry.id), ["c", "a", "b"]);
  assert.deepEqual(arrange(listingsFor(entries, "Motion"), "top").map((r) => r.entry.id), ["c", "a"]);
});

test("arrange 'free': only completely free websites, best free score first", () => {
  const withFree = [
    ...entries,
    site("d", "2026-10-04", [placement("UI", ["React"], 12, { free: { marks: [3, 5, 5, 5], score: 18 } })]),
  ];
  assert.deepEqual(arrange(listingsFor(withFree, ""), "free").map((r) => r.entry.id), ["d", "b"]);
  assert.deepEqual(arrange(listingsFor(entries, "Motion"), "free"), []);
});

test("arrange 'user': rated websites first by average, then by how many rated; unrated ones follow our score", () => {
  const rated = [
    site("a", "2026-10-03", [placement("UI", ["React"], 16)], { feedback: rate(4, 4) }), // 4.0, two ratings
    site("b", "2026-10-01", [placement("UI", ["Vue"], 10)], { feedback: rate(5) }), // 5.0, one rating
    site("c", "2026-10-02", [placement("UI", ["React"], 18)]), // not rated: after the rated ones
    site("d", "2026-10-02", [placement("UI", ["React"], 17)]), // not rated, lower score than c
    site("e", "2026-10-02", [placement("UI", ["React"], 9)], { feedback: rate(4) }), // 4.0, one rating: after a (more ratings)
  ];
  assert.deepEqual(arrange(listingsFor(rated, ""), "user").map((r) => r.entry.id), ["b", "a", "e", "c", "d"]);
});

test("arrange 'user' with nobody rated: exactly the order of our score", () => {
  const rows = listingsFor(entries, "");
  assert.equal(anyRated(rows), false);
  assert.deepEqual(arrange(rows, "user").map((r) => r.entry.id), arrange(rows, "top").map((r) => r.entry.id));
});

test("anyRated: true as soon as one row has a valid rating", () => {
  const rows = listingsFor([site("a", "2026-10-03", [placement("UI", ["React"], 16)], { feedback: rate(3) })], "");
  assert.equal(anyRated(rows), true);
});

test("arrange never changes the rows it is given", () => {
  const rows = listingsFor(entries, "");
  const before = rows.map((r) => r.entry.id).join();
  arrange(rows, "top");
  arrange(rows, "newest");
  assert.equal(rows.map((r) => r.entry.id).join(), before);
});
