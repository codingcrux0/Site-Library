// Guards for the list page's per-website actions: the star rating, the review button, the bookmark button and the Bookmarks view.
// Accounts are not open yet (the legal gate is not done), so these controls must only ASK the visitor to sign in:
// they must not save, send or invent anything. Run with: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../styles/global.css");

test("the star rating component (from Wensity) is installed and is self-contained: no network, no tracking, no other package", () => {
  const path = "../components/wensity/star-rating.tsx";
  assert.ok(existsSync(new URL(path, import.meta.url)), "src/components/wensity/star-rating.tsx is missing");
  const source = read(path);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|document\.cookie|import\s*\(/);
  assert.doesNotMatch(source, /https?:\/\//, "no web address may be in the component");
  // The only things it may import: React and the site's own class helper.
  const imports = [...source.matchAll(/^import .* from "(.+)";$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["@/lib/utils", "react"]);
});

test("Tailwind's dark: variant follows the site's own dark switch and dark colour picks, not the computer's setting", () => {
  // Without this, the star's dark styles would turn on whenever the computer is in dark mode, even while the site is bright.
  const line = css.split("\n").find((l) => l.startsWith("@custom-variant dark"));
  assert.ok(line, "@custom-variant dark is missing from global.css");
  assert.match(line, /\[data-theme="dark"\]/);
  assert.match(line, /\[data-tone="dark"\]/);
});

test("the review, rating and bookmark buttons only ask for a sign-in: they save and send nothing", () => {
  const source = read("../components/library/EntryActions.tsx");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie/);
  // Every prompt is honest that accounts are not open yet, and sends the visitor to the sign-in page.
  assert.match(source, /Accounts are not open yet\./);
  assert.match(source, /href="\/sign-in"/);
  // The star rating is controlled at 0: picking a star can never show a made-up rating.
  assert.match(source, /value=\{0\}/);
});

test("the list page has a Bookmarks item in the sidebar that asks for a sign-in", () => {
  const source = read("../components/library/LibraryPage.tsx");
  assert.match(source, /Bookmarks/);
  assert.match(source, /Sign in to see your bookmarks/);
});

test("the feedback panel only reads: it saves and sends nothing, and says accounts are not open", () => {
  const source = read("../components/library/FeedbackDrawer.tsx");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie/);
  assert.match(source, /Accounts are not open yet\./);
  assert.match(source, /href="\/sign-in"/);
  // A dialog that can be closed with the keyboard, and that a screen reader knows is a dialog.
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /Escape/);
});

test("only the localhost demo rows carry feedback, and each says so (the live list never shows made-up reviews)", () => {
  const library = read("../config/library.ts");
  assert.match(library, /export const ENTRIES: Entry\[\] = \[\];/, "the real list must stay empty until real, tested sites are added");
  const preview = read("../config/library-preview.ts");
  assert.match(preview, /feedback:/);
  assert.match(preview, /made up/i);
});
