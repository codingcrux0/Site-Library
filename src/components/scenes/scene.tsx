import type { CSSProperties, ReactNode } from "react";
import { Check, Heart, Search, Share2 } from "lucide-react";

/*
 * Small animated "mini screens" that fill the picture boxes (home page boxes and the sign-in side panel).
 * They are drawn with plain HTML and CSS, so there is no video or image file to download and no JavaScript:
 * React renders them to static HTML at build time. The motion lives in src/styles/scenes.css.
 *
 * Each scene shows one real feature from the spec (section 7) using grey "skeleton" bars instead of real text,
 * so it never states a fact about a real website. The few words in them ("Dated", "The catch", "Our score"...)
 * are the site's own feature names.
 *
 * Scenes are decorative: the box or card around them carries the real heading and description.
 */

export type SceneName =
  | "tested"
  | "catch"
  | "scores"
  | "compare"
  | "pick"
  | "search"
  | "lists"
  | "stack"
  | "components"
  | "motion"
  | "gallery"
  | "templates"
  | "graphics"
  | "video";

// A grey placeholder line, w = how wide.
const Bar = ({ w = "100%" }: { w?: string }) => <i className="sc-bar" style={{ "--w": w } as CSSProperties} />;

// "--i" = which step this element is in a sequence. The CSS multiplies it into a start delay.
const step = (i: number, extra: Record<string, string | number> = {}) => ({ "--i": i, ...extra }) as CSSProperties;

