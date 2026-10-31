"use client";

// Local change (2026-10-31): the empty star in dark mode is brighter (fill white/25, stroke white/20; the installer's copy had 0.075 and 0.06)
// because the resting one-star button was nearly invisible on the dark page. Everything else is the installer's copy.

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Star Rating
 *
 * A star rating input in two styles. `classic` is a soft rounded star with
 * a flat fill and a quiet top light, for product pages and forms that want
 * the familiar look. `cut`, the default, draws cut stars: every star is ten flat facets
 * around a raised center, shaded by one light source. At rest the light sits
 * top left. While the pointer is over the row the light follows it, so each
 * star turns its facets toward the cursor like a small gem being tilted.
 * Picking a rating swings the light once across the lit stars.
 *
 * The fill is one continuous level that glides along the row, so moving from
 * one star to five passes through every star in between. Each star is drawn
 * twice, an empty cut in the surface and a lit copy clipped to the level,
 * which is what makes half stars and read only fractions exact.
 *
 * Hovering below the current rating keeps a faint tint on the stars you
 * would remove. Dragging across the row rates on touch screens while
 * vertical scrolling still works.
 *
 * One requestAnimationFrame loop owns the level, the light and the glint,
 * writes straight to the DOM and stops as soon as everything settles, so
 * pointer moves never re-render the stars. Every curve is timed or a plain
 * ease toward the pointer, never a spring, so nothing overshoots. With
 * reduced motion the level jumps and the light stays put.
 *
 * Interactive ratings are a slider for assistive tech: arrow keys step by the
 * precision, Home and End jump to the ends, number keys pick a rating. Read
 * only ratings are an image labelled "Rated 4.7 out of 5".
 */

export type StarRatingTone = "gold" | "silver" | "chili" | "rose" | "violet";

export type StarRatingVariant = "cut" | "classic";

export interface StarRatingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Controlled rating. */
  value?: number;
  /** Initial rating when uncontrolled. */
  defaultValue?: number;
  /** Called with the new rating each time one is picked. */
  onValueChange?: (value: number) => void;
  /** Called with the rating under the pointer, or null when it leaves. */
  onHoverChange?: (value: number | null) => void;
  /** Number of stars. */
  max?: number;
  /** Smallest step: 1 for whole stars, 0.5 for half stars. */
  precision?: 0.5 | 1;
  /** Star size in pixels. */
  size?: number;
  /** Space between stars in pixels. Defaults to a fifth of the size. */
  gap?: number;
  /** `cut` draws faceted stars lit by a light that follows the pointer. `classic` draws soft rounded stars. */
  variant?: StarRatingVariant;
  /** Material of the lit stars. */
  tone?: StarRatingTone;
  /** Show the rating without letting anyone change it. Any fraction works. */
  readOnly?: boolean;
  disabled?: boolean;
  /** Picking the current rating again clears it to 0. */
  allowClear?: boolean;
  /** Form field name. Renders a hidden input with the rating. */
  name?: string;
  /** Spoken value for each whole rating, from 1 star up. */
  labels?: string[];
}

type Tone = { base: string; hi: string; lo: string; edge: string; shadow: string };

const TONES: Record<StarRatingTone, Tone> = {
  gold: { base: "#F5B21C", hi: "#FFF3C4", lo: "#A8590A", edge: "#8C4A07", shadow: "rgba(140, 74, 7, 0.32)" },
  silver: { base: "#C3C7D0", hi: "#FFFFFF", lo: "#5F6474", edge: "#525766", shadow: "rgba(30, 34, 48, 0.3)" },
  chili: { base: "#EE5229", hi: "#FFD0BF", lo: "#952107", edge: "#7E1B05", shadow: "rgba(126, 27, 5, 0.32)" },
  rose: { base: "#EF467A", hi: "#FFD3E1", lo: "#931342", edge: "#7A0F37", shadow: "rgba(122, 15, 55, 0.3)" },
  violet: { base: "#8D5BF6", hi: "#E7DDFF", lo: "#4519A0", edge: "#39148A", shadow: "rgba(57, 20, 138, 0.32)" },
};

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Room left around each star for its shadow, as a share of the star box. */
const BLEED = 25;

