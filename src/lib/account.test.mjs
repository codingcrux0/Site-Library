// Tests for the account rules (src/lib/account.ts): what the signed-in person's name and picture look like, where the saved sign-in lives,
// and how the public star averages from the network are checked before the page trusts them. Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { SUPABASE_URL } from "./auth.ts";
import { STORAGE_KEY, hasStoredSession, parseSummaries, profileOf, storageKeyFor } from "./account.ts";

test("the saved-sign-in key is the one Supabase's library uses (sb-<project>-auth-token)", () => {
  assert.equal(storageKeyFor("https://abcdefgh.supabase.co"), "sb-abcdefgh-auth-token");
  assert.equal(STORAGE_KEY, storageKeyFor(SUPABASE_URL));
});

test("hasStoredSession is true only when the saved sign-in key holds something", () => {
  const store = (entries) => ({ getItem: (key) => (key in entries ? entries[key] : null) });
  assert.equal(hasStoredSession(store({ [STORAGE_KEY]: '{"access_token":"x"}' })), true);
  assert.equal(hasStoredSession(store({})), false);
  assert.equal(hasStoredSession(store({ [STORAGE_KEY]: "" })), false);
  assert.equal(hasStoredSession(store({ "sb-other-auth-token": "x" })), false);
  // A browser that refuses storage (private mode, blocked cookies) must not crash the page.
  assert.equal(hasStoredSession({ getItem: () => { throw new Error("blocked"); } }), false);
  assert.equal(hasStoredSession(null), false);
});

test("profileOf: the name comes from the provider, falls back to the email's first part, then to 'Account'", () => {
  assert.equal(profileOf({ user_metadata: { full_name: "Aditya Rai" } }).name, "Aditya Rai");
  assert.equal(profileOf({ user_metadata: { name: "Only Name" } }).name, "Only Name");
  assert.equal(profileOf({ user_metadata: { user_name: "codingcrux0" } }).name, "codingcrux0");
  assert.equal(profileOf({ email: "someone@example.com", user_metadata: {} }).name, "someone");
  assert.equal(profileOf({}).name, "Account");
  assert.equal(profileOf({ user_metadata: { full_name: "   " } }).name, "Account");
});

test("profileOf: a name is plain text, one line, and not too long", () => {
  const long = profileOf({ user_metadata: { full_name: "A".repeat(200) } }).name;
  assert.ok(long.length <= 40, "cut to 40 characters");
  assert.equal(profileOf({ user_metadata: { full_name: "Line\none\ttwo" } }).name, "Line one two");
  assert.equal(profileOf({ user_metadata: { full_name: "Zero​Width‮RTL" } }).name, "ZeroWidthRTL", "invisible direction tricks are removed");
  // It is returned as text and rendered as text by the page, so markup is not special here: it stays as the characters it is.
  assert.equal(profileOf({ user_metadata: { full_name: "<img src=x onerror=alert(1)>" } }).name, "<img src=x onerror=alert(1)>");
  // A value that is not a string (someone edited their own profile data) is ignored.
  assert.equal(profileOf({ user_metadata: { full_name: { a: 1 } } }).name, "Account");
  assert.equal(profileOf({ user_metadata: { full_name: 42 } }).name, "Account");
});

test("profileOf: the initial is the first letter, upper case", () => {
  assert.equal(profileOf({ user_metadata: { full_name: "aditya rai" } }).initial, "A");
  assert.equal(profileOf({ user_metadata: { full_name: "  éclair" } }).initial, "É");
  assert.equal(profileOf({}).initial, "A");
});

test("profileOf: only a Google or GitHub picture over https is used, anything else is dropped", () => {
  const avatar = (url) => profileOf({ user_metadata: { avatar_url: url } }).avatar;
  assert.equal(avatar("https://lh3.googleusercontent.com/a/abc=s96-c"), "https://lh3.googleusercontent.com/a/abc=s96-c");
  assert.equal(avatar("https://avatars.githubusercontent.com/u/123?v=4"), "https://avatars.githubusercontent.com/u/123?v=4");
  assert.equal(profileOf({ user_metadata: { picture: "https://lh3.googleusercontent.com/a/x" } }).avatar, "https://lh3.googleusercontent.com/a/x");
  for (const bad of [
    "http://lh3.googleusercontent.com/a/abc", // not https
    "https://evil.example/a.png", // not an allowed host
    "https://lh3.googleusercontent.com.evil.example/a.png", // allowed name as a prefix of another host
    "https://evil.example/https://lh3.googleusercontent.com/a.png",
    "https://user@evil.example/",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//lh3.googleusercontent.com/a",
    "",
    42,
    null,
    undefined,
  ]) {
    assert.equal(avatar(bad), null, String(bad));
  }
});

const row = (site_id, counts, average) => {
  const [c1, c2, c3, c4, c5] = counts;
  return { site_id, count: counts.reduce((a, b) => a + b, 0), average, c1, c2, c3, c4, c5 };
};

test("parseSummaries keeps good rows from the network, keyed by website", () => {
  const map = parseSummaries([row("originkit", [0, 0, 1, 1, 2], 4.0), row("layro", [1, 0, 0, 0, 0], 1)]);
  assert.equal(map.size, 2);
  assert.deepEqual(map.get("originkit"), { count: 4, average: 4, counts: [0, 0, 1, 1, 2] });
  assert.deepEqual(map.get("layro"), { count: 1, average: 1, counts: [1, 0, 0, 0, 0] });
});

test("parseSummaries drops anything that is not a believable row (the page never trusts the network)", () => {
  const good = row("ok", [0, 0, 0, 0, 1], 5);
  const bad = [
    { ...good, site_id: "<script>" },
    { ...good, site_id: "UPPER" },
    { ...good, site_id: 7 },
    { ...good, count: 0 },
    { ...good, count: 1.5 },
    { ...good, count: "1" },
    { ...good, average: 0 },
    { ...good, average: 5.1 },
    { ...good, average: "4" },
    { ...good, average: Number.NaN },
    { ...good, c5: -1 },
    { ...good, c5: 2 }, // the five counts must add up to the total
    { ...good, c1: "0" },
    null,
    "text",
    42,
    [],
  ];
  const map = parseSummaries([good, ...bad]);
  assert.deepEqual([...map.keys()], ["ok"]);
});

test("parseSummaries gives an empty map for anything that is not a list", () => {
  for (const bad of [null, undefined, {}, "x", 5, { code: 401, message: "nope" }]) {
    assert.equal(parseSummaries(bad).size, 0, String(bad));
  }
});
