import {
  domAnimation,
  LazyMotion,
  m,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * Skiper 31 (scroll text animation), adapted. Changes from the original, so you can explain them:
 * - Uses the "motion" package (the new name of framer-motion; same library, same team),
 *   in its lighter LazyMotion + `m` form.
 * - The original's Lenis smooth-scroll wrapper is removed: the page uses the browser's own scrolling, which is lag-free.
 * - Respects "reduce motion": shows a plain, still version of the same content.
 * - Screen readers get the sentence once, instead of one letter at a time.
 * - Letters are grouped into words, so lines on phones break between words, never mid-word.
 * - Each block animates from "entering the screen" to "centred", which needs much less
 *   scrolling than the original 210vh-tall overlapping blocks.
 * - Colours and font switched to our tokens (black on white instead of orange on beige);
 *   the undefined `font-geist` class and the duplicate third block are removed.
 * - Logos: the original showed Discord/Figma/Framer/GitHub/MongoDB/Notion from a third-party
 *   CDN, which would be misleading here. We self-host the frameworks the site covers.
 * - Removed "use client" (Next.js only).
 * - 2026-10-29: the sentence became a reusable AnimatedLine, so `moreLines` can add more sentences
 *   after the logos (placeholder wording, to be rewritten by the owner).
 * - 2026-10-29: sentences now start with a capital and show in normal sentence case (the original forced ALL CAPS);
 *   the text size dropped from up to 72 px to up to 48 px because it dominated the screen.
 * - 2026-10-29 cleanup: removed the unused CharacterV3 (spinning logos) and the exports nothing imports.
 */

type CharacterProps = {
  char: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
};

type IconProps = {
  src: string;
  alt: string;
  index: number;
  centerIndex: number;
  scrollYProgress: MotionValue<number>;
};

// V1: a letter flies in from the side and flips upright as you scroll.
const CharacterV1 = ({ char, index, centerIndex, scrollYProgress }: CharacterProps) => {
  const isSpace = char === " ";
  // Letters further from the middle start further away, so the word "assembles" from the centre out.
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 1], [distanceFromCenter * 50, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [distanceFromCenter * 50, 0]);

  return (
    <m.span
      className={cn("inline-block", isSpace && "w-4")}
      // transformPerspective gives each letter real 3D depth for the flip.
      style={{ x, rotateX, transformPerspective: 500 }}
    >
      {char}
    </m.span>
  );
};

