// DEMO rows, so you can see the whole design (many pages, scores, dates) while the real list is still empty.
// They are used ONLY by `npm run dev` on your computer (see src/pages/websites.astro). The live site is built without
// them, and every row is labelled "Layout preview" so nobody can mistake it for a tested entry.
// The words and numbers below are made up on purpose, to show the layout. They say nothing about any real website.

import type { Entry } from "@/config/library";

const SUMMARIES = [
  "A one-line summary of the website goes here.",
  "Two short sentences can fit here, so you can see how a longer summary wraps on a small screen.",
  "A short line.",
];
const CATCHES = [
  "The limit, the paywall or the problem goes here, in plain words.",
  "A longer catch, to show how the line wraps when the words run past the edge of the box on a phone.",
  "A short catch.",
];

// `groups` is the tag list (src/config/tags.ts), passed in so this file stays plain and testable.
// Rows take turns across the categories, and each gets 2 or 3 tags from its own category.
export function previewEntries(groups: { category: string; tags: string[] }[], count = 160): Entry[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(2026, 9, 30) - i * 86_400_000); // one per day, going back from 30 Oct 2026
    const group = groups[i % groups.length];
    const round = Math.floor(i / groups.length); // 0, 1, 2... within this category
    const tagCount = 2 + (round % 2); // 2 or 3 tags
    return {
      id: `preview-${i + 1}`,
      name: `Example website ${i + 1}`,
      summary: SUMMARIES[i % SUMMARIES.length],
      theCatch: CATCHES[(i * 2) % CATCHES.length],
      score: 4 + ((i * 7) % 17), // 4 to 20, spread around
      testedOn: day.toISOString().slice(0, 10),
      category: group.category,
      tags: Array.from({ length: tagCount }, (_, k) => group.tags[(round * 3 + k * 4) % group.tags.length]),
      preview: true,
    };
  });
}
