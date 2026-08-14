import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/site/Footer";
import { Navigation } from "@/components/site/Navigation";

const title = "About IRS — Intelligence & Research Systems";
const description =
  "IRS is a technology company and product laboratory that takes existing software capabilities, understands them deeply, and rebuilds them as standalone products.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
        <p className="label-mono">About</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Intelligence &amp; Research Systems
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          IRS is a technology company and product laboratory. We work on a single premise: most
          software capabilities were shipped as features when they deserved to be products.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              h: "Depth over surface",
              p: "We do not build thin layers over existing tools. Every system models the relationships the original left implicit.",
            },
            {
              h: "Instruments, not dashboards",
              p: "The interface is built for interrogation: selection, traversal, modes, time. Charts are a byproduct, not the point.",
            },
            {
              h: "Open by default",
              p: "Everything currently built is free and usable. No accounts, no payment, no capability locks.",
            },
          ].map((c) => (
            <div key={c.h} className="panel p-5">
              <h2 className="font-display text-base font-semibold tracking-tight">{c.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.p}</p>
            </div>
          ))}
        </div>

        <section className="mt-14 border-t border-border pt-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">How we operate</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            The laboratory runs a continuous loop: locate a capability, recover the problem it was
            standing in for, go dramatically deeper, ship it as an independent product, repeat.
            Products share one substrate — a relationship graph and a common interaction grammar —
            but each one stands alone.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            ATLAS is the first system in production: it takes a codebase and renders architecture,
            dependency, causality and impact as one navigable graph, entirely in your browser.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/analyze"
              className="border border-primary/60 bg-primary/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20"
            >
              Open ATLAS
            </Link>
            <Link
              to="/products"
              className="border border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Product laboratory
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
