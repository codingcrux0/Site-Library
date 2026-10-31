// Tests that the safety settings (D37) cannot be removed by accident: the response headers, the Content Security Policy, the worker's own
// headers, robots.txt and the rule that .env is never committed. They read the settings files as text. Run with: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const headers = read("public/_headers");
const astroConfig = read("astro.config.mjs");
const worker = read("worker/index.mjs");

test("_headers: every page gets the standard safety headers", () => {
  for (const name of [
    "X-Content-Type-Options: nosniff",
    "X-Frame-Options: SAMEORIGIN",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Strict-Transport-Security: max-age=31536000",
    "Cross-Origin-Opener-Policy: same-origin",
  ]) {
    assert.ok(headers.includes(name), `${name} is missing from public/_headers`);
  }
  assert.match(headers, /Permissions-Policy: .*camera=\(\)/);
});

test("_headers: pages cannot be shown inside another website's frame (the part of the policy a <meta> tag cannot do)", () => {
  assert.match(headers, /Content-Security-Policy: frame-ancestors 'self'/);
});

test("astro.config: the Content Security Policy is on, scripts are limited to this site's own, and nothing outside may load", () => {
  assert.match(astroConfig, /csp:\s*\{/);
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "connect-src 'self'"]) {
    assert.ok(astroConfig.includes(directive), `${directive} is missing from the policy`);
  }
  // Scripts must stay on fingerprints (Astro's default): no way to say "allow any inline script" or "allow eval".
  assert.ok(!/unsafe-eval/.test(astroConfig), "unsafe-eval must never be allowed");
  assert.ok(!/scriptDirective/.test(astroConfig), "do not override the script rules: they must stay fingerprint-only");
  assert.ok(!/default-src[^"']*https?:/.test(astroConfig), "no outside website may be allowed by default");
});

test("the worker's answers carry the safety headers too", () => {
  for (const name of ["x-content-type-options", "x-frame-options", "referrer-policy", "strict-transport-security", "cache-control"]) {
    assert.ok(worker.includes(`"${name}"`), `${name} is missing from worker/index.mjs`);
  }
});

test("robots.txt: crawlers may read the pages but not the counter, and it points to the sitemap", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/site-library\.codingcrux0\.workers\.dev\/sitemap\.xml/);
});

test("sitemap.xml: lists the home page and the list, not the sign-in page", () => {
  const sitemap = read("public/sitemap.xml");
  assert.ok(sitemap.includes("<loc>https://site-library.codingcrux0.workers.dev/</loc>"));
  assert.ok(sitemap.includes("<loc>https://site-library.codingcrux0.workers.dev/websites/</loc>"));
  assert.ok(!sitemap.includes("sign-in"));
});

test(".gitignore keeps .env (and its variants) out of the repository", () => {
  const ignore = read(".gitignore").split("\n").map((line) => line.trim());
  assert.ok(ignore.includes(".env"), ".env must be listed in .gitignore");
  assert.ok(ignore.some((line) => line.startsWith(".env.") || line === ".env*"), ".env.* variants must be ignored (.env.example is the one allowed exception)");
});
