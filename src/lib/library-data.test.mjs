// Guards for the list's real data and the category set. A typo here would show on the live site, so these run on every `npm test`.
// (Node 24 reads the .ts files directly, so these import the real config.)
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { CATEGORIES } from "../config/categories.ts";
import { ENTRIES } from "../config/library.ts";
import { SHARED_TAGS, TAG_GROUPS } from "../config/tags.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const names = CATEGORIES.map((c) => c.name);
const allTags = [...TAG_GROUPS.flatMap((g) => g.tags), ...SHARED_TAGS.tags];

test("the categories and the tag groups use exactly the same names, in the same order", () => {
  assert.deepEqual(TAG_GROUPS.map((g) => g.category), names);
});

test("category names are unique and each has a words, a tint and a picture (scene) that exists", () => {
  assert.equal(new Set(names).size, names.length);
  const sceneSource = read("../components/scenes/scene.tsx");
  for (const c of CATEGORIES) {
    assert.ok(c.summary.length > 20, `${c.name}: summary is empty`);
    assert.match(c.tint, /^bg-tint-(sky|sand|sage|lilac)$/);
    assert.match(sceneSource, new RegExp(`^  ${c.scene}: \\(`, "m"), `${c.name}: scene "${c.scene}" is not drawn in scene.tsx`);
  }
});

test("every tag is unique across the whole file (groups and shared tags), and each category has some", () => {
  assert.equal(new Set(allTags).size, allTags.length, "a tag is written twice");
  for (const g of TAG_GROUPS) assert.ok(g.tags.length >= 4, `${g.category} has too few tags`);
  assert.ok(SHARED_TAGS.tags.length >= 3, "the shared tags (Open source, AI...) are missing");
});

test("every real entry is complete and valid", () => {
  assert.ok(ENTRIES.length > 0, "the real list is empty");
  const ids = new Set();
  for (const e of ENTRIES) {
    assert.match(e.id, /^[a-z0-9-]+$/, `${e.name}: id must be lowercase letters, numbers and dashes`);
    assert.ok(!ids.has(e.id), `${e.id} is used twice`);
    ids.add(e.id);
    assert.ok(e.name.trim() && e.summary.trim() && e.theCatch.trim(), `${e.id}: name, summary or catch is empty`);
    assert.ok(e.summary.length <= 260 && e.theCatch.length <= 320, `${e.id}: summary or catch is too long for the box`);
    assert.match(e.checkedOn, /^\d{4}-\d{2}-\d{2}$/, `${e.id}: checkedOn must be YYYY-MM-DD`);
    assert.ok(e.placements.length >= 1 && e.placements.length <= 3, `${e.id}: 1 to 3 placements (categories)`);
  }
});

test("every placement (a website judged inside one category) is complete, valid and judged on its own", () => {
  for (const e of ENTRIES) {
    const seen = new Set();
    for (const p of e.placements) {
      const where = `${e.id} in ${p.category}`;
      assert.ok(names.includes(p.category), `${where}: category does not exist`);
      assert.ok(!seen.has(p.category), `${e.id}: two placements in ${p.category}`);
      seen.add(p.category);
      assert.ok(p.tags.length >= 1 && p.tags.length <= 5, `${where}: use 1 to 5 tags`);
      for (const t of p.tags) assert.ok(allTags.includes(t), `${where}: tag "${t}" is not in tags.ts`);
      assert.equal(new Set(p.tags).size, p.tags.length, `${where}: a tag is repeated`);
      // Tags mostly come from the placement's own category or the shared tags (Open source, AI...): at most one from another category.
      const own = [...TAG_GROUPS.find((g) => g.category === p.category).tags, ...SHARED_TAGS.tags];
      assert.ok(p.tags.filter((t) => !own.includes(t)).length <= 1, `${where}: too many tags from other categories`);
      assert.ok(Number.isInteger(p.score) && p.score >= 4 && p.score <= 20, `${where}: score must be 4 to 20`);
      // The four marks (quality, free tier, beginner ease, freshness) are kept so the breakdown can be shown later; the score is their sum.
      assert.equal(p.marks.length, 4, `${where}: four marks`);
      for (const m of p.marks) assert.ok(Number.isInteger(m) && m >= 1 && m <= 5, `${where}: each mark is 1 to 5`);
      assert.equal(p.score, p.marks.reduce((a, b) => a + b, 0), `${where}: score is not the sum of the marks`);
      // Words written for one category must fit the box like the main words do.
      if (p.summary !== undefined) assert.ok(p.summary.trim() && p.summary.length <= 260, `${where}: summary is empty or too long`);
      if (p.theCatch !== undefined) assert.ok(p.theCatch.trim() && p.theCatch.length <= 320, `${where}: catch is empty or too long`);
    }
  }
});

