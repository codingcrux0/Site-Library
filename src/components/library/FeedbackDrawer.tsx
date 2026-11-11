import { MessageSquare, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Entry } from "@/config/library";
import { formatDate } from "@/lib/format-date";
import type { RatingSummary } from "@/lib/account";
import { summarizeFeedback } from "@/lib/ratings";
import { REVIEW_MAX, type MyReview, type PublicReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/*
 * The feedback panel: slides in from the right and shows what users said about one website: the average and how the stars split, and the
 * written reviews the owner has approved (text and day only, never a name). Signed in, a person also writes, changes or deletes their own
 * review here, and can clear their rating. A new or changed review waits for the owner's approval, and the panel says so. Signed out,
 * "Write a review" asks for a sign-in. Everything is saved by use-account.ts (this file sends nothing itself). A website with no feedback shows an honest empty state:
 * no made-up reviews, ever. (Only the localhost demo, started with `npm run dev:demo`, adds example feedback, and the panel says so.)
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

type Props = {
  entry: Entry;
  summary?: RatingSummary;
  signedIn: boolean;
  /** Open with the review box ready (the row's Review button). */
  startWriting: boolean;
  /** The visitor's own rating (0 = none) and own review (undefined = none) of this website. */
  myRating: number;
  myReview?: MyReview;
  loadReviews: (id: string) => Promise<PublicReview[]>;
  onSaveReview: (id: string, text: string) => Promise<string | null>;
  onDeleteReview: (id: string) => Promise<string | null>;
  onClearRating: (id: string) => Promise<string | null>;
  onClose: () => void;
};

const textButton =
  "cursor-pointer rounded-md px-1 text-sm text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const pillButton =
  "inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface-raised px-4 text-sm font-medium transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none";
const actionButton =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-action px-4 text-sm font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-60 motion-reduce:transition-none";

