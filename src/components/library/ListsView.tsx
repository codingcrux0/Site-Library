import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LIST_MAX, LIST_NAME_MAX } from "@/lib/lists";
import type { Listing } from "@/lib/listings";
import { ListPicker } from "./ListPicker";
import type { AccountApi } from "./use-account";

/*
 * The signed-in "My lists" view: "Saved" (every bookmark) and up to ten named lists of the person's own, side by side as small buttons.
 * A list can be made, renamed and deleted here (deleting a list never removes a bookmark), and each saved website has a "Lists" button
 * to put it in or take it out of a list. A website must be saved before it can be in a list.
 * This file sends nothing itself: every change goes through use-account.ts, and the database checks each one again.
 * List names are shown as plain text.
 */

type Mode = "idle" | "new" | "rename" | "delete";

const chip =
  "inline-flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none";
const quietButton =
  "inline-flex h-8 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none";
const linkButton =
  "cursor-pointer rounded-md px-1 text-xs text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function ListsView({
  api,
  rows,
  renderRow,
}: {
  api: AccountApi;
  /** The saved websites, newest first. */
  rows: Listing[];
  /** Draws one row; `extra` is the "Lists" button to put in it. */
  renderRow: (row: Listing, extra: ReactNode) => ReactNode;
}) {
  const { lists } = api;
  const [selected, setSelected] = useState(""); // "" = Saved, otherwise a list id
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // A list that is gone (deleted here, or the account changed) means the view goes back to Saved.
  const current = lists.find((list) => list.id === selected);
  const shownRows = useMemo(() => {
    if (!current) return rows;
    const inside = new Set(current.sites);
    return rows.filter((row) => inside.has(row.entry.id));
  }, [rows, current]);

  useEffect(() => {
    if (mode === "new" || mode === "rename") input.current?.focus();
  }, [mode]);

  const pick = (id: string) => {
    setSelected(id);
    setMode("idle");
    setProblem(null);
  };
  const startNew = () => {
    setText("");
    setProblem(null);
    setMode("new");
  };
  const startRename = () => {
    setText(current?.name ?? "");
    setProblem(null);
    setMode("rename");
  };
  const stop = () => {
    setMode("idle");
    setProblem(null);
  };

  const submit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    if (mode === "new") {
      const result = await api.createList(text);
      if (result.ok) pick(result.id);
      else setProblem(result.error);
    } else if (mode === "rename" && current) {
      const error = await api.renameList(current.id, text);
      if (error) setProblem(error);
      else stop();
    }
    setBusy(false);
  };
  const remove = async () => {
    if (!current || busy) return;
    setBusy(true);
    const error = await api.deleteList(current.id);
    if (error) setProblem(error);
    else pick("");
    setBusy(false);
  };

  const count = shownRows.length === 1 ? "1 site" : `${shownRows.length} sites`;
  const full = lists.length >= LIST_MAX;

  return (
    <section aria-labelledby="library-lists-title">
      <h2 id="library-lists-title" className="flex items-baseline gap-3 text-lg font-semibold tracking-tight">
        My lists
        <span className="text-sm font-normal text-ink-muted tabular-nums">{count}</span>
      </h2>

      <div role="group" aria-label="Your lists" className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={!current}
          onClick={() => pick("")}
          className={`${chip} ${!current ? "border-ink-primary bg-surface-sunken" : "border-line-strong hover:bg-surface-sunken"}`}
        >
          Saved
          <span className="text-xs text-ink-muted tabular-nums">{rows.length}</span>
        </button>
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            aria-pressed={current?.id === list.id}
            onClick={() => pick(list.id)}
            className={`${chip} ${current?.id === list.id ? "border-ink-primary bg-surface-sunken" : "border-line-strong hover:bg-surface-sunken"}`}
          >
            <span className="truncate">{list.name}</span>
            <span className="text-xs text-ink-muted tabular-nums">{list.sites.length}</span>
          </button>
        ))}
        <button type="button" onClick={startNew} disabled={full} className={`${chip} border-dashed border-line-strong hover:bg-surface-sunken disabled:cursor-default disabled:opacity-50`}>
          <Plus className="size-4" aria-hidden="true" />
          New list
        </button>
      </div>
      {full ? <p className="mt-2 text-xs text-ink-muted">You have {LIST_MAX} lists, the most you can make. Delete one to make another.</p> : null}

      {mode === "new" || mode === "rename" ? (
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="list-name" className="text-sm font-medium">
            {mode === "new" ? "Name of the new list" : "New name"}
          </label>
          <input
            id="list-name"
            ref={input}
            type="text"
            value={text}
            maxLength={LIST_NAME_MAX}
            onChange={(event) => setText(event.target.value)}
            className="h-9 w-56 max-w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          <button type="submit" disabled={busy} className={`${quietButton} bg-action text-action-ink hover:bg-action-hover`}>
            {mode === "new" ? "Make list" : "Save name"}
          </button>
          <button type="button" onClick={stop} className={linkButton}>
            Cancel
          </button>
          {problem ? (
            <p role="alert" className="basis-full text-sm text-ink-primary">
              {problem}
            </p>
          ) : null}
        </form>
      ) : null}

      {current && mode !== "new" && mode !== "rename" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {mode === "delete" ? (
            <>
              <p className="text-sm">Delete the list “{current.name}”? Your bookmarks stay.</p>
              <button type="button" onClick={remove} disabled={busy} className={quietButton}>
                Delete list
              </button>
              <button type="button" onClick={stop} className={linkButton}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startRename} className={quietButton}>
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setProblem(null);
                  setMode("delete");
                }}
                className={quietButton}
              >
                Delete list
              </button>
            </>
          )}
          {problem ? (
            <p role="alert" className="basis-full text-sm text-ink-primary">
              {problem}
            </p>
          ) : null}
        </div>
      ) : null}

      {shownRows.length === 0 ? (
        <p className="mt-6 max-w-xl leading-relaxed text-ink-secondary">
          {current
            ? "This list is empty. Open Saved and press the Lists button on a website to put it here."
            : "You have not saved a website yet. Press the bookmark button on any website and it is kept here, in your account."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line-subtle border-b border-line-subtle">
          {shownRows.map((row) => renderRow(row, <ListPicker siteId={row.entry.id} name={row.entry.name} lists={lists} onToggle={api.toggleInList} />))}
        </ul>
      )}
    </section>
  );
}
