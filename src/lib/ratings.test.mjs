// The average star rating shown on each website row and in the feedback panel. Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeFeedback } from "./ratings.ts";

const fb = (rating) => ({ id: `f${rating}-${Math.random()}`, author: "A", rating, date: "2026-10-30" });

test("no feedback at all: no average (never a made-up 0 or 5)", () => {
  assert.deepEqual(summarizeFeedback(undefined), { count: 0, average: null, counts: [0, 0, 0, 0, 0] });
  assert.deepEqual(summarizeFeedback([]), { count: 0, average: null, counts: [0, 0, 0, 0, 0] });
});

test("the average of every rating combined, to one decimal", () => {
  assert.equal(summarizeFeedback([fb(5), fb(4)]).average, 4.5);
  assert.equal(summarizeFeedback([fb(5), fb(5), fb(4)]).average, 4.7); // 4.666... rounds to 4.7
  assert.equal(summarizeFeedback([fb(1)]).average, 1);
});

test("counts how many people gave each number of stars (index 0 is one star)", () => {
  const s = summarizeFeedback([fb(5), fb(5), fb(3), fb(1)]);
  assert.deepEqual(s.counts, [1, 0, 1, 0, 2]);
  assert.equal(s.count, 4);
});

test("a bad value in the data (0, 6, 3.5, text) is ignored, so the average can never be outside 1 to 5", () => {
  const s = summarizeFeedback([fb(4), fb(0), fb(6), fb(3.5), { id: "x", author: "A", rating: "5", date: "2026-10-30" }]);
  assert.equal(s.count, 1);
  assert.equal(s.average, 4);
});
