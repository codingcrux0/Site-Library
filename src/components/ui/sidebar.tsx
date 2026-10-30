import { ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/*
 * The left sidebar (also the base for the other pages), adapted from a supplied "Sidebar" component.
 * Changes, so you can explain them:
 * - Kept: the parts and their names (Sidebar, SidebarHeader, SidebarNav, SidebarSection, SidebarItem, SidebarNested, SidebarFooter),
 *   the labelled groups, the dropdown group, badges, links or buttons, and the "current page" highlight.
 * - Dropped: the collapse / icon-rail / floating / resizable variants and the drag handle (nothing here uses them).
 *   Fewer variants means less code to explain and ship.
 * - No framer-motion, @base-ui/react or @tabler/icons-react. The site already has `motion` and `lucide-react`, and this needs
 *   neither motion nor a render helper: the dropdown opens with a plain CSS height transition, so it also works
 *   before the page's script loads. The gliding highlight (needs the bigger motion bundle) is a plain highlight now.
 * - Colours come from the site's tokens (white, light grey, black) instead of the original's `--primitive-*` variables.
 * - The injected <style> tag for the scrollbar is gone (a quiet thin scrollbar is one Tailwind class here).
 */

const item =
  "group/item relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none";
const itemActive = "bg-surface-sunken font-semibold text-ink-primary";

const Sidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <nav ref={ref} aria-label="Library" className={cn("flex flex-col", className)} {...props} />
));
Sidebar.displayName = "Sidebar";

const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2.5 px-3 pb-4", className)} {...props} />
);

const SidebarNav = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain [scrollbar-width:thin]", className)} {...props} />
);

const SidebarSection = ({ label, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { label?: string }) => (
  <div role="group" aria-label={label} className={className} {...props}>
    {label ? <div className="px-3 pb-1.5 text-[11px] font-medium tracking-[0.1em] text-ink-muted uppercase">{label}</div> : null}
    <div className="flex flex-col gap-0.5">{children}</div>
  </div>
);

interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  active?: boolean;
  /** Renders a link when given. */
  href?: string;
  /** A small tag or count after the label. */
  badge?: React.ReactNode;
}

const SidebarItem = ({ icon, active = false, href, badge, className, children, ...props }: SidebarItemProps) => {
  const classes = cn(item, active && itemActive, className);
  const content = (
    <>
      {icon ? <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge ? <span className="flex shrink-0 items-center">{badge}</span> : null}
    </>
  );
  if (href) {
    return (
      <a href={href} aria-current={active ? "page" : undefined} className={classes}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" aria-current={active ? "true" : undefined} className={classes} {...props}>
      {content}
    </button>
  );
};

interface SidebarNestedProps {
  icon?: React.ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// A dropdown group. `grid-rows-[0fr]` to `[1fr]` animates the height with CSS only (no layout code in JavaScript).
const SidebarNested = ({ icon, label, defaultOpen = false, children }: SidebarNestedProps) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <div className="flex flex-col">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className={item}>
        {icon ? <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">{icon}</span> : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight
          aria-hidden="true"
          className={cn("size-3.5 shrink-0 text-ink-muted transition-transform duration-200 motion-reduce:transition-none", open && "rotate-90")}
        />
      </button>
      <div
        id={id}
        // inert = closed items cannot be tabbed to or read while hidden.
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-5 flex flex-col gap-0.5 border-l border-line-subtle py-1 pl-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex flex-col gap-0.5 border-t border-line-subtle pt-4", className)} {...props} />
);

export { Sidebar, SidebarFooter, SidebarHeader, SidebarItem, SidebarNav, SidebarNested, SidebarSection };
