// The star numbers shown for a website: how many people rated it, the average, and how many gave one, two... five stars.
// Pure maths with no imports, so it is easy to test (ratings.test.mjs). With no feedback the average is null, never a made-up number.

export type Feedback = {
  id: string;
  /** The name shown next to the feedback. */
  author: string;
  /** Whole stars, 1 to 5. Anything else is ignored. */
  rating: number;
  /** "YYYY-MM-DD". */
  date: string;
  /** What they wrote. Optional: a rating can stand alone. */
  text?: string;
};

export type FeedbackSummary = {
  count: number;
  /** One decimal (4.5), or null when nobody has rated yet. */
  average: number | null;
  /** counts[0] = how many gave one star ... counts[4] = how many gave five stars. */
  counts: number[];
};

export function summarizeFeedback(feedback: Feedback[] | undefined): FeedbackSummary {
  const counts = [0, 0, 0, 0, 0];
  let total = 0;
  let count = 0;
  for (const item of feedback ?? []) {
    // A bad value in the data (0, 6, 3.5, text) must not drag the average outside 1 to 5.
    if (!Number.isInteger(item.rating) || item.rating < 1 || item.rating > 5) continue;
    counts[item.rating - 1] += 1;
    total += item.rating;
    count += 1;
  }
  return { count, average: count ? Math.round((total / count) * 10) / 10 : null, counts };
}
