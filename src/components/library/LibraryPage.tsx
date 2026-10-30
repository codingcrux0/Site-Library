import { ArrowLeft, Bookmark, Folder, House, LayoutGrid, LogIn, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GooeyTabs, type GooeyTab } from "@/components/ui/gooey-tabs";
import { Pagination, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { SearchBox } from "@/components/ui/search-box";
import { Sidebar, SidebarFooter, SidebarHeader, SidebarItem, SidebarNav, SidebarNested, SidebarSection } from "@/components/ui/sidebar";
import type { Entry } from "@/config/library";
import { tagGroupsFor } from "@/config/tags";
import { pageRange } from "@/lib/page-range";
import { countTags, filterEntries, suggestionWords } from "@/lib/search";
import { cn } from "@/lib/utils";
import { TypeFilter } from "./TypeFilter";

/*
 * The list page: tabs and the "Filter by type" button on top, the sidebar (home link and a categories dropdown) on the left,
 * the rows in the middle, page numbers below.
 * It is ONE React island (hydrated with client:load), so the page numbers, tabs, categories, filter and search all share one state.
 * The search box sits in the site header (outside this island): the page leaves an empty spot with id="header-search" there and this
 * island draws the box into it (a "portal"), so the box can share this state without a new package.
 * "My lists" is still a labelled placeholder; saving lists comes next (see DECISIONS.md D27 and D28).
 */

const PAGE_SIZE = 8;

const TABS: GooeyTab[] = [
  { id: "all", label: "All sites" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "top", label: "Top scored" },
  { id: "lists", label: "My lists" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-30" becomes "30 Oct 2026". Done by hand (not toLocaleDateString), so the server HTML and the browser always agree.
function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${Number(day)} ${name} ${year}` : iso;
}

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
  const panelRef = useRef<HTMLDivElement>(null);

  // The header's empty spot only exists in the page, so it is looked up after the island starts (the server HTML has no box yet).
  useEffect(() => setSearchSlot(document.getElementById("header-search")), []);

  const rows = useMemo(() => {
    const sorted = filterEntries(entries, { category, tags: picked, query }); // a new list, so sorting it changes nothing else
    if (tab === "newest") sorted.sort((a, b) => b.testedOn.localeCompare(a.testedOn) || a.name.localeCompare(b.name, "en", { numeric: true }));
    else if (tab === "oldest") sorted.sort((a, b) => a.testedOn.localeCompare(b.testedOn) || a.name.localeCompare(b.name, "en", { numeric: true }));
    else if (tab === "top") sorted.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    return sorted;
  }, [entries, tab, category, picked, query]);

  const suggestions = useMemo(() => suggestionWords(entries), [entries]);
  const typeCounts = useMemo(() => countTags(entries, category), [entries, category]);
  const perCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    return counts;
  }, [entries]);
  const inScope = category ? (perCategory.get(category) ?? 0) : entries.length; // sites in this category before search and types
  const narrowed = picked.length > 0 || query.trim() !== "";

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const isPreview = entries.some((entry) => entry.preview);
  const showingLists = tab === "lists";

  const goToPage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)));
    // Bring the top of the list back into view (only if it has scrolled away).
    if (panelRef.current && panelRef.current.getBoundingClientRect().top < 0) panelRef.current.scrollIntoView({ block: "start" });
  };
  const pickCategory = (name: string) => {
    setCategory(name);
    // Ticked types that do not belong to the new category are dropped, or the list would be empty for no visible reason.
    const allowed = new Set(tagGroupsFor(name).flatMap((group) => group.tags));
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
  const pickTab = (id: string) => {
    setTab(id);
    setPage(1);
  };

  const heading = category || "All sites";

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
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-line-subtle px-4 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
        >
          <span>Categories and links</span>
          {menuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
        </button>

        <div id="library-sidebar" className={cn("mt-3 md:mt-0 md:block", menuOpen ? "block" : "hidden")}>
          <Sidebar className="rounded-xl border border-line-subtle p-3 md:border-0 md:p-0">
            <SidebarHeader>
              <a
                href="/"
                className="flex items-center gap-2 rounded-md text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transition-none"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Go back
              </a>
            </SidebarHeader>
            <SidebarNav>
              <SidebarSection label="Browse">
                <SidebarItem href="/" icon={<House className="size-[18px]" />}>
                  Home
                </SidebarItem>
                <SidebarItem
                  icon={<LayoutGrid className="size-[18px]" />}
                  active={category === ""}
                  badge={<Count>{entries.length}</Count>}
                  onClick={() => pickCategory("")}
                >
                  All sites
                </SidebarItem>
              </SidebarSection>
              <SidebarSection label="Explore">
                <SidebarNested icon={<Folder className="size-[18px]" />} label="Categories" defaultOpen>
                  {categories.map((name) => (
                    <SidebarItem key={name} active={category === name} badge={<Count>{perCategory.get(name) ?? 0}</Count>} onClick={() => pickCategory(name)}>
                      {name}
                    </SidebarItem>
                  ))}
                </SidebarNested>
              </SidebarSection>
            </SidebarNav>
            <SidebarFooter>
              <SidebarItem href="/sign-in" icon={<LogIn className="size-[18px]" />}>
                Sign in
              </SidebarItem>
            </SidebarFooter>
          </Sidebar>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Tabs on the left, the type filter on the right (it drops under the tabs on narrow screens, still at the right edge). */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 max-w-full">
            <GooeyTabs tabs={TABS} value={tab} onChange={pickTab} idPrefix="library" aria-label="Ways to view the list" />
          </div>
          {showingLists ? null : (
            <div className="ml-auto">
              <TypeFilter groups={tagGroupsFor(category)} counts={typeCounts} picked={picked} onToggle={toggleType} onClear={() => setPicked([])} />
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

        <div id="library-panel" role="tabpanel" aria-labelledby={`library-tab-${tab}`} ref={panelRef} className="mt-6 scroll-mt-4">
          {isPreview && !showingLists ? (
            <p className="mb-5 rounded-lg border border-line-subtle bg-surface-sunken px-4 py-3 text-sm text-ink-secondary">
              <strong className="font-semibold text-ink-primary">Layout preview.</strong> The rows below are made-up examples that show the design. They
              are not tested entries, and they never appear on the live site.
            </p>
          ) : null}

          {showingLists ? (
            <section aria-labelledby="library-lists-title" className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
              <Bookmark className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
              <h2 id="library-lists-title" className="mt-4 text-lg font-semibold tracking-tight">
                My lists
              </h2>
              <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-secondary">
                Saving lists comes next. When it is ready, your lists will be kept in this browser, on this device only, and you will not need an account.
              </p>
            </section>
          ) : (
            <section aria-labelledby="library-heading">
              <h2 id="library-heading" className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
                {heading}
                <span className="text-sm font-normal text-ink-muted tabular-nums">{rows.length === 1 ? "1 site" : `${rows.length} sites`}</span>
              </h2>

              {shown.length === 0 ? (
                inScope === 0 ? (
                  // Honest empty state. The rule: nothing is listed until it has been tested by hand and dated.
                  <p className="mt-6 max-w-xl leading-relaxed text-ink-secondary">
                    {category ? `Nothing is listed in ${category} yet.` : "Nothing is listed yet."} Each website is tried by hand first, then dated and scored,
                    so the first entries appear once they have been tested.
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
                  {shown.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {showingLists ? null : (
          <div className="mt-8 flex flex-col items-center gap-3">
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

function EntryRow({ entry }: { entry: Entry }) {
  return (
    <li className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10">
      <div className="min-w-0">
        <h3 className="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
          {entry.name}
          {entry.preview ? (
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-medium text-ink-muted">Layout preview</span>
          ) : null}
        </h3>
        <p className="mt-1 leading-relaxed text-ink-secondary">{entry.summary}</p>
        <p className="mt-3 text-sm leading-relaxed">
          <span className="font-semibold">The catch: </span>
          <span className="text-ink-secondary">{entry.theCatch}</span>
        </p>
        {/* The types, so you can see why a site showed up for a filter or a search. */}
        <ul aria-label="Types" className="mt-3 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-line-subtle px-2.5 py-0.5 text-xs text-ink-secondary">
              {tag}
            </li>
          ))}
        </ul>
      </div>
      <dl className="flex gap-8 text-sm sm:flex-col sm:items-end sm:gap-2">
        <div className="sm:text-right">
          <dt className="text-ink-muted">My score</dt>
          <dd className="font-semibold tabular-nums">
            {entry.score}
            <span className="font-normal text-ink-muted"> / 20</span>
          </dd>
        </div>
        <div className="sm:text-right">
          <dt className="text-ink-muted">Tested on</dt>
          <dd>
            <time dateTime={entry.testedOn}>{formatDate(entry.testedOn)}</time>
          </dd>
        </div>
      </dl>
    </li>
  );
}
