import { Check, ChevronsUpDown, Pipette } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { type Hsv, type Rgb, hsvToRgb, parseHex, rgbToHsv, toHex } from "@/lib/theme";
import { cn } from "@/lib/utils";

/*
 * The colour picker panel: a square for saturation and brightness, a hue bar, HEX / RGB / HSL boxes, an eyedropper
 * (only where the browser has one) and a row of preset colours.
 *
 * Adapted from a supplied component (licence still to be checked by the owner, docs/COMPONENTS.md). Changes: no outside packages
 * (icons from lucide-react, no popup library: the popup is built in ThemeDock), no opacity bar (a see-through website colour makes no
 * sense), no data attributes from the original kit, and the colours come from this site's own variables.
 * HSV (hue, saturation, value) is the single source of truth, so dragging through pure black or white does not lose the hue.
 */

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const round = (n: number, digits = 0) => {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
};

function hsvToHsl({ h, s, v }: Hsv) {
  const vv = v / 100;
  const ss = s / 100;
  const l = vv * (1 - ss / 2);
  const sl = l === 0 || l === 1 ? 0 : (vv - l) / Math.min(l, 1 - l);
  return { h: Math.round(h), s: Math.round(sl * 100), l: Math.round(l * 100) };
}

function hslToHsv(h: number, s: number, l: number): Hsv {
  const ll = l / 100;
  const ss = s / 100;
  const v = ll + ss * Math.min(ll, 1 - ll);
  return { h: ((h % 360) + 360) % 360, s: v === 0 ? 0 : 2 * (1 - ll / v) * 100, v: v * 100 };
}

const toCss = (hsv: Hsv) => {
  const { r, g, b } = hsvToRgb(hsv);
  return `rgb(${r}, ${g}, ${b})`;
};

/** Is this colour light enough that a dark tick is easier to see on it than a white one? (WCAG luminance.) */
function isLight({ r, g, b }: Rgb) {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) > 0.45;
}

type Format = "hex" | "rgb" | "hsl";
const FORMATS: Format[] = ["hex", "rgb", "hsl"];

/** "drag" = a continuous move (square, hue bar); "pick" = a single jump (typed value, preset, eyedropper). */
export type ChangeSource = "drag" | "pick";

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const THUMB = "pointer-events-none absolute block rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_1px_4px_rgba(0,0,0,0.4)]";
const SMALL_BUTTON =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-secondary transition-[color,background-color,transform] duration-100 hover:bg-surface-sunken hover:text-ink-primary active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const FIELD_SHELL =
  "flex h-8 w-full items-center rounded-lg border border-line-strong bg-surface-raised transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus motion-reduce:transition-none";
const FIELD_INPUT = "h-full w-full bg-transparent text-center text-xs font-medium tabular-nums text-ink-primary outline-none";
const FIELD_LABEL = "text-[10px] font-medium tracking-[0.08em] text-ink-secondary";

/** Turns a pointer position into 0..1 coordinates inside an element. */
function ratio(el: HTMLElement, event: { clientX: number; clientY: number }) {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.width === 0 ? 0 : clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: rect.height === 0 ? 0 : clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

/** Press and drag on an element (mouse, finger or pen). */
function useDrag(onMove: (el: HTMLElement, event: { clientX: number; clientY: number }) => void) {
  const [dragging, setDragging] = useState(false);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const el = event.currentTarget;
      el.setPointerCapture(event.pointerId);
      setDragging(true);
      el.focus();
      onMove(el, event);
    },
    [onMove],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      event.preventDefault();
      onMove(event.currentTarget, event);
    },
    [dragging, onMove],
  );
  const stop = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }, []);
  return { dragging, handlers: { onPointerDown, onPointerMove, onPointerUp: stop, onPointerCancel: stop } };
}

/** Arrow keys and Page Up/Down for the square and the hue bar. */
function arrowStep(key: string, step: number, big: number): { dx: number; dy: number } | null {
  switch (key) {
    case "ArrowLeft": return { dx: -step, dy: 0 };
    case "ArrowRight": return { dx: step, dy: 0 };
    case "ArrowUp": return { dx: 0, dy: step };
    case "ArrowDown": return { dx: 0, dy: -step };
    case "PageUp": return { dx: big, dy: big };
    case "PageDown": return { dx: -big, dy: -big };
    default: return null;
  }
}

/* ---------- the saturation / brightness square ---------- */

