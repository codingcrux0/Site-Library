import { ArrowRight } from "lucide-react";
import Scene from "@/components/scenes/scene";
import { cn } from "@/lib/utils";
import type { Category } from "@/config/categories";

/*
 * Stacked scroll boxes, adapted from a supplied "smooth-scroll" component. Changes, so you can explain them:
 * - Each box is `sticky top-0` and one screen tall, so the next box slides up OVER the previous one.
 *   That is pure CSS. This component is used without a client:* directive, so React sends no JavaScript for it.
 * - The original wrapped everything in <ReactLenis root>. We use the browser's own scrolling (no smooth-scroll library,
 *   which made the page feel laggy), so that wrapper is removed, along with "use client" and forwardRef.
 * - Dark slate + grey boxes became soft tints on our white theme; the faint grid is kept but much lighter.
 * - The boxes are driven by data (src/config/categories.ts), so adding a category never means editing markup.
 * - Inside each box, an animated mini screen (or your own picture) and the words slide in from opposite sides, and flip sides on every other box.
 *   The "black bar sweeps across and reveals the text" effect is plain CSS (src/styles/reveal.css);
 *   src/scripts/reveal-on-scroll.ts only switches it on when a box scrolls into view.
 * - Real headings (h3) and a screen-reader section name replace the demo's four big <h1>s.
 * - h-dvh instead of h-screen: on phones, h-screen is taller than the visible area when the address bar shows.
 */

// Faint square grid that fades out downwards. Decorative only.
const GRID =
  "absolute inset-0 bg-[linear-gradient(to_right,rgba(11,13,16,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(11,13,16,0.06)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]";

// Shared by the picture and the animated scene. The height cap keeps both columns on one phone screen.
const PICTURE = "aspect-[4/3] max-h-[28dvh] w-full rounded-3xl md:max-h-none";

export default function StackedSections({ items }: { items: Category[] }) {
  return (
    <section id="categories" aria-labelledby="categories-title">
      <h2 id="categories-title" className="sr-only">
        Categories
      </h2>
      {items.map((item, index) => {
        // Every other box swaps sides: words on the left, picture on the right.
        const flip = index % 2 === 1;

        return (
          <article
            key={item.name}
            aria-labelledby={`category-${index}`}
            data-reveal-box
            className={cn(
              // sticky + one screen tall = the stacking effect. The soft shadow shows where one box ends and the next begins.
              "sticky top-0 h-dvh overflow-hidden rounded-t-[2rem] border-t border-line-subtle shadow-[0_-12px_24px_-16px_rgba(11,13,16,0.18)]",
              // The gap under every box except the last is a short "pause": the box stays fully in view for 30% of a
              // screen of scrolling before the next one starts to cover it. Kept short on purpose: a long pause felt
              // like the page had stopped (owner feedback). To tune: bigger = more time to read, smaller = less "stuck".
              index < items.length - 1 && "mb-[30dvh]",
              item.tint,
            )}
          >
            <div aria-hidden="true" className={GRID} />

            <div className="relative flex h-full items-center">
              <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-6 md:grid-cols-2 md:gap-16">
                {/* Picture: slides in from the left, or from the right on flipped boxes. */}
                <div className={cn("rv-slide", flip && "md:order-2")} data-from={flip ? "right" : "left"}>
                  {item.image ? (
                    <img
                      src={item.image.src}
                      alt={item.image.alt}
                      width={800}
                      height={600}
                      loading="lazy"
                      decoding="async"
                      className={cn(PICTURE, "object-cover")}
                    />
                  ) : (
                    // The animated mini screen for this box (components/scenes/scene.tsx). Decorative.
                    <div className={cn(PICTURE, "relative overflow-hidden border border-line-strong/60 bg-white/55")}>
                      <Scene name={item.scene} />
                    </div>
                  )}
                </div>

                {/* Words: slide in from the opposite side. The h3 and the paragraph also get the black-bar reveal. */}
                <div
                  className={cn(
                    "rv-slide flex flex-col items-center gap-4 text-center md:items-start md:text-left",
                    flip && "md:order-1",
                  )}
                  data-from={flip ? "left" : "right"}
                >
                  <p className="text-base font-bold text-ink-primary tabular-nums">
                    {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                  </p>

                  <p className="rounded-full border border-line-strong px-3 py-1 text-xs font-medium tracking-wide text-ink-secondary">
                    {item.status}
                  </p>

                  <h3
                    id={`category-${index}`}
                    className="rv-block rv-delay-1 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-semibold tracking-tight text-balance text-ink-primary"
                  >
                    <span className="rv-text">{item.name}</span>
                  </h3>

                  <p className="rv-block rv-delay-2 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-lg">
                    <span className="rv-text">{item.summary}</span>
                  </p>

                  <a href="/websites" className="group rv-fade rr-btn rr-btn--primary rr-btn--lg rr-btn--pill mt-2">
                    Browse the list
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </a>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
