// Which page buttons to show, for example: 1 … 4 5 6 … 20.
// Rules: the first and last page are always there, so is the current page with `siblings` neighbours each side, and
// "gap" stands for the "…" button. The list is always the same length (2 × siblings + 5), so the buttons never jump
// sideways when you click through the pages. Tests: src/lib/page-range.test.mjs (npm test).

export type PageItem = number | "gap";

export function pageRange(current: number, total: number, siblings = 1): PageItem[] {
  const last = Math.max(1, Math.floor(total) || 1);
  const page = Math.min(last, Math.max(1, Math.round(current) || 1));
  const slots = siblings * 2 + 5; // first, last, current + neighbours, and two gaps

  // Few pages: show them all.
  if (last <= slots) return Array.from({ length: last }, (_, i) => i + 1);

  const from = Math.max(page - siblings, 1);
  const to = Math.min(page + siblings, last);
  const gapLeft = from > 3;
  const gapRight = to < last - 2;
  const edge = siblings * 2 + 3; // how many numbers fill the side that has no gap

  const run = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

  if (!gapLeft) return [...run(1, edge), "gap", last];
  if (!gapRight) return [1, "gap", ...run(last - edge + 1, last)];
  return [1, "gap", ...run(from, to), "gap", last];
}

// What was typed into the "go to page" box. Only plain digits count: anything else (empty, letters, a minus sign, a decimal point)
// returns null, which means "stay where you are". A number that is too big goes to the last page and 0 goes to the first.
export function parsePage(text: string | null | undefined, total: number): number | null {
  const digits = (text ?? "").trim();
  if (!/^[0-9]+$/.test(digits)) return null;
  const last = Math.max(1, Math.floor(total) || 1);
  return Math.min(last, Math.max(1, Number(digits)));
}
