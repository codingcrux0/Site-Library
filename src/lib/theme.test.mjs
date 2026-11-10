// Tests for the colour wheel and dark mode rules (src/lib/theme.ts), the saved-choice reader, the tiny script that runs in
// the page head, and the dark palette in global.css. Run with: npm test
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import {
  DARK_BASE,
  STORAGE_KEY,
  THEME_BOOT_SCRIPT,
  THEME_VARS,
  contrastRatio,
  deriveTheme,
  hsvToRgb,
  parseHex,
  parseStored,
  pickIsDark,
  rgbToHsv,
  serializeTheme,
  toHex,
} from "./theme.ts";

const css = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");

// A small, repeatable "random" number generator, so a failure can be reproduced.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(2026);
const randomHexes = Array.from({ length: 2000 }, () => toHex({ r: Math.floor(random() * 256), g: Math.floor(random() * 256), b: Math.floor(random() * 256) }));
// The awkward ones: white, black, greys, pure colours, bright yellow, near-white, near-black.
const edgeHexes = ["#ffffff", "#000000", "#808080", "#f5f5f5", "#0a0a0a", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff", "#ffeb3b", "#fffff0", "#010101", "#fefefe"];
const allHexes = [...edgeHexes, ...randomHexes];

// ---------- the colour maths ----------

test("parseHex reads 3 and 6 digit colours, with or without the hash", () => {
  assert.deepEqual(parseHex("#2b52ff"), { r: 43, g: 82, b: 255 });
  assert.deepEqual(parseHex("2B52FF"), { r: 43, g: 82, b: 255 });
  assert.deepEqual(parseHex("#abc"), { r: 170, g: 187, b: 204 });
  assert.deepEqual(parseHex("  #000  "), { r: 0, g: 0, b: 0 });
});

test("parseHex refuses anything that is not a plain colour", () => {
  for (const bad of ["", "#", "#12", "#12345", "#1234567", "#ggg", "red", "rgb(1,2,3)", "#12345678", "url(x)", "#fff;color:red", null, undefined, 42, {}]) {
    assert.equal(parseHex(bad), null, `should refuse ${JSON.stringify(bad)}`);
  }
});

test("toHex and parseHex give back the same colour", () => {
  for (const hex of allHexes) assert.equal(toHex(parseHex(hex)), hex);
});

test("rgb to hsv and back is within 1 step for every channel", () => {
  for (const hex of allHexes) {
    const rgb = parseHex(hex);
    const back = hsvToRgb(rgbToHsv(rgb));
    for (const key of ["r", "g", "b"]) assert.ok(Math.abs(back[key] - rgb[key]) <= 1, `${hex} ${key}: ${rgb[key]} -> ${back[key]}`);
  }
});

test("contrastRatio matches the known WCAG values", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff") * 100) / 100, 21);
  assert.equal(contrastRatio("#777777", "#777777"), 1);
  // Order does not matter.
  assert.equal(contrastRatio("#ffffff", "#2b52ff"), contrastRatio("#2b52ff", "#ffffff"));
  // #767676 on white is the classic "just passes 4.5" grey.
  assert.ok(contrastRatio("#767676", "#ffffff") > 4.5 && contrastRatio("#777777", "#ffffff") < 4.6);
});

// ---------- the palette made from one picked colour ----------

test("deriveTheme refuses a bad colour", () => {
  assert.equal(deriveTheme("nonsense"), null);
  assert.equal(deriveTheme("#12345"), null);
});

