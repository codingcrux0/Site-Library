import { useCallback, useEffect, useRef, useState } from "react";
import { ACCOUNTS_OPEN, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config/supabase";
import { STORAGE_KEY, hasStoredSession, parseSummaries, profileOf, type Profile, type RatingSummary } from "@/lib/account";
import { MAX_BOOKMARKS, isSiteId } from "@/lib/bookmarks";
import { cleanReview, parseMine, parsePublicReviews, type MyReview, type PublicReview } from "@/lib/reviews";
import type { getSupabase } from "@/lib/supabase-client";

/*
 * Everything the list page needs to know about the visitor's account, in one place: who is signed in, their bookmarks, their own star
 * ratings and written reviews, and everyone's star averages (and the approved reviews of one website, when its panel opens). Plan: docs/AUTH-PLAN.md. The rules it follows are tested in src/lib/account.test.mjs.
 *
 * Speed: a visitor who never signed in downloads nothing extra. The Supabase library (216 KB) is only loaded when this browser has a
 * saved sign-in (hasStoredSession) or when someone presses a button that needs it. The star averages are one small plain request.
 *
 * Safety: the page only SHOWS what the database allows. Every save below is checked again by the database rules (supabase/*.sql), so
 * editing this page in the browser cannot read or change anybody else's bookmarks or ratings.
 *
 * Every action answers with null when it worked, or with one plain sentence when it did not (shown to the person next to the button).
 */

export type Account = { status: "loading" } | { status: "out" } | { status: "in"; profile: Profile; email: string };

type Client = Awaited<ReturnType<typeof getSupabase>>;

const NO_SAVE = "Could not save that. Please try again.";

async function client(): Promise<Client> {
  const { getSupabase } = await import("@/lib/supabase-client");
  return getSupabase();
}

// The approved reviews of ONE website, for its feedback panel: public, so one plain request with no library. Text and day only, never a name.
async function fetchReviews(id: string): Promise<PublicReview[]> {
  if (!isSiteId(id)) return [];
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/review_feed?select=body,created_at&site_id=eq.${id}&order=created_at.desc&limit=50`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json" },
    });
    return response.ok ? parsePublicReviews(await response.json()) : [];
  } catch {
    return []; // offline or blocked: the panel simply shows no written reviews
  }
}

// The star averages are public, so they need no sign-in and no library: one plain request to the database's totals-only view.
async function fetchSummaries(): Promise<Map<string, RatingSummary>> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rating_summary?select=*&limit=1000`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, accept: "application/json" },
    });
    return response.ok ? parseSummaries(await response.json()) : new Map();
  } catch {
    return new Map(); // offline or blocked: the list simply shows no averages
  }
}