function SaturationSquare({ hsv, onChange }: { hsv: Hsv; onChange: (next: { s: number; v: number }) => void }) {
  const apply = useCallback(
    (el: HTMLElement, event: { clientX: number; clientY: number }) => {
      const { x, y } = ratio(el, event);
      onChange({ s: round(x * 100, 1), v: round((1 - y) * 100, 1) });
    },
    [onChange],
  );
  const { dragging, handlers } = useDrag(apply);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? { s: 0, v: 100 } : { s: 100, v: 100 });
      return;
    }
    const delta = arrowStep(event.key, event.shiftKey ? 10 : 1, 10);
    if (!delta) return;
    event.preventDefault();
    onChange({ s: clamp(hsv.s + delta.dx), v: clamp(hsv.v + delta.dy) });
  };

  return (
    <div
      role="slider"
      aria-label="Saturation and brightness"
      aria-valuenow={Math.round(hsv.s)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      {...handlers}
      className={cn("relative isolate h-[164px] w-full touch-none select-none", dragging ? "cursor-grabbing" : "cursor-crosshair", FOCUS, "focus-visible:-outline-offset-2")}
      style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
    >
      {/* White fades in from the left, black from the bottom: the classic colour square. These are the colour square's own colours, not site colours. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff,transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,#000,transparent)]" />
      <span
        className={cn(THUMB, "size-4 -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out motion-reduce:transition-none", dragging && "scale-110 motion-reduce:scale-100")}
        style={{
          // Kept half a thumb inside the edges so it never clips at the corners.
          left: `clamp(8px, ${hsv.s}%, calc(100% - 8px))`,
          top: `clamp(8px, ${100 - hsv.v}%, calc(100% - 8px))`,
          backgroundColor: toCss(hsv),
        }}
      />
    </div>
  );
}

/* ---------- the hue bar ---------- */

function HueBar({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const apply = useCallback(
    (el: HTMLElement, event: { clientX: number; clientY: number }) => onChange(round(ratio(el, event).x * 360, 2)),
    [onChange],
  );
  const { dragging, handlers } = useDrag(apply);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? 0 : 360);
      return;
    }
    const delta = arrowStep(event.key, event.shiftKey ? 10 : 1, 10);
    if (!delta) return;
    event.preventDefault();
    onChange(round(clamp(value + (delta.dx || delta.dy), 0, 360), 2));
  };

  return (
    <div
      role="slider"
      aria-label="Hue"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuetext={`${Math.round(value)} degrees`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      {...handlers}
      className={cn("relative h-3 w-full touch-none select-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]", dragging ? "cursor-grabbing" : "cursor-pointer", FOCUS)}
      style={{ backgroundImage: "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)" }}
    >
      <span
        className={cn(THUMB, "top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out motion-reduce:transition-none", dragging && "scale-110 motion-reduce:scale-100")}
        // Kept half a thumb inside both ends of the bar.
        style={{ left: `calc(9px + ${value / 360} * (100% - 18px))`, background: `hsl(${value} 100% 50%)` }}
      />
    </div>
  );
}

/* ---------- number and hex boxes ---------- */

function NumberBox({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (next: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    const parsed = Number.parseFloat(raw);
    setDraft(null);
    if (!Number.isNaN(parsed)) onCommit(clamp(Math.round(parsed), min, max));
  };
  return (
    <label className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span className={FIELD_SHELL}>
        <input
          type="text"
          inputMode="numeric"
          value={draft ?? String(Math.round(value))}
          aria-label={label}
          maxLength={3}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              setDraft(null);
              onCommit(clamp(Math.round(value) + (event.shiftKey ? 10 : 1) * (event.key === "ArrowUp" ? 1 : -1), min, max));
            }
          }}
          className={FIELD_INPUT}
        />
      </span>
      <span className={FIELD_LABEL}>{label}</span>
    </label>
  );
}

function HexBox({ hex, onCommit }: { hex: string; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string) => {
    setDraft(null);
    if (parseHex(raw)) onCommit(raw);
  };
  return (
    <label className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <span className={FIELD_SHELL}>
        <span className="pl-2.5 text-xs text-ink-muted">#</span>
        <input
          type="text"
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          value={(draft ?? hex).replace(/^#/, "").toUpperCase()}
          aria-label="Hex colour"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(event.currentTarget.value);
            }
          }}
          className={cn(FIELD_INPUT, "pr-2.5 pl-1 text-left tracking-[0.08em] uppercase")}
        />
      </span>
      <span className={FIELD_LABEL}>HEX</span>
    </label>
  );
}

/* ---------- eyedropper (a feature built into some browsers; it never sends anything anywhere) ---------- */

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };
const nothingToWatch = () => () => {};

function useEyeDropper() {
  // Read through useSyncExternalStore: the server answer is "no", so the first paint matches and nothing flickers.
  const supported = useSyncExternalStore(nothingToWatch, () => "EyeDropper" in window, () => false);
  const pick = useCallback(async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;
    if (!Ctor) return null;
    try {
      return (await new Ctor().open()).sRGBHex;
    } catch {
      return null; // Dismissed with Escape: not an error.
    }
  }, []);
  return { supported, pick };
}

/* ---------- the panel ---------- */

export interface ColorPickerPanelProps {
  /** The colour shown, as "#rrggbb". */
  value: string;
  /** Called with every change. `source` says whether it was a drag or a single jump. */
  onChange: (hex: string, source: ChangeSource) => void;
  /** Preset colours under the boxes. */
  swatches?: string[];
}

