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

test("only the localhost demo (npm run dev:demo) carries feedback, it is labelled made up, and the real list is untouched", async () => {
  const { ENTRIES } = await import("../config/library.ts");
  const { withDemoFeedback } = await import("../config/demo-feedback.ts");
  const demo = withDemoFeedback(ENTRIES);
  assert.equal(demo.length, ENTRIES.length);
  assert.ok(demo.some((e) => e.feedback?.length), "the demo should add some feedback");
  assert.ok(demo.some((e) => !e.feedback), "some entries stay empty, to show the empty state");
  for (const e of demo) if (e.feedback) {
    assert.equal(e.demoFeedback, true);
    for (const f of e.feedback) assert.ok(!f.text || /made up/i.test(f.text), "every example line says it is made up");
  }
  // The real list is not changed, and the page only imports the demo when the dev switch is on.
  for (const e of ENTRIES) assert.equal(e.feedback, undefined);
  const page = read("../pages/websites.astro");
  assert.match(page, /import\.meta\.env\.DEV && import\.meta\.env\.PUBLIC_DEMO_FEEDBACK/);
  assert.match(read("../components/library/FeedbackDrawer.tsx"), /Demo only: the feedback below is made up/);
});

test("the link to each website opens safely in a new tab and carries no tracking", () => {
  const source = read("../components/library/LibraryPage.tsx");
  assert.match(source, /href=\{entry\.url\}/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /target="_blank"/);
  assert.doesNotMatch(source, /utm_|[?&]ref=/);
});

test("the list page has the 'Top user scored' and 'Best for free' tabs, and its header has no extra 'How we review' button", () => {
  const source = read("../components/library/LibraryPage.tsx");
  assert.match(source, /id: "user", label: "Top user scored"/);
  assert.match(source, /id: "free", label: "Best for free"/);
  // The two tabs are placed after "Top scored", in this order.
  assert.ok(source.indexOf('label: "Top scored"') < source.indexOf('label: "Top user scored"'));
  assert.ok(source.indexOf('label: "Top user scored"') < source.indexOf('label: "Best for free"'));
  assert.doesNotMatch(read("../pages/websites.astro"), /How we review/);
});

test("each row shows one cut-off line of the description that the full text replaces when the row opens", () => {
  const source = read("../components/library/LibraryPage.tsx");
  assert.match(source, /truncate[^"]*">\{row\.summary\}/); // the one-line preview
  assert.match(source, /PREVIEW_SHUT/); // it folds away when the row opens
});

test("the list page drops its content in on arrival: CSS only, transform and opacity only, off for reduced motion, and only once", () => {
  const css = read("../styles/drop.css");
  assert.match(read("../styles/global.css"), /@import "\.\/drop\.css";/);
  // Only motion that the graphics chip does for free: no width, height, top, left or filter inside the keyframes.
  const frames = css.match(/@keyframes drop-in \{[\s\S]*?\n {2}\}/)?.[0] ?? "";
  assert.ok(frames, "@keyframes drop-in is missing");
  assert.match(frames, /opacity/);
  assert.match(frames, /transform/);
  assert.doesNotMatch(frames, /\b(width|height|top|left|right|bottom|margin|padding|filter|blur)\b/);
  // Starts only when motion is allowed, and the delay keeps things hidden (fill "both") instead of flashing.
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
  assert.match(css, /animation-fill-mode:\s*both|\) both/);
  // The page puts the class on its heading words, its sentence words and the island's parts, with a delay each.
  const page = read("../pages/websites.astro");
  assert.match(page, /class="drop(-far)? /);
  assert.match(page, /--d/);
  const island = read("../components/library/LibraryPage.tsx");
  assert.match(island, /entering/); // the classes come off after the entrance, so rows that appear later do not drop again
  assert.match(island, /drop/);
});
