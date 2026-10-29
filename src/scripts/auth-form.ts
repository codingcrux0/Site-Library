// The sign-in form is NOT connected to anything yet: accounts stay closed until the legal review is done
// (CONTEXT.md, LEGAL GATE). So this script only does two things:
//   1. switches between the three views (sign in / create account / reset password)
//   2. when someone tries to submit, shows a message. Nothing typed here is sent, stored or logged.
const form = document.querySelector<HTMLFormElement>("[data-auth-form]");
const notice = document.getElementById("auth-notice");
const swap = form?.querySelector<HTMLElement>("[data-swap]");
const page = document.querySelector("main");

if (form && notice && swap) {
  const password = form.elements.namedItem("password") as HTMLInputElement;

  const setMode = (mode: string) => {
    form.dataset.mode = mode;
    // Show only what belongs to this view. data-for="signin signup" means "both of these".
    form.querySelectorAll<HTMLElement>("[data-for]").forEach((el) => {
      el.hidden = !(el.dataset.for ?? "").split(" ").includes(mode);
    });
    // The password box is hidden in the reset view. A hidden box that is still "required" would silently block submitting.
    password.disabled = mode === "reset";
    password.autocomplete = mode === "signup" ? "new-password" : "current-password";
    if (mode === "signup") password.minLength = 8;
    else password.removeAttribute("minlength");
    password.value = ""; // never carry a typed password into another view
    notice.textContent = "";

    // The first-load entrance (class rv-load) is only for arrival. Stop it, or boxes that reappear would replay it.
    page?.classList.remove("rv-load");
    // Re-play the short fade for the new view (remove, force a layout read, add).
    swap.classList.remove("rv-swap");
    void swap.offsetWidth;
    swap.classList.add("rv-swap");
    form.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({ preventScroll: true });
  };

  let hideTimer = 0;
  const showNotice = () => {
    // Filling it in (not unhiding) lets screen readers announce it through role="status".
    notice.textContent = notice.getAttribute(`data-notice-${form.dataset.mode}`) ?? "";
    // An empty notice is hidden by CSS, so clearing it after a few seconds makes it fade away.
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => (notice.textContent = ""), 7000);
  };

  form.addEventListener("click", (event) => {
    const target = event.target as Element;
    const switcher = target.closest<HTMLElement>("[data-mode-to]");
    if (switcher?.dataset.modeTo) return setMode(switcher.dataset.modeTo);
    if (target.closest("[data-provider]")) showNotice();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    showNotice();
  });
}
