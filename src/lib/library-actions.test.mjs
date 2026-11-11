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
  // Signed in, the Review button opens the feedback panel (where the review is written); it no longer says "not open yet".
  assert.match(source, /onReview/);
  assert.ok(!/not open yet/.test(source));
  // On a touch screen the first tap only OPENS the five stars; it must never rate one star by itself (found in the phone test, D47).
  assert.match(source, /onPointerDownCapture/);
  assert.match(source, /pointerType !== "mouse"/);
  // After rating, a person can take the rating back.
  assert.match(source, /Clear my rating/);
  assert.match(source, /onClear/);
});

test("everything that is saved goes through use-account.ts: only the website and the stars are sent, never the owner, and never a secret key", () => {
  const source = read("../components/library/use-account.ts");
  assert.match(source, /from\("bookmarks"\)\.insert\(\{ site_id: id \}\)/);
  assert.match(source, /from\("ratings"\)\.insert\(\{ site_id: id, stars \}\)/);
  assert.match(source, /from\("ratings"\)\.update\(\{ stars \}\)/);
  assert.doesNotMatch(source, /user_id/, "the database fills in the owner; the page never names one");
  assert.match(source, /rpc\("delete_my_account"\)/);
  // Written reviews: the checked text and the website only; the owner of a review and its "approved" flag are never named by the page.
  assert.match(source, /from\("reviews"\)\.insert\(\{ site_id: id, body: clean\.text \}\)/);
  assert.match(source, /from\("reviews"\)\.update\(\{ body: clean\.text \}\)/);
  assert.match(source, /from\("reviews"\)\.delete\(\)\.eq\("site_id", id\)/);
  assert.match(source, /from\("ratings"\)\.delete\(\)\.eq\("site_id", id\)/);
  assert.doesNotMatch(source, /approved\s*:\s*true/);
  assert.match(source, /cleanReview\(/);
  assert.match(source, /\/rest\/v1\/review_feed/);
  assert.doesNotMatch(source, /sb_secret_|service_role|SERVICE/i);
  // The public averages are one plain request with the publishable key, no library needed.
  assert.match(source, /\/rest\/v1\/rating_summary/);
  // A visitor with no saved sign-in downloads nothing extra: the library loads only after this check.
  assert.match(source, /hasStoredSession\(window\.localStorage\)/);
});

test("'My lists' is one thing: the tab and the sidebar item open the same view, a sign-in prompt when signed out, the saved websites when signed in", () => {
  const source = read("../components/library/LibraryPage.tsx");
  assert.match(source, /My lists/);
  assert.match(source, /Sign in to see your lists/);
  assert.match(read("../components/library/ListsView.tsx"), /You have not saved a website yet/);
  assert.ok(!/Saving lists comes next/.test(source), "the old placeholder must be gone");
  assert.ok(!/useState<"list" \| "bookmarks">/.test(source), "there is one view state: the tab");
  assert.match(source, /<AccountMenu api=\{api\} \/>/);
});

test("named lists are saved through use-account.ts: only the name, or the list and the website, are sent; never an owner", () => {
  const source = read("../components/library/use-account.ts");
  assert.match(source, /from\("lists"\)\s*\.insert\(\{ name: clean\.name \}\)/);
  assert.match(source, /from\("lists"\)\.update\(\{ name: clean\.name \}\)\.eq\("id", id\)/);
  assert.match(source, /from\("lists"\)\.delete\(\)\.eq\("id", id\)/);
  assert.match(source, /from\("list_items"\)\.insert\(\{ list_id: listId, site_id: siteId \}\)/);
  assert.match(source, /from\("list_items"\)\.delete\(\)\.eq\("list_id", listId\)\.eq\("site_id", siteId\)/);
  assert.match(source, /cleanListName\(/);
  assert.match(source, /parseLists\(/);
  // The download of "my data" includes the lists, and sign-out and account deletion empty them.
  assert.match(source, /lists:\s*live\.current\.lists/);
  assert.equal(source.match(/setLists\(\[\]\)/g)?.length, 2, "sign-out and delete-account must both clear the lists");
});

test("the lists view and the list picker send nothing themselves, show names as text, and never offer a website that is not saved", () => {
  for (const file of ["ListsView.tsx", "ListPicker.tsx"]) {
    const source = read(`../components/library/${file}`);
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|supabase|dangerouslySetInnerHTML|innerHTML/i, file);
  }
  const view = read("../components/library/ListsView.tsx");
  assert.match(view, /New list/);
  assert.match(view, /Rename/);
  assert.match(view, /Delete list/);
  assert.match(view, /Your bookmarks stay/);
  assert.match(view, /maxLength=\{LIST_NAME_MAX\}/);
  assert.match(view, /LIST_MAX/);
  const picker = read("../components/library/ListPicker.tsx");
  assert.match(picker, /type="checkbox"/);
  assert.match(picker, /aria-expanded/);
  assert.match(picker, /You have no lists yet/);
  // It is wired into the My lists view of the page, and only there (a website must be saved before it can be put in a list).
  const page = read("../components/library/LibraryPage.tsx");
  assert.match(page, /<ListsView/);
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

test("the feedback panel sends nothing itself: reviews are shown as plain text without names, and written through the account hook", () => {
  const source = read("../components/library/FeedbackDrawer.tsx");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|supabase/i);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML/, "a review is always shown as plain text");
  assert.ok(!/Accounts are not open yet|not open yet/.test(source));
  assert.match(source, /<textarea/);
  assert.match(source, /maxLength=\{REVIEW_MAX\}/);
  assert.match(source, /waiting to be checked/i);
  assert.match(source, /Delete my review/);
  assert.match(source, /Clear my rating/);
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
