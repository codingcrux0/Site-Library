// The list page's data. The rule: NOTHING is listed until it has been reviewed and dated.
// "Reviewed" means the site's own pages (pricing, docs, licence, update dates) were read, and for open-source projects their public GitHub page
// (licence, last update). The catch was written from what those say. It does NOT mean someone used the site by hand, and no page says so.
// Never invent a score, a catch or a date for a real website.
//
// ONE WEBSITE, SEVERAL CATEGORIES. A website has a list of `placements`, one per category it fits. The FIRST one is its main category.
// Each placement is judged on its own: its own types (`tags`), its own four `marks`, its own `score`, and (only when the words
// differ in that category) its own `summary` and `theCatch`. So the same website can score 16 as a UI library and 15 as a motion library.
//
// To add one, append an object to ENTRIES, for example:
//   { id: "some-site", name: "Some Site", url: "https://some-site.com", summary: "One line about it.", theCatch: "The limit or paywall, in plain words.",
//     checkedOn: "2026-11-02",
//     placements: [{ category: "UI Components", tags: ["React", "Tailwind CSS"], marks: [4, 3, 4, 5], score: 16 }] }
// `marks` are four 1 to 5 marks in this order: quality (in that category), free tier, beginner ease, freshness. `score` is their sum, so 4 to 20
// (src/lib/library-data.test.mjs checks that it is). THE RULES FOR EVERY MARK ARE WRITTEN IN docs/GRADING.md: use them for every site, so
// two sites with the same evidence get the same marks. The community score is separate and not built yet.
//
// BEST FOR FREE. A placement has `free` EXACTLY when its free-tier mark (the second mark) is 5, which means no paid plan, no membership and
// no usage limit was found on the pages read. Every placement of that website then needs it:
//   free: { marks: [4, 5, 5, 5], score: 19 }
// The four free marks are quality (the same number as in `marks`), no strings, clear terms, freshness (the same number as in `marks`);
// see docs/GRADING.md. The free score is judged separately from the main score and is what the "Best for free" tab sorts by.
//
// `checkedOn` is the date the site was reviewed, written year-month-day. `category` must match a name in src/config/categories.ts.
// `tags` are the "type of website" words for the filter and search. Pick 1 to 5 from src/config/tags.ts, mostly from that category's own
// group (npm test checks that they exist). A longer batch is drafted in docs/drafts/ first, then added here.

import type { Feedback } from "@/lib/ratings";

/** One website as judged inside one category. */
export type Placement = {
  category: string;
  /** Types of website, from src/config/tags.ts (for example "React", "Charts", "Landing pages"). */
  tags: string[];
  /** The four marks, 1 to 5 each: quality, free tier, beginner ease, freshness. */
  marks: number[];
  /** The score: the sum of the four marks, 4 to 20. */
  score: number;
  /** What the website offers in THIS category, when that differs from the main words. */
  summary?: string;
  /** The catch in THIS category, when it differs from the main one. */
  theCatch?: string;
  /** Only for completely free websites: the separate free-use score (marks: quality, no strings, clear terms, freshness). */
  free?: { marks: number[]; score: number };
};

export type Entry = {
  id: string;
  name: string;
  /** The website's own address (https, no tracking parts). The list links to it. */
  url: string;
  summary: string;
  /** "The catch": the limit, paywall or problem nobody mentions. */
  theCatch: string;
  /** The day the site was reviewed, "YYYY-MM-DD". */
  checkedOn: string;
  /** The categories it sits in, main one first. */
  placements: Placement[];
  /** What users wrote and rated. Left out until accounts are open (the legal gate); only the localhost demo (`npm run dev:demo`) adds any. */
  feedback?: Feedback[];
  /** Only for the localhost demo: the feedback above is made up, and the panel says so. Real entries never set this. */
  demoFeedback?: boolean;
};

const DAY = "2026-10-31";

