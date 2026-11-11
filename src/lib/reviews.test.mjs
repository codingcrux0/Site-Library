// Tests for the written-review rules (src/lib/reviews.ts): what a review may contain, and how reviews that come from the network are
// checked before the page shows them. The same rules are enforced again in the database (supabase/reviews.sql). Run with: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LINK_PATTERN, REVIEW_MAX, REVIEW_MIN, cleanReview, parseMine, parsePublicReviews } from "./reviews.ts";

const sql = readFileSync(new URL("../../supabase/reviews.sql", import.meta.url), "utf8");

test("a good review is accepted and tidied: trimmed, spaces folded, at most one blank line", () => {
  const good = cleanReview("  Clear and quick.   It did what I needed.\n\n\n\nWould use again.  ");
  assert.equal(good.ok, true);
  assert.equal(good.text, "Clear and quick. It did what I needed.\n\nWould use again.");
});

test("too short and too long are refused with a plain sentence, using the same numbers as the database", () => {
  assert.equal(REVIEW_MIN, 10);
  assert.equal(REVIEW_MAX, 600);
  assert.match(sql, new RegExp(`char_length\\(body\\) between ${REVIEW_MIN} and ${REVIEW_MAX}`));
  const short = cleanReview("Too short");
  assert.equal(short.ok, false);
  assert.match(short.error, /at least 10 characters/);
  assert.equal(cleanReview("a".repeat(REVIEW_MAX)).ok, true);
  const long = cleanReview("a".repeat(REVIEW_MAX + 1));
  assert.equal(long.ok, false);
  assert.match(long.error, /600 characters or fewer/);
  // Spaces alone do not count as writing.
  assert.equal(cleanReview(" ".repeat(50)).ok, false);
});

test("anything that is not text is refused", () => {
  for (const bad of [null, undefined, 42, {}, [], true]) assert.equal(cleanReview(bad).ok, false, String(bad));
});

test("web addresses are refused (reviews are plain text), and the page and database use the very same pattern", () => {
  for (const text of [
    "Great, see https://example.org for more",
    "Great, see http://example.org for more",
    "Great, see www.example.org for more",
    "Great, see example.com for more",
    "Great, see EXAMPLE.COM/page for more",
    "Great, see my-site.io for more",
    "Great, see mysite.app for more",
  ]) {
    const result = cleanReview(text);
    assert.equal(result.ok, false, text);
    assert.match(result.error, /web addresses/, text);
  }
  // Ordinary writing is not caught by mistake.
  for (const text of ["It works with Next.js and Node.js really well.", "Rated 4.5 out of 5. Fast and simple.", "No sign-in needed, simple."]) {
    assert.equal(cleanReview(text).ok, true, text);
  }
  assert.ok(sql.includes(LINK_PATTERN.source), "supabase/reviews.sql must use the same link pattern as src/lib/reviews.ts");
});

test("invisible and control characters are removed (no hidden text, no direction tricks)", () => {
  const result = cleanReview("Looks good​ and ‮works\u0000 fine");
  assert.equal(result.ok, true);
  assert.equal(result.text, "Looks good and works fine");
});

test("markup is not special: it is kept as the characters it is, and the page shows it as text", () => {
  const result = cleanReview("<img src=x onerror=alert(1)> is not allowed to run");
  assert.equal(result.ok, true);
  assert.equal(result.text, "<img src=x onerror=alert(1)> is not allowed to run");
});

test("parsePublicReviews keeps good rows (text and day only, never a name) and drops anything unbelievable", () => {
  const rows = [
    { body: "Clear and quick.", created_at: "2026-11-11T10:20:30.123+00:00" },
    { body: "  Second one  ", created_at: "2026-11-10T00:00:00Z" },
    { body: "", created_at: "2026-11-10T00:00:00Z" },
    { body: "x".repeat(601), created_at: "2026-11-10T00:00:00Z" },
    { body: 5, created_at: "2026-11-10T00:00:00Z" },
    { body: "no date", created_at: "yesterday" },
    { body: "no date either" },
    null,
    "text",
    [],
  ];
  const parsed = parsePublicReviews(rows);
  assert.deepEqual(parsed, [
    { text: "Clear and quick.", date: "2026-11-11" },
    { text: "Second one", date: "2026-11-10" },
  ]);
  for (const bad of [null, undefined, {}, "x", 5, { code: 401 }]) assert.deepEqual(parsePublicReviews(bad), [], String(bad));
});

test("parsePublicReviews shows at most 50 reviews", () => {
  const rows = Array.from({ length: 80 }, (_, i) => ({ body: `Review number ${i}`, created_at: "2026-11-11T00:00:00Z" }));
  assert.equal(parsePublicReviews(rows).length, 50);
});

test("parseMine reads the person's own reviews, keyed by website, with whether the owner has approved each", () => {
  const map = parseMine([
    { site_id: "originkit", body: "Mine.", approved: false },
    { site_id: "layro", body: "Also mine.", approved: true },
    { site_id: "<script>", body: "bad id", approved: true },
    { site_id: "ok", body: "", approved: true },
    { site_id: "ok2", body: "x", approved: "yes" },
    null,
  ]);
  assert.deepEqual([...map.keys()], ["originkit", "layro"]);
  assert.deepEqual(map.get("originkit"), { body: "Mine.", approved: false });
  assert.deepEqual(map.get("layro"), { body: "Also mine.", approved: true });
  assert.equal(parseMine("nope").size, 0);
});
