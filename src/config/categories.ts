// The four boxes on the landing page. Change the words here; the layout reads from this list.
// The words come from the product spec (project_spec.md sections 2 and 12), so nothing here claims more than the plan.
// Only the first box is live. The other three are the owner's picks for the next categories (the spec adds them one at a time).
//
// `scene` picks the animated mini screen shown in the picture box (components/scenes/scene.tsx).
// `image` is optional: if you add one, it replaces the animated scene.
// To add one: put the file in public/images/ and write { src: "/images/yourfile.webp", alt: "What it shows" }.
// `tint` must be one of the colours defined in src/styles/global.css (bg-tint-*).

import type { SceneName } from "@/components/scenes/scene";

export type Category = {
  name: string;
  summary: string;
  status: string;
  tint: "bg-tint-sky" | "bg-tint-sand" | "bg-tint-sage" | "bg-tint-lilac";
  scene: SceneName;
  image?: { src: string; alt: string };
};

export const CATEGORIES: Category[] = [
  {
    name: "Frontend Components",
    summary:
      "Component libraries, UI kits and the sites behind them. Each one is tried by hand, dated and scored, with the catch spelled out.",
    status: "Now testing",
    tint: "bg-tint-sky",
    scene: "components",
  },
  {
    name: "Dev Tools",
    summary:
      "Hosting, databases, APIs, editors and command-line helpers. The same hand-testing, the same dates, the same honest catch.",
    status: "Coming next",
    tint: "bg-tint-sand",
    scene: "devtools",
  },
  {
    name: "Productivity",
    summary:
      "Notes, tasks, calendars and focus tools. Free plans often hide their limits, so every limit is written down plainly.",
    status: "Coming next",
    tint: "bg-tint-sage",
    scene: "productivity",
  },
  {
    name: "AI Tools",
    summary:
      "Chat assistants, writing and image helpers. Free plans change fast, so each one is dated and its catch is spelled out.",
    status: "Coming next",
    tint: "bg-tint-lilac",
    scene: "ai",
  },
];