export function FeedbackDrawer({ entry, summary, signedIn, startWriting, myRating, myReview, loadReviews, onSaveReview, onDeleteReview, onClearRating, onClose }: Props) {
  const [shown, setShown] = useState(false); // false at first so the panel starts off screen, then slides in
  const [askReview, setAskReview] = useState(false); // signed out: the sign-in prompt
  const [writing, setWriting] = useState(signedIn && startWriting); // signed in: the review box is open
  const [text, setText] = useState(myReview?.body ?? "");
  const [problem, setProblem] = useState<string | null>(null); // one plain sentence next to what was pressed
  const [busy, setBusy] = useState(false);
  const [reviews, setReviews] = useState<PublicReview[] | null>(null); // the approved reviews of this website; null while they load
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleId = useId();

  // Typed words that are not saved yet: tapping the dim area must not throw them away by accident.
  const dirty = writing && text.trim() !== (myReview?.body ?? "");
  const dirtyNow = useRef(dirty);
  dirtyNow.current = dirty;

  // Live numbers (everyone's star ratings) when there are some; otherwise whatever feedback is built into the entry (none, on the real site).
  const { count, average, counts } = summary ?? summarizeFeedback(entry.feedback);
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
    (areaRef.current ?? closeRef.current)?.focus();
    let stale = false;
    loadReviews(entry.id).then((list) => {
      if (!stale) setReviews(list);
    });

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
      const items = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea:not([disabled])");
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
      stale = true;
      cancelAnimationFrame(frame);
      clearTimeout(closing.current);
      document.removeEventListener("keydown", onKey);
      root.style.overflow = before.overflow;
      root.style.paddingRight = before.paddingRight;
    };
  }, []);

  const send = async () => {
    setBusy(true);
    const answer = await onSaveReview(entry.id, text);
    setBusy(false);
    setProblem(answer);
    if (answer === null) setWriting(false);
  };
  const remove = async () => {
    setBusy(true);
    const answer = await onDeleteReview(entry.id);
    setBusy(false);
    setProblem(answer);
    if (answer === null) {
      setText("");
      setWriting(false);
    }
  };
  const clearRating = async () => {
    setBusy(true);
    setProblem(await onClearRating(entry.id));
    setBusy(false);
  };
  const openWriting = () => {
    setText(myReview?.body ?? "");
    setProblem(null);
    setWriting(true);
    requestAnimationFrame(() => areaRef.current?.focus());
  };
  const published = reviews ?? [];
  const nothingYet = count === 0 && feedback.length === 0 && published.length === 0 && !myReview;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* The dim area behind the panel. A click on it closes the panel. */}
      <div
        aria-hidden="true"
        onClick={() => {
          if (!dirtyNow.current) close();
        }}
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

          {signedIn ? (
            <section aria-label="Your rating and review" className="mb-5 space-y-3">
              {myRating > 0 ? (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-ink-secondary">You rated it {myRating} out of 5.</span>
                  <button type="button" onClick={clearRating} disabled={busy} className={textButton}>
                    Clear my rating
                  </button>
                </p>
              ) : null}
              {writing ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send();
                  }}
                  className="rounded-xl border border-line-strong p-4"
                >
                  <label htmlFor={`${titleId}-review`} className="text-sm font-medium">
                    Your review of {entry.name}
                  </label>
                  <textarea
                    id={`${titleId}-review`}
                    ref={areaRef}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={REVIEW_MAX}
                    rows={6}
                    aria-describedby={`${titleId}-hint`}
                    className="mt-2 block w-full resize-y rounded-lg border border-line-strong bg-surface-raised p-3 text-base leading-relaxed text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  />
                  <p id={`${titleId}-hint`} className="mt-2 text-xs leading-relaxed text-ink-muted">
                    Plain text, no web addresses. It is shown without your name, after it has been checked.
                    <span className="ml-2 tabular-nums">
                      {[...text].length} / {REVIEW_MAX}
                    </span>
                  </p>
                  {problem ? (
                    <p role="alert" className="mt-2 text-sm font-medium text-ink-primary">
                      {problem}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={busy} className={actionButton}>
                      {myReview ? "Save my review" : "Send my review"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWriting(false);
                        setProblem(null);
                      }}
                      className={textButton}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : myReview ? (
                <div className="rounded-xl border border-line-strong p-4">
                  <p className="text-xs font-medium tracking-widest text-ink-muted uppercase">Your review</p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line break-words text-ink-secondary">{myReview.body}</p>
                  <p role="status" className="mt-3 text-xs leading-relaxed text-ink-muted">
                    {myReview.approved
                      ? "It is shown on this page, without your name."
                      : "It is waiting to be checked. It will appear on this page once it has been approved."}
                  </p>
                  {problem ? (
                    <p role="alert" className="mt-2 text-sm font-medium text-ink-primary">
                      {problem}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={openWriting} disabled={busy} className={pillButton}>
                      Edit my review
                    </button>
                    <button type="button" onClick={remove} disabled={busy} className={textButton}>
                      Delete my review
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {nothingYet ? (
            <div className="rounded-xl border border-dashed border-line-strong px-5 py-10 text-center">
              <MessageSquare className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
              <p className="mt-3 font-medium">No feedback yet.</p>
              <p className="mt-1 text-sm text-ink-secondary">Be the first: rate this website with the stars on its row, or write a review.</p>
            </div>
          ) : (
            <>
              {/* The average, and how many people gave each number of stars. */}
              {count > 0 ? (
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
              ) : null}

              {published.length > 0 ? (
                <section aria-label="Written reviews" className="mt-5">
                  <h3 className="text-sm font-semibold">Written reviews ({published.length})</h3>
                  <ul className="mt-3 space-y-3">
                    {published.map((review, index) => (
                      <li key={`${review.date}-${index}`} className="rounded-xl border border-line-subtle p-4">
                        <p className="text-xs text-ink-muted">
                          A reader, <time dateTime={review.date}>{formatDate(review.date)}</time>
                        </p>
                        {/* Plain text only: React shows it as text, and line breaks are kept. */}
                        <p className="mt-2 text-sm leading-relaxed whitespace-pre-line break-words text-ink-secondary">{review.text}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

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
          {signedIn ? (
            writing || myReview ? (
              <button type="button" onClick={close} className={cn(pillButton, "w-full")}>
                Close
              </button>
            ) : (
              <button type="button" onClick={openWriting} className={cn(actionButton, "w-full")}>
                <MessageSquare className="size-4" aria-hidden="true" />
                Write a review
              </button>
            )
          ) : askReview ? (
            <div role="status">
              <p className="text-sm font-medium">Sign in to write a review of this website.</p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="/sign-in"
                  className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                >
                  Sign in
                </a>
                <button type="button" onClick={() => setAskReview(false)} className={textButton}>
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAskReview(true)} className={cn(actionButton, "w-full")}>
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
