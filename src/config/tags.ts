// The "type of website" words used by the filter on the list page (React, Charts, Landing pages...).
// Each placement of a website in src/config/library.ts (one per category it sits in) gets 1 to 5 of these in its `tags`: mostly from that
// category's group below, plus any SHARED tags. A tag must be written here first, spelled the same (src/lib/library-data.test.mjs fails if
// an entry uses a tag that is not in this file).
// To add a tag: add the word to the right category below (or to SHARED_TAGS if it fits every category). Every tag must be unique across the
// whole file. `category` must match a name in src/config/categories.ts, in the same order. The rules for choosing tags are in docs/GRADING.md.

export type TagGroup = { category: string; tags: string[] };

export const TAG_GROUPS: TagGroup[] = [
  {
    category: "UI Components",
    tags: [
      "React", "React Native", "Vue", "Svelte", "Angular", "Next.js", "Astro", "HTML", "CSS", "JavaScript", "TypeScript",
      "Tailwind CSS", "shadcn/ui", "Animation", "Charts", "Forms", "Tables", "Dashboards", "Accessibility", "AI interfaces",
      "Retro style", "Blocks", "Control panels",
    ],
  },
  {
    category: "Motion & Animation",
    tags: [
      "Transitions", "Micro-interactions", "Gestures", "Scroll effects", "Hero sections", "Loaders", "Animated components", "Text effects",
      "Animation engine", "Vector animation", "Math animation",
    ],
  },
  {
    category: "3D & Graphics",
    tags: ["3D", "WebGL", "WebGPU", "three.js", "Physics", "Rendering", "Particles", "Effects", "Blender", "C++"],
  },
  {
    category: "Video & Audio",
    tags: [
      "Video editing", "Video from code", "Screen recording", "Streaming", "Converting", "Transcription", "Speech", "Audio analysis",
    ],
  },
  {
    category: "Design Inspiration",
    tags: [
      "Landing pages", "Navigation", "Footers", "App screens", "User flows", "Interfaces", "Branding", "Illustration", "Resources",
      "Real app examples", "Typography",
    ],
  },
  {
    category: "Templates & Assets",
    tags: ["Templates", "Starters", "Webflow", "Backgrounds", "Gradients", "Fonts", "Colours", "Mockups", "Icons", "Prompts"],
  },
  {
    category: "Tools & Utilities",
    tags: [
      "Image editing", "Image generation", "PDF", "Documents", "Dictation", "Mac", "Directories", "Website builders", "Online tools",
      "No sign-up",
    ],
  },
];

// Tags that make sense in every category, so any placement may use them (they do not count as "from another category").
export const SHARED_TAGS: TagGroup = {
  category: "Across categories",
  tags: ["Open source", "AI", "Copy and paste", "Python", "Command line", "Desktop app"],
};

// The groups to offer for a category ("" = every category). Kept for callers that only want a category's own types.
export function tagGroupsFor(category: string): TagGroup[] {
  return category ? TAG_GROUPS.filter((group) => group.category === category) : TAG_GROUPS;
}

// The groups the "Filter by type" panel lists: the shared types, the category's own types first, then everything else
// (a website that is in two categories brings its other types with it, for example React inside Templates & Assets).
// The panel hides every type no website has, so a long list here costs nothing.
export function filterGroupsFor(category: string): TagGroup[] {
  if (!category) return [SHARED_TAGS, ...TAG_GROUPS];
  return [...tagGroupsFor(category), SHARED_TAGS, ...TAG_GROUPS.filter((group) => group.category !== category)];
}
