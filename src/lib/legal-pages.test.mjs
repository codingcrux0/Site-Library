// Tests for the Privacy and Terms pages (D46): they must stay TRUE to what the code does, be reachable, and not demand an age the owner did not choose.
// Run with: npm test
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const privacy = read("../pages/privacy.astro");
const terms = read("../pages/terms.astro");

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx|astro)$/.test(name) ? [path] : [];
  });
}

test("the Privacy page says what is stored, the same as the code does", () => {
  for (const word of ["Google", "GitHub", "Supabase", "Tokyo", "bookmarks", "star ratings", "Download my data", "Delete my account"]) {
    assert.ok(privacy.includes(word), `Privacy must mention: ${word}`);
  }
  // The two menu actions it points to really exist, under the same names.
  const menu = read("../components/library/AccountMenu.tsx");
  assert.ok(menu.includes("Download my data") && menu.includes("Delete my account"));
  // "No analytics, no advertising": nothing in the source loads an analytics or ad service.
  const all = sourceFiles(new URL("..", import.meta.url).pathname).map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(all, /google-analytics|googletagmanager|gtag\(|plausible|segment\.com|hotjar|doubleclick|adsbygoogle|facebook\.net|clarity\.ms/i);
});

test("the Privacy page does not claim a rule the site does not have: no age gate, no 'we copy nothing' claim", () => {
  assert.doesNotMatch(privacy + terms, /18 or older|18\+|eighteen/i);
  assert.doesNotMatch(privacy, /do not copy your (profile picture|name)/i);
  assert.match(privacy, /name and the address of your profile picture/);
});

test("the Privacy and Terms pages are listed in the sitemap, linked from the sign-in page and from the home page's footer", () => {
  const sitemap = read("../../public/sitemap.xml");
  for (const page of ["privacy", "terms"]) {
    assert.ok(sitemap.includes(`/${page}/</loc>`), `${page} is not in the sitemap`);
    assert.ok(read("../pages/sign-in.astro").includes(`href="/${page}/"`), `${page} is not linked from the sign-in page`);
    assert.ok(read("../pages/index.astro").includes(`href="/${page}/"`), `${page} is not linked from the home page`);
  }
});

test("both pages say plainly that nobody else sees names or who rated what, and that the account can be deleted", () => {
  assert.match(privacy, /never who gave them/);
  assert.match(terms, /never with your name/);
  assert.match(terms, /delete yours at any time/);
});

test("both pages cover written reviews: plain text, shown without a name, held until approved, and removed with the account", () => {
  assert.match(privacy, /written reviews/i);
  assert.match(privacy, /without your name/i);
  assert.match(privacy, /approve/i);
  assert.match(terms, /written reviews/i);
  assert.match(terms, /web addresses/i);
  assert.match(terms, /remove (a|any) review/i);
  // The menu's "Download my data" file really contains them (the page promises it).
  assert.match(read("../components/library/use-account.ts"), /reviews:/);
});
