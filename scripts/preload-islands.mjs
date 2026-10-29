// An Astro "integration": a small helper that runs once after the build and edits the finished home page.
//
// Problem it solves: the crowd (and the page-view counter) are React "islands". The browser only finds out which script files
// they need AFTER their first script arrives and is read, then it asks for the next ones, and so on: a chain where every link
// costs a full round trip. On a slow or shaky connection that chain, not the pictures, is what makes the crowd appear late.
//
// Fix: list ALL the files those islands need in the page's <head> as <link rel="modulepreload">, so the browser downloads
// them side by side from the start. Only the islands named in EARLY are done: the ones at the top of the page. The ones further
// down (text animation, back-to-top button) still load only when you get near them.
//
// If anything is not found (a renamed island, a page without islands), it quietly does nothing: the site then simply loads
// the old, slower way. The file names carry a fingerprint that changes every build, so they cannot be written by hand: that is why this exists.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Island names as written in src/pages/index.astro (the component's file name without .tsx, e.g. Skiper39 = skiper39.tsx).
const EARLY = ["Skiper39", "VisitCounter"];

export default function preloadIslands() {
  return {
    name: "preload-islands",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const root = fileURLToPath(dir);
        const pagePath = join(root, "index.html");
        const html = readFileSync(pagePath, "utf8");

        // Collect a script file and, one by one, every file it imports.
        const files = new Set();
        const collect = (url) => {
          if (files.has(url)) return;
          files.add(url);
          const code = readFileSync(join(root, url), "utf8");
          // Built files write their imports as from"./name.js" or import"./name.js".
          for (const match of code.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) collect(`/_astro/${match[1]}`);
        };

        for (const [tag] of html.matchAll(/<astro-island\b[^>]*>/g)) {
          const name = /&quot;name&quot;:&quot;([^&]+)&quot;/.exec(tag)?.[1];
          if (!EARLY.includes(name)) continue;
          for (const attribute of ["component-url", "renderer-url"]) {
            const url = new RegExp(`${attribute}="([^"]+)"`).exec(tag)?.[1];
            if (url) collect(url);
          }
        }
        if (files.size === 0) return;

        const links = [...files].map((url) => `<link rel="modulepreload" href="${url}">`).join("");
        writeFileSync(pagePath, html.replace("</head>", `${links}</head>`));
        console.log(`[preload-islands] added ${files.size} modulepreload links to index.html`);
      },
    },
  };
}