type Vec = { x: number; y: number; z: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const norm = (v: Vec): Vec => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

/**
 * Star geometry in a 24 unit box: five tips, five inner corners and a raised
 * center. Each tip owns two facets, one on either side of its ridge. Screen
 * axes, so y points down and a light with negative y comes from above.
 */
const GEOMETRY = (() => {
  const c = { x: 12, y: 12.75 };
  const outer = 11.4;
  const inner = outer * 0.46;
  const height = 3.6;
  const at = (r: number, deg: number) => ({
    x: c.x + r * Math.cos((deg * Math.PI) / 180),
    y: c.y + r * Math.sin((deg * Math.PI) / 180),
  });
  const tips = Array.from({ length: 5 }, (_, i) => at(outer, -90 + i * 72));
  const dips = Array.from({ length: 5 }, (_, i) => at(inner, -54 + i * 72));
  const f = (n: number) => n.toFixed(3);

  const outline =
    tips.map((t, i) => `${i === 0 ? "M" : "L"}${f(t.x)} ${f(t.y)}L${f(dips[i].x)} ${f(dips[i].y)}`).join("") + "Z";

  const facets: { d: string; n: Vec }[] = [];
  tips.forEach((tip, i) => {
    const before = dips[(i + 4) % 5];
    const after = dips[i];
    for (const [a, b] of [
      [before, tip],
      [tip, after],
    ]) {
      // Plane through the raised center and two corners on the ground.
      const u = { x: a.x - c.x, y: a.y - c.y, z: -height };
      const v = { x: b.x - c.x, y: b.y - c.y, z: -height };
      let n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      if (n.z < 0) n = { x: -n.x, y: -n.y, z: -n.z };
      facets.push({
        d: `M${f(c.x)} ${f(c.y)}L${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}Z`,
        n: norm(n),
      });
    }
  });
  return { outline, facets };
})();

/**
 * The classic star: rounded tips and softened inner corners. Every corner is
 * replaced by a short quadratic curve that uses the corner as its control.
 */
const ROUND_PATH = (() => {
  const cx = 12;
  const cy = 12.7;
  const outer = 11.2;
  const inner = outer * 0.5;
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), tip: i % 2 === 0 };
  });
  const toward = (from: (typeof points)[number], to: (typeof points)[number], d: number) => {
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    return { x: from.x + ((to.x - from.x) / len) * d, y: from.y + ((to.y - from.y) / len) * d };
  };
  const f = (n: number) => n.toFixed(3);
  let d = "";
  points.forEach((p, i) => {
    const prev = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const round = p.tip ? 2.4 : 1.3;
    const a = toward(p, prev, round);
    const b = toward(p, next, round);
    d += `${i === 0 ? "M" : "L"}${f(a.x)} ${f(a.y)}Q${f(p.x)} ${f(p.y)} ${f(b.x)} ${f(b.y)}`;
  });
  return `${d}Z`;
})();

const REST_LIGHT = norm({ x: -0.55, y: -0.85, z: 1 });

/** Highlight and shadow strength of each facet under a light. */
function shade(light: Vec, gain = 1) {
  const dots = GEOMETRY.facets.map(({ n }) => n.x * light.x + n.y * light.y + n.z * light.z);
  const mean = dots.reduce((sum, d) => sum + d, 0) / dots.length;
  return dots.map((d) => {
    const s = (d - mean) * 2.4 * gain;
    return { hi: clamp(s, 0, 1), lo: clamp(-s, 0, 1) };
  });
}

const REST_SHADE = shade(REST_LIGHT);