export const ENTRIES: Entry[] = [
  // ---- UI Components ----
  {
    id: "beui",
    name: "beUI",
    url: "https://beui.dev",
    summary: "About 150 animated React components plus React Native components, blocks and charts you copy in with the shadcn CLI.",
    theCatch: "The MIT free library sits beside a separate paid Pro collection (price not shown), and it targets React 19 and Tailwind 4 so older projects need work.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "React Native", "Tailwind CSS", "Animation", "Open source"],
        marks: [4, 4, 3, 5],
        score: 16,
      },
      {
        category: "Motion & Animation",
        tags: ["Animated components", "React"],
        marks: [3, 4, 3, 5],
        score: 15,
        summary: "About 150 React components that come already animated, plus blocks and charts, copied in with the shadcn CLI.",
      },
    ],
  },
  {
    id: "wensity-ui",
    name: "Wensity UI",
    url: "https://ui.wensity.com",
    summary: "112 animated React components, 57 UI primitives and 82 page blocks you copy into your own project, plus free gradient and noise tools.",
    theCatch: "Only 38 components are free; the rest need Pro ($169 a year or $199 once), purchases are final, and it needs React 18.2, TypeScript 5 and Tailwind 4.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Tailwind CSS", "TypeScript", "Animation", "Blocks"],
        marks: [4, 3, 3, 5],
        score: 15,
      },
      {
        category: "Templates & Assets",
        tags: ["Gradients", "Blocks"],
        marks: [3, 3, 3, 5],
        score: 14,
        summary: "82 ready-made page blocks to copy into your own project, plus free gradient and noise tools.",
      },
    ],
  },
  {
    id: "reui",
    name: "ReUI",
    url: "https://reui.io",
    summary: "A shadcn/ui-based library with over 1,200 free components and 27 custom pieces (data grid, kanban, filters) you copy in, plus paid Pro blocks, icons and templates.",
    theCatch: "Pro blocks and templates start at $249 once, some \"free\" templates need an account and aren't MIT, and you must set up shadcn/ui first.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "shadcn/ui", "Tailwind CSS", "Dashboards", "Tables"],
        marks: [4, 4, 3, 5],
        score: 16,
      },
      {
        category: "Templates & Assets",
        tags: ["Templates", "Blocks"],
        marks: [3, 2, 3, 5],
        score: 13,
        summary: "Pro blocks, icons and templates built from the same shadcn/ui parts as its free library.",
      },
    ],
  },
  {
    id: "21st-dev",
    name: "21st.dev",
    url: "https://21st.dev",
    summary: "A community catalogue of React and Tailwind components, templates and themes (it claims over 12,000) with live previews and one-command install.",
    theCatch: "Free use is limited to 2 component copies a day, unlimited copies and premium templates need a paid membership (price not shown), and quality varies because anyone can publish.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "shadcn/ui", "Tailwind CSS"],
        marks: [3, 2, 4, 5],
        score: 14,
      },
      {
        category: "Templates & Assets",
        tags: ["Templates", "React"],
        marks: [3, 2, 3, 5],
        score: 13,
        summary: "Templates and themes that sit next to its community catalogue of React and Tailwind components.",
        theCatch: "Premium templates need a paid membership (price not shown), and because anyone can publish, quality varies.",
      },
    ],
  },
  {
    id: "spectrum-ui",
    name: "Spectrum UI",
    url: "https://ui.spectrumhq.in",
    summary: "Animated React components, blocks and charts built on shadcn/ui, Tailwind and Motion, installable through an MCP server for AI tools.",
    theCatch: "Its counts disagree (250+ on the home page, 58 in the docs) and I couldn't read its FAQ answers, so what is paid isn't confirmed (its GitHub repository is Apache-2.0).",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "shadcn/ui", "Animation", "Charts", "Open source"],
        marks: [3, 4, 3, 4],
        score: 14,
      },
    ],
  },
  {
    id: "easyui",
    name: "EasyUI",
    url: "https://easyui.site",
    summary: "Open-source React components such as an interactive area chart, a gooey menu and a liquid toggle.",
    theCatch: "The landing page shows no licence, install steps or version (its GitHub repository says MIT), and a sponsor ad sits on the page.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Next.js", "shadcn/ui", "Animation", "Open source"],
        marks: [3, 5, 3, 5],
        score: 16,
        free: { marks: [3, 4, 5, 5], score: 17 },
      },
    ],
  },
  {
    id: "bencho",
    name: "Bencho",
    url: "https://bencho.dev",
    summary: "An index of 100+ interactive React components and micro-interactions such as sliders, loaders and drag-and-drop cards.",
    theCatch: "The page lists names only, with no previews, price or install steps, and its GitHub repository has a licence file GitHub can't identify, so read it before you reuse anything.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Animation", "Micro-interactions"],
        marks: [2, 3, 3, 5],
        score: 13,
      },
    ],
  },
  {
    id: "reactdrops",
    name: "ReactDrops",
    url: "https://reactdrops.dev",
    summary: "React components, animations and visual effects you can preview, adjust and copy into your project.",
    theCatch: "The page shows no price or install steps and doesn't say which React versions it supports, and its GitHub repository has a licence file GitHub can't identify.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Animation", "Copy and paste"],
        marks: [3, 3, 3, 5],
        score: 14,
      },
    ],
  },
  {
    id: "panelui",
    name: "PanelUI",
    url: "https://panelui.dev",
    summary: "141 accessible React Native components for Expo, styled with Tailwind and copied in with a command-line tool.",
    theCatch: "It is for Expo and React Native only (not websites). The site states no price (the library's GitHub repository says MIT), and its separate hosted Studio has a monthly allowance.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React Native", "Tailwind CSS", "Accessibility", "Open source", "Copy and paste"],
        marks: [4, 4, 3, 5],
        score: 16,
      },
    ],
  },
  {
    id: "8bitcn",
    name: "8bitcn",
    url: "https://8bitcn.com",
    summary: "Retro 8-bit styled components and blocks you copy and paste. Free and open source, built on shadcn/ui.",
    theCatch: "The page itself names no licence, framework or dates, so check its GitHub repository (it says MIT and shadcn/ui) before you rely on it.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["shadcn/ui", "Retro style", "Open source", "Copy and paste", "Accessibility"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "evil-charts",
    name: "Evil Charts",
    url: "https://evilcharts.com",
    summary: "Animated, interactive chart components for React and shadcn/ui, built on Recharts and ECharts, that you copy into your project.",
    theCatch: "The page shows no price, licence or update date (its GitHub repository says MIT), and you inherit the limits of Recharts and ECharts.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Charts", "shadcn/ui", "Animation", "Open source"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "affectui",
    name: "affectUI",
    url: "https://affectui.com",
    summary: "129 React components, screens and blocks for AI products and SaaS (agent monitors, approval flows, chat composers), each a single file.",
    theCatch: "Only 40 items are free (MIT), the rest is Pro from $199 once, and the page doesn't say which items are the free ones.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "AI interfaces", "TypeScript", "Dashboards", "Blocks"],
        marks: [3, 3, 3, 5],
        score: 14,
      },
    ],
  },
  {
    id: "tweakpane",
    name: "Tweakpane",
    url: "https://github.com/cocopon/tweakpane",
    summary: "A compact GUI panel for fine-tuning parameters and watching values change while a page runs.",
    theCatch: "It is a developer tool for adjusting values in your own code, not a design tool for visitors, and its last update was on 15 March 2026.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["Control panels", "JavaScript", "Open source"],
        marks: [4, 5, 4, 3],
        score: 16,
        free: { marks: [4, 5, 5, 3], score: 17 },
      },
      {
        category: "3D & Graphics",
        tags: ["Control panels", "Open source"],
        marks: [3, 5, 4, 3],
        score: 15,
        summary: "A compact panel for adjusting values live, handy for tuning the settings of a 3D scene or effect while it runs.",
        free: { marks: [3, 5, 5, 3], score: 16 },
      },
    ],
  },
  {
    id: "shadcn-ui",
    name: "shadcn/ui",
    url: "https://ui.shadcn.com",
    summary: "Accessible React components, blocks and charts that you copy into your own project with a command, so the code is yours to change.",
    theCatch: "You own and maintain the copied code, so updates are not automatic, and the page's install steps assume a React project with Tailwind CSS already set up.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Tailwind CSS", "Accessibility", "Copy and paste", "Open source"],
        marks: [5, 5, 4, 5],
        score: 19,
        free: { marks: [5, 5, 5, 5], score: 20 },
      },
    ],
  },
  {
    id: "radix-ui",
    name: "Radix UI",
    url: "https://www.radix-ui.com",
    summary: "An open-source React library with a ready-styled set called Themes, plus unstyled Primitives, Colors and Icons.",
    theCatch: "The Primitives come unstyled, so you write all the styling yourself, and the home page shows install steps only for Themes.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Accessibility", "Open source"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "base-ui",
    name: "Base UI",
    url: "https://base-ui.com",
    summary: "Unstyled, accessible React components with no bundled CSS, made by the team behind Radix, Floating UI and Material UI.",
    theCatch: "It is unstyled, so every style is yours to write, and its page says it offers no support contract beyond a few large partners.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Accessibility", "Open source"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "magicui",
    name: "Magic UI",
    url: "https://magicui.design",
    summary: "More than 150 free, open-source animated React components and effects, built with Tailwind CSS and Motion, that you copy into your project.",
    theCatch: "A paid Pro set of 50+ blocks and templates sits beside the free library (the page shows no price), and everything needs React, Tailwind CSS and Motion.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Tailwind CSS", "Animation", "Copy and paste", "Open source"],
        marks: [4, 4, 4, 5],
        score: 17,
      },
      {
        category: "Motion & Animation",
        tags: ["Animated components", "React", "Open source"],
        marks: [5, 4, 4, 5],
        score: 18,
        summary: "Free animated React components and effects to copy into a page, with a Pro set of full-page blocks beside them.",
      },
    ],
  },
  {
    id: "aceternity-ui",
    name: "Aceternity UI",
    url: "https://ui.aceternity.com",
    summary: "Over 100 free animated React components for Next.js, Tailwind CSS and Framer Motion that you copy in, with an MCP server for AI coding tools.",
    theCatch: "Only the 100+ components are free; blocks, templates and pages cost $169 for a year or $199 once, and the pages show no update dates.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Next.js", "Tailwind CSS", "Animation", "Copy and paste"],
        marks: [3, 4, 4, 3],
        score: 14,
      },
      {
        category: "Motion & Animation",
        tags: ["Animated components", "React"],
        marks: [4, 4, 4, 3],
        score: 15,
        summary: "Over 100 free animated components for React and Next.js to copy into a project, built with Framer Motion.",
      },
    ],
  },
  {
    id: "react-bits",
    name: "React Bits",
    url: "https://reactbits.dev",
    summary: "A large collection of animated React components and effects that you copy in as JavaScript or TypeScript, with plain CSS or Tailwind, or add with a command.",
    theCatch: "Its licence is MIT with a Commons Clause, so you may use it commercially but not resell or repackage the components, and the page links a Pro section without a price.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "JavaScript", "TypeScript", "CSS", "Tailwind CSS"],
        marks: [4, 4, 4, 5],
        score: 17,
      },
      {
        category: "Motion & Animation",
        tags: ["Animated components", "React"],
        marks: [5, 4, 4, 5],
        score: 18,
        summary: "Animated React components and effects to copy into a project, as JavaScript or TypeScript with plain CSS or Tailwind.",
      },
    ],
  },
  {
    id: "daisyui",
    name: "daisyUI",
    url: "https://daisyui.com",
    summary: "A free, open-source Tailwind CSS plugin with 68 components and over 600 utility classes that works with any JavaScript framework.",
    theCatch: "Official templates, a charts product and a Figma library are sold in a separate store (from $19), and it needs Tailwind CSS set up first.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["Tailwind CSS", "CSS", "HTML", "Open source"],
        marks: [5, 4, 4, 5],
        score: 18,
      },
    ],
  },
  {
    id: "mantine",
    name: "Mantine",
    url: "https://mantine.dev",
    summary: "A React library of 120+ components and 70+ hooks, with starter templates for Vite, Next.js and more.",
    theCatch: "It is a full system you build inside, not a pick-and-copy kit, so you wrap your app in its provider and learn how it works; the page asks for sponsors.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Open source"],
        marks: [5, 5, 3, 5],
        score: 18,
        free: { marks: [5, 4, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "ark-ui",
    name: "Ark UI",
    url: "https://ark-ui.com",
    summary: "A headless library of 45+ accessible components for React, Solid, Vue and Svelte that you style yourself.",
    theCatch: "Extra production-ready examples are sold as Ark UI Plus ($199 once for one person), and the components themselves come unstyled.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Vue", "Svelte", "Accessibility", "Open source"],
        marks: [4, 4, 3, 5],
        score: 16,
      },
    ],
  },
  {
    id: "astryx",
    name: "Astryx",
    url: "https://astryx.atmeta.com",
    summary: "An open-source React design system from Meta with 180+ components, themes, page templates and command-line and MCP tools.",
    theCatch: "It is still in beta (version 0.7.0 on 12 October 2026), it needs React 19 and the StyleX styling system, and the page shows no install commands, only links to its guide.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Accessibility", "Open source", "Command line"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "boardui",
    name: "BoardUI",
    url: "https://boardui.com",
    summary: "A React design system for dashboards and agentic (AI agent) interfaces, with 103 components including 19 charts, added to your project with one command.",
    theCatch: "Only the free components are in the MIT repository; the Pro charts and templates cost €149 for a year of updates or €199 once, and it needs React 19.2 and Tailwind CSS 4.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Tailwind CSS", "Dashboards", "Charts", "AI interfaces"],
        marks: [4, 4, 4, 5],
        score: 17,
      },
    ],
  },
  {
    id: "reverseui",
    name: "Reverse UI",
    url: "https://reverseui.com",
    summary: "68 animated React components, such as a radial menu, a dock and a text-scramble effect, each shown with the month it was released.",
    theCatch: "Only 19 of the 68 components are free (with source code and commercial use); the full set is $39 once, and the page states no licence terms beyond commercial use.",
    checkedOn: DAY,
    placements: [
      {
        category: "UI Components",
        tags: ["React", "Animation", "Copy and paste"],
        marks: [3, 4, 4, 4],
        score: 15,
      },
      {
        category: "Motion & Animation",
        tags: ["Animated components", "Text effects"],
        marks: [4, 4, 4, 4],
        score: 16,
        summary: "68 animated components (menus, docks, shaders and text effects) to copy into a React project, each dated by release month.",
      },
    ],
  },
  // ---- Motion & Animation ----
  {
    id: "60fps",
    name: "60fps",
    url: "https://60fps.design",
    summary: "About 2,100 short clips of real app interactions (swipes, loaders, onboarding) from iOS and web apps, with filters.",
    theCatch: "The clips are for learning, not code (only a small Snippets section has any), and a PRO tier exists that the page doesn't explain.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Gestures", "Micro-interactions", "Loaders", "Real app examples"],
        marks: [3, 4, 5, 5],
        score: 17,
      },
      {
        category: "Design Inspiration",
        tags: ["Real app examples", "User flows", "Interfaces"],
        marks: [4, 4, 5, 5],
        score: 18,
        summary: "About 2,100 short clips of real app interactions from iOS and web apps, good for studying how products onboard people and respond.",
      },
    ],
  },
  {
    id: "motionin-design",
    name: "Motionin.design",
    url: "https://motionin.design",
    summary: "A catalogue of animated web sections (heroes, galleries, product showcases), some free and some paid.",
    theCatch: "Paid sections show no price on the list, several are heavy (WebGL and canvas), and some effects are simplified in Safari and Firefox.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Hero sections", "WebGL"],
        marks: [3, 3, 3, 5],
        score: 14,
      },
      {
        category: "Design Inspiration",
        tags: ["Landing pages", "Hero sections"],
        marks: [3, 3, 5, 5],
        score: 16,
        summary: "A catalogue of animated web sections (heroes, galleries, product showcases) to study; some are free, some paid.",
      },
    ],
  },
  {
    id: "transitions-dev",
    name: "Transitions.dev",
    url: "https://transitions.dev",
    summary: "43+ ready-made UI motion transitions with remix links, plus an AI builder and a tool that scores a codebase's motion.",
    theCatch: "Many transitions are Pro-only (no price on the page I read), its GitHub repository has a licence file GitHub can't identify, and the page didn't fully load for me.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Transitions", "React"],
        marks: [4, 3, 4, 5],
        score: 16,
      },
    ],
  },
  {
    id: "kinetics",
    name: "Kinetics",
    url: "https://kinetics.colorion.co",
    summary: "162 interface animation examples for CSS and React (buttons, toggles, tabs, drag, loaders, text effects) you preview and copy.",
    theCatch: "Not every effect has React code, some snippets are partial, a paid Pro version is only on a waitlist, and its GitHub repository has no licence, so reuse rights are unclear.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Micro-interactions", "Gestures", "Loaders", "Text effects", "CSS"],
        marks: [3, 3, 4, 5],
        score: 15,
      },
      {
        category: "UI Components",
        tags: ["CSS", "React", "Animation", "Copy and paste"],
        marks: [2, 3, 4, 5],
        score: 14,
        summary: "162 interface examples for CSS and React (buttons, toggles, tabs, loaders and more) to preview and copy into a project.",
        theCatch: "Not every example has React code, some snippets are partial so you may have to finish them yourself, and the repository has no licence.",
      },
    ],
  },
  {
    id: "motion-library",
    name: "Motion (library)",
    url: "https://github.com/motiondivision/motion",
    summary: "A modern animation library for React and JavaScript, formerly Framer Motion, with gestures, springs, layout transitions, scroll-linked effects and timelines.",
    theCatch: "The library is MIT and free, but Motion+ (extra premium components and examples) is a paid add-on; its docs label which pages need it.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Animation engine", "Gestures", "Scroll effects", "Open source"],
        marks: [5, 4, 4, 5],
        score: 18,
      },
    ],
  },
  {
    id: "anime-js",
    name: "anime.js",
    url: "https://github.com/juliangarnier/anime",
    summary: "A JavaScript animation engine with a simple API that works with CSS properties, SVG, DOM attributes and JavaScript objects.",
    theCatch: "It is code only, with no visual editor, so you write every animation by hand, and its latest changes landed on 21 August 2026.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Animation engine", "JavaScript", "Open source"],
        marks: [5, 5, 4, 4],
        score: 18,
        free: { marks: [5, 5, 5, 4], score: 19 },
      },
    ],
  },
  {
    id: "lottie-web",
    name: "lottie-web",
    url: "https://github.com/airbnb/lottie-web",
    summary: "Plays After Effects animations exported as JSON (with Bodymovin) natively on the web, Android, iOS and React Native.",
    theCatch: "Most animations start in Adobe After Effects, a separate commercial program, and the repository's last change was on 1 September 2025, more than twelve months ago.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Vector animation", "JavaScript", "Open source"],
        marks: [5, 5, 3, 2],
        score: 15,
        free: { marks: [5, 5, 5, 2], score: 17 },
      },
    ],
  },
  {
    id: "manim",
    name: "Manim",
    url: "https://github.com/ManimCommunity/manim",
    summary: "A community-maintained Python animation engine for explanatory maths videos: you describe each scene in code and it renders precise animations.",
    theCatch: "You must install its dependencies first, you write Python for every scene, and it is built for maths-style explainers rather than web animation.",
    checkedOn: DAY,
    placements: [
      {
        category: "Motion & Animation",
        tags: ["Math animation", "Python", "Open source"],
        marks: [5, 5, 2, 5],
        score: 17,
        free: { marks: [5, 5, 5, 5], score: 20 },
      },
      {
        category: "Video & Audio",
        tags: ["Video from code", "Python", "Open source"],
        marks: [4, 5, 2, 5],
        score: 16,
        summary: "Renders explainer videos from Python scenes, best known for maths lessons; it makes new clips and does not edit existing footage.",
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  // ---- 3D & Graphics ----
  {
    id: "three-js",
    name: "three.js",
    url: "https://github.com/mrdoob/three.js",
    summary: "An easy-to-use, lightweight, general-purpose 3D library for the browser, with WebGL and WebGPU renderers and SVG and CSS3D renderers as add-ons.",
    theCatch: "It is a toolbox, not an editor: you write JavaScript for scenes, cameras and lighting, so some 3D basics are needed before you start.",
    checkedOn: DAY,
    placements: [
      {
        category: "3D & Graphics",
        tags: ["3D", "WebGL", "WebGPU", "three.js", "Open source"],
        marks: [5, 5, 3, 5],
        score: 18,
        free: { marks: [5, 5, 5, 5], score: 20 },
      },
    ],
  },
  {
    id: "three-gpu-pathtracer",
    name: "three-gpu-pathtracer",
    url: "https://github.com/gkjohnson/three-gpu-pathtracer",
    summary: "A path tracing renderer for three.js, built on three-mesh-bvh and WebGPU compute shaders, for high-quality physically based images in the browser.",
    theCatch: "It sits on top of three.js and needs a browser with WebGPU, so it is for people who already have a three.js scene to render.",
    checkedOn: DAY,
    placements: [
      {
        category: "3D & Graphics",
        tags: ["Rendering", "WebGPU", "three.js", "Open source"],
        marks: [3, 5, 2, 5],
        score: 15,
        free: { marks: [3, 5, 5, 5], score: 18 },
      },
    ],
  },
  {
    id: "jolt-physics",
    name: "JoltPhysics",
    url: "https://github.com/jrouwe/JoltPhysics",
    summary: "A rigid body physics and collision detection library written in C++, built to use many processor cores and suited to games and VR.",
    theCatch: "It is a C++ library you build into your own program, so it needs programming and build-tool experience.",
    checkedOn: DAY,
    placements: [
      {
        category: "3D & Graphics",
        tags: ["Physics", "C++", "Open source"],
        marks: [4, 5, 2, 5],
        score: 16,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "postprocessing",
    name: "postprocessing",
    url: "https://github.com/pmndrs/postprocessing",
    summary: "A post-processing library for three.js that adds screen effects to a 3D scene after it is drawn.",
    theCatch: "It needs three.js installed and set up first, and it is code only, with no visual editor.",
    checkedOn: DAY,
    placements: [
      {
        category: "3D & Graphics",
        tags: ["Effects", "three.js", "Open source"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "three-quarks",
    name: "three.quarks",
    url: "https://github.com/Alchemist0823/three.quarks",
    summary: "A general-purpose particle system and VFX engine for three.js, with WebGPU rendering and an experimental node-based VFX system.",
    theCatch: "The node-based VFX system is marked experimental, you need a three.js project to use any of it, and the last update was on 21 May 2026.",
    checkedOn: DAY,
    placements: [
      {
        category: "3D & Graphics",
        tags: ["Particles", "Effects", "three.js", "WebGPU", "Open source"],
        marks: [3, 5, 3, 4],
        score: 15,
        free: { marks: [3, 5, 5, 4], score: 17 },
      },
    ],
  },
  {
    id: "mcp-for-blender",
    name: "MCP for Blender",
    url: "https://github.com/ahujasid/mcp-for-blender",
    summary: "A community plugin that lets an AI model of your choice control Blender: describe a scene or a change and it builds it (formerly blender-mcp).",
    theCatch: "It can run arbitrary Python code inside Blender (its README says to save your work first), it sends an anonymous usage record by default, and it is a third-party plugin, not made by Blender.",
    checkedOn: DAY,
    placements: [
      {
        category: "3D & Graphics",
        tags: ["Blender", "3D", "AI", "Open source"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 3, 5, 5], score: 17 },
      },
    ],
  },
  // ---- Video & Audio ----
  {
    id: "remotion",
    name: "Remotion",
    url: "https://github.com/remotion-dev/remotion",
    summary: "Make videos programmatically with React: you build each frame as a component and render the result to a video file.",
    theCatch: "Free for individuals, non-profits and for-profit companies with up to 3 employees; bigger for-profit companies need a paid company licence, and it is Remotion's own licence, not open source.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Video from code", "React"],
        marks: [5, 4, 3, 5],
        score: 17,
      },
      {
        category: "Motion & Animation",
        tags: ["Animation engine", "Video from code"],
        marks: [4, 4, 3, 5],
        score: 16,
        summary: "Describe animations as React components and render them to video, so motion graphics are written as code.",
      },
    ],
  },
  {
    id: "remotion-skills",
    name: "Remotion Skills",
    url: "https://github.com/remotion-dev/skills",
    summary: "Agent Skills from the Remotion team that teach AI coding agents (Claude Code, Codex, Cursor and others) the best practices for Remotion projects, installed with one command.",
    theCatch: "The repository has no licence file, so reuse rights are unclear, and it only helps if you already use an AI coding agent and Remotion (which has its own licence rules).",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Video from code", "AI"],
        marks: [4, 3, 4, 5],
        score: 16,
      },
    ],
  },
  {
    id: "ffmpeg",
    name: "FFmpeg",
    url: "https://github.com/FFmpeg/FFmpeg",
    summary: "A collection of libraries and tools to process audio, video, subtitles and related metadata, the engine behind many converters and players.",
    theCatch: "It is command line only and takes time to learn; this repository is a mirror of the official one, and the licence is LGPL 2.1 or later, becoming GPL if you switch on its optional GPL parts.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Converting", "Video editing", "Command line", "Open source"],
        marks: [5, 5, 2, 5],
        score: 17,
        free: { marks: [5, 5, 4, 5], score: 19 },
      },
    ],
  },
  {
    id: "obs-studio",
    name: "OBS Studio",
    url: "https://github.com/obsproject/obs-studio",
    summary: "Free and open source software for live streaming and screen recording.",
    theCatch: "It has many options (scenes, sources, encoders), so first-time setup takes some learning, and it is licensed GPL-2.0.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Streaming", "Screen recording", "Desktop app", "Open source"],
        marks: [5, 5, 4, 5],
        score: 19,
        free: { marks: [5, 5, 4, 5], score: 19 },
      },
    ],
  },
  {
    id: "lossless-cut",
    name: "LosslessCut",
    url: "https://github.com/mifi/lossless-cut",
    summary: "The swiss army knife of lossless video and audio editing: trim, cut and re-package files (for example MKV to MP4) without re-encoding them.",
    theCatch: "Working without re-encoding has limits (its README links a page of known issues), and the Mac, Microsoft and Snap store versions cost money to support the author while the GitHub downloads stay free.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Video editing", "Converting", "Desktop app", "Open source"],
        marks: [4, 5, 5, 5],
        score: 19,
        free: { marks: [4, 5, 4, 5], score: 18 },
      },
    ],
  },
  {
    id: "whisperx",
    name: "WhisperX",
    url: "https://github.com/m-bain/whisperX",
    summary: "Fast automatic speech recognition (70x realtime with large-v2) with word-level timestamps and speaker diarization.",
    theCatch: "Fast GPU use needs the CUDA toolkit installed first (it also runs on CPU only), and you run it from the command line or from Python.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Transcription", "Speech", "Python", "Open source", "AI"],
        marks: [5, 5, 2, 5],
        score: 17,
        free: { marks: [5, 5, 5, 5], score: 20 },
      },
    ],
  },
  {
    id: "librosa",
    name: "librosa",
    url: "https://github.com/librosa/librosa",
    summary: "A Python library for audio and music analysis.",
    theCatch: "It analyses sound rather than editing it, and you need to write Python to use it.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Audio analysis", "Python", "Open source"],
        marks: [4, 5, 3, 5],
        score: 17,
        free: { marks: [4, 5, 5, 5], score: 19 },
      },
    ],
  },
  {
    id: "cosyvoice",
    name: "CosyVoice",
    url: "https://github.com/QwenAudio/CosyVoice",
    summary: "An open text-to-speech system built on large language models: Fun-CosyVoice 3.0 covers 9 languages and 18+ Chinese dialects, with streaming output as fast as 150 ms.",
    theCatch: "You run the models yourself, which needs Python, model downloads and a capable machine, and the repository's last update was on 25 May 2026.",
    checkedOn: DAY,
    placements: [
      {
        category: "Video & Audio",
        tags: ["Speech", "AI", "Python", "Open source"],
        marks: [5, 5, 2, 4],
        score: 16,
        free: { marks: [5, 5, 5, 4], score: 19 },
      },
    ],
  },
  // ---- Design Inspiration ----
  {
    id: "landdding",
    name: "Landdding",
    url: "https://landdding.com",
    summary: "A gallery of landing page and website designs from Webflow, Framer, WordPress and more, with templates and a colour browser.",
    theCatch: "The free plan limits the feed, search and filters (the limit isn't stated), shows partner ads and can't submit sites. PRO is $4 a month.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Landing pages", "Resources", "Colours"],
        marks: [3, 3, 5, 3],
        score: 14,
      },
      {
        category: "Templates & Assets",
        tags: ["Templates", "Colours"],
        marks: [3, 3, 3, 3],
        score: 12,
        summary: "Website templates and a colour browser that sit beside its gallery of landing page designs.",
      },
    ],
  },
  {
    id: "collect-ui",
    name: "Collect UI",
    url: "https://collectui.com",
    summary: "A daily-updated gallery of hand-picked interface designs, many from Dribbble, sorted by what they show.",
    theCatch: "Much of the page is sponsor links, and the designs are pictures to learn from, not components you can copy.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Interfaces"],
        marks: [3, 5, 5, 4],
        score: 17,
        free: { marks: [3, 3, 2, 4], score: 12 },
      },
    ],
  },
  {
    id: "inspora",
    name: "Inspora",
    url: "https://inspora.design",
    summary: "A visual gallery of web, branding, product, motion, illustration, 3D and print designs, updated often.",
    theCatch: "Posts show pictures and titles only, with no descriptions, credits or usage terms, so you can't tell who made a design or if you may reuse it.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Branding", "Illustration", "Interfaces", "3D"],
        marks: [3, 5, 5, 4],
        score: 17,
        free: { marks: [3, 4, 2, 4], score: 13 },
      },
    ],
  },
  {
    id: "footer-design",
    name: "Footer",
    url: "https://footer.design",
    summary: "A gallery of website footer designs you can filter by style (typographic, grid, animated, dark and more).",
    theCatch: "It shows footers only, it doesn't say how designs are chosen, and at least one entry is marked Sponsored.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Footers", "Interfaces"],
        marks: [3, 5, 5, 5],
        score: 18,
        free: { marks: [3, 4, 2, 5], score: 14 },
      },
    ],
  },
  {
    id: "mobbin",
    name: "Mobbin",
    url: "https://mobbin.com",
    summary: "A searchable library of real app and website screenshots, screens and user flows for design research.",
    theCatch: "Most of the library is behind paid plans, the free plan is limited (its limits aren't shown), and the AI-agent connection needs a paid plan.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["App screens", "User flows", "Interfaces"],
        marks: [4, 2, 5, 5],
        score: 16,
      },
    ],
  },
  {
    id: "navbar-gallery",
    name: "Navbar Gallery",
    url: "https://navbar.gallery",
    summary: "A gallery of navigation bar designs sorted by type: static, dropdown, mega menu, sidebar and more.",
    theCatch: "It covers navbars only, is sponsored by Mobbin with banners throughout, and shows no terms for reusing the designs.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Navigation", "Interfaces"],
        marks: [3, 5, 5, 5],
        score: 18,
        free: { marks: [3, 3, 2, 5], score: 13 },
      },
    ],
  },
  {
    id: "designeer",
    name: "Designeer",
    url: "https://designeer.xyz",
    summary: "A curated catalogue of interface craft, component libraries, AI tools and resources, with a feed of recent designs from individual creators.",
    theCatch: "Sponsored placements are prominent, the site is marked \"All Rights Reserved\" with no reuse terms, and it has accounts without saying what is free.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Resources", "Interfaces"],
        marks: [3, 3, 5, 5],
        score: 16,
      },
      {
        category: "Tools & Utilities",
        tags: ["Directories", "Resources"],
        marks: [2, 3, 5, 5],
        score: 15,
        summary: "A curated directory of component libraries, AI tools and design resources, with a feed of recent work.",
      },
    ],
  },
  {
    id: "recent-design",
    name: "Recent",
    url: "https://recent.design",
    summary: "A design inspiration feed of web and interface work, with creators credited and linked to their X profiles, and a job board for design roles. godly.website now redirects here.",
    theCatch: "Sponsored entries and job listings from companies sit among the designs, and its pages state no reuse terms.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Interfaces"],
        marks: [4, 5, 5, 5],
        score: 19,
        free: { marks: [4, 4, 2, 5], score: 15 },
      },
    ],
  },
  {
    id: "land-book",
    name: "Land-book",
    url: "https://land-book.com",
    summary: "A curated gallery of landing page and website designs.",
    theCatch: "Its pages block automated reading, so this review rests on third-party listings: the free plan limits categories, sections and search results, and Pro is listed from about $6 a month billed yearly.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Landing pages"],
        marks: [3, 3, 5, 3],
        score: 14,
      },
    ],
  },
  {
    id: "fontinlogo",
    name: "Font In Logo",
    url: "https://fontinlogo.com",
    summary: "A searchable library of the typefaces behind well-known logos, with designer-verified labels, a text generator and lists of famous film, TV and game fonts.",
    theCatch: "Free previews carry a watermark; clean downloads, SVG and 4K exports need a paid plan ($9 a month, $29 a year or $99 once), and promoted template listings sit among the results.",
    checkedOn: DAY,
    placements: [
      {
        category: "Design Inspiration",
        tags: ["Branding", "Typography", "Fonts"],
        marks: [3, 4, 5, 5],
        score: 17,
      },
    ],
  },
  // ---- Templates & Assets ----
  {
    id: "wedoflow",
    name: "Wedoflow",
    url: "https://wedoflow.com",
    summary: "A shop of about 200 premium Webflow templates, with an All-Access pass.",
    theCatch: "Templates are $24 to $169 and downloads need a subscription; some listings contradict themselves (marked \"free\" but priced $79).",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Templates", "Webflow"],
        marks: [3, 2, 3, 5],
        score: 13,
      },
    ],
  },
  {
    id: "foldwell",
    name: "Foldwell",
    url: "https://uberdesigner.ai/t/foldwell",
    summary: "A paid animated template of a dark file-manager screen, with a prompt for AI coding tools and a Vite and React project.",
    theCatch: "It costs $29 a month or $249 a year with no free tier, you can't resell or share the files, and the Figma file is still \"coming soon\".",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Templates", "Starters", "Animation"],
        marks: [2, 1, 3, 5],
        score: 11,
      },
    ],
  },
  {
    id: "v0-templates",
    name: "v0 Templates",
    url: "https://v0.app/templates",
    summary: "A library of community-made starter templates (apps, landing pages, dashboards, login screens) from the v0 AI builder.",
    theCatch: "The page doesn't show prices or what the free plan allows, and you need an account to use a template.",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Templates", "Starters", "Dashboards"],
        marks: [3, 3, 4, 3],
        score: 13,
      },
    ],
  },
  {
    id: "backgrounds-supply",
    name: "Backgrounds Supply",
    url: "https://backgrounds.supply",
    summary: "A library of backgrounds, wallpapers and gradients sold as a one-time $49 purchase.",
    theCatch: "There is no free tier, no refunds on the digital product, and you can't resell the images as your own pack; its own counts disagree (1,273 or 1,167 backgrounds).",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Backgrounds", "Gradients"],
        marks: [3, 1, 5, 5],
        score: 14,
      },
    ],
  },
  {
    id: "motionsites",
    name: "MotionSites",
    url: "https://motionsites.ai",
    summary: "Ready-made website prompts for AI builders such as Lovable, Bolt, Cursor and Claude, many for animated and 3D landing pages.",
    theCatch: "The page doesn't say what is free or what \"Go Unlimited\" costs, its terms and refund pages weren't readable, and you also need an AI builder to use a prompt.",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Prompts", "Templates"],
        marks: [3, 3, 4, 4],
        score: 14,
      },
      {
        category: "Motion & Animation",
        tags: ["Hero sections", "Scroll effects"],
        marks: [2, 3, 4, 4],
        score: 13,
        summary: "Prompts for animated, scroll-driven and 3D website sections, to paste into an AI builder.",
      },
    ],
  },
  {
    id: "runeicons",
    name: "Rune Icons",
    url: "https://runeicons.com",
    summary: "An open-source icon system of 900+ icons in five styles (outline, duotone, fill, pixel, glass), with a browser editor and packages for React, Vue, Svelte, Astro, React Native and plain JavaScript.",
    theCatch: "The 1,125 brand logos are not covered by its Apache 2.0 licence, the Flutter, VS Code and Figma versions are still \"coming soon\", and the site shows no version number.",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Icons", "Open source", "Copy and paste"],
        marks: [4, 5, 4, 5],
        score: 18,
        free: { marks: [4, 5, 4, 5], score: 18 },
      },
      {
        category: "UI Components",
        tags: ["React", "Vue", "Svelte", "Astro", "Open source"],
        marks: [3, 5, 4, 5],
        score: 17,
        summary: "Icon packages you add with one command for React, Vue, Svelte, Astro and React Native; its FAQ says each icon is tree-shakeable.",
        free: { marks: [3, 5, 4, 5], score: 17 },
      },
    ],
  },
  {
    id: "pryzm",
    name: "Pryzm",
    url: "https://pryzm.design",
    summary: "A browser studio for making gradient, glass and grain backgrounds and seamless animated loops with WebGL, with a gallery of looks to start from.",
    theCatch: "Exporting needs a free account, free video is small and watermarked, and clean or larger exports need Pro at $9 a month; you may not resell exports as stock.",
    checkedOn: DAY,
    placements: [
      {
        category: "Templates & Assets",
        tags: ["Backgrounds", "Gradients", "WebGL"],
        marks: [3, 3, 5, 5],
        score: 16,
      },
    ],
  },
  // ---- Tools & Utilities ----
  {
    id: "doblique",
    name: "Doblique",
    url: "https://doblique.com",
    summary: "27 free browser tools for PDFs, images, text, code and calculators, with no sign-up.",
    theCatch: "Most tools take files up to 100 MB (250 MB for splitting and deleting PDF pages), and \"files never leave your browser\" is the site's own claim.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Online tools", "PDF", "Image editing", "No sign-up"],
        marks: [3, 4, 5, 5],
        score: 17,
      },
    ],
  },
  {
    id: "remove-bg",
    name: "remove.bg",
    url: "https://remove.bg",
    summary: "An online tool that removes the background from a photo automatically, with apps, an API and a Photoshop extension.",
    theCatch: "The \"free\" use is limited (the page doesn't say how) and top quality needs a paid plan; images you rate may be used to improve the service unless you opt out.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["AI", "Image editing"],
        marks: [4, 3, 5, 5],
        score: 17,
      },
    ],
  },
  {
    id: "tapmac",
    name: "TapMac",
    url: "https://gettapmac.com",
    summary: "A Mac app that starts dictation, AI text actions or clipboard history when you tap your MacBook.",
    theCatch: "It is paid ($7.99 at launch, then $20) with no free trial, only 5 days to get a refund; it needs an Apple silicon Mac on macOS 14 or later, and the AI actions need macOS 26.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Mac", "Dictation", "AI"],
        marks: [3, 1, 4, 5],
        score: 13,
      },
    ],
  },
  {
    id: "iter0",
    name: "Iter0",
    url: "https://iter0.com",
    summary: "An AI builder that turns a product brief into an editable launch page, with an API for developers.",
    theCatch: "Its page shows no pricing or free tier, and the API needs keys it doesn't explain how to get.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["AI", "Website builders"],
        marks: [3, 3, 4, 5],
        score: 15,
      },
    ],
  },
  {
    id: "isthereanytool",
    name: "isthereanytool?",
    url: "https://isthereanytool.app",
    summary: "A searchable directory of nearly 1,900 design, craft and AI tools in 20 categories, with guides and comparisons.",
    theCatch: "Sponsored placements sit among the results, and listings show no dates, so you can't tell how current they are.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Directories", "AI"],
        marks: [3, 5, 5, 3],
        score: 16,
        free: { marks: [3, 3, 2, 3], score: 11 },
      },
    ],
  },
  {
    id: "comfyui",
    name: "ComfyUI",
    url: "https://github.com/Comfy-Org/ComfyUI",
    summary: "A node-based interface for building diffusion-model workflows that generate images, video, audio and 3D, with a desktop app, a portable build and an API.",
    theCatch: "Running it locally needs a capable GPU and large model downloads (the README says it can work on as little as 4 GB of VRAM), and the official Comfy Cloud is a separate paid service.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Image generation", "AI", "Desktop app", "Open source"],
        marks: [5, 4, 3, 5],
        score: 17,
      },
      {
        category: "Video & Audio",
        tags: ["AI", "Desktop app", "Open source"],
        marks: [4, 4, 3, 5],
        score: 16,
        summary: "Build and reuse video and audio generation workflows (as well as images and 3D) in a visual node graph, without writing code.",
      },
    ],
  },
  {
    id: "penpot",
    name: "Penpot",
    url: "https://penpot.app",
    summary: "An open-source design and prototyping tool that runs in the browser, with a free plan and an open-source option you can host yourself.",
    theCatch: "Its pricing page is unclear about the free plan's limits (it mentions up to 8 team members and storage caps without saying which plan they belong to), and paid plans start at $7 per editor a month.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Design tools", "Online tools", "Open source"],
        marks: [5, 4, 5, 5],
        score: 19,
      },
    ],
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    url: "https://excalidraw.com",
    summary: "An open-source whiteboard for sketching diagrams on an infinite canvas, with ready-made libraries and a share link for live collaboration, and no account needed to start.",
    theCatch: "Cloud workspaces, presentations and wider team features belong to a paid plan called Excalidraw+ (14-day trial, price not shown on its page).",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Whiteboards", "Online tools", "Open source", "No sign-up"],
        marks: [5, 4, 5, 5],
        score: 19,
      },
    ],
  },
  {
    id: "photopea",
    name: "Photopea",
    url: "https://www.photopea.com",
    summary: "An image editor in your browser that opens and saves PSD files and dozens of other formats, including AI, Figma, SVG and RAW photos.",
    theCatch: "Its own page mentions no price, but third-party sites report ads in the free version and a paid Premium plan whose price they give differently, so check photopea.com; \"processed on your device\" is the site's own claim.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Image editing", "Design tools", "Online tools"],
        marks: [4, 4, 5, 5],
        score: 18,
      },
    ],
  },
  {
    id: "tldraw",
    name: "tldraw",
    url: "https://www.tldraw.com",
    summary: "A free online whiteboard for instant collaboration, built on a developer kit (an SDK) you can use to make your own canvas apps.",
    theCatch: "The whiteboard is free, but using the kit in a production app needs a paid licence (a free hobby licence exists for personal projects, and no price is shown), so check before you build on it.",
    checkedOn: DAY,
    placements: [
      {
        category: "Tools & Utilities",
        tags: ["Whiteboards", "Online tools"],
        marks: [4, 3, 5, 5],
        score: 17,
      },
    ],
  },
];
