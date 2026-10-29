// Local stand-in for the live site. Run it with `npm run local`.
// It does two things, using only what ships with Node (no packages):
//   1. serves the built site from dist/
//   2. runs the visitor counter at /api/visits (the home page header reads it)
//
// This is for YOUR COMPUTER ONLY. When the site is hosted, Cloudflare serves the files and a small Cloudflare
// Worker (worker/index.mjs) answers /api/visits instead.
//
// The counter's contract (the online version in worker/index.mjs answers exactly the same way):
//   GET  /api/visits  ->  { "total": 123 }          just read the number
//   POST /api/visits  ->  { "total": 124 }          a page was loaded: count one page view, return the number
//
// It counts PAGE VIEWS (DECISIONS.md D22): every home-page load adds one, a refresh counts again.
// There is NO cookie and nothing about the visitor is stored. The only thing kept is one whole number in .data/visits.json.
// Who counts and who does not (own pages only, no robots, a brake against floods) is decided by worker/visits-rules.mjs,
// the same file the online version uses.

import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import http from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createBrake, decide } from "../worker/visits-rules.mjs";

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

// A brake for the whole counter: at most 10 counts in any one second (kept in memory only; same numbers as the online version).
const brake = createBrake(10, 1000);

const COMMON_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function sendJson(response, status, body, extra = {}) {
  response.writeHead(status, { ...COMMON_HEADERS, "content-type": "application/json", "cache-control": "no-store", ...extra });
  response.end(JSON.stringify(body));
}

function handleVisits(request, response) {
  request.resume(); // we never read a request body
  const verdict = decide(request.method, (name) => request.headers[name] ?? null, brake);
  if (verdict.status === 405) return sendJson(response, 405, { error: "use GET or POST" }, { allow: "GET, POST" });
  if (verdict.status === 403) return sendJson(response, 403, { error: "cross-site request refused" });
  if (verdict.count) {
    total += 1;
    saveTotal();
  }
  return sendJson(response, 200, { total });
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

server.listen(PORT, HOST, () => console.log(`Local site: http://localhost:${PORT}  (page views counted so far: ${total})`));

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
