import { gsap } from "gsap";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/*
 * Changes from the original Skiper 39 (so you can explain them):
 * - Respects "reduce motion": starts frozen, with a play button.
 * - Pause/play button (WCAG 2.2.2: moving content longer than 5s needs a way to stop it).
 * - Stops animating when scrolled off-screen, to save battery.
 * - Rebuilds only when the canvas really changes size (the original reset on every
 *   window resize, which made the crowd jump on phones when the address bar moved).
 * - Cleans up correctly if the component disappears before the image loads.
 * - Figure size adapts to the canvas, so heads are never cut off on short screens.
 * - Sharpness capped at 2x for performance.
 * - Can skip figures in the sheet (we skip the 4 holding knives).
 * - Uses w-full instead of w-screen (w-screen caused a sideways scrollbar on desktop).
 * - Removed "use client" (a Next.js-only line; Astro uses client:* directives instead).
 */

interface CrowdCanvasProps {
  /** A sprite sheet: a grid of figures. `rows` = figures across, `cols` = figures down (names kept from the original). */
  src: string;
  rows?: number;
  cols?: number;
  /** Grid positions to leave out, counted 0, 1, 2... left to right, then top to bottom. */
  skip?: readonly number[];
  /** Freeze the crowd where it is. */
  paused?: boolean;
  className?: string;
}

type Peep = {
  // Where this figure sits inside the sprite sheet.
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  // Size and position on the page.
  width: number;
  height: number;
  x: number;
  y: number;
  anchorY: number;
  scaleX: number; // 1 = facing right, -1 = flipped to walk left
  walk: gsap.core.Timeline | null;
};

const CrowdCanvas = ({
  src,
  rows = 15,
  cols = 7,
  skip = [],
  paused = false,
  className,
}: CrowdCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // These let the pause button reach the running animation without restarting it.
  const pausedRef = useRef(paused);
  const setPausedRef = useRef<(paused: boolean) => void>(() => {});
  // Compare skip lists by value, so a new array with the same numbers doesn't restart everything.
  const skipKey = skip.join(",");

  useEffect(() => {
    pausedRef.current = paused;
    setPausedRef.current(paused);
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const skipped = new Set(skipKey ? skipKey.split(",").map(Number) : []);
    const stage = { width: 0, height: 0, scale: 1, dpr: 1 };
    const allPeeps: Peep[] = [];
    const available: Peep[] = [];
    const crowd: Peep[] = [];
    const img = new Image();

    let cancelled = false;
    let loaded = false;
    let visible = false;
    let userPaused = pausedRef.current;
    let running = false;

    const randomRange = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const takeRandom = <T,>(array: T[]): T =>
      array.splice(Math.floor(Math.random() * array.length), 1)[0];

    // Cut the sprite sheet into one Peep per figure.
    const createPeeps = () => {
      const cellWidth = img.naturalWidth / rows;
      const cellHeight = img.naturalHeight / cols;
      for (let i = 0; i < rows * cols; i++) {
        if (skipped.has(i)) continue;
        allPeeps.push({
          sx: (i % rows) * cellWidth,
          sy: Math.floor(i / rows) * cellHeight,
          sw: cellWidth,
          sh: cellHeight,
          width: cellWidth,
          height: cellHeight,
          x: 0,
          y: 0,
          anchorY: 0,
          scaleX: 1,
          walk: null,
        });
      }
    };

    // Put a figure just off one edge and make it walk (with a little bounce) to the other edge.
    const startWalk = (peep: Peep) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      // "power2.in" makes most figures stand near the front and only a few further back.
      const offsetY =
        (100 - 250 * gsap.parseEase("power2.in")(Math.random())) * stage.scale;
      const startY = stage.height - peep.height + offsetY;
      // When flipped (scaleX -1) a figure draws to the LEFT of x, hence the different start/end.
      const startX = direction === 1 ? -peep.width : stage.width + peep.width;
      const endX = direction === 1 ? stage.width : 0;

      peep.scaleX = direction;
      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      const xDuration = 10;
      const yDuration = 0.25;
      const walk = gsap.timeline({
        // Walked off-screen: send this figure back to the pool and bring in a new one.
        onComplete: () => {
          removeFromCrowd(peep);
          addToCrowd();
        },
      });
      walk.timeScale(randomRange(0.5, 1.5));
      walk.to(peep, { duration: xDuration, x: endX, ease: "none" }, 0);
      walk.to(
        peep,
        {
          duration: yDuration,
          repeat: xDuration / yDuration,
          yoyo: true,
          y: startY - 10 * stage.scale,
        },
        0,
      );
      return walk;
    };

    const addToCrowd = () => {
      const peep = takeRandom(available);
      const walk = startWalk(peep);
      if (!running) walk.pause();
      peep.walk = walk;
      crowd.push(peep);
      // Draw figures further back first, so nearer ones overlap them.
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return walk;
    };

    const removeFromCrowd = (peep: Peep) => {
      crowd.splice(crowd.indexOf(peep), 1);
      available.push(peep);
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(stage.dpr, stage.dpr);
      for (const peep of crowd) {
        ctx.save();
        ctx.translate(peep.x, peep.y);
        ctx.scale(peep.scaleX, 1);
        ctx.drawImage(
          img,
          peep.sx,
          peep.sy,
          peep.sw,
          peep.sh,
          0,
          0,
          peep.width,
          peep.height,
        );
        ctx.restore();
      }
      ctx.restore();
    };

    // (Re)build the whole crowd for the canvas's current size.
    const layout = () => {
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      // Cap at 2x: sharper than that costs memory and battery but looks the same.
      stage.dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Figure size. Two limits, and the smaller one wins:
      // 1. Width: smaller figures on phones, so the crowd doesn't swallow the screen.
      // 2. Height: heads must never be cut off. The highest a figure ever reaches is
      //    its own height + 150px (standing furthest back) + 10px (walking bounce), all
      //    multiplied by the scale. That must fit inside the canvas, with 8px to spare.
      const widthScale = stage.width < 640 ? 0.6 : 1;
      const cellHeight = img.naturalHeight / cols;
      const heightScale = (stage.height - 8) / (cellHeight + 160);
      stage.scale = Math.max(0.3, Math.min(widthScale, heightScale));
      canvas.width = Math.round(stage.width * stage.dpr);
      canvas.height = Math.round(stage.height * stage.dpr);

      for (const peep of crowd) peep.walk?.kill();
      crowd.length = 0;
      available.length = 0;
      for (const peep of allPeeps) {
        peep.width = peep.sw * stage.scale;
        peep.height = peep.sh * stage.scale;
        available.push(peep);
      }
      // Start everyone part-way through their walk, so the street is already busy.
      while (available.length) addToCrowd().progress(Math.random());
      render();
    };

    // Animate only when it makes sense: image ready, on screen, and not paused by the person.
    const updateRunning = () => {
      const shouldRun = loaded && visible && !userPaused;
      if (shouldRun === running) return;
      running = shouldRun;
      for (const peep of crowd) {
        if (running) peep.walk?.resume();
        else peep.walk?.pause();
      }
      if (running) gsap.ticker.add(render);
      else gsap.ticker.remove(render);
    };

    setPausedRef.current = (value) => {
      userPaused = value;
      updateRunning();
    };

    let lastWidth = -1;
    let lastHeight = -1;
    const resizeObserver = new ResizeObserver(() => {
      if (!loaded) return;
      if (canvas.clientWidth === lastWidth && canvas.clientHeight === lastHeight) return;
      lastWidth = canvas.clientWidth;
      lastHeight = canvas.clientHeight;
      layout();
    });

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateRunning();
    });

    img.onload = () => {
      if (cancelled) return;
      loaded = true;
      createPeeps();
      lastWidth = canvas.clientWidth;
      lastHeight = canvas.clientHeight;
      layout();
      updateRunning();
    };
    img.src = src;

    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);

    return () => {
      cancelled = true;
      img.onload = null;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      gsap.ticker.remove(render);
      for (const peep of crowd) peep.walk?.kill();
      setPausedRef.current = () => {};
    };
  }, [src, rows, cols, skipKey]);

  // Decorative only, so screen readers skip it.
  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
};

