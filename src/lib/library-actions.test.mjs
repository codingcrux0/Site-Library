// Guards for the list page's per-website actions: the star rating, the review button, the bookmark button and the Bookmarks view.
// Signed out, these controls only ASK the visitor to sign in. Signed in, they save through ONE place (use-account.ts), and never show a
// rating or a bookmark that nobody made. Run with: npm test
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

test("the review, rating and bookmark buttons never talk to the network or the browser's storage themselves", () => {
  const source = read("../components/library/EntryActions.tsx");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|supabase/i);
  // Signed out, the prompt sends the visitor to the sign-in page.
  assert.match(source, /href="\/sign-in"/);
  assert.ok(!/Accounts are not open yet/.test(source), "accounts are open now, so no prompt may say they are not");
  // The star shows only the visitor's OWN rating (0 when they have none), so a rating nobody gave can never appear.
  assert.match(source, /value=\{armed \? myRating : myRating > 0 \? 1 : 0\}/);
  // A written review is not built; signed in, the button says so plainly instead of pretending.
  assert.match(source, /Written reviews are not open yet/);
});

test("everything that is saved goes through use-account.ts: only the website and the stars are sent, never the owner, and never a secret key", () => {
  const source = read("../components/library/use-account.ts");
  assert.match(source, /from\("bookmarks"\)\.insert\(\{ site_id: id \}\)/);
  assert.match(source, /from\("ratings"\)\.insert\(\{ site_id: id, stars \}\)/);
  assert.match(source, /from\("ratings"\)\.update\(\{ stars \}\)/);
  assert.doesNotMatch(source, /user_id/, "the database fills in the owner; the page never names one");
  assert.match(source, /rpc\("delete_my_account"\)/);
  assert.doesNotMatch(source, /sb_secret_|service_role|SERVICE/i);
  // The public averages are one plain request with the publishable key, no library needed.
  assert.match(source, /\/rest\/v1\/rating_summary/);
  // A visitor with no saved sign-in downloads nothing extra: the library loads only after this check.
  assert.match(source, /hasStoredSession\(window\.localStorage\)/);
});

test("the list page has a Bookmarks item in the sidebar: a sign-in prompt when signed out, the saved websites when signed in", () => {
  const source = read("../components/library/LibraryPage.tsx");
  assert.match(source, /Bookmarks/);
  assert.match(source, /Sign in to see your bookmarks/);
  assert.match(source, /You have not bookmarked a website yet/);
  assert.match(source, /<AccountMenu api=\{api\} \/>/);
});

test("the account menu shows the person's own name and picture, as text and as a picture from Google or GitHub only", () => {
  const source = read("../components/library/AccountMenu.tsx");
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML/, "a name is always shown as plain text");
  assert.match(source, /referrerPolicy="no-referrer"/);
  assert.match(source, /profile\.avatar/);
  assert.match(source, /Sign out/);
  assert.match(source, /Delete my account/);
  assert.match(source, /Download my data/);
  // Deleting asks once more, because it cannot be undone.
  assert.match(source, /This cannot be undone/);
});

test("the feedback panel only reads: it sends nothing itself, and a signed-in person is told plainly that written reviews are not open", () => {
  const source = read("../components/library/FeedbackDrawer.tsx");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie/);
  assert.ok(!/Accounts are not open yet/.test(source));
  assert.match(source, /Written reviews are not open yet/);
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
