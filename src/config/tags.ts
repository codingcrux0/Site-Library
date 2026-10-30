// The "type of website" words used by the filter on the list page (React, CSS, Java...).
// Each website in src/config/library.ts gets a few of these in its `tags`. A tag must be written here first, spelled the same
// (a test in src/lib/search.test.mjs fails if an entry uses a tag that is not in this list).
// To add a tag: add the word to the right category below. Every tag must be unique across the whole file.
// `category` must match a name in src/config/categories.ts.

export type TagGroup = { category: string; tags: string[] };

export const TAG_GROUPS: TagGroup[] = [
  {
    category: "Frontend Components",
    tags: [
      "React", "Vue", "Svelte", "Angular", "Next.js", "Astro", "HTML", "CSS", "Tailwind CSS", "JavaScript", "TypeScript",
      "Animation", "Icons", "Charts", "Forms", "Tables", "Templates", "Fonts", "Colours", "Accessibility", "Dashboards",
    ],
  },
  {
    category: "Dev Tools",
    tags: [
      "Hosting", "Deployment", "Databases", "APIs", "Authentication", "Editors", "Command line", "Git", "Docker", "Testing",
      "Monitoring", "Security", "Java", "Python", "Node.js", "Go", "Rust", "PHP",
    ],
  },
  {
    category: "Productivity",
    tags: ["Notes", "Tasks", "Calendar", "Focus", "Whiteboard", "Documents", "Spreadsheets", "Email", "Time tracking", "Habits"],
  },
  {
    category: "AI Tools",
    tags: ["Chat", "Writing", "Image", "Code", "Audio", "Video", "Research", "Translation", "Presentations", "Data analysis"],
  },
];

// The groups to offer for a category ("" = every category).
export function tagGroupsFor(category: string): TagGroup[] {
  return category ? TAG_GROUPS.filter((group) => group.category === category) : TAG_GROUPS;
}
