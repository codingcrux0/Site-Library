// Tests for the counter's rules (worker/visits-rules.mjs). Run with: npm test
// Written BEFORE the code, so each test says what the counter must do.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createBrake, decide, isRobot, isSameSite } from "./visits-rules.mjs";

// A small helper: build the "get a header by name" function the rules expect.
const headers = (obj = {}) => {
  const lower = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
  return (name) => lower[name.toLowerCase()] ?? null;
};
const PERSON = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/156.0 Safari/537.36";
const open = () => true; // a brake that always allows
const shut = () => false; // a brake that always refuses

test("robots are recognised, people are not", () => {
  for (const ua of ["Mozilla/5.0 HeadlessChrome/156", "Googlebot/2.1", "curl/8.4", "python-requests/2.31", "Lighthouse", "node-fetch", "Playwright"]) {
    assert.equal(isRobot(ua), true, ua);
  }
  assert.equal(isRobot(PERSON), false);
  assert.equal(isRobot(null), false); // no user agent at all: treated as unknown, not as a robot
});

test("same-site check: our own pages pass, other websites do not", () => {
  assert.equal(isSameSite({ fetchSite: "same-origin", origin: null, host: "a.dev" }), true);
  assert.equal(isSameSite({ fetchSite: "cross-site", origin: null, host: "a.dev" }), false);
  assert.equal(isSameSite({ fetchSite: "same-site", origin: null, host: "a.dev" }), false);
  assert.equal(isSameSite({ fetchSite: null, origin: "https://a.dev", host: "a.dev" }), true);
  assert.equal(isSameSite({ fetchSite: null, origin: "https://evil.example", host: "a.dev" }), false);
  assert.equal(isSameSite({ fetchSite: null, origin: "not a url", host: "a.dev" }), false);
  assert.equal(isSameSite({ fetchSite: null, origin: null, host: "a.dev" }), true); // no header = not a browser page; other rules decide
});

test("brake: allows a burst up to the limit, refuses the next, and recovers", () => {
  let clock = 0;
  const brake = createBrake(3, 1000, () => clock);
  assert.deepEqual([brake(), brake(), brake(), brake()], [true, true, true, false]);
  clock = 999;
  assert.equal(brake(), false); // still inside the window
  clock = 1001;
  assert.equal(brake(), true); // the first three have expired
});

test("decide: reading never counts", () => {
  assert.deepEqual(decide("GET", headers({ "user-agent": PERSON }), open), { status: 200, count: false });
});

test("decide: a real browser page load counts", () => {
  const h = headers({ "user-agent": PERSON, "sec-fetch-site": "same-origin", host: "a.dev" });
  assert.deepEqual(decide("POST", h, open), { status: 200, count: true });
});

test("decide: robots get the number but do not count", () => {
  const h = headers({ "user-agent": "HeadlessChrome/156", "sec-fetch-site": "same-origin" });
  assert.deepEqual(decide("POST", h, open), { status: 200, count: false });
});

test("decide: another website may not add to the count (403)", () => {
  const h = headers({ "user-agent": PERSON, "sec-fetch-site": "cross-site" });
  assert.deepEqual(decide("POST", h, open), { status: 403, count: false });
});

test("decide: when the brake says stop, the request is answered but not counted", () => {
  const h = headers({ "user-agent": PERSON, "sec-fetch-site": "same-origin" });
  assert.deepEqual(decide("POST", h, shut), { status: 200, count: false });
});

test("decide: the brake is only used up by requests that would otherwise count", () => {
  let used = 0;
  const counting = () => (used++, true);
  decide("GET", headers({ "user-agent": PERSON }), counting);
  decide("POST", headers({ "user-agent": "curl/8" }), counting);
  decide("POST", headers({ "user-agent": PERSON, "sec-fetch-site": "cross-site" }), counting);
  assert.equal(used, 0);
});

test("decide: other methods are refused (405)", () => {
  for (const method of ["PUT", "DELETE", "PATCH", "HEAD"]) {
    assert.deepEqual(decide(method, headers({ "user-agent": PERSON }), open), { status: 405, count: false }, method);
  }
});
