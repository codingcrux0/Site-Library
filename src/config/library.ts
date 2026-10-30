// The list page's data. The rule from the spec: NOTHING is listed until you have tested it by hand and dated it.
// So ENTRIES stays empty until you add real ones. Never invent a score, a catch or a date for a real website.
//
// To add one, append an object to ENTRIES, for example:
//   { id: "some-site", name: "Some Site", summary: "One line about it.", theCatch: "The limit or paywall, in plain words.",
//     score: 15, testedOn: "2026-11-02", category: "Frontend Components", tags: ["React", "Tailwind CSS"] }
// `score` is MY score: the sum of the four 1 to 5 scores, so 4 to 20 (project_spec.md). The community score is separate and not built yet.
// `testedOn` is a date written year-month-day. `category` must match a name in src/config/categories.ts.
// `tags` are the "type of website" words for the filter and search. Pick 2 to 4 from src/config/tags.ts (npm test checks they exist).

export type Entry = {
  id: string;
  name: string;
  summary: string;
  /** "The catch": the limit, paywall or problem nobody mentions. */
  theCatch: string;
  /** My score, 4 to 20. */
  score: number;
  /** Test date, "YYYY-MM-DD". */
  testedOn: string;
  category: string;
  /** Types of website, from src/config/tags.ts (for example "React", "CSS", "Java"). */
  tags: string[];
  /** Only the localhost demo rows set this. Real entries never do. */
  preview?: boolean;
};

export const ENTRIES: Entry[] = [];
