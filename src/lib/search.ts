// The list's search, filter and "ghost completion" rules, as plain functions (so they can be tested without a browser).
// Tests: src/lib/search.test.mjs.

// Only the parts of an entry that search looks at (a full Entry fits this).
export type Searchable = { name: string; summary: string; category: string; tags: string[] };

// Lower case, one space between words, no spaces at the ends.
const clean = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

// True when EVERY word typed appears somewhere in the name, summary, category or tags.
export function matchesQuery(entry: Searchable, query: string): boolean {
  const words = clean(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const text = clean(`${entry.name} ${entry.summary} ${entry.category} ${entry.tags.join(" ")}`);
  return words.every((word) => text.includes(word));
}

export type Filters = {
  /** "" or missing = every category. */
  category?: string;
  /** A site stays if it has ANY of these tags. Empty or missing = no tag filter. */
  tags?: string[];
  query?: string;
};

// Keeps the entries that pass all three filters. Returns a new list; the order is kept and the input is not changed.
export function filterEntries<T extends Searchable>(entries: T[], { category = "", tags = [], query = "" }: Filters): T[] {
  return entries.filter(
    (entry) =>
      (category === "" || entry.category === category) &&
      (tags.length === 0 || entry.tags.some((tag) => tags.includes(tag))) &&
      matchesQuery(entry, query),
  );
}

// The words the search box may suggest: names, categories and tags of the entries that exist (nothing is suggested from an empty list).
export function suggestionWords(entries: Searchable[]): string[] {
  const words = new Set<string>();
  for (const entry of entries) {
    words.add(entry.name);
    words.add(entry.category);
    for (const tag of entry.tags) words.add(tag);
  }
  return [...words];
}

// Ghost text: given what is typed, returns only the MISSING end of the best suggestion ("rea" gives "ct" for "React").
// Best = starts with what is typed (capitals ignored), shortest first, then alphabetical. Gives "" when there is nothing to add.
export function completionFor(typed: string, candidates: string[]): string {
  if (typed.trim() === "") return "";
  const start = typed.toLowerCase();
  const matches = candidates.filter((word) => word.toLowerCase().startsWith(start) && word.length > typed.length);
  if (matches.length === 0) return "";
  matches.sort((a, b) => a.length - b.length || a.localeCompare(b, "en"));
  return matches[0].slice(typed.length);
}

// How many entries carry each tag, inside one category ("" = all of them).
export function countTags(entries: Searchable[], category: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (category !== "" && entry.category !== category) continue;
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}
