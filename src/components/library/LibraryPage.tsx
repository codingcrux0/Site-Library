import { ArrowLeft, ArrowUpRight, Bookmark, Folder, House, LayoutGrid, Menu, MessagesSquare, X } from "lucide-react";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { GooeyTabs, type GooeyTab } from "@/components/ui/gooey-tabs";
import { Pagination, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarItem, SidebarNav, SidebarNested, SidebarSection } from "@/components/ui/sidebar";
import type { Entry } from "@/config/library";
import { filterGroupsFor } from "@/config/tags";
import { keepKnown } from "@/lib/bookmarks";
import { formatDate } from "@/lib/format-date";
import { pageRange } from "@/lib/page-range";
import { anyRated, arrange, listingsFor, placementCounts, type Listing } from "@/lib/listings";
import { countTags, filterEntries, suggestionWords } from "@/lib/search";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { EntryActions } from "./EntryActions";
import { FeedbackDrawer } from "./FeedbackDrawer";
import { TypeFilter } from "./TypeFilter";
import { useAccount } from "./use-account";

/*
 * The list page: tabs and the "Filter by type" button on top, the sidebar (home link and a categories dropdown) on the left,
 * the rows in the middle, page numbers below.
 * It is ONE React island (hydrated with client:load), so the page numbers, tabs, categories, filter and search all share one state.
 * The search box sits in the site header (outside this island): the page leaves an empty spot with id="header-search" there and this
 * island draws the box into it (a "portal"), so the box can share this state without a new package.
 * "My lists" (the last tab, and the sidebar item of the same name) is the person's saved websites: one view, opened from either place (D47).
 * A row is one website seen through one category (src/lib/listings.ts): a website in two categories is judged in each, and the sidebar and
 * the filter count it in both. "Top user scored" and "Best for free" are two more ways to order the same rows (D35).
 * Each row shows its name, its types and ONE line of the description; hovering (or tabbing to) a row turns it into a box, swaps that line
 * for the full description and opens "the catch" inside it.
 * The right of each row has a star rating, a Review button and a bookmark button (EntryActions.tsx). The sidebar has My lists and,
 * at the bottom, the account (AccountMenu.tsx): "Sign in", or the signed-in person's name and picture. Signed out, the buttons ask for a
 * sign-in; signed in, they save bookmarks and ratings (use-account.ts holds all of that: who is signed in, bookmarks, ratings, averages).
 * Opening a row shows a "See user feedback" button; it opens ONE side panel (FeedbackDrawer.tsx) for the whole page (D33).
 */

const PAGE_SIZE = 8;

// The entrance (src/styles/drop.css): while the page has only just arrived, its parts carry class "drop" and wait this many milliseconds
// before dropping in. After ENTRANCE_MS the classes come off, so rows that appear later (a new page, tab or category) do not drop again.
const ENTRANCE_MS = 2600;
const at = (ms: number) => ({ "--d": ms }) as CSSProperties;

const TABS: GooeyTab[] = [
  { id: "all", label: "All sites" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "top", label: "Top scored" },
  { id: "user", label: "Top user scored" },
  { id: "free", label: "Best for free" },
  { id: "lists", label: "My lists" },
];

interface Props {
  entries: Entry[];
  /** Category names, in the order of src/config/categories.ts. */
  categories: string[];
}

