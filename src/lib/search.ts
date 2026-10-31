// The list's search, filter and "ghost completion" rules, as plain functions (so they can be tested without a browser).
// Tests: src/lib/search.test.mjs.

// Only the parts of a row that search looks at. `alsoIn` = the other categories the site is in. `text` = the words below, already joined and
// lower-cased (the list builds it once per row, so typing in the search box does not rebuild it on every key press).
export type Searchable = { name: string; summary: string; category: string; tags: string[]; alsoIn?: string[]; text?: string };

// Lower case, one space between words, no spaces at the ends.
const clean = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

// The words a search looks in: name, summary, categories and tags.
export const searchTextOf = (entry: Searchable): string => clean(`${entry.name} ${entry.summary} ${entry.category} ${(entry.alsoIn ?? []).join(" ")} ${entry.tags.join(" ")}`);

// True when EVERY word typed appears somewhere in the name, summary, category or tags.
export function matchesQuery(entry: Searchable, query: string): boolean {
  const words = clean(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const text = entry.text ?? searchTextOf(entry);
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
    for (const other of entry.alsoIn ?? []) words.add(other);
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

// How many rows carry each tag. The page gives it the rows of one category (before search and types), so the counts match what the filter shows.
export function countTags(rows: Searchable[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return counts;
}
