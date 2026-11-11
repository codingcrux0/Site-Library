// Tests for the owner's review page: how the list the database sends back is checked before it is shown, and guards that the page stays
// private (not listed anywhere, no keys, no markup from reviews) and that the database file locks every function to the owner.
// Run with: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { OWNER_ROWS, parseOwnerReviews } from "./moderation.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = read("../../supabase/moderation.sql");
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const good = { user_id: U1, site_id: "originkit", body: "Clear and quick.", approved: false, created_at: "2026-11-11T10:20:30.123+00:00", author: "a@example.com" };

test("good rows are kept in the order sent: who wrote it, which website, the text, whether it is shown, the day", () => {
  const rows = parseOwnerReviews([good, { ...good, user_id: U2, site_id: "layro", approved: true, created_at: "2026-11-10T00:00:00Z" }]);
  assert.deepEqual(rows, [
    { userId: U1, siteId: "originkit", body: "Clear and quick.", approved: false, date: "2026-11-11", author: "a@example.com" },
    { userId: U2, siteId: "layro", body: "Clear and quick.", approved: true, date: "2026-11-10", author: "a@example.com" },
  ]);
});

test("rows that are not believable are dropped one at a time", () => {
  const bad = [
    { ...good, user_id: "nope" },
    { ...good, user_id: "abcdef12-abcd-4bcd-8bcd-abcdef123456".toUpperCase() },
    { ...good, site_id: "<script>" },
    { ...good, body: 5 },
    { ...good, body: "   " },
    { ...good, body: "x".repeat(601) },
    { ...good, approved: "yes" },
    { ...good, created_at: "yesterday" },
    null,
    "text",
    [],
  ];
  assert.deepEqual(parseOwnerReviews(bad), []);
  assert.equal(parseOwnerReviews([...bad, good]).length, 1);
});

test("the text is kept exactly as written (the page shows it as text, never as markup); the author is one plain line", () => {
  const [row] = parseOwnerReviews([{ ...good, body: "<img src=x onerror=alert(1)> stays text", author: "Name‮\u0000  with   gaps\n" }]);
  assert.equal(row.body, "<img src=x onerror=alert(1)> stays text");
  assert.equal(row.author, "Name with gaps");
  assert.equal(parseOwnerReviews([{ ...good, author: 42 }])[0].author, "");
  assert.equal(parseOwnerReviews([{ ...good, author: "a".repeat(500) }])[0].author.length, 120);
});

test("at most 200 rows are shown, and anything that is not a list gives an empty answer", () => {
  assert.equal(OWNER_ROWS, 200);
  assert.match(sql, new RegExp(`limit ${OWNER_ROWS}`));
  assert.equal(parseOwnerReviews(Array.from({ length: 300 }, () => good)).length, 200);
  for (const bad of [null, undefined, {}, "x", 5, { code: 401 }]) assert.deepEqual(parseOwnerReviews(bad), [], String(bad));
});

test("the database file locks every owner function to the owner, and the owners table to nobody", () => {
  for (const name of ["owner_reviews", "owner_set_review", "owner_delete_review"]) {
    const body = sql.slice(sql.indexOf(`function public.${name}(`));
    assert.ok(body.length > 0, `${name} is missing`);
    assert.match(body.slice(0, 700), /if not public\.is_owner\(\) then raise exception/, `${name} must refuse everyone who is not the owner`);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon, authenticated`), `${name}: revoke`);
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to authenticated`), `${name}: grant`);
  }
  assert.match(sql, /alter table public\.owners enable row level security/);
  assert.match(sql, /revoke all on public\.owners from anon, authenticated/);
  // The only policy the owners table may have is an explicit "no" (it says out loud what the missing grant already enforces).
  const policies = [...sql.matchAll(/create policy[^;]*on public\.owners[^;]*;/gi)].map((m) => m[0]);
  assert.ok(policies.length >= 1, "an explicit deny-all policy documents the intent (and clears the Supabase advisor note)");
  for (const policy of policies) assert.match(policy, /using \(false\)[\s\S]*with check \(false\)/, "an owners policy may only say no");
  // "Is this person the owner?" is used inside the owner functions only; the browser cannot call it (one less function exposed).
  assert.match(sql, /revoke all on function public\.is_owner\(\) from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant execute on function public\.is_owner/);
  assert.doesNotMatch(sql, /to anon/i, "a signed-out visitor is never given anything here");
  // Approving only counts for the exact text the owner read: if the author edits it in between, the approval is refused.
  assert.match(sql, /body = p_body/);
});

test("the owner page is private: not in the sitemap or robots.txt, no search listing, and nothing on the site links to it", () => {
  assert.ok(existsSync(new URL("../pages/admin.astro", import.meta.url)));
  const page = read("../pages/admin.astro");
  assert.match(page, /<meta[^>]*name="robots"[^>]*content="noindex, nofollow"/);
  assert.doesNotMatch(read("../../public/sitemap.xml") + read("../../public/robots.txt"), /admin/i);
  for (const file of ["library/LibraryPage.tsx", "library/AccountMenu.tsx", "SiteHeader.astro", "../pages/index.astro", "../pages/websites.astro", "../pages/privacy.astro", "../pages/terms.astro"]) {
    assert.doesNotMatch(read(`../components/${file}`), /\/admin/, `${file} must not link to the owner page`);
  }
});

test("the owner page only calls the three owner functions, holds no key, and shows reviews as text", () => {
  const source = read("../components/admin/AdminReviews.tsx");
  const calls = [...source.matchAll(/\.rpc\(\s*"([a-z_]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(calls)], ["owner_delete_review", "owner_reviews", "owner_set_review"]);
  assert.doesNotMatch(source, /\.from\(|\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|dangerouslySetInnerHTML|innerHTML/);
  assert.doesNotMatch(source, /sb_secret_|service_role|SERVICE|sb_publishable_/i);
  // An approval carries the text the owner read, so an edit made in between cannot slip through.
  assert.match(source, /p_body:/);
  assert.match(source, /whitespace-pre-line break-words/);
  // Anyone who is not the owner is refused by the database (permission denied); the page then shows its one sentence.
  assert.match(source, /code === "42501"/);
});
