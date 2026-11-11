// The two sign-in buttons (Google, GitHub). Plan: docs/AUTH-PLAN.md.
//
// LEGAL GATE: real sign-in only runs when the site was built with PUBLIC_ACCOUNTS_OPEN=1. Until then a click only shows the notice
// "Accounts are not open yet" and nothing is sent anywhere. When it is on, the Supabase library is loaded at the first click (or when the
// person comes back from Google or GitHub), never before, so nothing else on the site pays for it.
import { isProvider, readReturn } from "@/lib/auth";

const OPEN = import.meta.env.PUBLIC_ACCOUNTS_OPEN === "1";
const root = document.querySelector<HTMLElement>("[data-auth]");
const notice = document.getElementById("auth-notice");

if (root && notice) {
  let hideTimer = 0;
  // Filling it in (not unhiding) lets screen readers announce it through role="status"; an empty notice is hidden by CSS.
  const show = (message: string) => {
    notice.textContent = message;
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => (notice.textContent = ""), 7000);
  };

  // Where the provider sends the person back to. Always this page (the address is on Supabase's allow-list), never an address from the URL.
  const BACK = `${window.location.origin}/sign-in`;

  root.addEventListener("click", async (event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-provider]");
    if (!button) return;
    if (!OPEN) return show(root.dataset.open === "0" ? (notice.dataset.notice ?? "") : "");
    const provider = (button.dataset.provider ?? "").toLowerCase();
    if (!isProvider(provider)) return;
    try {
      const { getSupabase } = await import("@/lib/supabase-client");
      const supabase = await getSupabase();
      // In a browser this sends the person to Google or GitHub; there is nothing to do with the result unless it failed.
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: BACK } });
      if (error) show("Sign-in could not start. Please try again.");
    } catch {
      show("Sign-in could not start. Please try again.");
    }
  });

  // Coming back from Google or GitHub: the address carries a one-use code. The client swaps it for a session on its own; when it has, go on to the list.
  const back = readReturn(window.location.search);
  if (back.kind === "failed") show(back.message);
  if (back.kind === "returning" && OPEN) {
    (async () => {
      try {
        const { getSupabase } = await import("@/lib/supabase-client");
        const supabase = await getSupabase();
        const { data } = await supabase.auth.getSession(); // Waits until the code has been swapped.
        if (data.session) window.location.replace("/websites/");
        else show("Sign-in did not finish, and nothing was saved. Please try again.");
      } catch {
        show("Sign-in did not finish, and nothing was saved. Please try again.");
      }
    })();
  }
}
