// Tests for sign-in with Google and GitHub (src/lib/auth.ts), the sign-in page, and the guarantees around them (docs/AUTH-PLAN.md).
// Run with: npm test.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PROVIDERS, SUPABASE_URL, isProvider, readReturn } from "./auth.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../pages/sign-in.astro");
const config = read("../../astro.config.mjs");

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx|astro|mjs)$/.test(name) && !name.endsWith(".test.mjs") ? [path] : [];
  });
}

test("only Google and GitHub are sign-in providers, Google first", () => {
  assert.deepEqual([...PROVIDERS], ["google", "github"]);
});

test("isProvider accepts the two providers and nothing else", () => {
  assert.equal(isProvider("google"), true);
  assert.equal(isProvider("github"), true);
  for (const bad of ["Google", "facebook", "email", "", " google", "google ", null, undefined, 3, {}, ["google"]]) {
    assert.equal(isProvider(bad), false, String(bad));
  }
});

test("readReturn: a code in the address means the person is coming back from the provider", () => {
  assert.deepEqual(readReturn("?code=abc123"), { kind: "returning" });
  assert.deepEqual(readReturn(""), { kind: "none" });
  assert.deepEqual(readReturn("?foo=bar"), { kind: "none" });
});

test("readReturn: a refusal from the provider gives a fixed message, never the provider's own words", () => {
  const result = readReturn("?error=access_denied&error_description=%3Cscript%3Ealert(1)%3C%2Fscript%3E");
  assert.equal(result.kind, "failed");
  assert.ok(!/script|alert/i.test(result.message), result.message);
  assert.ok(result.message.length > 10);
});

test("the Supabase address is this project's own https address", () => {
  assert.match(SUPABASE_URL, /^https:\/\/[a-z0-9]{20}\.supabase\.co$/);
});

test("the Content Security Policy lets the page talk to this site and this one Supabase project only", () => {
  const line = config.match(/"connect-src[^"]*"/)?.[0];
  assert.equal(line, `"connect-src 'self' ${SUPABASE_URL}"`);
  assert.ok(!/\*/.test(line), "no wildcard allowed in connect-src");
});

test("the sign-in page has no password or email box (Google and GitHub only, so no password can ever exist here)", () => {
  assert.ok(!/type=["']password["']/.test(page), "found a password box");
  assert.ok(!/type=["']email["']/.test(page), "found an email box");
  assert.ok(!/Forgot password|Create account|Reset password/i.test(page), "found password-account wording");
});

test("the sign-in page shows two buttons, Google first and GitHub second", () => {
  const google = page.indexOf("'Google'");
  const github = page.indexOf("'GitHub'");
  assert.ok(google > 0 && github > google, "Google must come before GitHub");
  assert.ok(page.includes("data-provider"), "buttons must carry data-provider");
});

test("the Supabase library is loaded only when someone signs in (never at the top of a file), so no other page pays for it", () => {
  for (const file of sourceFiles(new URL("..", import.meta.url).pathname)) {
    const text = readFileSync(file, "utf8");
    assert.ok(!/^\s*import[^;]*from\s+["']@supabase\/supabase-js["']/m.test(text), `${file} imports Supabase at the top`);
  }
});

test("the real sign-in stays switched off unless the build says accounts are open (the legal gate)", () => {
  const script = read("../scripts/auth-form.ts");
  assert.match(script, /PUBLIC_ACCOUNTS_OPEN/);
  assert.match(script, /Accounts are not open yet/);
});

// A real Supabase secret key looks like sb_secret_ followed by a long run of letters and digits (the library's own code only contains the
// bare prefix, so that does not count). The old-style service key is a long token that starts eyJ and decodes to "service_role".
const REAL_SECRET = /sb_secret_[A-Za-z0-9_-]{16,}/;
const LEGACY_SERVICE_KEY = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;

test("the secret-key pattern really matches a secret key and ignores the library's own prefix check", () => {
  assert.ok(REAL_SECRET.test("sb_secret_AbCdEfGhIjKlMnOpQr12"));
  assert.ok(!REAL_SECRET.test("e.startsWith(`sb_secret_`)"));
});

test("no secret or service key is in the source code or in the built site", () => {
  const roots = [new URL("..", import.meta.url).pathname, new URL("../../dist", import.meta.url).pathname];
  let scanned = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|astro|mjs|js|html|css|json)$/.test(name) && !name.endsWith(".test.mjs")) {
        const text = readFileSync(path, "utf8");
        scanned++;
        assert.ok(!REAL_SECRET.test(text), `${path} contains a Supabase secret key`);
        assert.ok(!LEGACY_SERVICE_KEY.test(text), `${path} contains a long token (a service key?)`);
      }
    }
  };
  for (const root of roots) {
    try {
      walk(root);
    } catch (error) {
      if (error.code !== "ENOENT") throw error; // No dist/ folder yet is fine; the source is still scanned.
    }
  }
  assert.ok(scanned > 20, "too few files were scanned");
});
