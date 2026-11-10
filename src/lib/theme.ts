// The colour wheel and dark mode rules, as plain functions (so they can be tested without a browser).
// Tests: src/lib/theme.test.mjs. The dark palette itself lives in src/styles/global.css (html[data-theme="dark"]).
//
// How it works: the whole site takes its colours from CSS variables (--ink-primary, --action-primary ...).
// Picking a colour makes a full set of those variables from ONE colour, with the text colours worked out so they
// stay readable whatever was picked. A light pick makes a bright page; a dark pick makes a dark page in that colour.
// The moon button (dark mode) removes the picked colours again and the dark palette in global.css takes over.

export type Rgb = { r: number; g: number; b: number };
/** h is 0 to 360, s and v are 0 to 100 (the ranges the colour picker uses). */
export type Hsv = { h: number; s: number; v: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

/** Reads "#rgb" or "#rrggbb" (the hash is optional). Anything else, including 8 digit colours, gives null. */
export function parseHex(input: unknown): Rgb | null {
  if (typeof input !== "string") return null;
  const raw = input.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return null;
  const full = raw.length === 3 ? raw.replace(/./g, "$&$&") : raw;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const d = max - Math.min(rr, gg, bb);
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hh = (((h % 360) + 360) % 360) / 60;
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = vv - c;
  const parts: [number, number, number][] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = parts[Math.floor(hh) % 6];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

// HSL is the easiest way to say "same colour, but lighter or darker", so the palette below is written in it.
function rgbToHsl({ r, g, b }: Rgb) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: rgbToHsv({ r, g, b }).h, s, l };
}

function hslHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = l - c / 2;
  const parts: [number, number, number][] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]];
  const [r, g, b] = parts[Math.floor(hh) % 6];
  return toHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}

// Mixes a colour into white: 0 gives white, 1 gives the colour itself. The hue never changes, the page just gets a hint of it.
function mixIntoWhite(colour: Rgb, amount: number): string {
  const part = (c: number) => 255 - (255 - c) * amount;
  return toHex({ r: part(colour.r), g: part(colour.g), b: part(colour.b) });
}

// ---------- contrast (WCAG 2: text needs at least 4.5 to 1 against what is behind it) ----------

function luminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 1 (no contrast) to 21 (black on white). Takes two "#rrggbb" colours, in either order. */
export function contrastRatio(a: string, b: string): number {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return 1;
  const [light, dark] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// ---------- one picked colour becomes a whole palette ----------

/** Every CSS variable the colour wheel sets. Dark mode must define all of them too (a test checks that). */
export const THEME_VARS = [
  "--surface-base",
  "--surface-raised",
  "--surface-sunken",
  "--surface-brand-subtle",
  "--border-subtle",
  "--border-strong",
  "--ink-primary",
  "--ink-secondary",
  "--ink-muted",
  "--ink-brand",
  "--action-primary",
  "--action-primary-hover",
  "--action-primary-ink",
  "--focus-ring",
  "--tint-sky",
  "--tint-sand",
  "--tint-sage",
  "--tint-lilac",
] as const;

export type ThemeVars = Record<(typeof THEME_VARS)[number], string>;

// A little above 4.5, so the rounding to whole colour steps can never push a pair under the line.
const READABLE = 4.6;

// The same colour, made darker a step at a time until it is readable against every colour in `against`.
function darkenUntilReadable(h: number, s: number, l: number, against: string[]): string {
  let light = l;
  let hex = hslHex(h, s, light);
  while (light > 0 && against.some((bg) => contrastRatio(hex, bg) < READABLE)) {
    light = Math.max(0, light - 0.01);
    hex = hslHex(h, s, light);
  }
  return hex;
}

// The opposite of the above, for a dark page: the same colour, made lighter a step at a time until it is readable on every colour.
function lightenUntilReadable(h: number, s: number, l: number, against: string[]): string {
  let light = l;
  let hex = hslHex(h, s, light);
  while (light < 1 && against.some((bg) => contrastRatio(hex, bg) < READABLE)) {
    light = Math.min(1, light + 0.01);
    hex = hslHex(h, s, light);
  }
  return hex;
}

// A pick this dark (white text on it would be 10 to 1 or better, a colour like #1a237e or #010411) cannot make a bright page with
// dark text, so it makes a dark page in that colour instead. Ordinary colours (even deep blue #2b52ff) stay on the bright page.
const DARK_PICK_MAX_LUMINANCE = 0.055;

/** True if the picked colour is dark enough that the site turns dark in that colour. False for anything that is not a valid colour. */
export function pickIsDark(hex: string): boolean {
  const picked = parseHex(hex);
  return picked !== null && luminance(picked) <= DARK_PICK_MAX_LUMINANCE;
}

// The palette for a dark pick: the page IS the picked colour, the boxes and borders step up in lightness (same hue), text is light.
function deriveDarkTheme(picked: Rgb): ThemeVars {
  const { h, s, l } = rgbToHsl(picked);
  const colour = Math.min(s, 0.6); // How much hue the lifted surfaces carry (a grey or black pick stays neutral).
  const lifted = (amount: number, hueShift = 0) => hslHex(h + hueShift, colour, Math.min(1, l + amount));
  const surfaceBase = toHex(picked);
  const surfaceRaised = lifted(0.045);
  const surfaceSunken = lifted(0.02);
  const surfaceBrandSubtle = hslHex(h, Math.min(s, 0.8), Math.min(1, l + 0.08));
  // A neighbouring hue (green, say) is brighter to the eye than the pick itself, so each tint is darkened until it is still dark
  // (white on it at least 8 to 1), which keeps every text colour readable on it.
  const tint = (hueShift: number) => {
    let light = Math.min(1, l + 0.05);
    let hex = hslHex(h + hueShift, colour, light);
    while (light > 0 && contrastRatio(hex, "#ffffff") < 8) {
      light = Math.max(0, light - 0.01);
      hex = hslHex(h + hueShift, colour, light);
    }
    return hex;
  };
  const tints = [tint(0), tint(35), tint(-35), tint(70)];
  const surfaces = [surfaceBase, surfaceRaised, surfaceSunken, surfaceBrandSubtle, ...tints];
  const brandSat = Math.min(s, 0.9);
  const brand = lightenUntilReadable(h, brandSat, 0.72, surfaces);
  // Buttons are light with dark writing, the same idea as the moon-button dark mode.
  const actionSat = Math.min(s, 0.5);
  return {
    "--surface-base": surfaceBase,
    "--surface-raised": surfaceRaised,
    "--surface-sunken": surfaceSunken,
    "--surface-brand-subtle": surfaceBrandSubtle,
    "--border-subtle": lifted(0.14),
    "--border-strong": lifted(0.23),
    "--ink-primary": lightenUntilReadable(h, 0.3 * colour, 0.95, surfaces),
    "--ink-secondary": lightenUntilReadable(h, 0.25 * colour, 0.78, surfaces),
    "--ink-muted": lightenUntilReadable(h, 0.2 * colour, 0.7, surfaces),
    "--ink-brand": brand,
    "--action-primary": hslHex(h, actionSat, 0.94),
    "--action-primary-hover": hslHex(h, actionSat, 0.86),
    "--action-primary-ink": hslHex(h, 0.3 * colour, 0.05),
    "--focus-ring": brand,
    "--tint-sky": tints[0],
    "--tint-sand": tints[1],
    "--tint-sage": tints[2],
    "--tint-lilac": tints[3],
  };
}

// A pale box colour: the pure colour at this hue (turned `shift` degrees from the pick), mixed a little into white.
function neighbourTint(hue: number, shift: number, vivid: number): string {
  return mixIntoWhite(parseHex(hslHex(hue + shift, 1, 0.5))!, 0.13 * vivid);
}

/** Makes the whole palette from one picked colour. Returns null if the colour is not a valid hex colour. */
export function deriveTheme(hex: string): ThemeVars | null {
  const picked = parseHex(hex);
  if (!picked) return null;
  if (luminance(picked) <= DARK_PICK_MAX_LUMINANCE) return deriveDarkTheme(picked);
  const { h, s, l } = rgbToHsl(picked);
  // How strongly the pick should tint the page: 0 for a grey or white pick (the page stays white), up to 1 for a bright, pure colour.
  const pickedHsv = rgbToHsv(picked);
  const vivid = (pickedHsv.s / 100) * Math.min(1, Math.max(0, (pickedHsv.v - 10) / 40));

  // Page colours. The page, the boxes and the borders are the picked colour MIXED into white (a blend, not a flood): the more colourful the
  // pick, the more of it is mixed in. They are always light, so the site stays bright and the text stays readable: a grey, white or black
  // pick keeps the white page. (An exact mid-tone background could not hold readable text, so the page uses a light mix of the colour.)
  const surfaceBase = mixIntoWhite(picked, 0.09 * vivid);
  const surfaceRaised = mixIntoWhite(picked, 0.035 * vivid);
  const surfaceSunken = mixIntoWhite(picked, 0.125 * vivid);
  const surfaceBrandSubtle = mixIntoWhite(picked, 0.16 * vivid);
  const lightSurfaces = [surfaceBase, surfaceRaised, surfaceSunken, surfaceBrandSubtle];

  // The accent (buttons, pills, active tab) keeps the picked hue but is darkened until white text on it is readable.
  const accent = darkenUntilReadable(h, s, l, ["#ffffff"]);
  const accentHsl = rgbToHsl(parseHex(accent)!);
  // Hover: a little darker still (darker only adds contrast, so white text stays readable).
  const accentHover = hslHex(h, accentHsl.s, Math.max(0, accentHsl.l - 0.08));
  // Coloured text and the focus ring must be readable on every light surface, so they are checked against the hardest one.
  const brand = darkenUntilReadable(h, s, l, lightSurfaces);

  return {
    "--surface-base": surfaceBase,
    "--surface-raised": surfaceRaised,
    "--surface-sunken": surfaceSunken,
    "--surface-brand-subtle": surfaceBrandSubtle,
    "--border-subtle": mixIntoWhite(picked, 0.3 * vivid),
    "--border-strong": mixIntoWhite(picked, 0.5 * vivid),
    "--ink-primary": hslHex(h, 0.35 * vivid, 0.06),
    "--ink-secondary": hslHex(h, 0.25 * vivid, 0.28),
    "--ink-muted": hslHex(h, 0.2 * vivid, 0.33),
    "--ink-brand": brand,
    "--action-primary": accent,
    "--action-primary-hover": accentHover,
    "--action-primary-ink": "#ffffff",
    "--focus-ring": brand,
    // The four category boxes: the pick and three close neighbours on the colour wheel (within 50 degrees), each mixed into white the same
    // way, so the boxes blend with the page and with each other instead of showing four different colours.
    "--tint-sky": neighbourTint(h, 0, vivid),
    "--tint-sand": neighbourTint(h, 25, vivid),
    "--tint-sage": neighbourTint(h, -25, vivid),
    "--tint-lilac": neighbourTint(h, 50, vivid),
  };
}

// ---------- saving the choice in this browser ----------

export const STORAGE_KEY = "site-library-theme";
/** The dark page colour. Must equal --surface-base in the dark block of global.css (a test checks that). */
export const DARK_BASE = "#0d0f13";

export type ThemeChoice = { dark: boolean; hex: string | null };

/** Reads what was saved. Anything unexpected gives the plain default (light, no picked colour). */
export function parseStored(raw: string | null | undefined): ThemeChoice {
  const fallback: ThemeChoice = { dark: false, hex: null };
  if (!raw) return fallback;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || data.v !== 1) return fallback;
    const rgb = parseHex(data.hex);
    return { dark: data.dark === true, hex: rgb ? toHex(rgb) : null };
  } catch {
    return fallback;
  }
}