test("deriveTheme returns exactly the known variables, each a plain #rrggbb colour", () => {
  for (const hex of [...edgeHexes, ...randomHexes.slice(0, 200)]) {
    const theme = deriveTheme(hex);
    assert.deepEqual(Object.keys(theme).sort(), [...THEME_VARS].sort(), hex);
    for (const [name, value] of Object.entries(theme)) assert.match(value, /^#[0-9a-f]{6}$/, `${hex} ${name}`);
  }
});

test("every text colour stays readable (at least 4.5 to 1) on every surface, for any picked colour", () => {
  const failures = [];
  for (const hex of allHexes) {
    const t = deriveTheme(hex);
    const surfaces = ["--surface-base", "--surface-raised", "--surface-sunken", "--surface-brand-subtle", "--tint-sky", "--tint-sand", "--tint-sage", "--tint-lilac"];
    for (const ink of ["--ink-primary", "--ink-secondary", "--ink-muted"]) {
      for (const surface of surfaces) {
        const ratio = contrastRatio(t[ink], t[surface]);
        if (ratio < 4.5) failures.push(`${hex}: ${ink} on ${surface} = ${ratio.toFixed(2)}`);
      }
    }
    for (const surface of ["--surface-base", "--surface-raised", "--surface-sunken", "--surface-brand-subtle"]) {
      const ratio = contrastRatio(t["--ink-brand"], t[surface]);
      if (ratio < 4.5) failures.push(`${hex}: --ink-brand on ${surface} = ${ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} failures`);
});

test("white text on the accent (buttons, pills, active tab) is always readable, also when hovered", () => {
  const failures = [];
  for (const hex of allHexes) {
    const t = deriveTheme(hex);
    for (const bg of ["--action-primary", "--action-primary-hover"]) {
      const ratio = contrastRatio(t["--action-primary-ink"], t[bg]);
      if (ratio < 4.5) failures.push(`${hex}: ${bg} = ${ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures.slice(0, 10), [], `${failures.length} failures`);
});

test("the focus ring can be seen (at least 3 to 1) against the page and the white boxes", () => {
  for (const hex of allHexes) {
    const t = deriveTheme(hex);
    for (const surface of ["--surface-base", "--surface-raised", "--surface-sunken"]) {
      assert.ok(contrastRatio(t["--focus-ring"], t[surface]) >= 3, `${hex} on ${surface}`);
    }
  }
});

test("a saturated pick keeps its colour: the accent stays within 12 degrees of the hue picked", () => {
  for (const hex of randomHexes) {
    const picked = rgbToHsv(parseHex(hex));
    if (picked.s < 40 || picked.v < 40) continue;
    const accent = rgbToHsv(parseHex(deriveTheme(hex)["--action-primary"]));
    const diff = Math.min(Math.abs(picked.h - accent.h), 360 - Math.abs(picked.h - accent.h));
    assert.ok(diff <= 12, `${hex}: hue ${picked.h} became ${accent.h}`);
  }
});

test("a grey pick gives a grey page (no stray tint)", () => {
  const t = deriveTheme("#808080");
  for (const name of ["--surface-base", "--surface-sunken", "--ink-primary", "--action-primary"]) {
    const { r, g, b } = parseHex(t[name]);
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 2, `${name} = ${t[name]}`);
  }
});

test("a light pick gives a bright page with very dark text", () => {
  for (const hex of allHexes.filter((h) => !pickIsDark(h))) {
    const t = deriveTheme(hex);
    // Brightness measured against black (a blue pastel is perceived as bright even though its ratio to white is a little higher).
    assert.ok(contrastRatio(t["--surface-base"], "#000000") >= 13, `${hex} page too dark: ${t["--surface-base"]}`);
    assert.ok(contrastRatio(t["--ink-primary"], "#000000") < 1.6, `${hex} text too light: ${t["--ink-primary"]}`);
  }
});

// ---------- a DARK pick makes a dark site in that colour ----------

test("pickIsDark: near-black and deep colours are dark, ordinary colours are not", () => {
  for (const hex of ["#010411", "#000000", "#0b0d10", "#1a237e", "#0b1f4d", "#202020", "#3b0a0a", "#04201a"]) assert.equal(pickIsDark(hex), true, hex);
  for (const hex of ["#2b52ff", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#ffffff", "#808080", "#c0c0c0"]) assert.equal(pickIsDark(hex), false, hex);
  assert.equal(pickIsDark("nonsense"), false);
});

test("a dark pick becomes the page colour itself, and the page is dark with light text", () => {
  const t = deriveTheme("#010411");
  assert.equal(t["--surface-base"], "#010411");
  const darkOnes = allHexes.filter(pickIsDark);
  assert.ok(darkOnes.length > 100, "not enough dark picks were tried");
  for (const hex of darkOnes) {
    const d = deriveTheme(hex);
    assert.equal(d["--surface-base"], hex, `${hex}: the page should be the picked colour`);
    assert.ok(contrastRatio(d["--surface-base"], "#ffffff") >= 10, `${hex}: page not dark`);
    assert.ok(contrastRatio(d["--ink-primary"], "#ffffff") < 1.6, `${hex}: text not light: ${d["--ink-primary"]}`);
  }
});

test("on a dark pick the boxes are a step lighter than the page, the borders lighter still, and the hue is kept", () => {
  const t = deriveTheme("#010411");
  const lum = (hex) => contrastRatio(hex, "#000000");
  assert.ok(lum(t["--surface-raised"]) > lum(t["--surface-sunken"]) && lum(t["--surface-sunken"]) > lum(t["--surface-base"]), "raised > sunken > page");
  assert.ok(lum(t["--border-subtle"]) > lum(t["--surface-raised"]), "borders lighter than boxes");
  assert.ok(lum(t["--border-strong"]) > lum(t["--border-subtle"]), "strong border lighter than subtle");
  const h = rgbToHsv(parseHex(t["--surface-raised"]));
  assert.ok(h.h > 200 && h.h < 245, `boxes should stay blue, hue ${h.h}`);
  const grey = deriveTheme("#0b0d10");
  assert.equal(grey["--surface-base"], "#0b0d10");
});

test("a dark grey or black pick gives a neutral dark site (no stray colour)", () => {
  const t = deriveTheme("#000000");
  for (const name of ["--surface-base", "--surface-raised", "--surface-sunken", "--ink-primary", "--action-primary", "--ink-brand"]) {
    const { r, g, b } = parseHex(t[name]);
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 2, `${name} = ${t[name]}`);
  }
});

test("a light pick is never treated as dark: the page stays light", () => {
  for (const hex of ["#2b52ff", "#7c3aed", "#db2777"]) assert.equal(contrastRatio(deriveTheme(hex)["--surface-base"], "#000000") >= 13, true, hex);
});

// How far a colour is from white: the biggest gap in any one of red, green, blue.
const awayFromWhite = (hex) => 255 - Math.min(...Object.values(parseHex(hex)));

test("a colourful pick really changes the page colour, the boxes and the borders (not only the buttons)", () => {
  const checked = [];
  for (const hex of randomHexes) {
    const picked = rgbToHsv(parseHex(hex));
    if (picked.s < 50 || picked.v < 40 || pickIsDark(hex)) continue;
    const t = deriveTheme(hex);
    checked.push(hex);
    // The page is a gentle mix (D41), so even the weakest colourful pick only has to be a few steps off white; vivid picks go further.
    assert.ok(awayFromWhite(t["--surface-base"]) >= 4, `${hex}: page ${t["--surface-base"]} looks white`);
    assert.ok(awayFromWhite(t["--surface-raised"]) >= 1, `${hex}: boxes ${t["--surface-raised"]} look white`);
    assert.ok(awayFromWhite(t["--surface-sunken"]) > awayFromWhite(t["--surface-base"]), `${hex}: sunken is not deeper than the page`);
    assert.ok(awayFromWhite(t["--border-subtle"]) >= 12, `${hex}: border ${t["--border-subtle"]} is not tinted`);
  }
  assert.ok(checked.length > 200, "not enough colourful picks were tried");
});

test("the page tint gets stronger the more colourful the pick is", () => {
  const strength = (hex) => awayFromWhite(deriveTheme(hex)["--surface-base"]);
  assert.ok(strength("#ff2d6f") > strength("#c98a9a"), "a vivid pink should tint more than a dull pink");
  assert.ok(strength("#c98a9a") > strength("#999999"));
});

// The blend (D41): the page is the pick MIXED into white, not a flat wash of it. Before, a rose pick turned the whole page hot pink.
const hueGap = (a, b) => {
  const gap = Math.abs(rgbToHsv(parseHex(a)).h - rgbToHsv(parseHex(b)).h);
  return Math.min(gap, 360 - gap);
};
const colourful = (hex) => {
  const picked = rgbToHsv(parseHex(hex));
  return picked.s >= 50 && picked.v >= 40 && !pickIsDark(hex);
};

test("the page is a gentle blend of the pick and white, never a flat flood of the pick", () => {
  for (const hex of allHexes) {
    if (pickIsDark(hex)) continue;
    const t = deriveTheme(hex);
    assert.ok(awayFromWhite(t["--surface-base"]) <= 24, `${hex}: page ${t["--surface-base"]} is too strong`);
    assert.ok(awayFromWhite(t["--surface-sunken"]) <= 34, `${hex}: sunken ${t["--surface-sunken"]} is too strong`);
  }
});

test("the page and boxes keep the hue of the pick (a true mix, not a different colour)", () => {
  // A colour only a few steps off white has no real hue left once it is rounded to whole steps, so only tints with at least 10 steps of
  // colour in them are measured.
  const chroma = (hex) => Math.max(...Object.values(parseHex(hex))) - Math.min(...Object.values(parseHex(hex)));
  let checked = 0;
  for (const hex of randomHexes) {
    if (!colourful(hex)) continue;
    const t = deriveTheme(hex);
    for (const name of ["--surface-base", "--surface-sunken", "--border-strong"]) {
      if (chroma(t[name]) < 10) continue;
      checked++;
      assert.ok(hueGap(hex, t[name]) <= 6, `${hex}: ${name} ${t[name]} drifted from the hue`);
    }
  }
  assert.ok(checked > 200, "not enough tints were measured");
});

test("the four category boxes are neighbours of the pick on the colour wheel (within 55 degrees), so they blend instead of clashing", () => {
  let checked = 0;
  for (const hex of randomHexes) {
    if (!colourful(hex)) continue;
    const t = deriveTheme(hex);
    checked++;
    for (const name of ["--tint-sky", "--tint-sand", "--tint-sage", "--tint-lilac"]) {
      assert.ok(hueGap(hex, t[name]) <= 55, `${hex}: ${name} ${t[name]} is ${hueGap(hex, t[name]).toFixed(0)} degrees away`);
    }
  }
  assert.ok(checked > 200);
});

test("a white or mid-grey pick keeps the original white page", () => {
  for (const hex of ["#ffffff", "#808080", "#c0c0c0"]) {
    assert.equal(deriveTheme(hex)["--surface-base"], "#ffffff", hex);
    assert.equal(deriveTheme(hex)["--surface-raised"], "#ffffff", hex);
  }
});

// ---------- the saved choice ----------

test("parseStored gives the plain default for nothing or for rubbish", () => {
  const fallback = { dark: false, hex: null };
  for (const raw of [null, undefined, "", "not json", "null", "[]", "42", '"x"', '{"v":2,"dark":true}', "{}"]) {
    assert.deepEqual(parseStored(raw), fallback, `raw: ${raw}`);
  }
});

test("parseStored reads a good choice and drops a bad colour", () => {
  assert.deepEqual(parseStored(JSON.stringify({ v: 1, dark: true, hex: "#2b52ff" })), { dark: true, hex: "#2b52ff" });
  assert.deepEqual(parseStored(JSON.stringify({ v: 1, dark: false, hex: "#ABC" })), { dark: false, hex: "#aabbcc" });
  assert.deepEqual(parseStored(JSON.stringify({ v: 1, dark: false, hex: "javascript:alert(1)" })), { dark: false, hex: null });
  // Only the real boolean true counts as dark.
  assert.equal(parseStored(JSON.stringify({ v: 1, dark: "yes", hex: null })).dark, false);
});

test("serializeTheme saves the choice, the made palette and the page colour, and reads back", () => {
  const saved = JSON.parse(serializeTheme({ dark: false, hex: "#2b52ff" }));
  assert.equal(saved.v, 1);
  assert.deepEqual(saved.vars, deriveTheme("#2b52ff"));
  assert.equal(saved.color, saved.vars["--surface-base"]);
  assert.deepEqual(parseStored(JSON.stringify(saved)), { dark: false, hex: "#2b52ff" });
});

test("serializeTheme remembers the picked colour while dark mode is on", () => {
  const saved = JSON.parse(serializeTheme({ dark: true, hex: "#2b52ff" }));
  assert.equal(saved.dark, true);
  assert.equal(saved.hex, "#2b52ff");
  assert.equal(saved.color, DARK_BASE);
});

test("serializeTheme saves whether the palette is dark, so the head script can set it before the page draws", () => {
  assert.equal(JSON.parse(serializeTheme({ dark: false, hex: "#010411" })).tone, "dark");
  assert.equal(JSON.parse(serializeTheme({ dark: false, hex: "#2b52ff" })).tone, undefined);
  assert.equal(JSON.parse(serializeTheme({ dark: true, hex: "#010411" })).tone, undefined, "the dark switch wins");
});

test("serializeTheme with no colour and light mode saves no palette", () => {
  const saved = JSON.parse(serializeTheme({ dark: false, hex: null }));
  assert.equal(saved.vars, undefined);
  assert.equal(saved.color, "#ffffff");
});

// ---------- the script that runs in the page head, before the page draws ----------

// Runs the real script text against a fake page and fake browser storage.
function runBoot({ stored, storageThrows = false } = {}) {
  const set = {};
  const attrs = {};
  const meta = { content: "#ffffff", setAttribute(k, v) { if (k === "content") this.content = v; } };
  const documentStub = {
    documentElement: { style: { setProperty: (k, v) => (set[k] = v) }, setAttribute: (k, v) => (attrs[k] = v) },
    querySelector: (selector) => (selector === 'meta[name="theme-color"]' ? meta : null),
  };
  const localStorage = {
    getItem(key) {
      if (storageThrows) throw new Error("storage blocked");
      return key === STORAGE_KEY ? (stored ?? null) : null;
    },
  };
  vm.runInNewContext(THEME_BOOT_SCRIPT, { document: documentStub, localStorage, JSON, RegExp });
  return { set, attrs, meta };
}

test("boot script with nothing saved changes nothing", () => {
  const { set, attrs, meta } = runBoot();
  assert.deepEqual(set, {});
  assert.deepEqual(attrs, {});
  assert.equal(meta.content, "#ffffff");
});

test("boot script applies a saved colour palette and the browser-bar colour", () => {
  const { set, attrs, meta } = runBoot({ stored: serializeTheme({ dark: false, hex: "#e91e63" }) });
  assert.deepEqual(set, deriveTheme("#e91e63"));
  assert.deepEqual(attrs, {}, "a light palette sets no attribute");
  assert.equal(meta.content, set["--surface-base"]);
});

test("boot script applies a dark palette and marks the page as dark-toned (for scrollbars and form controls)", () => {
  const { set, attrs, meta } = runBoot({ stored: serializeTheme({ dark: false, hex: "#010411" }) });
  assert.deepEqual(set, deriveTheme("#010411"));
  assert.equal(attrs["data-tone"], "dark");
  assert.equal(attrs["data-theme"], undefined);
  assert.equal(meta.content, "#010411");
});

test("boot script in dark mode sets dark and applies no colours", () => {
  const { set, attrs, meta } = runBoot({ stored: serializeTheme({ dark: true, hex: "#e91e63" }) });
  assert.deepEqual(set, {});
  assert.equal(attrs["data-theme"], "dark");
  assert.equal(meta.content, DARK_BASE);
});

test("boot script ignores rubbish, unknown names and anything that is not a plain colour", () => {
  assert.deepEqual(runBoot({ stored: "{{{" }).set, {});
  const evil = JSON.stringify({
    v: 1,
    dark: false,
    vars: { "--surface-base": "url(https://evil.example/x)", "--evil": "#ffffff", "background-image": "#ffffff", "--ink-primary": "#112233" },
    color: "red;x",
  });
  const { set, meta } = runBoot({ stored: evil });
  assert.deepEqual(set, { "--ink-primary": "#112233" });
  assert.equal(meta.content, "#ffffff");
});

test("boot script does not crash when the browser blocks storage", () => {
  assert.doesNotThrow(() => runBoot({ storageThrows: true }));
});

// ---------- the dark palette in global.css ----------

function block(selector) {
  const start = css.indexOf(selector);
  assert.ok(start >= 0, `${selector} not found in global.css`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("}", open));
}
// The { } block that holds a given line (used for the light palette, whose selector is a list).
function blockWith(line) {
  const at = css.indexOf(line);
  assert.ok(at >= 0, `${line} not found in global.css`);
  return css.slice(css.lastIndexOf("{", at) + 1, css.indexOf("}", at));
}
function tokens(text) {
  const out = {};
  for (const m of text.matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}
const dark = tokens(block('html[data-theme="dark"]'));

test("the dark palette defines every colour the wheel can change", () => {
  for (const name of THEME_VARS) assert.ok(dark[name], `${name} is missing from the dark palette`);
});

test("the dark page colour matches the one the boot script uses", () => {
  assert.equal(dark["--surface-base"], DARK_BASE);
});

test("dark text stays readable on every dark surface", () => {
  for (const ink of ["--ink-primary", "--ink-secondary", "--ink-muted"]) {
    for (const surface of ["--surface-base", "--surface-raised", "--surface-sunken", "--surface-brand-subtle", "--tint-sky", "--tint-sand", "--tint-sage", "--tint-lilac"]) {
      assert.ok(contrastRatio(dark[ink], dark[surface]) >= 4.5, `${ink} on ${surface}: ${contrastRatio(dark[ink], dark[surface]).toFixed(2)}`);
    }
  }
  for (const surface of ["--surface-base", "--surface-raised", "--surface-sunken", "--surface-brand-subtle"]) {
    assert.ok(contrastRatio(dark["--ink-brand"], dark[surface]) >= 4.5, `--ink-brand on ${surface}`);
  }
  for (const bg of ["--action-primary", "--action-primary-hover"]) {
    assert.ok(contrastRatio(dark["--action-primary-ink"], dark[bg]) >= 4.5, `ink on ${bg}`);
  }
  assert.ok(contrastRatio(dark["--focus-ring"], dark["--surface-base"]) >= 3);
});

test("the default light palette is still readable", () => {
  // The light palette points at named greys (var(--gray-7)), so look those up in the raw palette block first.
  const raw = tokens(block(":root {\n  --gray-1"));
  const light = {};
  for (const m of blockWith("--surface-base: #ffffff").matchAll(/(--[a-z0-9-]+):\s*(#[0-9a-fA-F]{6}|var\((--[a-z0-9-]+)\))\s*;/g)) {
    light[m[1]] = m[3] ? raw[m[3]] : m[2].toLowerCase();
  }
  for (const ink of ["--ink-primary", "--ink-secondary", "--ink-muted"]) {
    for (const surface of ["--surface-base", "--surface-sunken", "--surface-brand-subtle"]) {
      assert.ok(contrastRatio(light[ink], light[surface]) >= 4.5, `${ink} on ${surface}`);
    }
  }
});

// ---------- what the colour wheel must NOT touch ----------

// The selector text that opens the block containing a given declaration (the lines just above its "{").
function selectorOf(declaration) {
  const open = css.lastIndexOf("{", css.indexOf(declaration));
  const before = css.slice(0, open);
  return before.slice(Math.max(before.lastIndexOf("*/"), before.lastIndexOf("}")) + 1); // Only the selector, not the comment above it.
}

test("the X button, category cards and sign-in cards keep their own colours (the wheel cannot reach them)", () => {
  // The wheel sets its colours on <html>. A block that re-declares the palette on the element itself wins over that.
  const lightSelector = selectorOf("--surface-base: #ffffff");
  assert.match(lightSelector, /\[data-keep-palette\]/, "light palette must also apply to [data-keep-palette]");
  assert.match(css, /html\[data-theme="dark"\] \[data-keep-palette\]/, "dark palette must also apply inside [data-keep-palette]");
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  assert.match(read("../components/ui/stacked-sections.tsx"), /<section[^>]*data-keep-palette/);
  assert.match(read("../components/auth/AuthShowcase.astro"), /<aside[^>]*data-keep-palette/);
});

test("a dark-toned page (dark pick) tells the browser to draw scrollbars and form controls dark, and the dock sets that marker", () => {
  assert.match(css, /html\[data-tone="dark"\]\s*\{[^}]*color-scheme:\s*dark/);
  const dock = readFileSync(new URL("../components/ThemeDock.tsx", import.meta.url), "utf8");
  assert.match(dock, /data-tone/);
  assert.match(dock, /pickIsDark/);
});

test("on a dark pick the category cards and sign-in cards take the dark look (like the moon button), instead of glowing bright on a dark page", () => {
  const darkSelector = selectorOf("--surface-base: #0d0f13");
  assert.match(darkSelector, /html\[data-tone="dark"\] \[data-keep-palette\]/);
});

test("the colour change fades the whole page in one go, not every element one by one (that stalled the list page)", () => {
  const dock = readFileSync(new URL("../components/ThemeDock.tsx", import.meta.url), "utf8");
  assert.match(dock, /startViewTransition/, "ThemeDock should use the browser's page cross-fade");
  assert.match(dock, /prefers-reduced-motion/, "and skip it for people who asked for less motion");
  assert.doesNotMatch(css, /theme-fade/, "the blanket per-element transition must be gone from global.css");
  assert.doesNotMatch(dock, /theme-fade/);
});

test("the mini screens in the category pictures stay light in dark mode (they are white cards with dark bars)", () => {
  // Their bars and cards are drawn for a light page. If dark mode flipped the text colour to light, white labels would sit on white cards.
  const lightSelector = selectorOf("--surface-base: #ffffff");
  assert.match(lightSelector, /\.sc\b/, "the light palette must also be declared on the mini screens (.sc)");
  const darkSelector = selectorOf("--surface-base: #0d0f13");
  assert.doesNotMatch(darkSelector, /\.sc\b/, "the dark palette must not reach the mini screens");
});

test("the X button uses its own colour variables, which the wheel never sets", () => {
  for (const name of ["--logo-bg", "--logo-ink"]) {
    assert.ok(!THEME_VARS.includes(name), `${name} must not be a wheel colour`);
    assert.ok(blockWith("--surface-base: #ffffff").includes(name), `${name} missing from the light palette`);
    assert.ok(dark[name], `${name} missing from the dark palette`);
  }
  const header = readFileSync(new URL("../components/SiteHeader.astro", import.meta.url), "utf8");
  assert.ok(/bg-logo/.test(header) && /text-logo-ink/.test(header), "SiteHeader must use bg-logo and text-logo-ink");
  assert.ok(!/bg-action|text-action-ink/.test(header), "SiteHeader must not use the wheel's button colours");
});

// ---------- a guard so hard-coded white does not creep back in ----------

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|astro)$/.test(name) ? [path] : [];
  });
}

test("no page or component paints a box white or text white by hand (they must use the colour variables)", () => {
  const offenders = [];
  for (const file of sourceFiles(new URL("../", import.meta.url).pathname)) {
    // The picker's own tick mark sits on swatches of every colour, so it is allowed to choose black or white.
    if (file.endsWith("color-picker.tsx")) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/\b(bg|text)-white\b/.test(line)) offenders.push(`${file.split("/src/")[1]}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});
