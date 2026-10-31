import { MessageSquare, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Entry } from "@/config/library";
import { formatDate } from "@/lib/format-date";
import { summarizeFeedback } from "@/lib/ratings";
import { cn } from "@/lib/utils";

/*
 * The feedback panel: slides in from the right and lists what users said about one website, with the average and how the stars split.
 * It only READS. Accounts are not open yet (the legal gate), so "Write a review" only asks the visitor to sign in and nothing is saved
 * or sent. A website with no feedback shows an honest empty state: no made-up reviews, ever. (Only the localhost demo, started with `npm run dev:demo`, adds
 * example feedback, and the panel says so.)
 * It is built by hand with no new package: a dialog that traps Tab, closes with Escape or a click outside, locks the page behind it and
 * gives focus back to the button that opened it. It slides with transform and opacity only, which the graphics chip does for free.
 */

const SLIDE_MS = 250;

// Five small stars, `value` of them filled. Decorative: the words next to it say the rating.
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} width={size} height={size} className={n <= value ? "fill-current" : "fill-transparent text-ink-muted/40"} />
      ))}
    </span>
  );
}

export function FeedbackDrawer({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [shown, setShown] = useState(false); // false at first so the panel starts off screen, then slides in
  const [askReview, setAskReview] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleId = useId();

  const { count, average, counts } = summarizeFeedback(entry.feedback);
  const feedback = (entry.feedback ?? []).filter((f) => Number.isInteger(f.rating) && f.rating >= 1 && f.rating <= 5);

  // Slide out first, then tell the page to remove the panel.
  const close = () => {
    setShown(false);
    clearTimeout(closing.current);
    closing.current = setTimeout(onClose, SLIDE_MS);
  };
  const closeNow = useRef(close);
  closeNow.current = close;

  useEffect(() => {
    // Two frames, so the browser draws the off-screen start before the slide begins.
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    closeRef.current?.focus();

    // Lock the page behind (and keep it from jumping sideways when the scrollbar disappears).
    const root = document.documentElement;
    const before = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    const bar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (bar > 0) root.style.paddingRight = `${bar}px`;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return closeNow.current();
      if (event.key !== "Tab" || !panelRef.current) return;
      // Keep Tab inside the panel: from the last control go to the first, and back.
      const items = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(closing.current);
      document.removeEventListener("keydown", onKey);
      root.style.overflow = before.overflow;
      root.style.paddingRight = before.paddingRight;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* The dim area behind the panel. A click on it closes the panel. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={cn("absolute inset-0 bg-ink-primary/30 transition-opacity duration-250 motion-reduce:transition-none", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line-subtle bg-surface-raised shadow-2xl transition-transform duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line-subtle px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-widest text-ink-muted uppercase">User feedback</p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold tracking-tight break-words">
              {entry.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close feedback"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface-raised text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {entry.demoFeedback && count > 0 ? (
            <p className="mb-4 rounded-lg border border-line-subtle bg-surface-sunken px-3 py-2 text-xs text-ink-secondary">
              Demo only: the feedback below is made up to show the design.
            </p>
          ) : null}

          {count === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong px-5 py-10 text-center">
              <MessageSquare className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
              <p className="mt-3 font-medium">No feedback yet.</p>
              <p className="mt-1 text-sm text-ink-secondary">Ratings and reviews from users will be listed here.</p>
            </div>
          ) : (
            <>
              {/* The average, and how many people gave each number of stars. */}
              <section aria-label="Rating summary" className="flex items-center gap-6 rounded-xl border border-line-subtle bg-surface-sunken p-5">
                <div className="text-center">
                  <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
                    {average?.toFixed(1)}
                    <span className="text-base font-normal text-ink-muted"> / 5</span>
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Stars value={Math.round(average ?? 0)} />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-secondary">
                    {count} {count === 1 ? "rating" : "ratings"}
                  </p>
                </div>
                <ul aria-label="Ratings by number of stars" className="min-w-0 flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <li key={stars} className="flex items-center gap-2 text-xs text-ink-secondary">
                      <span className="w-3 text-right tabular-nums">{stars}</span>
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line-subtle">
                        {/* scaleX (not width) so the bar fills on the graphics chip. */}
                        <span
                          className="block h-full origin-left rounded-full bg-amber-500 transition-transform duration-500 ease-out motion-reduce:transition-none"
                          style={{ transform: `scaleX(${shown ? counts[stars - 1] / count : 0})` }}
                        />
                      </span>
                      <span className="w-4 tabular-nums">{counts[stars - 1]}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <ul className="mt-5 space-y-3">
                {feedback.map((item, index) => (
                  <li
                    key={item.id}
                    // Each card fades up a moment after the one above it.
                    style={{ transitionDelay: shown ? `${Math.min(index, 6) * 45 + 120}ms` : "0ms" }}
                    className={cn(
                      "rounded-xl border border-line-subtle p-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
                      shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-semibold text-ink-secondary">
                        {item.author.trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.author}</p>
                        <p className="text-xs text-ink-muted">
                          <time dateTime={item.date}>{formatDate(item.date)}</time>
                        </p>
                      </div>
                      <Stars value={item.rating} />
                      <span className="sr-only">Rated {item.rating} out of 5</span>
                    </div>
                    {item.text ? <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{item.text}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="border-t border-line-subtle px-6 py-4">
          {askReview ? (
            <div role="status">
              <p className="text-sm font-medium">Sign in to write a review of this website.</p>
              <p className="mt-0.5 text-xs text-ink-muted">Accounts are not open yet.</p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="/sign-in"
                  className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                >
                  Sign in
                </a>
                <button
                  type="button"
                  onClick={() => setAskReview(false)}
                  className="cursor-pointer rounded-md px-1 text-sm text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAskReview(true)}
              className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-action px-4 text-sm font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              Write a review
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
