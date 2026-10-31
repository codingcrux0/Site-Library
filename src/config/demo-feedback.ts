// LOCALHOST DEMO ONLY (`npm run dev:demo`). Adds made-up feedback to a copy of the real list, so the rating circle and the feedback panel
// can be seen with numbers in them. The panel says "Demo only: the feedback below is made up". The live site never gets this file:
// websites.astro only imports it when the dev server is started with the demo switch, and a test checks the built pages are free of it.

import type { Entry } from "@/config/library";

const DEMO_FEEDBACK = [
  { rating: 5, text: "Example feedback, made up to show the layout. A real review would say what worked well." },
  { rating: 4, text: "Example feedback, made up to show how a longer review wraps onto a second and third line inside the panel on a narrow screen." },
  { rating: 3, text: "Example feedback, made up. Short." },
  { rating: 5 },
  { rating: 2, text: "Example feedback, made up to show a lower rating." },
];

// Every third entry gets none (to show the empty state); the others get 1 to 5 example ratings. Returns new objects, the real list is untouched.
export function withDemoFeedback(entries: Entry[]): Entry[] {
  return entries.map((entry, i) =>
    i % 3 === 2
      ? entry
      : {
          ...entry,
          demoFeedback: true,
          feedback: Array.from({ length: 1 + ((i * 3) % 5) }, (_, k) => ({
            id: `demo-${entry.id}-${k + 1}`,
            author: `Example reader ${k + 1}`,
            date: new Date(Date.UTC(2026, 9, 30) - (i + k * 3) * 86_400_000).toISOString().slice(0, 10),
            ...DEMO_FEEDBACK[(i + k) % DEMO_FEEDBACK.length],
          })),
        },
  );
}
