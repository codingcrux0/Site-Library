import type { CSSProperties, ReactNode } from "react";
import { Check, Heart, Search, Share2, Sparkles } from "lucide-react";

/*
 * Small animated "mini screens" that fill the picture boxes (home page boxes and the sign-in side panel).
 * They are drawn with plain HTML and CSS, so there is no video or image file to download and no JavaScript:
 * React renders them to static HTML at build time. The motion lives in src/styles/scenes.css.
 *
 * Each scene shows one real feature from the spec (section 7) using grey "skeleton" bars instead of real text,
 * so it never states a fact about a real website. The few words in them ("Dated", "The catch", "My score"...)
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
  | "devtools"
  | "productivity"
  | "ai";

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
        { label: "My score", to: 0.84, dark: true },
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

  // A terminal: two commands run, then a result line appears under a blinking cursor.
  devtools: (
    <div className="sc-card sc-term">
      <div className="sc-dots">
        <i />
        <i />
        <i />
      </div>
      <div className="sc-lines">
        {["58%", "44%"].map((width, i) => (
          <div className="sc-row sc-rise" key={i} style={step(i + 1, { "--step": "1s" })}>
            <b className="sc-prompt">$</b>
            <Bar w={width} />
          </div>
        ))}
        <div className="sc-row sc-rise" style={step(3.2, { "--step": "1s" })}>
          <span className="sc-ok">
            <Check strokeWidth={3} />
          </span>
          <Bar w="36%" />
          <i className="sc-cursor" />
        </div>
      </div>
    </div>
  ),

  // A task board: one card slides from "To do" across to "Done".
  productivity: (
    <div className="sc-board">
      {["To do", "Doing", "Done"].map((label, column) => (
        <div className="sc-card sc-lane" key={label}>
          <span className="sc-label">{label}</span>
          {column === 0 && (
            <>
              <i className="sc-slot" />
              <i className="sc-slot" />
            </>
          )}
          {column === 2 && <i className="sc-slot sc-slot--done" />}
        </div>
      ))}
      <i className="sc-mover sc-move" />
    </div>
  ),

  // A chat: a question, three "thinking" dots, then the answer drops in.
  ai: (
    <div className="sc-card">
      <div className="sc-bubble sc-bubble--me sc-rise" style={step(1)}>
        <Bar w="70%" />
      </div>
      <div className="sc-thinking sc-rise" style={step(2)}>
        {[0, 1, 2].map((i) => (
          <i className="sc-think sc-pulse" key={i} style={step(i, { "--step": "0.25s" })} />
        ))}
      </div>
      <div className="sc-bubble sc-bubble--ai sc-rise" style={step(4.4)}>
        <Sparkles strokeWidth={2.25} />
        <div className="sc-lines">
          <Bar w="92%" />
          <Bar w="74%" />
          <Bar w="52%" />
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
