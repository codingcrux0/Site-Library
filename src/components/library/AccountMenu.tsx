import { Download, LogIn, LogOut, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { SidebarItem } from "@/components/ui/sidebar";
import type { Profile } from "@/lib/account";
import type { AccountApi } from "./use-account";

/*
 * The bottom of the list page's sidebar. Signed out: a "Sign in" link. Signed in: the person's own name and picture (from Google or
 * GitHub), which open a small list: download my data, sign out, delete my account (asks once more, because it cannot be undone).
 * The name and the picture address are checked and cleaned first (src/lib/account.ts), and the name is shown as plain text.
 */

function Avatar({ profile }: { profile: Profile }) {
  const [broken, setBroken] = useState(false);
  return profile.avatar && !broken ? (
    // The picture comes from Google or GitHub only (the safety policy allows nothing else). No referrer is sent with the request.
    <img
      src={profile.avatar}
      alt=""
      width={20}
      height={20}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setBroken(true)}
      className="size-5 rounded-full object-cover"
    />
  ) : (
    <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-surface-sunken text-[11px] font-semibold text-ink-secondary">
      {profile.initial}
    </span>
  );
}

export function AccountMenu({ api }: { api: AccountApi }) {
  const { account } = api;
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const listId = useId();

  if (account.status === "out") {
    return (
      <SidebarItem href="/sign-in" icon={<LogIn className="size-[18px]" />}>
        Sign in
      </SidebarItem>
    );
  }
  if (account.status === "loading") {
    // Only shown for a moment, and only when this browser has a saved sign-in: the place is kept so nothing jumps.
    return (
      <div role="status" aria-label="Checking your sign-in" className="flex items-center gap-3 px-3 py-2">
        <span className="size-5 shrink-0 rounded-full bg-surface-sunken" />
        <span className="h-3 w-24 rounded-full bg-surface-sunken" />
      </div>
    );
  }

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setMessage(null);
    const problem = await action();
    setBusy(false);
    if (problem) setMessage(problem);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <SidebarItem icon={<Avatar profile={account.profile} />} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)}>
        {account.profile.name}
      </SidebarItem>
      <div id={listId} hidden={!open} className="ml-5 flex flex-col gap-0.5 border-l border-line-subtle py-1 pl-2">
        {account.email ? <p className="truncate px-3 pb-1 text-xs text-ink-muted">{account.email}</p> : null}
        {confirming ? (
          <div role="alertdialog" aria-label="Delete my account" className="rounded-lg border border-line-strong p-3 text-sm">
            <p className="leading-relaxed">Delete your account, your bookmarks and your ratings for good? This cannot be undone.</p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => run(api.deleteAccount)}
                className="cursor-pointer rounded-full bg-action px-3.5 py-1.5 text-xs font-semibold text-action-ink transition-colors hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60 motion-reduce:transition-none"
              >
                {busy ? "Deleting..." : "Delete everything"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-md px-1 text-xs text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <SidebarItem icon={<Download className="size-[18px]" />} disabled={busy} onClick={() => run(api.exportData)}>
              Download my data
            </SidebarItem>
            <SidebarItem icon={<LogOut className="size-[18px]" />} disabled={busy} onClick={() => run(api.signOut)}>
              Sign out
            </SidebarItem>
            <SidebarItem icon={<Trash2 className="size-[18px]" />} disabled={busy} onClick={() => setConfirming(true)}>
              Delete my account
            </SidebarItem>
          </>
        )}
      </div>
      {message ? (
        <p role="status" className="px-3 pt-1 text-xs text-ink-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
