import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";
import { parsePage } from "@/lib/page-range";
import { cn } from "@/lib/utils";

/*
 * The page-number buttons (Previous, 1 … 4 5 6 … 20, Next), adapted from a supplied "pagination" component.
 * Changes, so you can explain them:
 * - Colours come from the site's own tokens: the current page is a black pill, hover is a light grey. The demo's blue,
 *   dark mode and shadcn colour names (bg-primary...) are gone, because this site has none of them.
 * - No class-variance-authority: the variants were never used, so plain class names do the same job (one package less).
 * - The demo's own "which page numbers to show" code (and its matchMedia hook, which differs between the server HTML
 *   and the browser) is replaced by src/lib/page-range.ts, which is tested. Phones just get smaller buttons and
 *   icon-only Previous/Next, done with CSS, so nothing changes after the script loads.
 * - The "…" can be clicked: it turns into a small box where you type a page number (Enter goes there, Escape or clicking away cancels).
 *   Only digits are accepted, and a number that is too big goes to the last page (rules and tests: parsePage in src/lib/page-range.ts).
 * - Buttons are type="button", the nav is labelled, the current page says aria-current="page", and "…" is read as "More pages".
 */

const button =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg text-sm whitespace-nowrap tabular-nums text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none";

const Pagination = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    aria-label="Pagination"
    className={cn("flex max-w-full items-center gap-0.5 overflow-x-auto sm:gap-1", className)}
    {...props}
  />
));
Pagination.displayName = "Pagination";

interface PaginationItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

const PaginationItem = React.forwardRef<HTMLButtonElement, PaginationItemProps>(
  ({ className, isActive, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        button,
        "size-7 min-[360px]:size-8 sm:size-9",
        isActive && "bg-action font-semibold text-action-ink hover:bg-action-hover hover:text-action-ink",
        className,
      )}
      {...props}
    />
  ),
);
PaginationItem.displayName = "PaginationItem";

// Previous and Next: icon only on phones (the label shows from the "sm" screen width up).
const PaginationPrevious = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label="Previous page"
      className={cn(button, "h-7 gap-1 px-1.5 min-[360px]:h-8 min-[360px]:px-2 sm:h-9 sm:px-3", className)}
      {...props}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{children ?? "Previous"}</span>
    </button>
  ),
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label="Next page"
      className={cn(button, "h-7 gap-1 px-1.5 min-[360px]:h-8 min-[360px]:px-2 sm:h-9 sm:px-3", className)}
      {...props}
    >
      <span className="hidden sm:inline">{children ?? "Next"}</span>
      <ChevronRight className="size-4" aria-hidden="true" />
    </button>
  ),
);
PaginationNext.displayName = "PaginationNext";

interface PaginationEllipsisProps extends React.HTMLAttributes<HTMLElement> {
  /** The number of the last page. With `onJump`, the "…" becomes a button that opens a box to type a page number. */
  max?: number;
  onJump?: (page: number) => void;
}

const dotsClass = "inline-flex size-7 shrink-0 items-center justify-center min-[360px]:size-8 sm:size-9";

const PaginationEllipsis = ({ className, max = 1, onJump, ...props }: PaginationEllipsisProps) => {
  const [typing, setTyping] = React.useState(false);
  const [text, setText] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (typing) inputRef.current?.focus();
  }, [typing]);

  // Not clickable (no onJump): just the dots, as in the original component.
  if (!onJump) {
    return (
      <span className={cn(dotsClass, "text-ink-muted", className)} {...props}>
        <MoreHorizontal className="size-4" aria-hidden="true" />
        <span className="sr-only">More pages</span>
      </span>
    );
  }

  const close = (refocusDots: boolean) => {
    setTyping(false);
    setText("");
    setInvalid(false);
    if (refocusDots) requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const submit = () => {
    const page = parsePage(text, max);
    if (page === null) {
      // Nothing usable typed: stay open and mark the box, so it is clear nothing happened.
      setInvalid(true);
      return;
    }
    const nav = inputRef.current?.closest("nav");
    onJump(page);
    close(false);
    // The dots may move or disappear after the jump, so keyboard users land on the current page instead of nowhere.
    requestAnimationFrame(() => nav?.querySelector<HTMLElement>('[aria-current="page"]')?.focus());
  };

  if (typing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={String(max).length + 1}
        value={text}
        placeholder="Page"
        aria-label={`Go to page, from 1 to ${max}`}
        aria-invalid={invalid || undefined}
        // Digits only: anything else typed or pasted is dropped on the spot.
        onChange={(event) => {
          setText(event.target.value.replace(/[^0-9]/g, ""));
          setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            close(true);
          }
        }}
        onBlur={() => close(false)}
        className={cn(
          "h-7 w-12 shrink-0 rounded-lg border border-line-strong bg-surface-raised px-1 text-center text-sm tabular-nums text-ink-primary placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus min-[360px]:h-8 min-[360px]:w-14 sm:h-9 sm:w-16",
          invalid && "border-ink-primary",
        )}
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Go to a page number"
      title="Go to a page number"
      onClick={() => setTyping(true)}
      className={cn(button, dotsClass, "text-ink-muted", className)}
    >
      <MoreHorizontal className="size-4" aria-hidden="true" />
    </button>
  );
};
PaginationEllipsis.displayName = "PaginationEllipsis";

export { Pagination, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious };
