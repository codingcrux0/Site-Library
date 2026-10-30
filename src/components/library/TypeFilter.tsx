import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { TagGroup } from "@/config/tags";
import { cn } from "@/lib/utils";

/*
 * "Filter by type": a button that opens a small panel with a search box and tick boxes (React, CSS, Java...).
 * It only shows the choices; the page owns which ones are picked. Picking more than one means "any of them".
 * Closes with Escape (focus goes back to the button), when you click elsewhere, or when focus moves out of the panel.
 * The tick boxes are real checkboxes, so keyboard and screen readers work without extra code.
 */

interface TypeFilterProps {
  groups: TagGroup[];
  /** How many sites carry each tag (a missing tag counts as 0). */
  counts: Map<string, number>;
  picked: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export function TypeFilter({ groups, counts, picked, onToggle, onClear }: TypeFilterProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const close = (refocus: boolean) => {
    setOpen(false);
    setText("");
    if (refocus) buttonRef.current?.focus();
  };

  // While open: start in the search box, and close when you click or tab to anywhere outside.
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const outside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setText("");
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);

  const needle = text.trim().toLowerCase();
  const visible = groups
    .map((group) => ({ ...group, tags: group.tags.filter((tag) => tag.toLowerCase().includes(needle)) }))
    .filter((group) => group.tags.length > 0);

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close(true);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close(false) : setOpen(true))}
        className="flex h-[42px] cursor-pointer items-center gap-2 rounded-full border border-line-subtle bg-surface-raised px-4 text-sm font-medium text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        Filter by type
        {picked.length > 0 ? (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-action px-1.5 py-0.5 text-[11px] leading-none text-action-ink tabular-nums">
            <span className="sr-only">Picked: </span>
            {picked.length}
          </span>
        ) : null}
        <ChevronDown className={cn("size-4 text-ink-muted transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label="Filter by type of website"
          className="absolute top-full right-0 z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-line-subtle bg-surface-raised p-3 shadow-lg"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Search types"
              aria-label="Search the types"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={40}
              className="h-9 w-full rounded-lg border border-line-strong bg-surface-raised pr-3 pl-9 text-sm text-ink-primary placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
            />
          </div>

          <div className="mt-2 max-h-64 overflow-y-auto overscroll-y-contain [scrollbar-width:thin]">
            {visible.length === 0 ? (
              <p className="px-2 py-3 text-sm text-ink-secondary">No type matches that.</p>
            ) : (
              visible.map((group) => (
                <div key={group.category} role="group" aria-label={group.category} className="pb-1">
                  {groups.length > 1 ? (
                    <div className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-[0.1em] text-ink-muted uppercase">{group.category}</div>
                  ) : null}
                  {group.tags.map((tag) => {
                    const count = counts.get(tag) ?? 0;
                    return (
                      <label
                        key={tag}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-sunken has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus"
                      >
                        <input
                          type="checkbox"
                          checked={picked.includes(tag)}
                          onChange={() => onToggle(tag)}
                          className="size-4 shrink-0 cursor-pointer accent-ink-primary"
                        />
                        <span className={cn("min-w-0 flex-1 truncate", count === 0 && "text-ink-secondary")}>{tag}</span>
                        <span className="text-xs text-ink-muted tabular-nums">{count}</span>
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {picked.length > 0 ? (
            <div className="mt-2 flex items-center justify-between border-t border-line-subtle pt-3 text-sm">
              <span className="text-ink-secondary tabular-nums">{picked.length} picked</span>
              <button
                type="button"
                onClick={onClear}
                className="cursor-pointer rounded-md px-1 font-medium text-ink-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Clear types
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