export function ColorPickerPanel({ value, onChange, swatches }: ColorPickerPanelProps) {
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(parseHex(value) ?? { r: 43, g: 82, b: 255 }));
  const [seen, setSeen] = useState(value);
  const [format, setFormat] = useState<Format>("hex");
  const { supported: dropperSupported, pick } = useEyeDropper();

  const rgb = hsvToRgb(hsv);
  const hex = toHex(rgb);
  const hsl = hsvToHsl(hsv);

  // When the parent hands in a different colour (for example after "Reset"), show it. Done while rendering, so it is never
  // painted a frame late. It only runs when the value from outside really changed, which also rules out a loop through rounding.
  if (value !== seen) {
    setSeen(value);
    const external = parseHex(value);
    if (external && toHex(external) !== hex) {
      const next = rgbToHsv(external);
      // A grey or black has no hue of its own: keep the hue that was showing.
      setHsv({ ...next, h: next.s === 0 || next.v === 0 ? hsv.h : next.h });
    }
  }

  // Emit after working out the new colour (state updaters must stay pure).
  const commit = (next: Hsv, source: ChangeSource) => {
    setHsv(next);
    onChange(toHex(hsvToRgb(next)), source);
  };
  const commitRgb = (next: Rgb) => {
    const converted = rgbToHsv(next);
    commit({ ...converted, h: converted.s === 0 || converted.v === 0 ? hsv.h : converted.h }, "pick");
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line-subtle bg-surface-raised text-ink-primary select-none">
      <SaturationSquare hsv={hsv} onChange={(next) => commit({ ...hsv, ...next }, "drag")} />

      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-2.5">
          {dropperSupported ? (
            <button
              type="button"
              aria-label="Pick a colour from the screen"
              onClick={async () => {
                const picked = parseHex(await pick());
                if (picked) commitRgb(picked);
              }}
              className={cn(SMALL_BUTTON, "border border-line-subtle", FOCUS)}
            >
              <Pipette className="size-4" aria-hidden="true" />
            </button>
          ) : null}

          <span aria-hidden="true" className="size-8 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]" style={{ backgroundColor: hex }} />

          <div className="min-w-0 flex-1">
            <HueBar value={hsv.h} onChange={(h) => commit({ ...hsv, h }, "drag")} />
          </div>
        </div>

        <div className="flex items-start gap-2">
          {format === "hex" ? <HexBox hex={hex} onCommit={(next) => { const parsed = parseHex(next); if (parsed) commitRgb(parsed); }} /> : null}
          {format === "rgb" ? (
            <>
              <NumberBox label="R" value={rgb.r} min={0} max={255} onCommit={(r) => commitRgb({ ...rgb, r })} />
              <NumberBox label="G" value={rgb.g} min={0} max={255} onCommit={(g) => commitRgb({ ...rgb, g })} />
              <NumberBox label="B" value={rgb.b} min={0} max={255} onCommit={(b) => commitRgb({ ...rgb, b })} />
            </>
          ) : null}
          {format === "hsl" ? (
            <>
              <NumberBox label="H" value={hsl.h} min={0} max={360} onCommit={(h) => commit(hslToHsv(h, hsl.s, hsl.l), "pick")} />
              <NumberBox label="S" value={hsl.s} min={0} max={100} onCommit={(s) => commit(hslToHsv(hsl.h, s, hsl.l), "pick")} />
              <NumberBox label="L" value={hsl.l} min={0} max={100} onCommit={(l) => commit(hslToHsv(hsl.h, hsl.s, l), "pick")} />
            </>
          ) : null}
          <button
            type="button"
            aria-label={`Colour format: ${format.toUpperCase()}. Switch format`}
            onClick={() => setFormat((prev) => FORMATS[(FORMATS.indexOf(prev) + 1) % FORMATS.length])}
            className={cn(SMALL_BUTTON, "mt-0.5", FOCUS)}
          >
            <ChevronsUpDown className="size-4" aria-hidden="true" />
          </button>
        </div>

        {swatches && swatches.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-t border-line-subtle pt-3">
            {swatches.map((swatch) => {
              const parsed = parseHex(swatch);
              const selected = parsed ? toHex(parsed) === hex : false;
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  aria-pressed={selected}
                  onClick={() => parsed && commitRgb(parsed)}
                  className={cn(
                    "size-5 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.16)] transition-transform duration-100 ease-out hover:scale-110 active:scale-[0.94] motion-reduce:transition-none motion-reduce:hover:scale-100",
                    FOCUS,
                  )}
                  style={{ backgroundColor: swatch }}
                >
                  {/* The tick colour follows the swatch's own brightness, so it shows on pale and dark swatches alike. */}
                  <Check
                    aria-hidden="true"
                    strokeWidth={2.6}
                    className={cn("mx-auto size-3", selected ? "opacity-100" : "opacity-0", parsed && isLight(parsed) ? "text-black/80" : "text-white")}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