/** Clip for star `index` at `level`. The lit side keeps room for its shadow. */
function clipFor(level: number, index: number, rtl: boolean) {
  const f = clamp(level - index, 0, 1);
  if (f <= 0) return "inset(0 100% 0 0)";
  const cut = f >= 1 ? -BLEED : (1 - f) * 100;
  return rtl
    ? `inset(-${BLEED}% -${BLEED}% -${BLEED}% ${cut}%)`
    : `inset(-${BLEED}% ${cut}% -${BLEED}% -${BLEED}%)`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

type Facets = { hi: (SVGPathElement | null)[]; lo: (SVGPathElement | null)[] };

/** Ten facets, each a highlight and a shadow path over the star's base. */
function FacetPaths({
  register,
  hi,
  lo,
  hiClassName,
  loClassName,
}: {
  register: Facets;
  hi: string;
  lo: string;
  hiClassName?: string;
  loClassName?: string;
}) {
  return (
    <>
      <g className={hiClassName}>
        {GEOMETRY.facets.map((facet, i) => (
          <path
            key={i}
            ref={(el) => {
              register.hi[i] = el;
            }}
            d={facet.d}
            fill={hi}
            fillOpacity={REST_SHADE[i].hi}
          />
        ))}
      </g>
      <g className={loClassName}>
        {GEOMETRY.facets.map((facet, i) => (
          <path
            key={i}
            ref={(el) => {
              register.lo[i] = el;
            }}
            d={facet.d}
            fill={lo}
            fillOpacity={REST_SHADE[i].lo}
          />
        ))}
      </g>
    </>
  );
}

type StarParts = {
  box: HTMLSpanElement | null;
  press: HTMLSpanElement | null;
  pop: HTMLSpanElement | null;
  fill: HTMLSpanElement | null;
  ghost: HTMLSpanElement | null;
  empty: Facets;
  lit: Facets;
  light: Vec;
  glint: number | null;
};

const newParts = (): StarParts => ({
  box: null,
  press: null,
  pop: null,
  fill: null,
  ghost: null,
  empty: { hi: [], lo: [] },
  lit: { hi: [], lo: [] },
  light: REST_LIGHT,
  glint: null,
});

const GLINT_MS = 720;
const GLINT_STAGGER = 55;

export function StarRating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  onHoverChange,
  max = 5,
  precision = 1,
  size = 28,
  gap,
  variant = "cut",
  tone = "gold",
  readOnly = false,
  disabled = false,
  allowClear = true,
  name,
  labels,
  className,
  style,
  onKeyDown,
  ...rest
}: StarRatingProps) {
  const colors = TONES[tone];
  const cut = variant === "cut";
  const gradientId = `${React.useId().replace(/:/g, "")}-light`;
  const cutRef = React.useRef(cut);
  React.useEffect(() => {
    cutRef.current = cut;
  }, [cut]);
  const reduced = usePrefersReducedMotion();
  const interactive = !readOnly && !disabled;
  const spacing = gap ?? Math.round(size / 5);

  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = clamp(valueProp ?? uncontrolled, 0, max);
  const [hover, setHover] = React.useState<number | null>(null);
  const shown = hover ?? value;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const partsRef = React.useRef<StarParts[]>([]);
  const parts = (i: number) => (partsRef.current[i] ??= newParts());

  const rtlRef = React.useRef(false);
  const pointerRef = React.useRef<{ x: number; y: number } | null>(null);
  const levelRef = React.useRef({ now: value, from: value, to: value, start: 0, duration: 0 });
  const frameRef = React.useRef(0);
  const reducedRef = React.useRef(reduced);
  React.useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  // The clip each star renders with on the server and first paint. After
  // that the loop owns the clip paths, so these never change.
  const [initialLevel] = React.useState(value);

  const paintFacets = (facets: Facets, light: Vec, gain: number) => {
    const s = shade(light, gain);
    for (let i = 0; i < s.length; i++) {
      facets.hi[i]?.setAttribute("fill-opacity", s[i].hi.toFixed(3));
      facets.lo[i]?.setAttribute("fill-opacity", s[i].lo.toFixed(3));
    }
  };

  const tickRef = React.useRef<() => void>(() => {});
  const tick = React.useCallback(() => {
    frameRef.current = 0;
    const now = performance.now();
    const still = reducedRef.current;
    let busy = false;

    // Level.
    const level = levelRef.current;
    if (level.now !== level.to) {
      const t = still || level.duration <= 0 ? 1 : clamp((now - level.start) / level.duration, 0, 1);
      level.now = t >= 1 ? level.to : level.from + (level.to - level.from) * (1 - Math.pow(1 - t, 3));
      if (t < 1) busy = true;
    }

    const pointer = pointerRef.current;
    for (let i = 0; i < max; i++) {
      const p = partsRef.current[i];
      if (!p) continue;
      if (p.fill) p.fill.style.clipPath = clipFor(level.now, i, rtlRef.current);

      // Light: toward the pointer while it is over the row, else rest.
      let target = REST_LIGHT;
      if (!cutRef.current) continue;
      if (pointer && p.box && !still) {
        const r = p.box.getBoundingClientRect();
        const dx = (pointer.x - (r.left + r.width / 2)) / r.width;
        const dy = (pointer.y - (r.top + r.height / 2)) / r.height;
        target = norm({ x: clamp(dx, -2.5, 2.5) * 0.9, y: clamp(dy, -2.5, 2.5) * 0.9 - 0.35, z: 1 });
      }
      const dist = Math.hypot(target.x - p.light.x, target.y - p.light.y, target.z - p.light.z);
      if (dist > 0.002) {
        const k = 0.16;
        p.light = norm({
          x: p.light.x + (target.x - p.light.x) * k,
          y: p.light.y + (target.y - p.light.y) * k,
          z: p.light.z + (target.z - p.light.z) * k,
        });
        busy = true;
      } else {
        p.light = target;
      }

      // Glint: the light swings from left to right across the star once.
      let light = p.light;
      let gain = 1;
      if (p.glint !== null) {
        const t = (now - p.glint) / GLINT_MS;
        if (t >= 1) {
          p.glint = null;
        } else {
          busy = true;
          if (t > 0) {
            const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const w = Math.sin(Math.PI * t);
            const swing = norm({ x: -1.4 + 2.8 * e, y: -0.7, z: 0.8 });
            light = norm({
              x: light.x * (1 - w) + swing.x * w,
              y: light.y * (1 - w) + swing.y * w,
              z: light.z * (1 - w) + swing.z * w,
            });
            gain = 1 + 0.45 * w;
          }
        }
      }

      paintFacets(p.empty, light, 1);
      paintFacets(p.lit, light, gain);
    }

    if (busy) frameRef.current = requestAnimationFrame(tickRef.current);
  }, [max]);

  React.useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const kick = React.useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  React.useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      // Clear the id too: a cancelled frame left here would read as a loop
      // still running, and nothing could restart it after a remount.
      frameRef.current = 0;
    },
    [],
  );

  React.useEffect(() => {
    if (rootRef.current) rtlRef.current = getComputedStyle(rootRef.current).direction === "rtl";
    kick();
  }, [kick]);

  // Glide the level to whatever is shown: the hover preview, or the rating.
  React.useEffect(() => {
    const level = levelRef.current;
    if (level.to === shown) return;
    level.from = level.now;
    level.to = shown;
    level.start = performance.now();
    level.duration = clamp(130 + Math.abs(shown - level.now) * 45, 130, 320);
    kick();
  }, [shown, kick]);

  // The faint tint that marks the current rating while you hover lower.
  React.useEffect(() => {
    partsRef.current.forEach((p, i) => {
      if (p?.ghost) p.ghost.style.clipPath = clipFor(value, i, rtlRef.current);
    });
  }, [value]);

  const glint = React.useCallback(
    (next: number) => {
      if (reducedRef.current || next <= 0) return;
      if (!cutRef.current) {
        // Classic: a small lift that runs along the lit stars.
        for (let i = 0; i < Math.ceil(next); i++) {
          partsRef.current[i]?.pop?.animate(
            [{ transform: "scale(1)" }, { transform: "scale(1.08)", offset: 0.4 }, { transform: "scale(1)" }],
            { duration: 320, delay: i * 35, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
          );
        }
        return;
      }
      const start = performance.now();
      for (let i = 0; i < Math.ceil(next); i++) parts(i).glint = start + i * GLINT_STAGGER;
      kick();
    },
    [kick],
  );

  const commit = React.useCallback(
    (next: number, withGlint: boolean) => {
      const rounded = clamp(Math.round(next / precision) * precision, 0, max);
      if (valueProp === undefined) setUncontrolled(rounded);
      onValueChange?.(rounded);
      if (withGlint) glint(rounded);
    },
    [precision, max, valueProp, onValueChange, glint],
  );

  const hoverRef = React.useRef<number | null>(null);
  const changeHover = React.useCallback(
    (next: number | null) => {
      if (hoverRef.current === next) return;
      hoverRef.current = next;
      setHover(next);
      onHoverChange?.(next);
    },
    [onHoverChange],
  );

  /** Rating under a pointer x. Left of the first star is 0. */
  const valueAt = (clientX: number) => {
    const rtl = rtlRef.current;
    for (let i = 0; i < max; i++) {
      const el = partsRef.current[i]?.box;
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const edge = rtl ? rect.left - spacing / 2 : rect.right + spacing / 2;
      if (i === max - 1 || (rtl ? clientX >= edge : clientX <= edge)) {
        const into = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
        if (i === 0 && into < 0) return 0;
        const raw = i + clamp(into, 0, 1);
        return clamp(Math.ceil(raw / precision - 1e-6) * precision, precision, max);
      }
    }
    return max;
  };

  const press = React.useRef<{ id: number; start: number; moved: boolean; star: number } | null>(null);

  const pressStar = (index: number, down: boolean) => {
    if (reducedRef.current) return;
    partsRef.current[index]?.press?.animate([{ transform: down ? "scale(0.9)" : "scale(1)" }], {
      duration: down ? 120 : 260,
      easing: EASE_OUT,
      fill: "forwards",
    });
  };

  const track = (event: React.PointerEvent) => {
    pointerRef.current = { x: event.clientX, y: event.clientY };
    kick();
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button !== 0 || press.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    track(event);
    const next = valueAt(event.clientX);
    const star = Math.max(0, Math.ceil(next) - 1);
    press.current = { id: event.pointerId, start: event.clientX, moved: false, star };
    pressStar(star, true);
    changeHover(next);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const p = press.current;
    if (p) {
      if (p.id !== event.pointerId) return;
      track(event);
      if (Math.abs(event.clientX - p.start) > 4) p.moved = true;
      const next = valueAt(event.clientX);
      const star = Math.max(0, Math.ceil(next) - 1);
      if (star !== p.star) {
        pressStar(p.star, false);
        pressStar(star, true);
        p.star = star;
      }
      changeHover(next);
      return;
    }
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      track(event);
      changeHover(valueAt(event.clientX));
    }
  };

  const endPress = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const p = press.current;
    if (!p || p.id !== event.pointerId) return;
    press.current = null;
    pressStar(p.star, false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const rect = rootRef.current?.getBoundingClientRect();
    const inside =
      !!rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    const keepHover = event.pointerType !== "touch" && inside;
    if (!keepHover) pointerRef.current = null;
    if (cancelled) {
      changeHover(null);
      kick();
      return;
    }
    const next = valueAt(event.clientX);
    const clear = allowClear && !p.moved && next === value;
    commit(clear ? 0 : next, !clear);
    changeHover(keepHover && !clear ? next : null);
    kick();
  };

  const onPointerLeave = () => {
    if (press.current) return;
    pointerRef.current = null;
    changeHover(null);
    kick();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!interactive || event.defaultPrevented) return;
    const rtl = rtlRef.current;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
        next = value + (rtl ? -precision : precision);
        break;
      case "ArrowLeft":
        next = value + (rtl ? precision : -precision);
        break;
      case "ArrowUp":
        next = value + precision;
        break;
      case "ArrowDown":
        next = value - precision;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = max;
        break;
      default:
        if (/^[0-9]$/.test(event.key) && Number(event.key) <= max) next = Number(event.key);
    }
    if (next === null) return;
    event.preventDefault();
    next = clamp(next, 0, max);
    changeHover(null);
    if (next !== value) commit(next, false);
  };

  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));
  const spoken = (n: number) => {
    const word = labels?.[Math.ceil(n) - 1];
    const count = `${format(n)} out of ${max} stars`;
    return word && n > 0 ? `${word}, ${count}` : count;
  };

  const a11y: React.HTMLAttributes<HTMLDivElement> = readOnly
    ? { role: "img", "aria-label": `Rated ${format(value)} out of ${max}` }
    : {
        role: "slider",
        tabIndex: disabled ? undefined : 0,
        "aria-label": "Rating",
        "aria-disabled": disabled || undefined,
        "aria-valuemin": 0,
        "aria-valuemax": max,
        "aria-valuenow": value,
        "aria-valuetext": spoken(value),
      };

  const ghostVisible = hover !== null && hover < value;
  const softShadow = `drop-shadow(0 ${(size / 40).toFixed(2)}px ${(size / 26).toFixed(2)}px ${colors.shadow})`;
  const shadow = `drop-shadow(0 ${(size / 30).toFixed(2)}px ${(size / 18).toFixed(2)}px ${colors.shadow})`;

  return (
    <div
      ref={rootRef}
      {...a11y}
      {...rest}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endPress(e, false)}
      onPointerCancel={(e) => endPress(e, true)}
      onPointerLeave={onPointerLeave}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex select-none items-center rounded-[10px] outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-neutral-900/40 dark:focus-visible:outline-white/40",
        interactive && "cursor-pointer touch-pan-y",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
      style={{ gap: spacing, WebkitTapHighlightColor: "transparent", ...style }}
    >
      {cut ? null : (
        <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
          {/* A quiet top light and a little depth at the base, no gloss. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={colors.hi} stopOpacity="0.38" />
            <stop offset="0.5" stopColor={colors.hi} stopOpacity="0" />
            <stop offset="0.5" stopColor={colors.lo} stopOpacity="0" />
            <stop offset="1" stopColor={colors.lo} stopOpacity="0.22" />
          </linearGradient>
        </svg>
      )}
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            parts(i).box = el;
          }}
          className="relative block shrink-0"
          style={{ width: size, height: size }}
        >
          <span
            ref={(el) => {
              parts(i).press = el;
            }}
            className="absolute inset-0 block"
          >
            <span
              ref={(el) => {
                parts(i).pop = el;
              }}
              className="absolute inset-0 block"
            >
              {cut ? (
                <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                  {/* Empty: the same cut, pressed into the surface. */}
                  <path
                    d={GEOMETRY.outline}
                    className="fill-neutral-200 stroke-neutral-300/70 dark:fill-white/25 dark:stroke-white/20"
                    strokeWidth={0.5}
                    strokeLinejoin="round"
                  />
                  <FacetPaths
                    register={parts(i).empty}
                    hi="#fff"
                    lo="#000"
                    hiClassName="opacity-90 dark:opacity-[0.14]"
                    loClassName="opacity-[0.1] dark:opacity-60"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                  <path d={ROUND_PATH} className="fill-neutral-200 dark:fill-white/[0.09]" />
                </svg>
              )}

              {/* The rating you would lose, while hovering lower. */}
              <span
                ref={(el) => {
                  parts(i).ghost = el;
                }}
                className="absolute inset-0 block"
                style={{
                  clipPath: clipFor(initialLevel, i, false),
                  opacity: ghostVisible ? 0.3 : 0,
                  transition: reduced ? undefined : `opacity 160ms ${EASE_OUT}`,
                }}
              >
                <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                  {cut ? (
                    <path d={GEOMETRY.outline} fill={colors.base} stroke={colors.base} strokeWidth={0.5} strokeLinejoin="round" />
                  ) : (
                    <path d={ROUND_PATH} fill={colors.base} />
                  )}
                </svg>
              </span>

              {/* Lit: clipped to the level. */}
              <span
                ref={(el) => {
                  parts(i).fill = el;
                }}
                className="absolute inset-0 block"
                style={{ clipPath: clipFor(initialLevel, i, false), filter: cut ? shadow : softShadow }}
              >
                {cut ? (
                  <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                    <path d={GEOMETRY.outline} fill={colors.base} />
                    <FacetPaths register={parts(i).lit} hi={colors.hi} lo={colors.lo} loClassName="opacity-80" />
                    <path
                      d={GEOMETRY.outline}
                      fill="none"
                      stroke={colors.edge}
                      strokeOpacity={0.45}
                      strokeWidth={0.5}
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                    <path d={ROUND_PATH} fill={colors.base} />
                    <path d={ROUND_PATH} fill={`url(#${gradientId})`} />
                  </svg>
                )}
              </span>
            </span>
          </span>
        </span>
      ))}

      {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
    </div>
  );
}
