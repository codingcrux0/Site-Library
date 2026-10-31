// The category boxes on the home page, and the categories on the list page. Change the words here; the layout reads from this list.
// Order matters: it is the order on the home page and in the sidebar. A category is only worth having if it will hold several sites.
//
// `scene` picks the animated mini screen shown in the picture box (components/scenes/scene.tsx).
// `image` is optional: if you add one, it replaces the animated scene.
// To add one: put the file in public/images/ and write { src: "/images/yourfile.webp", alt: "What it shows" }.
// `tint` must be one of the colours defined in src/styles/global.css (bg-tint-*).
// A new category also needs a group of tags with the SAME name in src/config/tags.ts (npm test checks the two lists match).

import type { SceneName } from "@/components/scenes/scene";

export type Category = {
  name: string;
  summary: string;
  tint: "bg-tint-sky" | "bg-tint-sand" | "bg-tint-sage" | "bg-tint-lilac";
  scene: SceneName;
  image?: { src: string; alt: string };
};

export const CATEGORIES: Category[] = [
  {
    name: "UI Components",
    summary:
      "Copy-paste component libraries for React, React Native and more, from buttons and charts to whole dashboards. Each one is scored, with its free limits and its catch written down.",
    tint: "bg-tint-sky",
    scene: "components",
  },
  {
    name: "Motion & Animation",
    summary:
      "Animation libraries, transition packs and galleries of real app interactions. See what moves well, and what costs extra.",
    tint: "bg-tint-sand",
    scene: "motion",
  },
  {
    name: "3D & Graphics",
    summary:
      "Engines, renderers, physics and effects for 3D on the web and beyond, plus an AI plugin for Blender. Most are open source, and each one says how much 3D knowledge you need first.",
    tint: "bg-tint-lilac",
    scene: "graphics",
  },
  {
    name: "Video & Audio",
    summary:
      "Tools for making, cutting, converting, recording and analysing video, audio and speech, from desktop apps to code libraries. The free ones are marked, and the hard setup steps are written down.",
    tint: "bg-tint-sand",
    scene: "video",
  },
  {
    name: "Design Inspiration",
    summary:
      "Galleries of landing pages, navigation bars, footers and app screens to learn from. Some are free, some hide most of the library behind a plan, and each one says which.",
    tint: "bg-tint-sage",
    scene: "gallery",
  },
  {
    name: "Templates & Assets",
    summary:
      "Ready-made templates, starter projects and backgrounds. The free ones are marked, and the price of every paid one is written down.",
    tint: "bg-tint-lilac",
    scene: "templates",
  },
  {
    name: "Tools & Utilities",
    summary:
      "Everyday tools: PDF and image helpers, AI assistants, Mac apps and directories of more tools. Free plans often hide their limits, so each limit is written down plainly.",
    tint: "bg-tint-sky",
    scene: "search",
  },
];