export function useAccount() {
  const [account, setAccount] = useState<Account>({ status: "out" });
  const [bookmarks, setBookmarks] = useState<string[]>([]); // newest first
  const [mine, setMine] = useState<ReadonlyMap<string, number>>(new Map()); // the visitor's own ratings
  const [reviews, setReviews] = useState<ReadonlyMap<string, MyReview>>(new Map()); // the visitor's own written reviews
  const [summaries, setSummaries] = useState<ReadonlyMap<string, RatingSummary>>(new Map());
  // Always the latest values, for actions that run later (a click handler must not act on stale lists).
  const live = useRef({ bookmarks, mine, reviews });
  live.current = { bookmarks, mine, reviews };
  const userId = useRef<string | null>(null);

  const refreshSummaries = useCallback(() => {
    fetchSummaries().then(setSummaries);
  }, []);

  useEffect(() => {
    refreshSummaries();
    if (!ACCOUNTS_OPEN || !hasStoredSession(window.localStorage)) return; // signed out: nothing else to load
    setAccount({ status: "loading" });
    let stop = () => {};
    let cancelled = false;

    const apply = async (supabase: Client, session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!session) {
        userId.current = null;
        setAccount({ status: "out" });
        setBookmarks([]);
        setMine(new Map());
        setReviews(new Map());
        return;
      }
      userId.current = session.user.id;
      setAccount({ status: "in", profile: profileOf(session.user), email: session.user.email ?? "" });
      const [saved, rated, written] = await Promise.all([
        supabase.from("bookmarks").select("site_id").order("created_at", { ascending: false }).limit(MAX_BOOKMARKS),
        supabase.from("ratings").select("site_id, stars").limit(MAX_BOOKMARKS),
        supabase.from("reviews").select("site_id, body, approved").limit(MAX_BOOKMARKS),
      ]);
      if (cancelled || userId.current !== session.user.id) return;
      // Whatever came back is checked again before use (a table that is missing or a bad row just means "nothing yet").
      setBookmarks((saved.data ?? []).map((row) => row.site_id).filter(isSiteId));
      setMine(
        new Map(
          (rated.data ?? [])
            .filter((row) => isSiteId(row.site_id) && Number.isInteger(row.stars) && row.stars >= 1 && row.stars <= 5)
            .map((row) => [row.site_id as string, row.stars as number]),
        ),
      );
      setReviews(parseMine(written.data));
    };

    (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        await apply(supabase, data.session);
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          // Not awaited inside the callback (the library asks for that). Only a real sign-in or sign-out changes anything here.
          if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && session?.user.id !== userId.current)) setTimeout(() => apply(supabase, session), 0);
        });
        stop = () => listener.subscription.unsubscribe();
      } catch {
        if (!cancelled) setAccount({ status: "out" }); // the library could not load: treat as signed out, the list still works
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [refreshSummaries]);

  const signedIn = account.status === "in";

  const toggleBookmark = useCallback(async (id: string): Promise<string | null> => {
    if (!isSiteId(id)) return NO_SAVE;
    const had = live.current.bookmarks.includes(id);
    if (!had && live.current.bookmarks.length >= MAX_BOOKMARKS) return `You can keep up to ${MAX_BOOKMARKS} bookmarks. Remove one to add another.`;
    // The button answers at once; if the save fails, it goes back and says so.
    setBookmarks((list) => (had ? list.filter((item) => item !== id) : [id, ...list]));
    try {
      const supabase = await client();
      const { error } = had ? await supabase.from("bookmarks").delete().eq("site_id", id) : await supabase.from("bookmarks").insert({ site_id: id });
      if (error && error.code !== "23505") throw error; // 23505 = already saved: that is what was wanted
    } catch {
      setBookmarks((list) => (had ? [id, ...list] : list.filter((item) => item !== id)));
      return NO_SAVE;
    }
    return null;
  }, []);

  const rate = useCallback(
    async (id: string, stars: number): Promise<string | null> => {
      if (!isSiteId(id) || !Number.isInteger(stars) || stars < 1 || stars > 5) return NO_SAVE;
      const before = live.current.mine.get(id);
      if (before === stars) return null;
      setMine((map) => new Map(map).set(id, stars));
      try {
        const supabase = await client();
        // Change the stars of an existing rating, or add a new one (the database lets an update touch the stars and nothing else).
        const { error } =
          before === undefined
            ? await supabase.from("ratings").insert({ site_id: id, stars })
            : await supabase.from("ratings").update({ stars }).eq("site_id", id);
        if (error) throw error;
      } catch {
        setMine((map) => {
          const next = new Map(map);
          if (before === undefined) next.delete(id);
          else next.set(id, before);
          return next;
        });
        return NO_SAVE;
      }
      refreshSummaries();
      return null;
    },
    [refreshSummaries],
  );

  // Take back your rating (the database lets a person delete their own rating, and nobody else's).
  const clearRating = useCallback(
    async (id: string): Promise<string | null> => {
      const before = live.current.mine.get(id);
      if (!isSiteId(id) || before === undefined) return null;
      setMine((map) => {
        const next = new Map(map);
        next.delete(id);
        return next;
      });
      try {
        const supabase = await client();
        const { error } = await supabase.from("ratings").delete().eq("site_id", id);
        if (error) throw error;
      } catch {
        setMine((map) => new Map(map).set(id, before));
        return NO_SAVE;
      }
      refreshSummaries();
      return null;
    },
    [refreshSummaries],
  );

  // Write or change your review of one website. It is checked here for a friendly message and again by the database; either way a new or
  // changed review waits for the owner's approval before anyone else sees it.
  const saveReview = useCallback(async (id: string, text: string): Promise<string | null> => {
    const clean = cleanReview(text);
    if (!clean.ok) return clean.error;
    if (!isSiteId(id)) return NO_SAVE;
    const before = live.current.reviews.get(id);
    setReviews((map) => new Map(map).set(id, { body: clean.text, approved: false }));
    try {
      const supabase = await client();
      const { error } =
        before === undefined
          ? await supabase.from("reviews").insert({ site_id: id, body: clean.text })
          : await supabase.from("reviews").update({ body: clean.text }).eq("site_id", id);
      if (error) throw error;
    } catch {
      setReviews((map) => {
        const next = new Map(map);
        if (before === undefined) next.delete(id);
        else next.set(id, before);
        return next;
      });
      return NO_SAVE;
    }
    return null;
  }, []);

  const deleteReview = useCallback(async (id: string): Promise<string | null> => {
    const before = live.current.reviews.get(id);
    if (!isSiteId(id) || before === undefined) return null;
    setReviews((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
    try {
      const supabase = await client();
      const { error } = await supabase.from("reviews").delete().eq("site_id", id);
      if (error) throw error;
    } catch {
      setReviews((map) => new Map(map).set(id, before));
      return NO_SAVE;
    }
    return null;
  }, []);

  const signOut = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = await client();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      return "Could not sign out. Please try again.";
    }
    return null; // the library's sign-out event clears the lists
  }, []);

  const deleteAccount = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = await client();
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" }).catch(() => {}); // the person is gone; this just clears this browser
    } catch {
      return "Could not delete the account. Nothing was changed. Please try again.";
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage blocked: nothing to clear */
    }
    userId.current = null;
    setAccount({ status: "out" });
    setBookmarks([]);
    setMine(new Map());
    setReviews(new Map());
    return null;
  }, []);

  // A plain file with everything we hold about the person (their email, bookmarks, ratings and reviews), saved by the browser. Nothing is sent anywhere.
  const exportData = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = await client();
      const { data } = await supabase.auth.getSession();
      const file = {
        exportedAt: new Date().toISOString(),
        account: { email: data.session?.user.email ?? null },
        bookmarks: live.current.bookmarks,
        ratings: [...live.current.mine].map(([site, stars]) => ({ site, stars })),
        reviews: [...live.current.reviews].map(([site, review]) => ({ site, text: review.body, approved: review.approved })),
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "site-library-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
      return null;
    } catch {
      return "Could not make the file. Please try again.";
    }
  }, []);

  return {
    account,
    signedIn,
    bookmarks,
    mine,
    reviews,
    summaries,
    toggleBookmark,
    rate,
    clearRating,
    saveReview,
    deleteReview,
    loadReviews: fetchReviews,
    signOut,
    deleteAccount,
    exportData,
  };
}

export type AccountApi = ReturnType<typeof useAccount>;
