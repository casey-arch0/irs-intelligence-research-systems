import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { GraphCanvas, type GraphViewApi } from "@/components/graph/GraphCanvas";
import { GraphControls } from "@/components/graph/GraphControls";
import { NodeInspector } from "@/components/graph/NodeInspector";
import { CodebaseIntake } from "@/components/site/CodebaseIntake";
import { Footer } from "@/components/site/Footer";
import { Navigation } from "@/components/site/Navigation";
import { analyzeCodebase, type AnalysisResult } from "@/lib/analysis/codebase-graph";
import type { GraphMode } from "@/lib/graph/types";
import type { IntakeResult } from "@/lib/intake/types";

const title = "Analyze a Codebase — IRS";
const description =
  "Bring a repository, ZIP archive or local folder into IRS and explore your software as an interactive system graph. Everything is processed in your browser.";

export const Route = createFileRoute("/analyze")({
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
  component: AnalyzePage,
});

type Phase = "idle" | "analyzing" | "ready" | "error";

function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<GraphMode>("architecture");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [timeline, setTimeline] = useState(1);
  const apiRef = useRef<GraphViewApi | null>(null);

  const handleIntake = useCallback((intake: IntakeResult) => {
    setPhase("analyzing");
    setErrorMessage(null);
    // Defer so the loading state paints before the synchronous analysis pass.
    window.setTimeout(() => {
      try {
        const analysis = analyzeCodebase(intake);
        if (analysis.graph.nodes.length === 0) {
          throw new Error("empty-graph");
        }
        setResult(analysis);
        setSelectedId(null);
        setSelectedEdgeId(null);
        setExpanded(new Set());
        setTimeline(1);
        setPhase("ready");
      } catch (e) {
        const kind = (e as Error)?.message;
        setErrorMessage(
          kind === "empty-graph"
            ? "No analyzable source files were found in that codebase."
            : "IRS could not build a system graph from that codebase. It may be too large, private, or in an unsupported format.",
        );
        setPhase("error");
      }
    }, 30);
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setErrorMessage(null);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setExpanded(new Set());
  }, []);

  const graph = result?.graph;
  const selectedNode = useMemo(
    () => graph?.nodes.find((n) => n.id === selectedId) ?? null,
    [graph, selectedId],
  );
  const selectedEdge = useMemo(
    () => graph?.edges.find((e) => e.id === selectedEdgeId) ?? null,
    [graph, selectedEdgeId],
  );

  const selectNode = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedEdgeId(null);
  }, []);

  const expandNode = useCallback((id: string) => {
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

      <main className="flex flex-1 flex-col">
        <header className="border-b border-border px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="label-mono">IRS / Analysis</p>
              <h1 className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight">
                {graph?.source?.label ?? "No system loaded"}
              </h1>
            </div>
            {phase === "ready" && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <RotateCcw className="h-3 w-3" /> New analysis
              </button>
            )}
          </div>
        </header>

        {phase === "ready" && result && (
          <SummaryStrip result={result} />
        )}

        {phase === "idle" && (
          <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Bring your codebase into the system.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              IRS reads your source locally, extracts structure, symbols, dependencies and IO
              surfaces, and renders the result as an interactive system graph. Nothing is uploaded.
            </p>
            <div className="mt-8">
              <CodebaseIntake onResult={handleIntake} />
            </div>
          </section>
        )}

        {phase === "analyzing" && <AnalyzingState />}

        {phase === "error" && (
          <section className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6">
            <AlertTriangle className="mx-auto h-6 w-6 text-[var(--graph-alert,#f77)]" />
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
              Analysis failed
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{errorMessage}</p>
            <button
              onClick={reset}
              className="mt-6 border border-primary/60 bg-primary/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
            >
              Try again
            </button>
          </section>
        )}

        {phase === "ready" && graph && (
          <section className="relative min-h-[70vh] flex-1">
            <GraphCanvas
              data={graph}
              mode={mode}
              selectedId={selectedId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={selectNode}
              onSelectEdge={(id) => {
                setSelectedEdgeId(id);
                if (id) setSelectedId(null);
              }}
              expanded={expanded}
              onExpand={expandNode}
              timeline={timeline}
              onReady={(api) => {
                apiRef.current = api;
              }}
              className="absolute inset-0 h-full w-full"
            />

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-3 sm:p-4 lg:flex-row">
              <div className="w-full max-w-xs">
                <GraphControls
                  data={graph}
                  mode={mode}
                  onModeChange={setMode}
                  onSearchSelect={(id) => {
                    selectNode(id);
                    apiRef.current?.focusNode(id, 1.4);
                  }}
                  onFocus={() => selectedId && apiRef.current?.focusNode(selectedId, 1.4)}
                  onReset={() => apiRef.current?.resetCamera()}
                  onZoom={(f) => apiRef.current?.zoomBy(f)}
                  timeline={timeline}
                  onTimelineChange={setTimeline}
                />
              </div>

              <div className="pointer-events-auto w-full max-h-[45vh] self-end overflow-hidden lg:max-h-[80vh] lg:max-w-sm">
                <NodeInspector
                  data={graph}
                  node={selectedNode}
                  edge={selectedEdge}
                  onClose={() => {
                    setSelectedId(null);
                    setSelectedEdgeId(null);
                  }}
                  onSelectNode={selectNode}
                  onExpand={expandNode}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {phase !== "ready" && <Footer />}
    </div>
  );
}

function SummaryStrip({ result }: { result: AnalysisResult }) {
  const { summary, graph } = result;
  const count = (type: string) => graph.nodes.filter((n) => n.type === type).length;
  const items: { label: string; value: string }[] = [
    { label: "Files", value: String(summary.files) },
    { label: "Directories", value: String(summary.directories) },
    { label: "Symbols", value: String(summary.modules) },
    { label: "Dependencies", value: String(summary.dependencies) },
    { label: "APIs", value: String(count("api")) },
    { label: "Databases", value: String(count("database")) },
    { label: "External", value: String(count("external")) },
    { label: "Relations", value: String(graph.edges.length) },
    { label: "Size", value: `${(summary.bytes / 1_000_000).toFixed(2)} MB` },
  ];
  return (
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        {items.map((i) => (
          <div key={i.label} className="flex items-baseline gap-2">
            <span className="label-mono">{i.label}</span>
            <span className="font-mono text-xs text-foreground">{i.value}</span>
          </div>
        ))}
        {summary.languages.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="label-mono">Languages</span>
            <span className="font-mono text-xs text-foreground">
              {summary.languages.map((l) => l.name).join(" · ")}
            </span>
          </div>
        )}
        {summary.truncated && (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Truncated for size
          </span>
        )}
      </div>
    </div>
  );
}

const STEPS = [
  "Reading the codebase",
  "Indexing files and directories",
  "Extracting symbols",
  "Mapping dependencies",
  "Constructing the system graph",
];

function AnalyzingState() {
  return (
    <section className="mx-auto w-full max-w-md px-4 py-24 sm:px-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="font-display text-lg font-semibold tracking-tight">Analyzing system</p>
      </div>
      <ul className="mt-6 space-y-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            style={{ animation: `pulse 1.6s ease-in-out ${i * 0.18}s infinite` }}
          >
            <span className="h-1 w-1 rounded-full bg-primary" />
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}
