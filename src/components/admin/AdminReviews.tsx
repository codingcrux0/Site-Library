import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format-date";
import { parseOwnerReviews, type OwnerReview } from "@/lib/moderation";

/*
 * The owner's review page: every written review, the ones waiting first, with who wrote it. Approve one so everyone can read it, hide one
 * again, or delete it. Rules in src/lib/moderation.ts; the database file is supabase/moderation.sql.
 *
 * WHO may do this is decided by the database, not by this page: every call below goes to a database function that refuses anyone who is not
 * the owner (the owner is one account id in a table nobody can reach through the site). So a person who opens this page without being the
 * owner is shown one sentence and gets nothing, however this file is edited. Nothing here holds a key, and review text is only ever shown as text.
 * The Supabase library is loaded only when this page opens (the list page never loads it for visitors).
 */

type View =
  | { status: "loading" }
  | { status: "out" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; rows: OwnerReview[] };

const key = (row: OwnerReview) => `${row.userId}:${row.siteId}`;
const SOME_PROBLEM = "That did not work. Please try again.";
const CHANGED = "That review was changed or removed. Press Refresh to see the latest.";

const button =
  "inline-flex h-8 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none";

async function client() {
  const { getSupabase } = await import("@/lib/supabase-client");
  return getSupabase();
}

export default function AdminReviews({ names }: { names: Record<string, string> }) {
  const [view, setView] = useState<View>({ status: "loading" });
  const [busy, setBusy] = useState<string | null>(null); // the key of the review being changed
  const [confirming, setConfirming] = useState<string | null>(null); // the key of the review about to be deleted
  const [problem, setProblem] = useState<{ key: string; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = await client();
      const { data } = await supabase.auth.getSession();
      if (!data.session) return setView({ status: "out" });
      // Ask for the reviews. The database answers only the owner; anyone else is refused ("permission denied", code 42501) and gets nothing.
      const list = await supabase.rpc("owner_reviews");
      if (list.error) return setView({ status: list.error.code === "42501" ? "denied" : "error" });
      setView({ status: "ready", rows: parseOwnerReviews(list.data) });
    } catch {
      setView({ status: "error" });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (row: OwnerReview, approve: boolean) => {
    setBusy(key(row));
    setProblem(null);
    try {
      const supabase = await client();
      // The text the owner read goes with the approval: if the author edited it meanwhile, the database refuses and nothing is published.
      const { error } = await supabase.rpc("owner_set_review", { p_user: row.userId, p_site: row.siteId, p_body: row.body, p_approved: approve });
      if (error) throw error;
      setView((now) => (now.status === "ready" ? { status: "ready", rows: now.rows.map((r) => (key(r) === key(row) ? { ...r, approved: approve } : r)) } : now));
    } catch (error) {
      setProblem({ key: key(row), text: (error as { code?: string })?.code === "P0002" ? CHANGED : SOME_PROBLEM });
    }
    setBusy(null);
  };

  const remove = async (row: OwnerReview) => {
    setBusy(key(row));
    setProblem(null);
    try {
      const supabase = await client();
      const { error } = await supabase.rpc("owner_delete_review", { p_user: row.userId, p_site: row.siteId });
      if (error) throw error;
      setView((now) => (now.status === "ready" ? { status: "ready", rows: now.rows.filter((r) => key(r) !== key(row)) } : now));
    } catch {
      setProblem({ key: key(row), text: SOME_PROBLEM });
    }
    setConfirming(null);
    setBusy(null);
  };

  if (view.status === "loading") {
    return (
      <p role="status" className="text-ink-secondary">
        Loading...
      </p>
    );
  }
  if (view.status === "out") {
    return (
      <p className="max-w-xl leading-relaxed text-ink-secondary">
        Sign in with the account that runs this site, then come back to this page.{" "}
        <a href="/sign-in/" className="text-ink-primary underline underline-offset-4">
          Sign in
        </a>
      </p>
    );
  }
  if (view.status === "denied") return <p className="max-w-xl leading-relaxed text-ink-secondary">This page is only for the person who runs this site.</p>;
  if (view.status === "error") {
    return (
      <div className="max-w-xl">
        <p className="leading-relaxed text-ink-secondary">The reviews could not be loaded. Nothing was changed.</p>
        <button type="button" onClick={load} className={`${button} mt-3`}>
          Try again
        </button>
      </div>
    );
  }

  const waiting = view.rows.filter((row) => !row.approved);
  const shown = view.rows.filter((row) => row.approved);

  const card = (row: OwnerReview) => {
    const id = key(row);
    return (
      <li key={id} className="py-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="font-semibold tracking-tight">{names[row.siteId] ?? row.siteId}</h3>
          <p className="min-w-0 text-sm text-ink-muted">
            <span className="break-all">{row.author || "No email"}</span>, {formatDate(row.date)}
          </p>
        </div>
        <p className="mt-2 max-w-2xl whitespace-pre-line break-words leading-relaxed text-ink-secondary">{row.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {row.approved ? (
            <button type="button" disabled={busy === id} onClick={() => change(row, false)} className={button}>
              Hide
            </button>
          ) : (
            <button type="button" disabled={busy === id} onClick={() => change(row, true)} className={`${button} bg-action text-action-ink hover:bg-action-hover`}>
              Approve
            </button>
          )}
          {confirming === id ? (
            <>
              <span className="text-sm">Delete this review for good?</span>
              <button type="button" disabled={busy === id} onClick={() => remove(row)} className={button}>
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="cursor-pointer rounded-md px-1 text-xs text-ink-secondary underline underline-offset-4 hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Cancel
              </button>
            </>
          ) : (
            <button type="button" disabled={busy === id} onClick={() => setConfirming(id)} className={button}>
              Delete
            </button>
          )}
          {problem?.key === id ? (
            <p role="alert" className="basis-full text-sm text-ink-primary">
              {problem.text}
            </p>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <div>
      <button type="button" onClick={load} className={button}>
        Refresh
      </button>
      <section aria-labelledby="admin-waiting" className="mt-8">
        <h2 id="admin-waiting" className="text-lg font-semibold tracking-tight">
          Waiting for approval <span className="text-sm font-normal text-ink-muted tabular-nums">{waiting.length}</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="mt-3 text-ink-secondary">Nothing is waiting.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line-subtle border-b border-line-subtle">{waiting.map(card)}</ul>
        )}
      </section>
      <section aria-labelledby="admin-shown" className="mt-10">
        <h2 id="admin-shown" className="text-lg font-semibold tracking-tight">
          Shown on the site <span className="text-sm font-normal text-ink-muted tabular-nums">{shown.length}</span>
        </h2>
        {shown.length === 0 ? (
          <p className="mt-3 text-ink-secondary">No review is shown yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line-subtle border-b border-line-subtle">{shown.map(card)}</ul>
        )}
      </section>
    </div>
  );
}