// V2: a logo slides up from below and grows to full size.
const CharacterV2 = ({ src, alt, index, centerIndex, scrollYProgress }: IconProps) => {
  const distanceFromCenter = index - centerIndex;

  const x = useTransform(scrollYProgress, [0, 1], [distanceFromCenter * 50, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.75, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [Math.abs(distanceFromCenter) * 50, 0]);

  return (
    <m.img
      src={src}
      alt={alt}
      width={64}
      height={64}
      loading="lazy"
      className={ICON_CLASS}
      style={{ x, scale, y, transformOrigin: "center" }}
    />
  );
};

const ICON_CLASS = "size-12 shrink-0 object-contain will-change-transform sm:size-16";

// Framework logos from Simple Icons (CC0), self-hosted in public/images/stack/.
const STACK_ICONS = [
  { src: "/images/stack/react.svg", alt: "React" },
  { src: "/images/stack/vuedotjs.svg", alt: "Vue" },
  { src: "/images/stack/svelte.svg", alt: "Svelte" },
  { src: "/images/stack/angular.svg", alt: "Angular" },
  { src: "/images/stack/html5.svg", alt: "HTML" },
  { src: "/images/stack/tailwindcss.svg", alt: "Tailwind CSS" },
];

// Animate from "top of the block enters the bottom of the screen" (0)
// to "block is centred on screen" (1). After that it stays finished.
const SCROLL_OFFSET: ["start end", "center center"] = ["start end", "center center"];

// True when the device asks for less motion.
// Checked AFTER the page loads on purpose: the server can't know this setting, so the first
// render must match the server's HTML. Then we switch to the still version if needed.
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduce(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

// One sentence that assembles itself letter by letter. Its own component, because each line
// needs its own scroll tracking (hooks can't be called inside a loop).
function AnimatedLine({ text, reduceMotion }: { text: string; reduceMotion: boolean }) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const { scrollYProgress } = useScroll({ target: textRef, offset: SCROLL_OFFSET });
  const centerIndex = Math.floor(text.length / 2);

  // Split into words, remembering where each word starts in the whole sentence
  // (the animation needs every letter's position in the full text).
  let position = 0;
  const words = text.split(" ").map((word) => {
    const start = position;
    position += word.length + 1; // +1 for the space after the word
    return { word, start };
  });

  return (
    <div className="flex min-h-[45vh] items-center justify-center overflow-hidden px-6 py-16">
      <p
        ref={textRef}
        className="w-full max-w-4xl text-center text-[clamp(1.75rem,4.5vw,3rem)] leading-[1.1] font-bold tracking-tight text-ink-primary"
      >
        {reduceMotion ? (
          text
        ) : (
          <>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">
              {words.map(({ word, start }, wordIndex) => (
                <Fragment key={wordIndex}>
                  {wordIndex > 0 && " "}
                  <span className="inline-block whitespace-nowrap">
                    {word.split("").map((char, charIndex) => (
                      <CharacterV1
                        key={charIndex}
                        char={char}
                        index={start + charIndex}
                        centerIndex={centerIndex}
                        scrollYProgress={scrollYProgress}
                      />
                    ))}
                  </span>
                </Fragment>
              ))}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

interface Skiper31Props {
  text?: string;
  caption?: string;
  // More sentences shown after the logos. They repeat the site's three promises (spec section 2).
  moreLines?: string[];
}

const Skiper31 = ({
  text = "Find what works",
  caption = "For the stack you already use",
  moreLines = ["Reviewed, not just listed", "Dated and scored", "With the catch up front"],
}: Skiper31Props) => {
  const reduceMotion = usePrefersReducedMotion();
  const iconsRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress: iconsProgress } = useScroll({ target: iconsRef, offset: SCROLL_OFFSET });
  const iconCenterIndex = Math.floor(STACK_ICONS.length / 2);

  return (
    // LazyMotion + the small `m` component (instead of `motion`) loads only the animation
    // features we use. Measured: 54.7 KB down to 41.5 KB (gzipped).
    <LazyMotion features={domAnimation} strict>
      <div className="w-full bg-surface-base">
        {/* Block 1: the sentence */}
        <AnimatedLine text={text} reduceMotion={reduceMotion} />

        {/* Block 2: the frameworks */}
        <div className="flex min-h-[45vh] flex-col items-center justify-center gap-10 overflow-hidden px-6 py-16">
          <p className="flex items-center justify-center gap-3 text-center text-lg font-medium tracking-tight text-ink-primary sm:text-2xl">
            <Bracket className="h-10 shrink-0 sm:h-12" />
            <span>{caption}</span>
            <Bracket className="h-10 shrink-0 -scale-x-100 sm:h-12" />
          </p>

          {/* 3 per row on phones, one row on larger screens */}
          <div
            ref={iconsRef}
            className="grid grid-cols-3 place-items-center gap-8 sm:flex sm:items-center sm:justify-center sm:gap-10"
          >
            {STACK_ICONS.map((icon, index) =>
              reduceMotion ? (
                <img
                  key={icon.src}
                  src={icon.src}
                  alt={icon.alt}
                  width={64}
                  height={64}
                  loading="lazy"
                  className={ICON_CLASS}
                />
              ) : (
                <CharacterV2
                  key={icon.src}
                  src={icon.src}
                  alt={icon.alt}
                  index={index}
                  centerIndex={iconCenterIndex}
                  scrollYProgress={iconsProgress}
                />
              ),
            )}
          </div>
        </div>

        {/* Block 3 onwards: more sentences, same effect */}
        {moreLines.map((line) => (
          <AnimatedLine key={line} text={line} reduceMotion={reduceMotion} />
        ))}
      </div>
    </LazyMotion>
  );
};

export default Skiper31;

// The curly bracket drawn either side of the caption. Decorative, so hidden from screen readers.
const Bracket = ({ className }: { className: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 27 78"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        d="M26.52 77.21h-5.75c-6.83 0-12.38-5.56-12.38-12.38V48.38C8.39 43.76 4.63 40 .01 40v-4c4.62 0 8.38-3.76 8.38-8.38V12.4C8.38 5.56 13.94 0 20.77 0h5.75v4h-5.75c-4.62 0-8.38 3.76-8.38 8.38V27.6c0 4.34-2.25 8.17-5.64 10.38 3.39 2.21 5.64 6.04 5.64 10.38v16.45c0 4.62 3.76 8.38 8.38 8.38h5.75v4.02Z"
      />
    </svg>
  );
};
