import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/site/Footer";
import { Navigation } from "@/components/site/Navigation";

const title = "Research Method — IRS";
const description =
  "How IRS turns an existing feature into a standalone product: capability, problem, depth, instrument. The research methodology behind the laboratory.";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ResearchPage,
});

const STAGES = [
  {
    n: "01",
    label: "Locate the capability",
    body: "Start from something people already use every day and quietly tolerate: error tracking, webhooks, session replay, a repository file tree. Familiarity is the signal — it means the problem is real and the current answer is a compromise.",
  },
  {
    n: "02",
    label: "Recover the real problem",
    body: "Ask what the feature is actually standing in for. A file tree is a stand-in for understanding architecture. Grouped stack traces are a stand-in for causality. The feature is a shortcut; the problem underneath is the product.",
  },
  {
    n: "03",
    label: "Go dramatically deeper",
    body: "Not 20% better. Depth means modelling relationships the original never represented — structure, dependency, causality, blast radius, time — and making them first-class objects you can select, trace and interrogate.",
  },
  {
    n: "04",
    label: "Build it standalone",
    body: "The result is an instrument, not a tab inside someone else's dashboard. It owns its data model, its interaction language and its failure modes. It has to be worth opening on its own.",
  },
  {
    n: "05",
    label: "Repeat",
    body: "Every finished system exposes the next capability worth taking apart. The laboratory compounds: shared graph model, shared interaction grammar, independent products.",
  },
];

function ResearchPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
        <p className="label-mono">Research</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Feature → problem → depth → product.
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          IRS is a product laboratory. The research is not academic — it is the disciplined
          disassembly of software capabilities that were shipped shallow.
        </p>

        <ol className="mt-12 border-t border-border">
          {STAGES.map((s) => (
            <li
              key={s.n}
              className="grid gap-3 border-b border-border py-7 md:grid-cols-[6rem_16rem_1fr]"
            >
              <span className="font-mono text-xs text-primary">{s.n}</span>
              <h2 className="font-display text-lg font-semibold tracking-tight">{s.label}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>

        <section className="panel mt-12 p-6">
          <p className="label-mono">Working thesis</p>
          <p className="mt-3 font-display text-xl leading-relaxed tracking-tight">
            Software is not a list of files, events or errors. It is a system of relationships.
            Tools that render lists force you to reconstruct the system in your head — IRS renders
            the system directly.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
