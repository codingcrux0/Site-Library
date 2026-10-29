// The online page-view counter (runs on Cloudflare). Everything else on the site is plain files.
//
// How it fits together (settings in wrangler.jsonc):
//   - Only requests to /api/* reach this Worker ("run_worker_first"). Pages, images and scripts are served straight
//     from Cloudflare's file store, so even a flood of visitors, or this counter running out of its free daily
//     allowance, can never take the pages down. If the counter fails, the page just shows no number.
//   - The number is kept by one "Durable Object": a tiny stored program that handles one request at a time,
//     so two people loading the page at the same moment can never overwrite each other's count.
//
// Privacy: no cookie, and nothing about the visitor is stored (no address, no ID). Only one whole number exists.
// The rules (who counts, robots, the brake) are in visits-rules.mjs and are tested (npm test).
import { DurableObject } from "cloudflare:workers";
import { createBrake, decide } from "./visits-rules.mjs";

// Free-plan note: Cloudflare allows 100,000 Worker requests and 100,000 Durable Object row writes per day on the free
// plan (checked in its docs on 2026-10-29). Past that, counting stops for the day and the page shows no number.
const MAX_COUNTS = 10; // brake: at most 10 counts ...
const PER_MS = 1000; //   ... in any one second, for the whole site

export class PageViewCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    // One table, one row. The CHECK makes it impossible to ever add a second row.
    this.sql.exec("CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL)");
    this.sql.exec("INSERT OR IGNORE INTO counter (id, total) VALUES (1, 0)");
    this.brake = createBrake(MAX_COUNTS, PER_MS);
  }

  read() {
    return this.sql.exec("SELECT total FROM counter WHERE id = 1").one().total;
  }

  // Add one page view, unless the brake says the site is being flooded. Returns the total either way.
  increment() {
    if (!this.brake()) return this.read();
    return this.sql.exec("UPDATE counter SET total = total + 1 WHERE id = 1 RETURNING total").one().total;
  }
}

const COMMON_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...COMMON_HEADERS, ...extra } });
}

async function handleVisits(request, env) {
  const url = new URL(request.url);
  // The rules only decide WHAT to do; the Durable Object's own brake is the one that limits the whole site.
  const header = (name) => (name === "host" ? url.host : request.headers.get(name));
  const verdict = decide(request.method, header, () => true);

  if (verdict.status === 405) return json({ error: "use GET or POST" }, 405, { allow: "GET, POST" });
  if (verdict.status === 403) return json({ error: "cross-site request refused" }, 403);

  try {
    const counter = env.PAGE_VIEWS.get(env.PAGE_VIEWS.idFromName("total"));
    const total = verdict.count ? await counter.increment() : await counter.read();
    return json({ total });
  } catch {
    // For example: the free daily allowance is used up. The page then shows no number, and nothing else is affected.
    return json({ error: "counter unavailable" }, 503);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/visits") return handleVisits(request, env);
    if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    // Safety net: anything else (only reachable if the settings were ever changed) is served as a normal file.
    return env.ASSETS.fetch(request);
  },
};