test("a website in two categories is judged differently in each: the placements are not copies of each other", () => {
  const multi = ENTRIES.filter((e) => e.placements.length > 1);
  assert.ok(multi.length > 0, "no website is in more than one category");
  for (const e of multi) {
    const [main, ...others] = e.placements;
    for (const p of others) {
      const same = p.score === main.score && p.tags.join() === main.tags.join();
      assert.ok(!same, `${e.id}: the ${p.category} placement is just a copy of the main one`);
    }
  }
});

test("Best for free follows one rule: a placement has a free score exactly when its free-tier mark is 5, and the free score adds up", () => {
  const free = ENTRIES.filter((e) => e.placements.some((p) => p.free));
  assert.ok(free.length > 0, "no website is listed under Best for free");
  for (const e of ENTRIES) {
    for (const p of e.placements) {
      const where = `${e.id} in ${p.category}`;
      // The free-tier mark (second mark) is 5 only when nothing is held back: no paid plan, membership or limit was found.
      assert.equal(Boolean(p.free), p.marks[1] === 5, `${where}: a free score exists exactly when the free-tier mark is 5`);
      if (!p.free) continue;
      assert.equal(p.free.marks.length, 4, `${where}: four free marks`);
      for (const m of p.free.marks) assert.ok(Number.isInteger(m) && m >= 1 && m <= 5, `${where}: each free mark is 1 to 5`);
      assert.equal(p.free.score, p.free.marks.reduce((a, b) => a + b, 0), `${where}: free score is not the sum of the free marks`);
      // Marks 1 and 4 (quality and freshness) are facts about the site in this category, so they match the main marks.
      assert.equal(p.free.marks[0], p.marks[0], `${where}: free quality must match the quality mark`);
      assert.equal(p.free.marks[3], p.marks[3], `${where}: free freshness must match the freshness mark`);
    }
    // A website that has a free score must have one in every category it is in, and must not describe a paid plan in its own words.
    if (e.placements.some((p) => p.free)) {
      assert.ok(e.placements.every((p) => p.free), `${e.id}: free in one category but not another`);
      const words = [e.summary, e.theCatch, ...e.placements.flatMap((p) => [p.summary ?? "", p.theCatch ?? ""])].join(" ");
      assert.doesNotMatch(words, /\b(Pro|PRO|premium|paid|membership|subscription|per month|a month|a year)\b|\$\d/, `${e.id}: calls itself free but mentions a paid plan`);
    }
  }
});

test("the grading rules are written down and the data file points to them", () => {
  const rules = readFileSync(new URL("../../docs/GRADING.md", import.meta.url), "utf8");
  for (const word of ["Quality", "Free tier", "Beginner ease", "Freshness", "Best for free", "Category rules"]) assert.match(rules, new RegExp(word), `GRADING.md lacks "${word}"`);
  assert.match(read("../config/library.ts"), /docs\/GRADING\.md/);
});

test("every category holds at least one website (an empty box on the home page would look broken)", () => {
  for (const name of names) assert.ok(ENTRIES.some((e) => e.placements.some((p) => p.category === name)), `${name} has no website`);
});

test("every entry has its own https web address, written plainly (no tracking parts), used once", () => {
  const seen = new Set();
  for (const e of ENTRIES) {
    const url = new URL(e.url); // throws if it is not a real address
    assert.equal(url.protocol, "https:", `${e.id}: use https`);
    assert.equal(url.search + url.hash, "", `${e.id}: no ?tracking or #parts in the address`);
    assert.ok(!seen.has(e.url), `${e.id}: address used twice`);
    seen.add(e.url);
  }
});

test("the real list never carries feedback or the demo flag (no made-up reviews on the live site)", () => {
  for (const e of ENTRIES) {
    assert.equal(e.feedback, undefined, `${e.id} has feedback`);
    assert.equal(e.demoFeedback, undefined, `${e.id} is marked as demo feedback`);
  }
});

test("no page says a site was 'tested by hand' or 'tried by a real person': the scores come from a review, not hands-on use", () => {
  const walk = (dir) =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const root = new URL("../", import.meta.url).pathname;
  for (const file of walk(root).filter((f) => /\.(ts|tsx|astro|css)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /tested by hand|tried by hand|tested by a real person|tried by a real person|hand-tested/i, `${file} claims hands-on testing`);
  }
});
