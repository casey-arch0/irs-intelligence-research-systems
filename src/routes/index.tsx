import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { CodebaseIntake } from "@/components/site/CodebaseIntake";
import { Footer } from "@/components/site/Footer";
import { Navigation } from "@/components/site/Navigation";
import { ProductCard } from "@/components/site/ProductCard";
import { referenceGraph } from "@/lib/graph/reference-graph";
import { products } from "@/lib/products";

const title = "IRS — Intelligence & Research Systems";
const description =
  "IRS researches the capabilities hidden inside modern software, takes them deeper, and turns them into focused standalone products. Analyze any codebase as a live system graph.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const METHOD = [
  { step: "Observe", text: "Watch how developers actually use a feature buried in a larger tool." },
  { step: "Research", text: "Study the real problem the feature only half solves." },
  { step: "Build", text: "Rebuild it standalone, with no product politics attached." },
  { step: "Deepen", text: "Push it ten times further than the original ever could go." },
  { step: "Release", text: "Ship it as an independent instrument in the IRS laboratory." },
];

function Index() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const featured = useMemo(() => products.slice(0, 3), []);

  const onExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 opacity-40 sm:opacity-55">
            <GraphCanvas
              data={referenceGraph}
              mode="architecture"
              selectedId={null}
              selectedEdgeId={null}
              onSelectNode={() => {}}
              onSelectEdge={() => {}}
              expanded={new Set<string>()}
              onExpand={() => {}}
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
            <p className="label-mono">Intelligence &amp; Research Systems</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              We turn software features
              <br />
              into systems.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              IRS researches the capabilities hidden inside modern software, takes them deeper, and
              turns them into focused standalone products.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/analyze"
                className="inline-flex items-center gap-2 border border-primary/60 bg-primary/15 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/25"
              >
                Analyze a codebase <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 border border-border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Explore products
              </Link>
            </div>
          </div>
        </section>

        {/* Method */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <p className="label-mono">What we do</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Observe → Research → Build → Deepen → Release
            </h2>
            <ol className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
              {METHOD.map((m, i) => (
                <li key={m.step} className="bg-background p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                    {String(i + 1).padStart(2, "0")} / {m.step}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Graph showcase */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <p className="label-mono">Signature instrument</p>
            <h2 className="mt-2 max-w-2xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Complex software becomes understandable when its relationships become visible.
            </h2>
            <div className="panel relative mt-8 h-[420px] overflow-hidden sm:h-[520px]">
              <GraphCanvas
                data={referenceGraph}
                mode="architecture"
                selectedId={selectedId}
                selectedEdgeId={null}
                onSelectNode={setSelectedId}
                onSelectEdge={() => {}}
                expanded={expanded}
                onExpand={onExpand}
                className="absolute inset-0 h-full w-full"
              />
              <p className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Drag nodes · scroll to zoom · double-click to expand
              </p>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label-mono">Product laboratory</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Instruments in development
                </h2>
              </div>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Explore the laboratory <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Codebase CTA */}
        <section>
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Bring your codebase.
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                See your software as a system, not a pile of files.
              </p>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                GitHub · GitLab · ZIP · Local folder · Repository archive
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                No account, no upload, no payment. Everything runs in your browser.
              </p>
            </div>
            <CodebaseIntake
              onResult={() => {
                void navigate({ to: "/analyze" });
              }}
              compact
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
