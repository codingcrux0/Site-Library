// How the list turns websites into rows, and how each tab orders them. Plain functions, so they can be tested without a browser
// (src/lib/listings.test.mjs).
//
// One website can sit in several categories and is judged again in each one (a "placement": its own types, marks and score, and
// sometimes its own words). A ROW is one website seen through one category:
// - a category picked: the website's placement in that category;
// - no category ("All sites"): the website once, through its main (first) placement, with all of its types and the other categories noted.

import type { Entry } from "../config/library.ts";
import { summarizeFeedback } from "./ratings.ts";
import { searchTextOf } from "./search.ts";

export type Listing = {
  entry: Entry;
  name: string;
  category: string;
  tags: string[];
  summary: string;
  theCatch: string;
  score: number;
  /** Set only when this website is completely free: the separate free-use score. */
  free?: { marks: number[]; score: number };
  /** The other categories this website is in (not the one shown). */
  alsoIn: string[];
  /** How many users rated it, and their average (null when nobody has). Worked out once here, not on every render. */
  ratings: number;
  average: number | null;
  /** The words the search looks in, ready made (lower case). */
  text: string;
};

export type Tab = "all" | "newest" | "oldest" | "top" | "user" | "free" | "lists";

// How many websites each category holds (a website in two categories counts in both).
export function placementCounts(entries: Entry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) for (const p of entry.placements) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return counts;
}

export function listingsFor(entries: Entry[], category: string): Listing[] {
  const rows: Listing[] = [];
  for (const entry of entries) {
    const main = entry.placements[0];
    const placement = category === "" ? main : entry.placements.find((p) => p.category === category);
    if (!placement) continue;
    const { count, average } = summarizeFeedback(entry.feedback);
    const row: Omit<Listing, "text"> = {
      entry,
      name: entry.name,
      category: placement.category,
      // With no category picked, show every type the website has (once each), so the filter and the row agree.
      tags: category === "" ? [...new Set(entry.placements.flatMap((p) => p.tags))] : placement.tags,
      summary: placement.summary ?? entry.summary,
      theCatch: placement.theCatch ?? entry.theCatch,
      score: placement.score,
      free: placement.free,
      alsoIn: entry.placements.filter((p) => p !== placement).map((p) => p.category),
      ratings: count,
      average,
    };
    rows.push({ ...row, text: searchTextOf(row) });
  }
  return rows;
}

const byName = (a: Listing, b: Listing) => a.entry.name.localeCompare(b.entry.name, "en", { numeric: true });
const byScore = (a: Listing, b: Listing) => b.score - a.score;

// True when at least one row has a user rating (the "Top user scored" tab says so when none has).
export const anyRated = (rows: Listing[]): boolean => rows.some((row) => row.ratings > 0);

// The rows for a tab, in that tab's order. Returns a new list; the input is not changed.
export function arrange(rows: Listing[], tab: Tab | string): Listing[] {
  switch (tab) {
    case "newest":
      return [...rows].sort((a, b) => b.entry.checkedOn.localeCompare(a.entry.checkedOn) || byName(a, b));
    case "oldest":
      return [...rows].sort((a, b) => a.entry.checkedOn.localeCompare(b.entry.checkedOn) || byName(a, b));
    case "top":
      return [...rows].sort((a, b) => byScore(a, b) || byName(a, b));
    case "user":
      // Rated websites first (best average, then most ratings). Websites nobody has rated follow in the order of our score,
      // so with no ratings at all this is exactly "Top scored".
      return [...rows].sort((a, b) => {
        if ((a.ratings > 0) !== (b.ratings > 0)) return a.ratings > 0 ? -1 : 1;
        if (a.ratings > 0) return (b.average ?? 0) - (a.average ?? 0) || b.ratings - a.ratings || byScore(a, b) || byName(a, b);
        return byScore(a, b) || byName(a, b);
      });
    case "free":
      return rows.filter((row) => row.free).sort((a, b) => (b.free?.score ?? 0) - (a.free?.score ?? 0) || byScore(a, b) || byName(a, b));
    default:
      return [...rows].sort(byName);
  }
}
