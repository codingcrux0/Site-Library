import { useEffect, useState } from "react";
import AnimatedCounter from "@/components/ui/animated-counter";

/*
 * The "People visited" pill in the home page header.
 *
 * What it counts: UNIQUE BROWSERS. Each time the home page loads, the browser asks the server to count it
 * (POST /api/visits). The server counts a browser only the first time: it hands out a cookie ("visited=1", no ID,
 * no personal data) and recognises it afterwards. So a refresh does not count again (DECISIONS.md D15).
 * Strictly it is browsers, not people: a second device, a cleared cookie or a private window counts again.
 * This file never touches the cookie. It is HttpOnly (set and read by the server only).
 * It then re-reads the number once a minute while the tab is visible, so the figure stays "live".
 *
 * The server side is described in DECISIONS.md D12. If the server can't be reached (for example the plain
 * `npm run dev`, which has no /api/visits), NOTHING is shown. We never show a made-up number.
 */

const ENDPOINT = "/api/visits";
const REFRESH_MS = 60_000;

// One page load = one count, even if this component is mounted twice in development.
let counted = false;

async function request(method: "GET" | "POST"): Promise<number> {
  const response = await fetch(ENDPOINT, { method, cache: "no-store" });
  if (!response.ok) throw new Error(`visits ${response.status}`);
  const data: unknown = await response.json();
  const total = (data as { total?: unknown } | null)?.total;
  // Trust nothing from the network: only a plain whole number is shown.
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) throw new Error("bad total");
  return total;
}

// For the first appearance, the wheel starts a little below the real number, so only the last digits roll.
// (Never across a change in digit count, which would add columns while rolling.)
function rollStart(total: number) {
  const from = Math.max(0, total - 12);
  return String(from).length === String(total).length ? from : total;
}

export default function VisitCounter() {
  const [total, setTotal] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = (method: "GET" | "POST") =>
      request(method)
        .then((value) => alive && setTotal(value))
        .catch(() => {}); // on failure keep whatever is shown (or nothing)

    load(counted ? "GET" : "POST");
    counted = true;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load("GET");
    }, REFRESH_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  // Let the pill fade in first, then roll the last digits up to the real number.
  useEffect(() => {
    if (total === null || rolled) return;
    const id = window.setTimeout(() => setRolled(true), 350);
    return () => window.clearTimeout(id);
  }, [total, rolled]);

  if (total === null) return null;

  return (
    <p className="rv-pop inline-flex items-center gap-2.5 rounded-full border border-line-subtle bg-white px-3.5 py-1.5 text-sm text-ink-secondary">
      {/* Small pulsing dot = "live". The pulse stops for people who asked for less motion. */}
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
        <span className="relative size-2 rounded-full bg-emerald-500" />
      </span>
      <span>People visited</span>
      <AnimatedCounter value={rolled ? total : rollStart(total)} duration={1} className="font-semibold text-ink-primary" />
    </p>
  );
}
