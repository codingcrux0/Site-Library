// Tests for the list's search, filter and ghost-completion rules (src/lib/search.ts), plus the data files that feed them.
// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES } from "../config/categories.ts";
import { SHARED_TAGS, TAG_GROUPS, filterGroupsFor, tagGroupsFor } from "../config/tags.ts";
import { completionFor, countTags, filterEntries, matchesQuery, suggestionWords } from "./search.ts";

const sample = [
  { id: "a", name: "Alpha UI", summary: "Buttons and cards.", category: "Frontend Components", tags: ["React", "Tailwind CSS"] },
  { id: "b", name: "Beta Kit", summary: "A Vue toolbox.", category: "Frontend Components", tags: ["Vue", "CSS"] },
  { id: "c", name: "Gamma DB", summary: "A hosted database.", category: "Dev Tools", tags: ["Databases", "Java"] },
  { id: "d", name: "Delta Chat", summary: "A chat helper.", category: "AI Tools", tags: ["Chat"] },
];

test("matchesQuery: an empty query matches everything", () => {
  assert.equal(matchesQuery(sample[0], ""), true);
  assert.equal(matchesQuery(sample[0], "   "), true);
});

test("matchesQuery: looks in name, summary, category and tags, ignoring capitals", () => {
  assert.equal(matchesQuery(sample[0], "ALPHA"), true); // name
  assert.equal(matchesQuery(sample[0], "cards"), true); // summary
  assert.equal(matchesQuery(sample[0], "frontend"), true); // category
  assert.equal(matchesQuery(sample[0], "tailwind"), true); // tag
  assert.equal(matchesQuery(sample[0], "java"), false);
});

test("matchesQuery: every word must match, and extra spaces do not matter", () => {
  assert.equal(matchesQuery(sample[0], "alpha   react"), true);
  assert.equal(matchesQuery(sample[0], "alpha vue"), false);
});

test("filterEntries: no filters keeps everything, in order", () => {
  assert.deepEqual(filterEntries(sample, {}).map((e) => e.id), ["a", "b", "c", "d"]);
});

test("filterEntries: by category", () => {
  assert.deepEqual(filterEntries(sample, { category: "Dev Tools" }).map((e) => e.id), ["c"]);
});

test("filterEntries: several tags means ANY of them", () => {
  assert.deepEqual(filterEntries(sample, { tags: ["React", "Java"] }).map((e) => e.id), ["a", "c"]);
  assert.deepEqual(filterEntries(sample, { tags: ["Chat"] }).map((e) => e.id), ["d"]);
});

test("filterEntries: category, tags and words all have to agree", () => {
  assert.deepEqual(filterEntries(sample, { category: "Frontend Components", tags: ["CSS", "React"], query: "kit" }).map((e) => e.id), ["b"]);
  assert.deepEqual(filterEntries(sample, { category: "Dev Tools", tags: ["React"] }), []);
});

test("filterEntries: does not change the list it is given", () => {
  const copy = JSON.stringify(sample);
  filterEntries(sample, { tags: ["Vue"], query: "beta" });
  assert.equal(JSON.stringify(sample), copy);
});

test("completionFor: gives only the missing end of the best match", () => {
  assert.equal(completionFor("rea", ["Read me", "React", "Redux"]), "ct"); // shortest match wins
});

test("completionFor: ignores capitals when matching, and takes the end from the suggestion", () => {
  assert.equal(completionFor("REA", ["React"]), "ct");
});

test("completionFor: nothing to add when empty, blank, exact or unmatched", () => {
  assert.equal(completionFor("", ["React"]), "");
  assert.equal(completionFor("   ", ["React"]), "");
  assert.equal(completionFor("react", ["React"]), "");
  assert.equal(completionFor("xyz", ["React"]), "");
  assert.equal(completionFor("rea", []), "");
});

test("completionFor: same length matches pick the first alphabetically", () => {
  assert.equal(completionFor("v", ["Vue", "Vim"]), "im");
});

test("completionFor: works across a space", () => {
  assert.equal(completionFor("next ", ["Next.js", "Next step"]), "step");
});

test("suggestionWords: names, categories and tags, once each, only from the entries", () => {
  const words = suggestionWords(sample);
  assert.ok(words.includes("Alpha UI") && words.includes("Dev Tools") && words.includes("Java"));
  assert.equal(new Set(words).size, words.length);
  assert.deepEqual(suggestionWords([]), []);
});

test("countTags: counts the rows that carry each tag (the page gives it the rows of one category)", () => {
  assert.equal(countTags(sample).get("CSS"), 1);
  assert.equal(countTags(sample.slice(0, 2)).get("Vue"), 1);
  assert.equal(countTags(sample.slice(2)).get("Vue"), undefined);
  assert.equal(countTags([]).size, 0);
});

test("matchesQuery: uses the ready-made search text when a row has one, and also looks in 'also in' categories", () => {
  assert.equal(matchesQuery({ ...sample[0], text: "only this" }, "this"), true);
  assert.equal(matchesQuery({ ...sample[0], text: "only this" }, "alpha"), false); // the ready-made text is trusted
  assert.equal(matchesQuery({ ...sample[0], alsoIn: ["Motion & Animation"] }, "motion"), true);
});

// ---- The data files ----

test("tags: every tag is unique and belongs to a real category", () => {
  const names = CATEGORIES.map((c) => c.name);
  const all = TAG_GROUPS.flatMap((g) => g.tags);
  assert.equal(new Set(all).size, all.length);
  for (const group of TAG_GROUPS) assert.ok(names.includes(group.category), group.category);
  assert.equal(TAG_GROUPS.length, names.length);
});

test("tagGroupsFor: one group for a category, all groups for none", () => {
  assert.equal(tagGroupsFor("Design Inspiration").length, 1);
  assert.equal(tagGroupsFor("").length, TAG_GROUPS.length);
});

test("filterGroupsFor: a category shows its own types first, then the shared ones, then the rest; no category shows the shared ones first", () => {
  const inCategory = filterGroupsFor("Design Inspiration").map((g) => g.category);
  assert.equal(inCategory[0], "Design Inspiration");
  assert.equal(inCategory[1], SHARED_TAGS.category);
  assert.equal(inCategory.length, TAG_GROUPS.length + 1);
  const all = filterGroupsFor("").map((g) => g.category);
  assert.equal(all[0], SHARED_TAGS.category);
  assert.equal(all.length, TAG_GROUPS.length + 1);
});
