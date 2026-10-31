import { Bookmark, MessageSquare } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { StarRating } from "@/components/wensity/star-rating";

/*
 * The three things on the right of every website row: a star rating, a "Review" button and a bookmark button.
 *
 * Accounts are not open yet (the legal gate: privacy policy and age rule are not done). So these only ASK the visitor to sign in.
 * Nothing is saved, sent or counted here, and no rating or review is ever shown that nobody wrote. Once accounts exist this is the
 * one place that changes: each button then does its real job instead of showing the prompt.
 *
 * Left of the star rating sits the average of every user's ratings, in a small circle ("4.5 /5", or "–" while nobody has rated).
 *
 * The star rating (Wensity "Star Rating", src/components/wensity/star-rating.tsx) rests as ONE star in a round pill. Hovering it
 * (or tabbing to it) grows the pill to five stars; the light on the stars follows the pointer. The star is the LAST item on its line and
 * the spot after it is kept empty, so the pill grows sideways into that room: it never covers a button and nothing moves.
 */

type Ask = "rate" | "review" | "bookmark";

const MESSAGES: Record<Ask, string> = {
  rate: "Sign in to rate this website.",
  review: "Sign in to write a review of this website.",
  bookmark: "Sign in to save this website to your bookmarks.",
};

// What a screen reader says for each whole rating, from one star up.
const RATING_WORDS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

const roundButton =
  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface-raised text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none";

// Each star is about 40 small shapes, and a page has 8 rows. So a row draws ONE star until the pointer or the keyboard reaches the star
// button, and only then the full five (and goes back to one a moment after it leaves). That keeps the list page light: 8 stars at rest
// instead of 40, which makes every colour change, dark switch and search keystroke on this page cheaper.
function EntryActionsInner({ name, average, count }: { name: string; average: number | null; count: number }) {
  const [ask, setAsk] = useState<Ask | null>(null);
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(disarmTimer.current), []);
  const arm = () => {
    clearTimeout(disarmTimer.current);
    setArmed(true);
  };
  // Wait for the shrinking animation to finish, and stay five stars while the pointer is still over it or it still has the focus.
  const disarm = () => {
    clearTimeout(disarmTimer.current);
    disarmTimer.current = setTimeout(() => {
      if (!pillRef.current?.matches(":hover, :focus-within")) setArmed(false);
    }, 450);
  };

  // While the prompt is open: Escape or a click elsewhere closes it.
  useEffect(() => {
    if (!ask) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setAsk(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAsk(null);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [ask]);

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setAsk("review")}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised px-3.5 text-sm font-medium text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        Review
        <span className="sr-only"> {name}</span>
      </button>

      <button type="button" aria-label={`Bookmark ${name}`} onClick={() => setAsk("bookmark")} className={roundButton}>
        <Bookmark className="size-4" aria-hidden="true" />
      </button>

      {/* The average of everyone's ratings in a small circle, just left of the star rating. "–" until somebody has rated. */}
      <div
        role="img"
        aria-label={average === null ? `${name}: no ratings yet` : `${name}: average rating ${average.toFixed(1)} out of 5, from ${count} ${count === 1 ? "rating" : "ratings"}`}
        title={average === null ? "No ratings yet" : `${count} ${count === 1 ? "rating" : "ratings"}`}
        className="grid size-10 shrink-0 place-content-center rounded-full border border-line-strong bg-surface-raised text-center leading-none"
      >
        <span className="text-[13px] font-semibold tabular-nums">{average === null ? "–" : average.toFixed(1)}</span>
        <span className="mt-0.5 text-[9px] text-ink-muted">/5</span>
      </div>

      {/* The star spot: as wide as the five-star pill, so the pill (taken out of the flow) grows into this empty room and pushes nothing. */}
      <div className="relative h-9 w-[7.75rem] shrink-0">
        <div
          ref={pillRef}
          onPointerEnter={arm}
          onFocus={arm}
          onPointerLeave={disarm}
          onBlur={disarm}
          className="group/pill absolute top-0 left-0 z-10 h-9 w-9 overflow-hidden rounded-full border border-line-strong bg-surface-raised transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:w-[7.75rem] hover:w-[7.75rem] motion-reduce:transition-none">
          <div className="flex h-full items-center pl-[9px]">
            {/* This inner clip keeps the second star completely out of sight while the pill is small (it grows together with the pill). */}
            <div className="-my-1 w-[18px] overflow-hidden py-1 transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within/pill:w-[106px] group-hover/pill:w-[106px] motion-reduce:transition-none">
              {/* value={0}: picking a star only opens the sign-in prompt, so a rating nobody gave can never appear. */}
              <StarRating
                value={0}
                max={armed ? 5 : 1}
                size={18}
                labels={RATING_WORDS}
                aria-label={`Rate ${name}`}
                // While it draws a single star, it must still read as a five star rating to a screen reader. (The value is always 0 here.)
                aria-valuemax={5}
                aria-valuetext="0 out of 5 stars"
                onValueChange={() => setAsk("rate")}
              />
            </div>
          </div>
        </div>
      </div>

      {ask ? (
        // data-nudge: the row stays open (shows its box and details) while this is on screen.
        <div
          data-nudge
          role="status"
          className="absolute top-full left-0 z-30 mt-2 w-64 rounded-xl border border-line-subtle bg-surface-raised p-3 text-left text-sm shadow-lg sm:right-0 sm:left-auto"
        >
          <p className="font-medium text-ink-primary">{MESSAGES[ask]}</p>
          <p className="mt-0.5 text-xs text-ink-muted">Accounts are not open yet.</p>
          <div className="mt-2.5 flex items-center gap-3">
            <a
              href="/sign-in"
              className="rounded-full bg-action px-3.5 py-1.5 text-xs font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              Sign in
            </a>
            <button
              type="button"
              onClick={() => setAsk(null)}
              className="cursor-pointer rounded-md px-1 text-xs text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// The parent list re-renders on every search keystroke, tab or page change; a row whose website did not change has nothing new to show.
export const EntryActions = memo(EntryActionsInner);
