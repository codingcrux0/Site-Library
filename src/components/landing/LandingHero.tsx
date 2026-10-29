import Hero from "@/components/ui/hero";

// The top of the home page. Astro turns this into plain HTML at build time,
// so it sends no JavaScript to the browser and shows up instantly.
export default function LandingHero() {
  return (
    <Hero
      mark={
        <span className="inline-flex items-center gap-2 rounded-full border border-line-subtle px-3 py-1 text-xs font-medium text-ink-secondary">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ink-brand" />
          Now testing: Frontend Components
        </span>
      }
      lede="Every site here is tested by hand, dated and scored, and comes with the catch nobody mentions."
      action={
        // A link, not a <button>: it takes you somewhere instead of doing something.
        <a href="/websites" className="rr-btn rr-btn--primary rr-btn--lg rr-btn--pill">
          Browse the list
        </a>
      }
      secondary="Sign in"
      secondaryHref="/sign-in"
      foot="Free to use. No account needed."
    >
      <h1 className="m-0 text-[clamp(2.5rem,4vw+1.25rem,4.25rem)] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance text-ink-primary">
        Useful websites, tested by a real person.
      </h1>
    </Hero>
  );
}
