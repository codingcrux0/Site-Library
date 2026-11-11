import { Bookmark, MessageSquare } from "lucide-react";
import { memo, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { StarRating } from "@/components/wensity/star-rating";
import { cn } from "@/lib/utils";

/*
 * The three things on the right of every website row: a star rating, a "Review" button and a bookmark button.
 *
 * Signed in (see use-account.ts): the stars save YOUR rating (and show it), and the bookmark button saves or removes the website from your
 * bookmarks. Signed out, those buttons ask the visitor to sign in and nothing is saved or sent. Whatever the buttons show is only a
 * picture of what the database allows: the database's own rules (the .sql files in the database folder) decide, so editing this page changes nothing for anyone else.
 * "Review" opens the feedback panel (FeedbackDrawer.tsx), where a signed-in person writes a review; signed out, it asks for a sign-in. After you
 * rate, a small note says what you gave and offers "Clear my rating". No rating or review is ever shown that nobody wrote.
 *
 * Left of the star rating sits the average of every user's ratings, in a small circle ("4.5 /5", or "–" while nobody has rated).
 *
 * The star rating (Wensity "Star Rating", src/components/wensity/star-rating.tsx) rests as ONE star in a round pill (filled once you have
 * rated). Hovering it (or tabbing to it) grows the pill to five stars; the light on the stars follows the pointer. The star is the LAST item
 * on its line and the spot after it is kept empty, so the pill grows sideways into that room: it never covers a button and nothing moves.
 */

type Ask = "rate" | "review" | "bookmark";

// What the sign-in prompt says for each button (signed-out visitors only).
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
function EntryActionsInner({
  id,
  name,
  average,
  count,
  signedIn,
  bookmarked,
  myRating,
  onBookmark,
  onRate,
  onClear,
  onReview,
}: {
  id: string;
  name: string;
  average: number | null;
  count: number;
  signedIn: boolean;
  bookmarked: boolean;
  /** The visitor's own rating of this website, 0 when they have not rated it (or are signed out). */
  myRating: number;
  onBookmark: (id: string) => Promise<string | null>;
  onRate: (id: string, stars: number) => Promise<string | null>;
  /** Takes the visitor's own rating back. */
  onClear: (id: string) => Promise<string | null>;
  /** Opens the feedback panel with the review box ready; the button is passed so the keyboard can be put back on it. */
  onReview: (button: HTMLElement) => void;
}) {
  const [ask, setAsk] = useState<Ask | null>(null); // the sign-in prompt (signed-out visitors)
  const [note, setNote] = useState<string | null>(null); // a plain sentence for signed-in people (what they just did, or a problem)
  const [canClear, setCanClear] = useState(false); // true right after a rating was saved: the note then offers "Clear my rating"
  const open = ask !== null || note !== null;
  const [armed, setArmed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // When the five stars opened (0 = they are shut), and whether the tap in progress only opened them (touch screens, see below).
  const armedAt = useRef(0);
  const justOpening = useRef(false);

  useEffect(() => () => clearTimeout(disarmTimer.current), []);
  const arm = () => {
    clearTimeout(disarmTimer.current);
    if (armedAt.current === 0) armedAt.current = performance.now();
    setArmed(true);
  };
  // A finger has no hover, so on a phone the FIRST tap on the pill must only open the five stars. Without this, that tap lands on the single
  // resting star and rates one star at once. A mouse is never held back (it opens the stars by hovering, before the click).
  const touchStart = (event: ReactPointerEvent) => {
    justOpening.current = event.pointerType !== "mouse" && !(armedAt.current > 0 && performance.now() - armedAt.current > 300);
  };
  const touchEnd = () => setTimeout(() => (justOpening.current = false), 0); // after the click that follows the tap
  // Wait for the shrinking animation to finish, and stay five stars while the pointer is still over it or it still has the focus.
  const disarm = () => {
    clearTimeout(disarmTimer.current);
    disarmTimer.current = setTimeout(() => {
      if (!pillRef.current?.matches(":hover, :focus-within")) {
        armedAt.current = 0;
        setArmed(false);
      }
    }, 450);
  };

  const closePrompt = () => {
    setAsk(null);
    setNote(null);
    setCanClear(false);
  };

  // While the prompt is open: Escape, a click elsewhere, or the pointer moving onto a different row closes it (only one row stays open).
  useEffect(() => {
    if (!open) return;
    const close = closePrompt;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const otherRow = (event: PointerEvent) => {
      const row = (event.target as Element).closest("[data-row]");
      if (row && row !== rootRef.current?.closest("[data-row]")) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("pointermove", otherRow);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("pointermove", otherRow);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Signed in: do the real thing and show a sentence only if it did not work. Signed out: ask for a sign-in.
  const bookmark = async () => {
    if (!signedIn) return setAsk("bookmark");
    setNote(await onBookmark(id));
  };
  const rate = async (stars: number) => {
    if (justOpening.current) return; // that tap only opened the stars
    if (!signedIn) return setAsk("rate");
    const problem = await onRate(id, stars);
    setNote(problem ?? `You rated it ${stars} out of 5.`);
    setCanClear(problem === null);
  };
  const clear = async () => {
    const problem = await onClear(id);
    setCanClear(false);
    setNote(problem ?? "Your rating is cleared.");
  };
  const review = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (!signedIn) return setAsk("review");
    onReview(event.currentTarget);
  };

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={review}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised px-3.5 text-sm font-medium text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        Review
        <span className="sr-only"> {name}</span>
      </button>

      <button type="button" aria-label={`Bookmark ${name}`} aria-pressed={signedIn ? bookmarked : undefined} onClick={bookmark} className={roundButton}>
        <Bookmark className={cn("size-4", bookmarked && "fill-current")} aria-hidden="true" />
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
          onPointerDownCapture={touchStart}
          onPointerUpCapture={touchEnd}
          onPointerCancelCapture={touchEnd}
          onPointerEnter={arm}
          onFocus={arm}
          onPointerLeave={disarm}
          onBlur={disarm}
          className="group/pill absolute top-0 left-0 z-10 h-9 w-9 overflow-hidden rounded-full border border-line-strong bg-surface-raised transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:w-[7.75rem] hover:w-[7.75rem] motion-reduce:transition-none">
          <div className="flex h-full items-center pl-[9px]">
            {/* This inner clip keeps the second star completely out of sight while the pill is small (it grows together with the pill). */}
            <div className="-my-1 w-[18px] overflow-hidden py-1 transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within/pill:w-[106px] group-hover/pill:w-[106px] motion-reduce:transition-none">
              {/* value is YOUR rating (0 when you have none or are signed out), never anyone else's: a rating nobody gave can never appear. */}
              <StarRating
                value={armed ? myRating : myRating > 0 ? 1 : 0}
                max={armed ? 5 : 1}
                size={18}
                labels={RATING_WORDS}
                aria-label={`Rate ${name}`}
                // While it draws a single star, it must still read as a five star rating to a screen reader.
                aria-valuemax={5}
                aria-valuetext={myRating > 0 ? `You rated it ${myRating} out of 5 stars` : "Not rated by you yet"}
                onValueChange={rate}
              />
            </div>
          </div>
        </div>
      </div>

      {open ? (
        // data-nudge: the row stays open (shows its box and details) while this is on screen.
        <div
          data-nudge
          role="status"
          className="absolute top-full left-0 z-30 mt-2 w-64 rounded-xl border border-line-subtle bg-surface-raised p-3 text-left text-sm shadow-lg sm:right-0 sm:left-auto"
        >
          <p className="font-medium text-ink-primary">{ask ? MESSAGES[ask] : note}</p>
          <div className="mt-2.5 flex items-center gap-3">
            {ask ? (
              <a
                href="/sign-in"
                className="rounded-full bg-action px-3.5 py-1.5 text-xs font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
              >
                Sign in
              </a>
            ) : null}
            {canClear ? (
              <button
                type="button"
                onClick={clear}
                className="cursor-pointer rounded-full border border-line-strong px-3.5 py-1.5 text-xs font-semibold transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
              >
                Clear my rating
              </button>
            ) : null}
            <button
              type="button"
              onClick={closePrompt}
              className="cursor-pointer rounded-md px-1 text-xs text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {ask ? "Not now" : "Close"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// The parent list re-renders on every search keystroke, tab or page change; a row whose website did not change has nothing new to show.
export const EntryActions = memo(EntryActionsInner);