export default function LibraryPage({ entries, categories }: Props) {
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState(""); // "" = every category
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]); // the types ticked in "Filter by type"
  const [searchSlot, setSearchSlot] = useState<HTMLElement | null>(null);
  const api = useAccount();
  const bookmarkSet = useMemo(() => new Set(api.bookmarks), [api.bookmarks]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [entering, setEntering] = useState(true); // true on the server too, so the first paint already has the classes
  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, []);
  const drop = entering ? "drop" : undefined;

  // The header's empty spot only exists in the page, so it is looked up after the island starts (the server HTML has no box yet).
  useEffect(() => setSearchSlot(document.getElementById("header-search")), []);

  // Only one row is open at a time. A row also stays open while something inside it has the focus (that is what keeps it open for someone
  // using the keyboard), and a mouse click leaves the focus on the button that was clicked. So when the pointer MOVES onto a different row,
  // the focus lets go of the old row, which then closes. ("Moves": a row that closes and shifts the page under a resting pointer must not
  // steal the keyboard's place.) The sign-in prompt closes itself the same way, in EntryActions.tsx.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const held = document.activeElement?.closest("[data-row]");
      if (!held) return;
      const row = (event.target as Element).closest("[data-row]");
      if (row && row !== held) (document.activeElement as HTMLElement).blur();
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  // Typing updates the box at once; the (heavier) list catches up a moment later, so the keys never lag.
  const deferredQuery = useDeferredValue(query);

  // One row per website for "All sites"; with a category picked, one row per website that is in it (judged in that category).
  const everyRow = useMemo(() => listingsFor(entries, "", api.summaries), [entries, api.summaries]);
  const inCategory = useMemo(() => (category ? listingsFor(entries, category, api.summaries) : everyRow), [entries, category, everyRow, api.summaries]);
  // "Best for free" only ever looks at the completely free websites.
  const scoped = useMemo(() => (tab === "free" ? inCategory.filter((row) => row.free) : inCategory), [inCategory, tab]);
  const rows = useMemo(
    () => arrange(filterEntries(scoped, { tags: picked, query: deferredQuery }), tab),
    [scoped, tab, picked, deferredQuery],
  );

  const suggestions = useMemo(() => suggestionWords(everyRow), [everyRow]);
  const typeCounts = useMemo(() => countTags(scoped), [scoped]);
  const perCategory = useMemo(() => placementCounts(entries), [entries]);
  // The filter offers every type some website here has (the panel hides the rest), the category's own types first.
  const filterGroups = useMemo(() => filterGroupsFor(category), [category]);
  const inScope = scoped.length; // sites in this category (and tab) before search and types
  const narrowed = picked.length > 0 || query.trim() !== "";

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const showingLists = tab === "lists"; // "My lists": the tab and the sidebar item both open it
  // The My lists view: the saved websites in the order they were saved (newest first); one that has left the list is simply not shown.
  const savedRows = useMemo(() => {
    const byId = new Map(everyRow.map((row) => [row.entry.id, row]));
    return keepKnown(api.bookmarks, new Set(byId.keys())).map((id) => byId.get(id)!);
  }, [api.bookmarks, everyRow]);

  const goToPage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)));
    // Bring the top of the list back into view (only if it has scrolled away).
    if (panelRef.current && panelRef.current.getBoundingClientRect().top < 0) panelRef.current.scrollIntoView({ block: "start" });
  };
  const pickCategory = (name: string) => {
    setCategory(name);
    if (tab === "lists") setTab("all"); // picking a category means looking at a list of sites
    // Ticked types that no website in the new category has are dropped, or the list would be empty for no visible reason.
    const allowed = new Set(listingsFor(entries, name).flatMap((row) => row.tags));
    setPicked((current) => current.filter((tag) => allowed.has(tag)));
    setPage(1);
    setMenuOpen(false);
  };
  const toggleType = (tag: string) => {
    setPicked((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
    setPage(1);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setPage(1);
    if (tab === "lists") setTab("all"); // searching only makes sense on a list of sites
  };
  const clearNarrowing = () => {
    setQuery("");
    setPicked([]);
    setPage(1);
  };
  // The feedback panel is ONE panel for the whole page (not one per row); it shows the website whose button was pressed.
  const [feedbackFor, setFeedbackFor] = useState<{ entry: Entry; write: boolean } | null>(null); // write: open with the review box ready
  const opener = useRef<HTMLElement | null>(null);
  const openFeedback = useCallback((entry: Entry, button: HTMLElement, write = false) => {
    opener.current = button;
    setFeedbackFor({ entry, write });
  }, []);
  const closeFeedback = useCallback(() => {
    setFeedbackFor(null);
    opener.current?.focus(); // put the keyboard back where it was
  }, []);
  const openLists = () => {
    setTab("lists");
    setPage(1);
    setMenuOpen(false);
  };
  const pickTab = (id: string) => {
    setTab(id);
    setPage(1);
  };

  const heading = tab === "free" ? (category ? `${category}: best for free` : "Best for free") : category || "All sites";

  return (
    <div className="grid gap-6 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10">
      {searchSlot ? createPortal(<SearchBox value={query} onChange={changeQuery} suggestions={suggestions} aria-label="Search the list" placeholder="Search the list" />, searchSlot) : null}

      <aside className="md:sticky md:top-6 md:self-start">
        {/* Phones: the sidebar folds away behind this button. From the "md" width up it is always open. */}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="library-sidebar"
          onClick={() => setMenuOpen((open) => !open)}
          style={entering ? at(200) : undefined}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded-lg border border-line-subtle px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden",
            drop,
          )}
        >
          <span>Categories and links</span>
          {menuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
        </button>

        <div id="library-sidebar" className={cn("mt-3 md:mt-0 md:block", menuOpen ? "block" : "hidden")}>
          <Sidebar className="rounded-xl border border-line-subtle p-3 md:border-0 md:p-0">
            <SidebarHeader className={drop} style={entering ? at(200) : undefined}>
              <a
                href="/"
                className="flex items-center gap-2 rounded-md text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transition-none"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Go back
              </a>
            </SidebarHeader>
            <SidebarNav>
              <SidebarSection label="Browse" className={drop} style={entering ? at(280) : undefined}>
                <SidebarItem href="/" icon={<House className="size-[18px]" />}>
                  Home
                </SidebarItem>
                <SidebarItem
                  icon={<LayoutGrid className="size-[18px]" />}
                  active={category === "" && !showingLists}
                  badge={<Count>{entries.length}</Count>}
                  onClick={() => pickCategory("")}
                >
                  All sites
                </SidebarItem>
                <SidebarItem icon={<Bookmark className="size-[18px]" />} active={showingLists} onClick={openLists}>
                  My lists
                </SidebarItem>
              </SidebarSection>
              <SidebarSection label="Explore" className={drop} style={entering ? at(360) : undefined}>
                <SidebarNested icon={<Folder className="size-[18px]" />} label="Categories" defaultOpen>
                  {categories.map((name, index) => (
                    <SidebarItem
                      key={name}
                      className={drop}
                      style={entering ? at(520 + index * 55) : undefined}
                      active={category === name && !showingLists}
                      badge={<Count>{perCategory.get(name) ?? 0}</Count>}
                      onClick={() => pickCategory(name)}
                    >
                      {name}
                    </SidebarItem>
                  ))}
                </SidebarNested>
              </SidebarSection>
            </SidebarNav>
            <SidebarFooter className={drop} style={entering ? at(900) : undefined}>
              <AccountMenu api={api} />
            </SidebarFooter>
          </Sidebar>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Tabs on the left, the type filter on the right (it drops under the tabs on narrow screens, still at the right edge). */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("min-w-0 max-w-full", drop)} style={entering ? at(450) : undefined}>
            <GooeyTabs tabs={TABS} value={tab} onChange={pickTab} idPrefix="library" aria-label="Ways to view the list" />
          </div>
          {showingLists ? null : (
            <div className={cn("ml-auto", drop)} style={entering ? at(560) : undefined}>
              <TypeFilter groups={filterGroups} counts={typeCounts} picked={picked} onToggle={toggleType} onClear={() => setPicked([])} />
            </div>
          )}
        </div>

        {!showingLists && narrowed ? (
          <ul aria-label="Active search and types" className="mt-4 flex flex-wrap items-center gap-2">
            {query.trim() !== "" ? (
              <li>
                <Chip label={`Search: “${query.trim()}”`} remove="Remove search" onRemove={() => changeQuery("")} />
              </li>
            ) : null}
            {picked.map((tag) => (
              <li key={tag}>
                <Chip label={tag} remove={`Remove ${tag}`} onRemove={() => toggleType(tag)} />
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={clearNarrowing}
                className="cursor-pointer rounded-md px-1 text-sm text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Clear all
              </button>
            </li>
          </ul>
        ) : null}

        <div
          id="library-panel"
          role="tabpanel"
          aria-labelledby={`library-tab-${tab}`}
          ref={panelRef}
          className="mt-6 scroll-mt-4"
        >
          {showingLists ? (
            api.account.status === "in" ? (
              <section aria-labelledby="library-lists-title">
                <h2 id="library-lists-title" className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
                  My lists
                  <span className="text-sm font-normal text-ink-muted tabular-nums">{savedRows.length === 1 ? "1 site" : `${savedRows.length} sites`}</span>
                </h2>
                {savedRows.length === 0 ? (
                  <p className="mt-6 max-w-xl leading-relaxed text-ink-secondary">
                    You have not saved a website yet. Press the bookmark button on any website and it is kept here, in your account.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-line-subtle border-b border-line-subtle">
                    {savedRows.map((row) => (
                      <EntryRow
                        key={row.entry.id}
                        row={row}
                        showFree={false}
                        onOpenFeedback={openFeedback}
                        signedIn
                        bookmarked
                        myRating={api.mine.get(row.entry.id) ?? 0}
                        onBookmark={api.toggleBookmark}
                        onRate={api.rate}
                        onClear={api.clearRating}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ) : api.account.status === "loading" ? (
              <p role="status" className="mt-6 text-ink-secondary">
                Loading your lists...
              </p>
            ) : (
              <section aria-labelledby="library-lists-title" className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
                <Bookmark className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
                <h2 id="library-lists-title" className="mt-4 text-lg font-semibold tracking-tight">
                  My lists
                </h2>
                <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-secondary">
                  Sign in to see your lists. Websites you bookmark are kept in your account and listed here.
                </p>
                <a
                  href="/sign-in"
                  className="mt-5 inline-flex rounded-full bg-action px-5 py-2 text-sm font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                >
                  Sign in
                </a>
              </section>
            )
          ) : (
            <section aria-labelledby="library-heading">
              <h2 id="library-heading" className={cn("flex items-baseline gap-3 text-lg font-semibold tracking-tight", drop)} style={entering ? at(640) : undefined}>
                {heading}
                <span className="text-sm font-normal text-ink-muted tabular-nums">{rows.length === 1 ? "1 site" : `${rows.length} sites`}</span>
              </h2>
              {/* One honest sentence under the heading for the two tabs whose order needs explaining. */}
              {tab === "free" ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
                  Websites where we found no paid plan, no membership and no usage limit. They are ranked by a free score, judged on its own: quality, nothing in the way,
                  clear terms and how recently they were updated.
                </p>
              ) : null}
              {tab === "user" ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
                  {anyRated(scoped)
                    ? "Websites users rated highest come first. Any website nobody has rated yet follows, in the order of our score."
                    : "Nobody has rated a website yet, so this follows our score. Once users start rating, the best rated come first."}
                </p>
              ) : null}

              {shown.length === 0 ? (
                inScope === 0 ? (
                  // Honest empty state. The rule: nothing is listed until it has been reviewed and dated.
                  <p className="mt-6 max-w-xl leading-relaxed text-ink-secondary">
                    {tab === "free"
                      ? `No completely free websites in ${category || "the list"} yet. A website is added here only when we find no paid plan, membership or limit.`
                      : `${category ? `Nothing is listed in ${category} yet.` : "Nothing is listed yet."} Each website is reviewed first, then dated and scored, so the first entries appear once they have been checked.`}
                  </p>
                ) : (
                  // There are sites, but the search or the ticked types rule them all out.
                  <div className="mt-6 max-w-xl">
                    <p className="leading-relaxed text-ink-secondary">No sites match your search and types.</p>
                    <button
                      type="button"
                      onClick={clearNarrowing}
                      className="mt-3 cursor-pointer rounded-full border border-line-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                    >
                      Clear search and types
                    </button>
                  </div>
                )
              ) : (
                <ul className="mt-2 divide-y divide-line-subtle border-b border-line-subtle">
                  {shown.map((row, index) => (
                    <EntryRow
                      key={row.entry.id}
                      row={row}
                      showFree={tab === "free"}
                      dropAt={entering ? 780 + index * 70 : undefined}
                      onOpenFeedback={openFeedback}
                      signedIn={api.signedIn}
                      bookmarked={bookmarkSet.has(row.entry.id)}
                      myRating={api.mine.get(row.entry.id) ?? 0}
                      onBookmark={api.toggleBookmark}
                      onRate={api.rate}
                      onClear={api.clearRating}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {showingLists ? null : (
          <div className={cn("mt-8 flex flex-col items-center gap-3", drop)} style={entering ? at(780 + shown.length * 70) : undefined}>
            <p aria-live="polite" className="text-sm text-ink-muted tabular-nums">
              {rows.length === 0
                ? "No sites to show"
                : `Showing ${(current - 1) * PAGE_SIZE + 1} to ${(current - 1) * PAGE_SIZE + shown.length} of ${rows.length}`}
            </p>
            <Pagination>
              <PaginationPrevious onClick={() => goToPage(current - 1)} disabled={current === 1} />
              {pageRange(current, totalPages).map((item, index) =>
                item === "gap" ? (
                  <PaginationEllipsis key={`gap-${index}`} max={totalPages} onJump={goToPage} />
                ) : (
                  <PaginationItem
                    key={item}
                    isActive={item === current}
                    aria-label={`Page ${item}`}
                    onClick={() => goToPage(item)}
                  >
                    {item}
                  </PaginationItem>
                ),
              )}
              <PaginationNext onClick={() => goToPage(current + 1)} disabled={current === totalPages} />
            </Pagination>
          </div>
        )}
      </div>
      {feedbackFor ? (
        <FeedbackDrawer
          key={feedbackFor.entry.id}
          entry={feedbackFor.entry}
          summary={api.summaries.get(feedbackFor.entry.id)}
          signedIn={api.signedIn}
          startWriting={feedbackFor.write}
          myRating={api.mine.get(feedbackFor.entry.id) ?? 0}
          myReview={api.reviews.get(feedbackFor.entry.id)}
          loadReviews={api.loadReviews}
          onSaveReview={api.saveReview}
          onDeleteReview={api.deleteReview}
          onClearRating={api.clearRating}
          onClose={closeFeedback}
        />
      ) : null}
    </div>
  );
}

function Chip({ label, remove, onRemove }: { label: string; remove: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      aria-label={remove}
      onClick={onRemove}
      className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface-sunken py-1 pr-2 pl-3 text-sm transition-colors hover:border-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
    >
      <span className="truncate">{label}</span>
      <X className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-ink-primary/[0.07] px-1.5 py-0.5 text-[11px] leading-none font-medium text-ink-secondary tabular-nums">{children}</span>
  );
}

// What a row looks like when it is open (hovered, tabbed into, or showing a sign-in prompt): a box. Written out in full for each trigger
// because Tailwind only finds class names that are spelled out.
const CARD_OPEN =
  "group-hover/row:border-line-subtle group-hover/row:bg-surface-raised group-hover/row:shadow-md " +
  "group-focus-within/row:border-line-subtle group-focus-within/row:bg-surface-raised group-focus-within/row:shadow-md " +
  "group-has-[[data-nudge]]/row:border-line-subtle group-has-[[data-nudge]]/row:bg-surface-raised group-has-[[data-nudge]]/row:shadow-md";
// The description and the catch open INSIDE the row, under the types, in the free space beside the buttons. The row only grows if the text
// is taller than that space, and only by what it needs (a short description fits and grows nothing). Screens that cannot hover (phones,
// tablets) have no way to open it, so there it simply stays open.
const DETAILS_OPEN =
  "group-hover/row:grid-rows-[1fr] group-hover/row:opacity-100 group-focus-within/row:grid-rows-[1fr] group-focus-within/row:opacity-100 " +
  "group-has-[[data-nudge]]/row:grid-rows-[1fr] group-has-[[data-nudge]]/row:opacity-100 [@media(hover:none)]:grid-rows-[1fr] [@media(hover:none)]:opacity-100";

// While a row is open, the one-line preview folds away (the full description takes its place). Same triggers as DETAILS_OPEN.
const PREVIEW_SHUT =
  "group-hover/row:grid-rows-[0fr] group-hover/row:opacity-0 group-focus-within/row:grid-rows-[0fr] group-focus-within/row:opacity-0 " +
  "group-has-[[data-nudge]]/row:grid-rows-[0fr] group-has-[[data-nudge]]/row:opacity-0 [@media(hover:none)]:grid-rows-[0fr] [@media(hover:none)]:opacity-0";

// memo: typing in the search box, opening the sidebar or switching a tab re-renders this page, but a row that did not change is skipped.
const EntryRow = memo(function EntryRow({
  row,
  showFree,
  dropAt,
  onOpenFeedback,
  signedIn,
  bookmarked,
  myRating,
  onBookmark,
  onRate,
  onClear,
}: {
  row: Listing;
  showFree: boolean;
  /** Set only during the page's entrance: this row drops in after this many milliseconds. */
  dropAt?: number;
  onOpenFeedback: (entry: Entry, button: HTMLElement, write?: boolean) => void;
  signedIn: boolean;
  bookmarked: boolean;
  myRating: number;
  onBookmark: (id: string) => Promise<string | null>;
  onRate: (id: string, stars: number) => Promise<string | null>;
  onClear: (id: string) => Promise<string | null>;
}) {
  const { entry, average, ratings } = row;
  // "Best for free" shows the free score; every other tab shows the main score of the category being looked at.
  const score = showFree && row.free ? { label: "Free score", value: row.free.score } : { label: "Score", value: row.score };
  return (
    // z-20 while open, so the box's shadow sits over the neighbouring rows.
    <li
      data-row
      className={cn("group/row relative focus-within:z-20 hover:z-20 has-[[data-nudge]]:z-20", dropAt !== undefined && "drop")}
      style={dropAt !== undefined ? at(dropAt) : undefined}
    >
      <div
        className={cn(
          "-mx-4 grid gap-3 rounded-xl border border-transparent px-4 py-5 transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10",
          CARD_OPEN,
        )}
      >
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
            {entry.name}
            {/* A small arrow link to the website itself. It opens in a new tab and sends nothing extra (no tracking, no referrer). */}
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${entry.name} (opens in a new tab)`}
              className="grid size-6 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </h3>
          {/* The types, so you can see why a site showed up for a filter or a search, and the other categories it is in. */}
          <ul aria-label="Types" className="mt-3 flex flex-wrap items-center gap-1.5">
            {row.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-line-subtle px-2.5 py-0.5 text-xs text-ink-secondary">
                {tag}
              </li>
            ))}
            {row.alsoIn.length > 0 ? <li className="pl-1 text-xs text-ink-muted">Also in {row.alsoIn.join(", ")}</li> : null}
          </ul>
          {/* One line of the description, cut with "..." when it is longer. Hidden from screen readers (the full text below is read instead). */}
          <div
            aria-hidden="true"
            className={cn("grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none", PREVIEW_SHUT)}
          >
            <div className="min-h-0 overflow-hidden">
              <p className="truncate pt-3 text-sm text-ink-secondary">{row.summary}</p>
            </div>
          </div>
          {/* The full description and the catch. Shut = zero height (grid row 0fr); open = exactly as tall as the text (1fr), so there is no blank space. */}
          <div
            className={cn(
              "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              DETAILS_OPEN,
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="pt-3">
                <p className="leading-relaxed text-ink-secondary">{row.summary}</p>
                <p className="mt-3 text-sm leading-relaxed">
                  <span className="font-semibold">The catch: </span>
                  <span className="text-ink-secondary">{row.theCatch}</span>
                </p>
                {row.free ? (
                  <p className="mt-2 text-sm leading-relaxed">
                    <span className="font-semibold">Free to use: </span>
                    <span className="text-ink-secondary">no paid plan, membership or usage limit found.</span>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => onOpenFeedback(entry, event.currentTarget)}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised px-3 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                  >
                    <MessagesSquare className="size-3.5" aria-hidden="true" />
                    See user feedback{ratings > 0 ? ` (${ratings})` : ""}
                    <span className="sr-only"> for {entry.name}</span>
                  </button>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-action px-3.5 text-xs font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
                  >
                    Visit website
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    <span className="sr-only"> {entry.name} (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:items-start">
          <EntryActions
            id={entry.id}
            name={entry.name}
            average={average}
            count={ratings}
            signedIn={signedIn}
            bookmarked={bookmarked}
            myRating={myRating}
            onBookmark={onBookmark}
            onRate={onRate}
            onClear={onClear}
            onReview={(button) => onOpenFeedback(entry, button, true)}
          />
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-ink-muted">{score.label}</dt>
              <dd className="font-semibold tabular-nums">
                {score.value}
                <span className="font-normal text-ink-muted"> / 20</span>
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Checked on</dt>
              <dd>
                <time dateTime={entry.checkedOn}>{formatDate(entry.checkedOn)}</time>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
});