/**
 * The text that is saved. It holds the finished palette too, so the tiny head script can apply it without
 * any colour maths (it has to run before the page draws, so it cannot wait for the rest of the code to load).
 */
export function serializeTheme({ dark, hex }: ThemeChoice): string {
  const vars = hex ? deriveTheme(hex) : null;
  return JSON.stringify({
    v: 1,
    dark,
    hex,
    ...(vars ? { vars } : {}),
    // "dark" = the picked colour made a dark page (the head script then marks the page, so scrollbars and form controls match).
    ...(!dark && hex && pickIsDark(hex) ? { tone: "dark" } : {}),
    color: dark ? DARK_BASE : (vars?.["--surface-base"] ?? "#ffffff"),
  });
}

/**
 * Runs in <head> before the page draws, so there is no flash of the wrong colours.
 * It only ever applies the known variable names and plain #rrggbb colours, so a hand-edited saved value
 * cannot inject anything. If storage is blocked or the value is broken it quietly does nothing.
 */
export const THEME_BOOT_SCRIPT = `(function () {
  try {
    var s = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
    if (!s || s.v !== 1) return;
    var known = ${JSON.stringify(THEME_VARS)};
    var plain = /^#[0-9a-f]{6}$/i;
    var root = document.documentElement;
    if (s.dark === true) {
      root.setAttribute("data-theme", "dark");
    } else if (s.vars && typeof s.vars === "object") {
      for (var i = 0; i < known.length; i++) {
        var value = s.vars[known[i]];
        if (typeof value === "string" && plain.test(value)) root.style.setProperty(known[i], value);
      }
      if (s.tone === "dark") root.setAttribute("data-tone", "dark");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && typeof s.color === "string" && plain.test(s.color)) meta.setAttribute("content", s.color);
  } catch (e) {}
})();`;
