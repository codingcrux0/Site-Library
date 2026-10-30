import { Search, X } from "lucide-react";
import * as React from "react";
import { completionFor } from "@/lib/search";
import { cn } from "@/lib/utils";

/*
 * A search box that suggests the rest of your word in faint grey ("rea" shows a faint "ct"). Written for this site (no outside component).
 * How the ghost works, so you can explain it:
 * - Behind the real <input> sits a second layer with the SAME font and padding. It holds your typed text (made invisible, so it only
 *   takes up the right amount of space) followed by the missing end of the suggestion in faint grey. The input has no background,
 *   so the grey end shows through, right after your last letter.
 * - Tab or the right arrow (with the cursor at the end) accepts the suggestion. Escape clears the box. Nothing is accepted by itself.
 * - What to suggest is decided by completionFor() in src/lib/search.ts (tested). The ghost is hidden from screen readers (aria-hidden);
 *   the input says aria-autocomplete="inline".
 * - If your text is longer than the box (it scrolls), the ghost is switched off, because it would no longer line up.
 */

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** Words that may be suggested while typing. */
  suggestions: string[];
  className?: string;
  "aria-label": string;
  placeholder?: string;
}

export function SearchBox({ value, onChange, suggestions, className, "aria-label": label, placeholder }: SearchBoxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [fits, setFits] = React.useState(true);

  // Does the typed text still fit inside the box? (Runs after every change to the text.)
  React.useEffect(() => {
    const input = inputRef.current;
    if (input) setFits(input.scrollWidth <= input.clientWidth);
  }, [value]);

  const rest = focused && fits ? completionFor(value, suggestions) : "";

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const atEnd = event.currentTarget.selectionStart === value.length && event.currentTarget.selectionEnd === value.length;
    if (rest && ((event.key === "Tab" && !event.shiftKey) || (event.key === "ArrowRight" && atEnd))) {
      event.preventDefault();
      onChange(value + rest);
    } else if (event.key === "Escape" && value) {
      event.preventDefault();
      onChange("");
    }
  };

  return (
    <div
      className={cn(
        "relative flex h-10 items-center rounded-full border border-line-strong bg-surface-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        className,
      )}
    >
      <Search className="pointer-events-none absolute left-3.5 size-4 text-ink-muted" aria-hidden="true" />

      {/* The ghost layer: same font and padding as the input, so the faint end lines up with your typing. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-9 left-10 flex items-center overflow-hidden text-sm whitespace-pre">
        <span className="invisible">{value}</span>
        <span className="text-ink-primary/35">{rest}</span>
      </div>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={label}
        aria-autocomplete="inline"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={60}
        // No outline here (the box draws it) and no browser "x" (our own button is below).
        className="relative h-full w-full min-w-0 rounded-full bg-transparent pr-9 pl-10 text-sm text-ink-primary outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none"
      />

      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-focus motion-reduce:transition-none"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
