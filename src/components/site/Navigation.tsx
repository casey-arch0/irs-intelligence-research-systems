import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/products", label: "Products" },
  { to: "/research", label: "Research" },
  { to: "/about", label: "About" },
  { to: "/verify", label: "Verify" },
] as const;

export function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-6 w-6 items-center justify-center border border-primary/60 text-primary transition-colors group-hover:bg-primary/15">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          <span className="font-display text-sm font-semibold tracking-[0.22em] text-foreground">
            IRS
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            Intelligence &amp; Research Systems
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/analyze"
            className="ml-2 border border-primary/60 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
          >
            Analyze
          </Link>
        </div>

        <button
          className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      <div className={cn("border-t border-border md:hidden", open ? "block" : "hidden")}>
        <div className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
          {[...LINKS, { to: "/analyze", label: "Analyze" } as const].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