const SCENES: Record<SceneName, ReactNode> = {
  // A checklist that ticks itself off, then gets a date.
  tested: (
    <div className="sc-card">
      <Bar w="45%" />
      {["72%", "55%", "64%"].map((width, i) => (
        <div className="sc-row" key={i}>
          <span className="sc-ring">
            <span className="sc-tick sc-pop" style={step(i + 1)}>
              <Check strokeWidth={3} />
            </span>
          </span>
          <Bar w={width} />
        </div>
      ))}
      <span className="sc-chip sc-pop" style={step(4.5)}>
        Dated
      </span>
    </div>
  ),

  // A website card, and then "the catch" slides in under it.
  catch: (
    <div className="sc-card">
      <div className="sc-row">
        <span className="sc-logo" />
        <Bar w="50%" />
      </div>
      <Bar w="92%" />
      <Bar w="68%" />
      <div className="sc-catch sc-rise" style={step(3)}>
        <span className="sc-label">
          <b className="sc-bang">!</b>The catch
        </span>
        <Bar w="88%" />
        <Bar w="56%" />
      </div>
    </div>
  ),

  // Two meters that fill by themselves: my score and the community's. Always separate.
  scores: (
    <div className="sc-card sc-roomy">
      {[
        { label: "Our score", to: 0.84, dark: true },
        { label: "Community", to: 0.6, dark: false },
      ].map(({ label, to, dark }, i) => (
        <div className="sc-meter" key={label}>
          <span className="sc-label">{label}</span>
          <span className="sc-track">
            <i className={`sc-fill sc-grow${dark ? "" : " sc-fill--soft"}`} style={step(i * 1.2, { "--to": to })} />
          </span>
        </div>
      ))}
      <span className="sc-note">Never mixed</span>
    </div>
  ),

  // Two tools side by side, and a highlight scanning down the rows.
  compare: (
    <div className="sc-pair">
      {[0, 1].map((column) => (
        <div className="sc-card sc-col" key={column}>
          <Bar w="62%" />
          {["80%", "58%", "70%", "46%"].map((width, row) => (
            <div className="sc-cell" key={row}>
              <i className="sc-dot" />
              <Bar w={column === 0 ? width : ["60%", "76%", "52%", "68%"][row]} />
            </div>
          ))}
        </div>
      ))}
      <span className="sc-vs sc-pulse">vs</span>
      <i className="sc-scan" />
    </div>
  ),

  // Three quick questions get answered, then three picks appear.
  pick: (
    <div className="sc-card">
      {["Framework?", "Free only?", "Copy or install?"].map((question, i) => (
        <div className="sc-pill" key={question}>
          {question}
          <span className="sc-ok sc-pop" style={step(i + 1, { "--step": "0.7s" })}>
            <Check strokeWidth={3} />
          </span>
        </div>
      ))}
      {[0, 1, 2].map((i) => (
        <div className="sc-result sc-rise" key={i} style={step(i + 4.2, { "--step": "0.45s" })}>
          <b className="sc-num">{i + 1}</b>
          <Bar w={["78%", "62%", "70%"][i]} />
        </div>
      ))}
    </div>
  ),

  // A search box that "types", and results that drop in.
  search: (
    <div className="sc-card">
      <div className="sc-field">
        <Search strokeWidth={2.25} />
        <span className="sc-typed">
          <i className="sc-type" />
        </span>
        <kbd className="sc-kbd">⌘K</kbd>
      </div>
      {[0, 1, 2].map((i) => (
        <div className={`sc-hit sc-rise${i === 0 ? " sc-hit--first" : ""}`} key={i} style={step(i + 3.2, { "--step": "0.4s" })}>
          <span className="sc-logo sc-logo--sm" />
          <Bar w={["70%", "56%", "64%"][i]} />
        </div>
      ))}
    </div>
  ),

  // Hearts pop onto items as they are saved into a list.
  lists: (
    <div className="sc-card">
      <span className="sc-chip">My list</span>
      {["68%", "52%", "60%"].map((width, i) => (
        <div className="sc-row" key={i}>
          <span className="sc-logo sc-logo--sm" />
          <Bar w={width} />
          <Heart className="sc-heart sc-pop" style={step(i + 1.5, { "--step": "0.8s" })} />
        </div>
      ))}
    </div>
  ),

  // Five tools drop into a card that is ready to share.
  stack: (
    <div className="sc-card sc-float">
      <span className="sc-label">My frontend stack</span>
      <div className="sc-chips">
        {["sky", "sand", "sage", "lilac", "sky"].map((tint, i) => (
          <i className="sc-chip-dot sc-pop" key={i} style={step(i + 1, { "--step": "0.45s", "--tint": `var(--tint-${tint})` })} />
        ))}
      </div>
      <span className="sc-share sc-pop" style={step(4.2)}>
        <Share2 strokeWidth={2.25} />
        Share
      </span>
    </div>
  ),

  // A little web page being put together: nav, headline, button, cards, and a switch that flips.
  components: (
    <div className="sc-card sc-window">
      <div className="sc-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-row sc-nav">
        <Bar w="22%" />
        <span className="sc-toggle">
          <i className="sc-knob" />
        </span>
      </div>
      <div className="sc-hero">
        <Bar w="74%" />
        <Bar w="48%" />
        <span className="sc-btn sc-pulse" />
      </div>
      <div className="sc-minis">
        {[0, 1, 2].map((i) => (
          <i className="sc-mini sc-rise" key={i} style={step(i + 1, { "--step": "0.35s" })} />
        ))}
      </div>
    </div>
  ),

  // Motion: a dot that pulses, a progress line that fills, and little tiles that pop in one after another.
  motion: (
    <div className="sc-card sc-roomy">
      <div className="sc-row">
        <i className="sc-chip-dot sc-pulse" style={{ "--tint": "var(--tint-lilac)" } as CSSProperties} />
        <div className="sc-lines">
          <Bar w="68%" />
          <Bar w="44%" />
        </div>
      </div>
      <span className="sc-track">
        <i className="sc-fill sc-grow" style={step(1, { "--to": 0.82 })} />
      </span>
      <div className="sc-chips">
        {["sky", "sand", "sage", "lilac"].map((tint, i) => (
          <i className="sc-chip-dot sc-pop" key={tint} style={step(i + 2, { "--step": "0.45s", "--tint": `var(--tint-${tint})` })} />
        ))}
      </div>
    </div>
  ),

  // A gallery: a search bar and a grid of little design tiles that rise in one after another.
  gallery: (
    <div className="sc-card sc-window">
      <div className="sc-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-row sc-nav">
        <Bar w="38%" />
        <Bar w="16%" />
      </div>
      {[0, 1].map((row) => (
        <div className="sc-minis" key={row}>
          {[0, 1, 2].map((col) => (
            <i className="sc-mini sc-rise" key={col} style={step(row * 3 + col + 1, { "--step": "0.35s" })} />
          ))}
        </div>
      ))}
    </div>
  ),

  // Templates: a page layout (picture block, lines, button) and the colours it can wear.
  templates: (
    <div className="sc-card sc-window">
      <div className="sc-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-row" style={{ padding: "2cqw 3.5cqw 3cqw" }}>
        <i className="sc-mini sc-pulse" style={{ flex: "none", width: "26cqw", height: "20cqw", background: "var(--tint-lilac)" } as CSSProperties} />
        <div className="sc-lines">
          <Bar w="88%" />
          <Bar w="62%" />
          <span className="sc-btn" />
        </div>
      </div>
      <div className="sc-chips" style={{ padding: "0 3.5cqw 3.5cqw" }}>
        {["sky", "sand", "sage", "lilac"].map((tint, i) => (
          <i className="sc-chip-dot sc-pop" key={tint} style={step(i + 1, { "--step": "0.45s", "--tint": `var(--tint-${tint})` })} />
        ))}
      </div>
    </div>
  ),

  // 3D: a small cube that turns slowly, in a window with a caption bar under it.
  graphics: (
    <div className="sc-card sc-window">
      <div className="sc-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-cube-wrap">
        <div className="sc-cube">
          {[0, 1, 2, 3, 4, 5].map((face) => (
            <i key={face} />
          ))}
        </div>
      </div>
      <div className="sc-row sc-nav">
        <Bar w="34%" />
        <Bar w="14%" />
      </div>
    </div>
  ),

  // Video: a preview with a play button above a timeline of clips, and a playhead that slides along it.
  video: (
    <div className="sc-card sc-window">
      <div className="sc-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-reel">
        <i className="sc-preview">
          <b className="sc-play" />
        </i>
        <div className="sc-timeline">
          {[
            ["0%", "46%", "sky"],
            ["38%", "50%", "sand"],
            ["14%", "58%", "lilac"],
          ].map(([left, width, tint]) => (
            <i className="sc-clip" key={tint} style={{ "--l": left, "--w": width, "--tint": `var(--tint-${tint})` } as CSSProperties} />
          ))}
          <i className="sc-playhead" />
        </div>
      </div>
    </div>
  ),
};

export default function Scene({ name }: { name: SceneName }) {
  return (
    <div className="sc" data-scene={name} aria-hidden="true">
      <div className="sc-stage">{SCENES[name]}</div>
    </div>
  );
}
