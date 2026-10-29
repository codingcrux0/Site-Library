// The rules of the page-view counter, as small plain functions with no Cloudflare or Node parts in them.
// Two programs use them, so the counter behaves the same everywhere:
//   - worker/index.mjs        the online version (Cloudflare)
//   - scripts/local-server.mjs  the version on your own computer
// The tests are in worker/visits-rules.test.mjs (run: npm test).
//
// What the counter counts: PAGE VIEWS. Every time the home page loads in a browser, the number goes up by one.
// There is NO cookie and NOTHING about the visitor is stored (no address, no ID): only one whole number.
// So a refresh counts again, and the label on the site says "Page views", never "people".

// Robots and automated test browsers are not readers, so they are not counted.
// This is a simple name check, not proof: a robot that pretends to be a normal browser would still be counted.
const ROBOT = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|lighthouse|curl|wget|python-requests|node-fetch|undici/i;

export function isRobot(userAgent) {
  return ROBOT.test(userAgent ?? "");
}

// Only our own pages may add to the count. Browsers always say where a request came from; if it was another website, refuse.
// (A script on someone's computer can fake these headers, so this stops other WEBSITES, not determined people. The brake below limits the damage.)
export function isSameSite({ fetchSite, origin, host }) {
  if (fetchSite && fetchSite !== "same-origin") return false;
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return true;
}

// A brake for the WHOLE counter, not per visitor (so no visitor address is ever kept):
// at most `limit` counts in any `windowMs` milliseconds. Past that, requests are answered but not counted.
// It keeps a flood of fake requests from running up the number (or using up the free daily allowance) in seconds.
export function createBrake(limit, windowMs, now = Date.now) {
  let stamps = [];
  return () => {
    const time = now();
    stamps = stamps.filter((stamp) => time - stamp < windowMs);
    if (stamps.length >= limit) return false;
    stamps.push(time);
    return true;
  };
}

// Decide what to do with one request to /api/visits.
//   method: "GET", "POST"...   header: a function that returns a header's value by name (or null)   brake: from createBrake
// Returns { status, count }: the answer code, and whether the total should go up by one.
// GET reads the number. POST means "a page was loaded": it counts only if the request is from our own site,
// is not a robot, and the brake allows it. The brake is only used up by requests that would really count.
export function decide(method, header, brake) {
  if (method === "GET") return { status: 200, count: false };
  if (method !== "POST") return { status: 405, count: false };
  const sameSite = isSameSite({ fetchSite: header("sec-fetch-site"), origin: header("origin"), host: header("host") });
  if (!sameSite) return { status: 403, count: false };
  if (isRobot(header("user-agent"))) return { status: 200, count: false };
  return { status: 200, count: brake() };
}
