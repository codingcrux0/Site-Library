// Starts each entrance animation (src/styles/reveal.css) when its box scrolls into view.
// It only flips a data attribute; the animation itself is CSS.
const boxes = document.querySelectorAll<HTMLElement>("[data-reveal-box]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reduced motion (or no boxes on this page): do nothing, so everything just shows.
if (boxes.length > 0 && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const box = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          box.dataset.in = "";
        } else if (entry.boundingClientRect.top > 0) {
          // Scrolled back up past it: re-arm, so it plays again next time. (Out of sight, so no visible jump.)
          delete box.dataset.in;
        }
      }
    },
    // Start as soon as the box's top edge is 15% above the bottom of the screen. The entrance then runs while
    // the box is still sliding up, so it is mostly finished by the time the box fills the screen.
    { threshold: 0, rootMargin: "0px 0px -15% 0px" },
  );

  boxes.forEach((box) => observer.observe(box));

  // Once the NEXT box has slid up to the top of the screen, it covers this one. Nobody can see its picture any more,
  // so mark it (data-covered) and the CSS pauses its animation instead of running it for nothing.
  // ("At the top" means "within 6% of it": the browser reports in 5% steps and never reports an exact 100%.)
  // Twenty-one thresholds = a report every 5% of progress.
  const coverObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const covered = entry.boundingClientRect.top <= window.innerHeight * 0.06;
        (entry.target.previousElementSibling as HTMLElement | null)?.toggleAttribute("data-covered", covered);
      }
    },
    { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  );
  boxes.forEach((box, i) => i > 0 && coverObserver.observe(box));

  // Hide the "before" state only now that the script is running and will reveal it.
  document.documentElement.dataset.reveal = "ready";
}
