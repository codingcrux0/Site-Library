import { ListPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MyList } from "@/lib/lists";

/*
 * The small "Lists" button on a saved website in the My lists view. It opens a short box of tick boxes, one per list the person has made;
 * ticking puts the website in that list, unticking takes it out (it stays saved either way). It sends nothing itself: the ticks go through
 * use-account.ts (toggleInList), and the database checks again that the list and the website both belong to the signed-in person.
 * A list name is shown as plain text (React never turns it into markup).
 */

export function ListPicker({
  siteId,
  name,
  lists,
  onToggle,
}: {
  siteId: string;
  name: string;
  lists: readonly MyList[];
  onToggle: (listId: string, siteId: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inCount = lists.filter((list) => list.sites.includes(siteId)).length;

  // While the box is open: Escape (the keyboard goes back to the button) or a press elsewhere closes it.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const toggle = async (listId: string) => setNote(await onToggle(listId, siteId));

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((now) => !now);
          setNote(null);
        }}
        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised px-3 text-xs font-medium text-ink-primary transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        <ListPlus className="size-3.5" aria-hidden="true" />
        Lists{inCount > 0 ? ` (${inCount})` : ""}
        <span className="sr-only"> for {name}</span>
      </button>
      {open ? (
        // data-nudge: the row stays open (shows its box and details) while this is on screen.
        <div
          data-nudge
          className="absolute top-full left-0 z-30 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-line-subtle bg-surface-raised p-3 text-left text-sm shadow-lg"
        >
          {lists.length === 0 ? (
            <p className="text-ink-secondary">You have no lists yet. Press “New list” above to make one.</p>
          ) : (
            <div role="group" aria-label={`Lists for ${name}`} className="flex flex-col">
              {lists.map((list) => (
                <label key={list.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-1 hover:bg-surface-sunken">
                  <input
                    type="checkbox"
                    checked={list.sites.includes(siteId)}
                    onChange={() => toggle(list.id)}
                    className="size-4 shrink-0 cursor-pointer accent-ink-primary"
                  />
                  <span className="min-w-0 truncate">{list.name}</span>
                </label>
              ))}
            </div>
          )}
          {note ? (
            <p role="status" className="mt-2 text-xs font-medium text-ink-primary">
              {note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
