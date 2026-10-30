// Tests for the page-number logic (src/lib/page-range.ts). Run with: npm test
// Written BEFORE the code, so each test says what the page numbers must do.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pageRange, parsePage } from "./page-range.ts";

const G = "gap";

test("a few pages: every number is shown, no gaps", () => {
  assert.deepEqual(pageRange(1, 1), [1]);
  assert.deepEqual(pageRange(3, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test("no pages at all still shows page 1 (the empty list)", () => {
  assert.deepEqual(pageRange(1, 0), [1]);
  assert.deepEqual(pageRange(5, -3), [1]);
});

test("many pages: near the start, near the middle, near the end", () => {
  assert.deepEqual(pageRange(1, 20), [1, 2, 3, 4, 5, G, 20]);
  assert.deepEqual(pageRange(4, 20), [1, 2, 3, 4, 5, G, 20]);
  assert.deepEqual(pageRange(5, 20), [1, G, 4, 5, 6, G, 20]);
  assert.deepEqual(pageRange(16, 20), [1, G, 15, 16, 17, G, 20]);
  assert.deepEqual(pageRange(17, 20), [1, G, 16, 17, 18, 19, 20]);
  assert.deepEqual(pageRange(20, 20), [1, G, 16, 17, 18, 19, 20]);
});

test("a wider window with 2 neighbours on each side", () => {
  assert.deepEqual(pageRange(10, 20, 2), [1, G, 8, 9, 10, 11, 12, G, 20]);
});

test("a page number outside the range is pulled back inside it", () => {
  assert.deepEqual(pageRange(0, 20), pageRange(1, 20));
  assert.deepEqual(pageRange(99, 20), pageRange(20, 20));
  assert.deepEqual(pageRange(2.7, 20), pageRange(3, 20)); // a fractional page is rounded
});

test("for every page: same length (so the buttons never jump), ascending, no repeats, always has first, last and current", () => {
  for (const total of [8, 9, 20, 100]) {
    const lengths = new Set();
    for (let current = 1; current <= total; current++) {
      const range = pageRange(current, total);
      lengths.add(range.length);
      const numbers = range.filter((x) => x !== G);
      assert.deepEqual(numbers, [...new Set(numbers)].sort((a, b) => a - b), `${current}/${total}`);
      assert.ok(numbers.includes(1) && numbers.includes(total) && numbers.includes(current), `${current}/${total}`);
    }
    assert.equal(lengths.size, 1, `total ${total}`);
  }
});

test("typed page number: a normal number is used as it is", () => {
  assert.equal(parsePage("7", 20), 7);
  assert.equal(parsePage(" 12 ", 20), 12); // spaces around it do not matter
  assert.equal(parsePage("007", 20), 7);
});

test("typed page number: too big goes to the last page, zero goes to the first", () => {
  assert.equal(parsePage("99", 20), 20);
  assert.equal(parsePage("0", 20), 1);
  assert.equal(parsePage("5", 1), 1);
});

test("typed page number: nothing usable returns null (the page stays where it is)", () => {
  for (const text of ["", "   ", "abc", "-3", "2.5", "1e3", "٣", "12abc", null, undefined]) {
    assert.equal(parsePage(text, 20), null, String(text));
  }
});

test("typed page number: an enormous number cannot break anything", () => {
  assert.equal(parsePage("9".repeat(400), 20), 20);
});
