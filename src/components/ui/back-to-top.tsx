import { ArrowUp, MousePointerClick } from "lucide-react";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { useState } from "react";

/*
 * "Back to top" button at the end of the home page. Adapted from Skiper UI's "Dynamic Toggle" (Skiper 3, by
 * @gurvinder-singh02, https://gxuri.me). The credit is in the page footer, as its free licence asks. Changes, so you can explain them:
 * - It is a real <button> now: click, tap, Enter and Space all scroll to the top of the page.
 * - Resting: a round black dot with a "click" icon. On mouse hover or keyboard focus it springs open (same spring as the
 *   original) to show "Back to top" and an up arrow. The original's skeleton dots and play button are gone.
 * - Touch screens have no hover, so a tap goes straight to the top (only a real mouse opens it by hovering).
 * - Colours: black and white like the site's buttons, not the demo's undefined `bg-foreground` classes.
 * - The original's blur animations are dropped (blur is slow to draw on phones), as are its demo "Toggle" button,
 *   its entrance animation (the button is simply there, even if scripts fail) and "use client".
 * - Lighter `m` + LazyMotion like the other animated parts, and "reduce motion" is respected: no spring, an instant jump.
 */

const DOT = 60; // px: the round resting size. Also the height, and the size of the arrow circle.
const OPEN = 200; // px: the opened width

export default function BackToTop() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const goToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // Keyboard users: move the focus to the top too, or it would stay stranded down here. (preventScroll: scrolling is already happening.)
    document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
  };

  // One transition for everything, so "reduce motion" needs one switch.
  const transition = reduceMotion ? { duration: 0 } : { type: "spring" as const, bounce: 0.16 };
  // initial={false} = "start already in the resting state". Without it, the server-made HTML had no opacity on these layers,
  // so "Back to top" and the arrow sat on top of the click icon until the script loaded (a few seconds on a slow phone).
  const fade = (visible: boolean, delay = 0) => ({
    initial: false as const,
    animate: { opacity: visible ? 1 : 0 },
    transition: reduceMotion ? { duration: 0 } : { duration: 0.2, delay: visible ? delay : 0 },
  });

  return (
    <LazyMotion features={domAnimation} strict>
      <m.button
        type="button"
        aria-label="Back to top"
        onClick={goToTop}
        // Only a real mouse opens it by hovering. Keyboard focus opens it too.
        onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        initial={false}
        animate={{ width: open ? OPEN : DOT }}
        transition={transition}
        style={{ height: DOT, width: DOT }}
        className="relative block cursor-pointer overflow-hidden rounded-full bg-ink-primary text-white outline-offset-4 transition-colors hover:bg-[var(--action-primary-hover)] focus-visible:outline-2 focus-visible:outline-focus active:scale-95 motion-reduce:transition-none"
      >
        {/* The click icon: the resting face of the dot. Fades out as the button opens. */}
        <m.span aria-hidden="true" {...fade(!open)} className="absolute top-0 left-0 grid place-items-center" style={{ width: DOT, height: DOT }}>
          <MousePointerClick className="size-5" strokeWidth={2} />
        </m.span>

        {/* The words, on the left once open. */}
        <m.span
          aria-hidden="true"
          {...fade(open, 0.12)}
          className="absolute top-0 left-0 flex items-center pl-6 text-sm font-semibold whitespace-nowrap"
          style={{ height: DOT }}
        >
          Back to top
        </m.span>

        {/* The arrow, in its own lighter circle on the right once open. */}
        <m.span
          aria-hidden="true"
          {...fade(open, 0.12)}
          className="absolute top-0 right-0 grid place-items-center rounded-full bg-white/15"
          style={{ width: DOT, height: DOT }}
        >
          <ArrowUp className="size-5" strokeWidth={2.25} />
        </m.span>
      </m.button>
    </LazyMotion>
  );
}
