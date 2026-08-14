import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-display text-sm font-semibold tracking-[0.22em]">IRS</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Intelligence &amp; Research Systems. We take capabilities people already use,
            understand them deeply, and build what they should have been.
          </p>
        </div>
        <div>
          <p className="label-mono">Systems</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link to="/products" className="text-muted-foreground hover:text-foreground">
              Product laboratory
            </Link>
            <Link to="/analyze" className="text-muted-foreground hover:text-foreground">
              ATLAS · Codebase graph
            </Link>
            <Link to="/research" className="text-muted-foreground hover:text-foreground">
              Research
            </Link>
          </div>
        </div>
        <div>
          <p className="label-mono">Company</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link to="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link to="/verify" className="text-muted-foreground hover:text-foreground">
              Verification
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} IRS</span>
          <span>All capabilities free · No accounts · Analysis runs in your browser</span>
        </div>
      </div>
    </footer>
  );
}