// Figures in the Open Peeps sheet that hold a knife. Not the mood for a friendly landing page.
const KNIFE_FIGURES = [17, 72, 92, 100] as const;

interface Skiper39Props {
  /** Small caption above the crowd. */
  label?: string;
  src?: string;
}

const Skiper39 = ({
  label = "Built for builders",
  src = "/images/open-peeps-crowd.png",
}: Skiper39Props) => {
  const [paused, setPaused] = useState(false);

  // Follow the device's "reduce motion" setting: start frozen; the person can still press play.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(query.matches);
    const onChange = (event: MediaQueryListEvent) => setPaused(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-base text-ink-primary">
      <div className="absolute left-1/2 top-10 grid -translate-x-1/2 justify-items-center text-center">
        <span className="relative max-w-[18ch] text-xs uppercase leading-tight tracking-[0.14em] text-ink-muted after:absolute after:left-1/2 after:top-full after:mt-3 after:h-10 after:w-px sm:after:h-16 after:-translate-x-1/2 after:bg-linear-to-b after:from-transparent after:to-ink-primary after:content-['']">
          {label}
        </span>
      </div>

      <CrowdCanvas
        src={src}
        rows={15}
        cols={7}
        skip={KNIFE_FIGURES}
        paused={paused}
        // The canvas starts just below the caption and its line (124px on phones, 150px on
        // larger screens), so figures can never cover the caption.
        className="absolute inset-x-0 bottom-0 h-[calc(100%-124px)] w-full sm:h-[calc(100%-150px)]"
      />

      {/* Small icon button. ::before stretches its clickable area to 44px. */}
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Play the crowd animation" : "Pause the crowd animation"}
        className="absolute bottom-4 right-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full border border-line-subtle bg-surface-base/90 text-ink-secondary transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {paused ? (
          <Play size={12} aria-hidden="true" />
        ) : (
          <Pause size={12} aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default Skiper39;

/**
 * Skiper 39 Canvas_Landing_004 — React + Canvas
 * Inspired by and adapted from https://codepen.io/zadvorsky/pen/xxwbBQV
 * illustration by https://www.openpeeps.com/
 * We respect the original creators. This is an inspired rebuild with our own taste and does not claim any ownership.
 * These animations aren’t associated with the codepen.io . They’re independent recreations meant to study interaction design
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
