import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * Tabs with a "gooey" black blob that stretches and slides to the tab you pick. Written for this site (no outside component).
 * How the goo works, so you can explain it:
 * - Two identical black pills sit behind the labels. One moves fast, one follows slowly, so while moving they stretch apart.
 * - An SVG filter (blur, then a hard contrast step) melts the two pills into one stretchy shape. At rest they overlap perfectly.
 * - The filter touches only this small strip, and is switched off with "reduce motion" (the blob then just jumps).
 * Before the script loads (or if it fails), the chosen tab paints its own black background, so the strip never looks empty.
 * Keyboard: arrow keys, Home and End move between tabs, like any tab list.
 */

export type GooeyTab = { id: string; label: string };

// left / width: where the chosen tab is. track: the full width of the strip, including any part scrolled out of view.
type Box = { left: number; width: number; track: number };

const FILTER_ID = "gooey-tabs-filter";

interface GooeyTabsProps {
  tabs: GooeyTab[];
  value: string;
  onChange: (id: string) => void;
  /** Used to link each tab to its panel (the page gives the panel `${idPrefix}-panel`). */
  idPrefix: string;
  "aria-label": string;
}

export function GooeyTabs({ tabs, value, onChange, idPrefix, "aria-label": label }: GooeyTabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<Box | null>(null);
  // Off for the very first placement, so the blob appears in place instead of sliding in from the left.
  const [animate, setAnimate] = React.useState(false);

  // Measure the chosen tab. Runs again when the strip changes size (fonts loading, window resizing).
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (active) setBox({ left: active.offsetLeft, width: active.offsetWidth, track: list.scrollWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [value, tabs]);

  // On narrow screens the strip scrolls sideways. Bring the chosen tab into view (this only moves the strip, not the page).
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [value]);

  React.useEffect(() => {
    if (!box || animate) return;
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [box, animate]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    const next =
      event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next].id);
    listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  const blob = (speed: string): React.CSSProperties => ({
    left: box?.left ?? 0,
    width: box?.width ?? 0,
    transition: animate ? `left ${speed} cubic-bezier(0.3, 0.8, 0.3, 1), width ${speed} cubic-bezier(0.3, 0.8, 0.3, 1)` : "none",
  });

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative inline-flex max-w-full overflow-x-auto rounded-full border border-line-subtle bg-surface-sunken p-1 [scrollbar-width:none]"
    >
      {/* The filter itself (no size, hidden from screen readers). */}
      <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute size-0">
        <defs>
          <filter id={FILTER_ID}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
          </filter>
        </defs>
      </svg>

      {/* The blobs. Not drawn until measured; "reduce motion" removes the filter. */}
      {box ? (
        <div
          aria-hidden="true"
          // As wide as the whole strip (not just the visible part), or the filter would cut the blob off when the strip scrolls.
          className="pointer-events-none absolute top-0 left-0 h-full [filter:url(#gooey-tabs-filter)] motion-reduce:[filter:none]"
          style={{ width: box.track }}
        >
          <span className="absolute inset-y-1 rounded-full bg-action motion-reduce:!transition-none" style={blob("0.35s")} />
          <span className="absolute inset-y-1 rounded-full bg-action motion-reduce:!transition-none" style={blob("0.6s")} />
        </div>
      ) : null}

      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:px-4",
              selected ? "text-action-ink" : "text-ink-secondary hover:text-ink-primary",
              // Until the blob exists, the chosen tab draws its own black background.
              selected && !box && "bg-action",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
