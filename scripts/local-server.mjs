// Local stand-in for the live site. Run it with `npm run local`.
// It does two things, using only what ships with Node (no packages):
//   1. serves the built site from dist/
//   2. runs the visitor counter at /api/visits (the home page header reads it)
//
// This is for YOUR COMPUTER ONLY. When the site is hosted, Cloudflare serves the files and a small
// Cloudflare function must answer /api/visits instead (DECISIONS.md D12 describes exactly what it must do).
//
// The counter's contract:
//   GET  /api/visits  ->  { "total": 123 }          just read the number
//   POST /api/visits  ->  { "total": 124 }          count this browser if it has not been counted before, return the number
//
// Counting UNIQUE browsers (owner's decision, DECISIONS.md D15): the first time a browser POSTs, it has no
// "visited" cookie, so it is counted and given one. The cookie's value is just "1": no ID, no personal data,
// the same for everyone. It only means "this browser was already counted". Next visits carry it, so are not counted.
// It counts browsers, not people: two devices count twice, and clearing cookies or a private window counts again.
// Robots and automated test browsers are skipped (see ROBOT below).
// The only thing stored on the server is one whole number in .data/visits.json. No IP addresses, no per-visitor data.

import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const HOST = "127.0.0.1"; // this computer only: other devices on your wifi cannot reach it
const PORT = Number(process.env.PORT) || 4321;
const DATA_FILE = process.env.VISITS_FILE || join(ROOT, ".data", "visits.json");

// ---------- the counter ----------

function loadTotal() {
  if (!existsSync(DATA_FILE)) return 0;
  const saved = JSON.parse(readFileSync(DATA_FILE, "utf8")); // a damaged file stops the server, so a real count is never silently reset to 0
  if (!Number.isSafeInteger(saved.total) || saved.total < 0) throw new Error(`${DATA_FILE} does not hold a valid total`);
  return saved.total;
}

let total = loadTotal();

function saveTotal() {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  // Write a temporary file, then swap it in, so a crash half-way can never leave a broken file.
  const temporary = `${DATA_FILE}.tmp`;
  writeFileSync(temporary, JSON.stringify({ total }));
  renameSync(temporary, DATA_FILE);
}

// Basic abuse brake: the same address can add at most one count every 2 seconds. Kept in memory only,
// never written to disk, and forgotten after a minute.
const lastCounted = new Map();
const MIN_GAP_MS = 2000;

function mayCount(address) {
  const now = Date.now();
  for (const [key, time] of lastCounted) if (now - time > 60_000) lastCounted.delete(key);
  if (now - (lastCounted.get(address) ?? 0) < MIN_GAP_MS) return false;
  lastCounted.set(address, now);
  return true;
}

// Robots and automated test browsers are not people, so they are never counted (and never get the cookie).
// This is a simple name check, not proof: a robot that pretends to be a normal browser would still be counted.
const ROBOT = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|lighthouse|curl|wget|python-requests|node-fetch|undici/i;

function isRobot(request) {
  return ROBOT.test(request.headers["user-agent"] ?? "");
}

// Only our own pages may add to the count. Browsers always say where a request came from; if it was another website, refuse.
function isSameSite(request) {
  const fetchSite = request.headers["sec-fetch-site"];
  if (fetchSite && fetchSite !== "same-origin") return false;
  const origin = request.headers.origin;
  if (origin) {
    try {
      return new URL(origin).host === request.headers.host;
    } catch {
      return false;
    }
  }
  return true;
}

const COMMON_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
};

// The "already counted" cookie. Value "1" for everyone. HttpOnly: page scripts cannot read it. SameSite=Lax:
// it is only sent for our own site. Secure is added when the request came over https (a hosted site must be https).
const COOKIE_NAME = "visited";
const COOKIE_DAYS = 365;

function hasCookie(request) {
  return (request.headers.cookie ?? "").split(";").some((part) => part.trim() === `${COOKIE_NAME}=1`);
}

function cookieHeader(request) {
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${COOKIE_NAME}=1; Max-Age=${COOKIE_DAYS * 86400}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function sendJson(response, status, body, extra = {}) {
  response.writeHead(status, { ...COMMON_HEADERS, "content-type": "application/json", "cache-control": "no-store", ...extra });
  response.end(JSON.stringify(body));
}

function handleVisits(request, response) {
  if (request.method === "GET") return sendJson(response, 200, { total });
  if (request.method === "POST") {
    request.resume(); // we never read a request body
    if (!isSameSite(request)) return sendJson(response, 403, { error: "cross-site request refused" });
    // Already counted before (has the cookie), or not a person: change nothing and set nothing.
    if (hasCookie(request) || isRobot(request)) return sendJson(response, 200, { total });
    // New browser: count it and give it the cookie. (If the abuse brake says no, no cookie is given, so a real visitor is counted next time.)
    if (!mayCount(request.socket.remoteAddress ?? "unknown")) return sendJson(response, 200, { total });
    total += 1;
    saveTotal();
    return sendJson(response, 200, { total }, { "set-cookie": cookieHeader(request) });
  }
  return sendJson(response, 405, { error: "use GET or POST" }, { allow: "GET, POST" });
}

// ---------- the static files ----------

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function sendText(response, status, text) {
  response.writeHead(status, { ...COMMON_HEADERS, "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

function findFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const target = resolve(DIST, "." + decoded);
  // Path-trick guard: whatever was asked for must still be inside dist/ (blocks things like /../../.env).
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  for (const candidate of [target, join(target, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function handleStatic(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") return sendText(response, 405, "Method not allowed");
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const file = findFile(pathname);
  if (!file) return sendText(response, 404, "Not found");

  const immutable = pathname.startsWith("/_astro/"); // build files have fingerprinted names, safe to cache for long
  response.writeHead(200, {
    ...COMMON_HEADERS,
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
  });
  if (request.method === "HEAD") return response.end();
  createReadStream(file)
    .on("error", () => response.destroy())
    .pipe(response);
}

// ---------- start ----------

if (!existsSync(DIST)) {
  console.error("No dist/ folder yet. Run `npm run build` first (or just `npm run local`, which builds for you).");
  process.exit(1);
}

const server = http.createServer((request, response) => {
  const path = (request.url ?? "/").split("?")[0];
  if (path === "/api/visits") return handleVisits(request, response);
  return handleStatic(request, response);
});

server.listen(PORT, HOST, () => console.log(`Local site: http://localhost:${PORT}  (visitors counted so far: ${total})`));

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
