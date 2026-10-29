// The feature cards that drift up and down beside the sign-in form (components/auth/AuthShowcase.astro).
// Every card is a feature from the product spec (project_spec.md section 7). They are PLANNED for v1, not live yet,
// so the panel says "What's being built". Never add a card for something that is not in the plan.
//
// The cards alternate between the two moving columns: 1st, 3rd, 5th, 7th drift up; 2nd, 4th, 6th, 8th drift down.
// Keep at least 4 per column (8 in total), or the loop will show a gap on tall screens.
//
// `scene` picks the animated mini screen (components/scenes/scene.tsx). `image` is optional and replaces it:
// put the file in public/images/ and write { src: "/images/yourfile.webp", alt: "What it shows" }.
// `tint` must be one of the colours defined in src/styles/global.css (bg-tint-*).

import type { SceneName } from "@/components/scenes/scene";

type ShowcaseCard = {
  scene: SceneName;
  title: string;
  caption: string;
  tint: "bg-tint-sky" | "bg-tint-sand" | "bg-tint-sage" | "bg-tint-lilac";
  image?: { src: string; alt: string };
};

export const SHOWCASE: ShowcaseCard[] = [
  { scene: "tested", title: "Tested by hand", caption: "Every site is tried by a real person, and dated.", tint: "bg-tint-sky" },
  { scene: "catch", title: "The catch, up front", caption: "The limit or the paywall, in plain words.", tint: "bg-tint-sand" },
  { scene: "scores", title: "Two separate scores", caption: "My score and the community score, never mixed.", tint: "bg-tint-sage" },
  { scene: "compare", title: "Compare side by side", caption: "Put two or three tools next to each other.", tint: "bg-tint-lilac" },
  { scene: "pick", title: "Pick for me", caption: "Three quick questions, three picks, with reasons.", tint: "bg-tint-sand" },
  { scene: "search", title: "Instant search", caption: "Find a tool fast, with a keyboard shortcut.", tint: "bg-tint-sky" },
  { scene: "lists", title: "Save your lists", caption: "Keep your favourites in private lists.", tint: "bg-tint-lilac" },
  { scene: "stack", title: "Share your stack", caption: "Turn your top five into a card for X.", tint: "bg-tint-sage" },
];
