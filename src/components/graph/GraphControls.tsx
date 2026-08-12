import { Search, Crosshair, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useMemo, useState } from "react";
import { GRAPH_MODES, type GraphData, type GraphMode } from "@/lib/graph/types";
import { cn } from "@/lib/utils";

interface GraphControlsProps {
  data: GraphData;
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
  onSearchSelect: (id: string) => void;
  onFocus: () => void;
  onReset: () => void;
  onZoom: (factor: number) => void;
  timeline: number;
  onTimelineChange: (value: number) => void;
}

export function GraphControls({
  data,
  mode,
  onModeChange,
  onSearchSelect,
  onFocus,
  onReset,
  onZoom,
  timeline,
  onTimelineChange,
}: GraphControlsProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return data.nodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.type.includes(q))
      .slice(0, 8);
  }, [query, data.nodes]);

  return (
    <div className="pointer-events-auto flex flex-col gap-3">
      <div className="panel p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes"
            aria-label="Search nodes"
            className="w-full bg-transparent py-1.5 pl-7 pr-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        {results.length > 0 && (
          <ul className="mt-1 max-h-52 overflow-auto border-t border-border pt-1">
            {results.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    onSearchSelect(n.id);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left font-mono text-[11px] text-foreground hover:bg-secondary"
                >
                  <span className="truncate">{n.label}</span>
                  <span className="shrink-0 text-muted-foreground">{n.type}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel p-2">
        <p className="label-mono px-1 pb-1.5">Mode</p>
        <div className="grid grid-cols-2 gap-1">
          {GRAPH_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              title={m.description}
              className={cn(
                "border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                mode === m.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === "timeline" && (
          <div className="mt-2 px-1">
            <label className="label-mono" htmlFor="timeline-scrub">
              Time {(timeline * 100).toFixed(0)}%
            </label>
            <input
              id="timeline-scrub"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={timeline}
              onChange={(e) => onTimelineChange(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--signal)]"
            />
          </div>
        )}
      </div>

      <div className="panel flex items-center gap-1 p-1">
        <ControlButton label="Zoom in" onClick={() => onZoom(1.25)}>
          <ZoomIn className="h-3.5 w-3.5" />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => onZoom(0.8)}>
          <ZoomOut className="h-3.5 w-3.5" />
        </ControlButton>
        <ControlButton label="Focus selection" onClick={onFocus}>
          <Crosshair className="h-3.5 w-3.5" />
        </ControlButton>
        <ControlButton label="Reset camera" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-primary"
    >
      {children}
    </button>
  );
}
