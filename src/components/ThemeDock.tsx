import { MoonStar, RotateCcw, Sun } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ColorPickerPanel, type ChangeSource } from "@/components/ui/color-picker";
import { DARK_BASE, STORAGE_KEY, THEME_VARS, type ThemeChoice, deriveTheme, parseStored, pickIsDark, serializeTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/*
 * Two round buttons that float over the page. On wide screens (1280px and up) they sit as a pair on the right edge, in the empty margin
 * beside the page. On narrower screens there is no empty margin, so they sit side by side in the bottom-right corner instead (a pair in the
 * middle of the edge would cover the page's own buttons and tabs), and the picker opens upwards:
 *   1. The rainbow button opens a colour picker. The picked colour restyles the whole site (the rules are in src/lib/theme.ts):
 *      a light or ordinary colour makes a bright page in that colour, a dark colour makes a dark page in that colour.
 *   2. The moon / sun button switches dark mode. While dark is on, the colour wheel is switched off (greyed) and its
 *      colours are removed; the picked colour is remembered for when dark mode is switched off again.
 * The choice is saved in this browser only (localStorage, no cookie, nothing is sent anywhere). A tiny script in <head>
 * (THEME_BOOT_SCRIPT, added in src/layouts/main.astro) applies it before the page draws, so there is no flash.
 * Until this component has loaded it shows nothing, so the buttons are never visible but dead.
 */

// The colour the picker starts on the first time (the site's original blue). It is only shown, never applied, until picked.
const START_COLOUR = "#2b52ff";
const SWATCHES = ["#2b52ff", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#0b0d10"];

const root = () => document.documentElement;

// Puts a choice onto the page: the dark switch, the made palette (or none), and the browser-bar colour.
function applyTheme({ dark, hex }: ThemeChoice) {
  const vars = !dark && hex ? deriveTheme(hex) : null;
  if (dark) root().setAttribute("data-theme", "dark");
  else root().removeAttribute("data-theme");
  // A dark pick makes a dark page in that colour: mark it so scrollbars and form controls are drawn dark too.
  if (vars && hex && pickIsDark(hex)) root().setAttribute("data-tone", "dark");
  else root().removeAttribute("data-tone");
  for (const name of THEME_VARS) {
    if (vars) root().style.setProperty(name, vars[name]);
    else root().style.removeProperty(name);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? DARK_BASE : (vars?.["--surface-base"] ?? "#ffffff"));
}

// A short cross-fade of the whole page. The browser takes a picture of the page before and after and fades between the two, which is
// cheap. (The old way faded the colours of every element one by one: on the list page that was about a thousand small animations per
// frame and the page stalled.) Browsers without it, and people who asked for less motion, simply get the change at once.
function crossfade(change: () => void) {
  const start = (document as Document & { startViewTransition?: (callback: () => void) => unknown }).startViewTransition;
  if (typeof start === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) start.call(document, change);
  else change();
}

function save(choice: ThemeChoice) {
  try {
    if (!choice.dark && !choice.hex) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, serializeTheme(choice));
  } catch {
    // Storage blocked (private mode, full): the choice still works until the page is closed.
  }
}

const BUTTON =
  "relative grid size-11 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface-raised text-ink-primary shadow-sm transition-[transform,opacity] duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

export function ThemeDock() {
  const [ready, setReady] = useState(false);
  const [choice, setChoice] = useState<ThemeChoice>({ dark: false, hex: null });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const colourButton = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelId = useId();

  // On arrival: read what was saved and show the buttons.
  useEffect(() => {
    let saved: ThemeChoice = { dark: false, hex: null };
    try {
      saved = parseStored(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage blocked: start plain.
    }
    setChoice(saved);
    applyTheme(saved); // Also refreshes a palette that an older version of the rules made.
    setReady(true);
    return () => {
      clearTimeout(saveTimer.current);
      clearTimeout(noteTimer.current);
    };
  }, []);

  const update = (next: ThemeChoice, source: ChangeSource) => {
    setChoice(next);
    // A single jump (dark switch, preset, typed colour) fades; a drag changes many times a second, so it applies at once.
    if (source === "pick") crossfade(() => applyTheme(next));
    else applyTheme(next);
    // A drag sends many changes a second, so saving waits until it pauses; a single jump saves at once.
    clearTimeout(saveTimer.current);
    if (source === "pick") save(next);
    else saveTimer.current = setTimeout(() => save(next), 250);
  };

  const closePanel = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) colourButton.current?.focus();
  }, []);

  // While the picker is open: Escape or a click elsewhere closes it, and it starts on the colour square for the keyboard.
  useEffect(() => {
    if (!open) return;
    // A short wait: for the first frame of the fade-in the picker still counts as hidden, and a hidden thing cannot take focus.
    const focusTimer = setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[role=slider]")?.focus(), 50);
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  const onColourClick = () => {
    if (choice.dark) {
      // The wheel is off in dark mode: say why, for a moment, instead of doing nothing.
      setNote(true);
      clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => setNote(false), 2600);
      return;
    }
    setOpen((value) => !value);
  };

  const toggleDark = () => {
    const next = { ...choice, dark: !choice.dark };
    setOpen(false);
    setNote(false);
    update(next, "pick");
  };

  if (!ready) return null;

  return (
    <div
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closePanel(true);
        }
      }}
      className="fixed right-3 bottom-3 z-50 flex flex-row gap-2.5 min-[1280px]:top-1/2 min-[1280px]:right-4 min-[1280px]:bottom-auto min-[1280px]:-translate-y-1/2 min-[1280px]:flex-col"
    >
      {/* The picker. Always in the page but hidden and unreachable while closed, so it can fade and scale smoothly both ways. */}
      <div className="pointer-events-none absolute right-0 bottom-full mb-3 min-[1280px]:top-1/2 min-[1280px]:right-full min-[1280px]:bottom-auto min-[1280px]:mr-3 min-[1280px]:mb-0 min-[1280px]:-translate-y-1/2">
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Site colour"
          inert={!open}
          className={cn(
            "max-h-[calc(100dvh-6rem)] w-[min(268px,calc(100vw-1.5rem))] origin-bottom-right overflow-y-auto min-[1280px]:max-h-[calc(100dvh-1.5rem)] min-[1280px]:origin-right rounded-2xl border border-line-subtle bg-surface-raised shadow-xl transition-[opacity,scale,visibility] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
            open ? "pointer-events-auto visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
          )}
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-sm font-semibold text-ink-primary">Site colour</span>
            <button
              type="button"
              onClick={() => update({ ...choice, hex: null }, "pick")}
              disabled={!choice.hex}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-40 disabled:hover:text-ink-secondary"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
          <div className="px-3 pb-3">
            <ColorPickerPanel
              value={choice.hex ?? START_COLOUR}
              onChange={(hex, source) => update({ ...choice, hex }, source)}
              swatches={SWATCHES}
            />
          </div>
        </div>
      </div>

      {/* The short "why is this greyed" message for dark mode. */}
      <p
        role="status"
        className={cn(
          "pointer-events-none absolute right-0 bottom-full mb-3 rounded-full min-[1280px]:top-1.5 min-[1280px]:right-full min-[1280px]:bottom-auto min-[1280px]:mr-3 min-[1280px]:mb-0 border border-line-subtle bg-surface-raised px-3 py-1 text-xs whitespace-nowrap text-ink-secondary shadow-sm transition-opacity duration-200 motion-reduce:transition-none",
          note ? "opacity-100" : "opacity-0",
        )}
      >
        {note ? "Colours are off in dark mode." : ""}
      </p>

      <button
        ref={colourButton}
        type="button"
        aria-label={choice.dark ? "Site colour (off in dark mode)" : "Change the site colour"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-disabled={choice.dark || undefined}
        onClick={onColourClick}
        className={cn(BUTTON, choice.dark && "opacity-50")}
      >
        {/* A rainbow disc: the colours here are the picture on the button, not site colours. */}
        <span
          aria-hidden="true"
          className={cn("size-6 rounded-full transition-[filter] duration-300", choice.dark && "grayscale")}
          style={{ background: "conic-gradient(from 90deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)" }}
        >
          <span className="absolute inset-0 m-auto size-2.5 rounded-full bg-surface-raised" />
        </span>
      </button>

      <button
        type="button"
        aria-label="Dark mode"
        aria-pressed={choice.dark}
        onClick={toggleDark}
        className={BUTTON}
      >
        {/* Both icons sit on top of each other; one turns and shrinks away while the other turns in. */}
        <MoonStar
          aria-hidden="true"
          className={cn("absolute size-5 transition-[opacity,rotate,scale] duration-300 motion-reduce:transition-none", choice.dark ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100")}
          fill="currentColor"
          fillOpacity={0.12}
        />
        <Sun
          aria-hidden="true"
          className={cn("absolute size-5 text-amber-300 transition-[opacity,rotate,scale] duration-300 motion-reduce:transition-none", choice.dark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0")}
          fill="currentColor"
          fillOpacity={0.25}
        />
      </button>
    </div>
  );
}
