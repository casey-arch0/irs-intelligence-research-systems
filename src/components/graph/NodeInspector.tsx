import { X, Maximize2 } from "lucide-react";
import {
  EDGE_TYPE_LABEL,
  NODE_TYPE_LABEL,
  type GraphData,
  type GraphEdge,
  type GraphNode,
} from "@/lib/graph/types";

interface NodeInspectorProps {
  data: GraphData;
  node: GraphNode | null;
  edge: GraphEdge | null;
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onExpand: (id: string) => void;
}

export function NodeInspector({
  data,
  node,
  edge,
  onClose,
  onSelectNode,
  onExpand,
}: NodeInspectorProps) {
  if (!node && !edge) {
    return (
      <div className="panel p-4">
        <p className="label-mono">Inspector</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a node to trace its relationships. Double-click to expand a neighbourhood, click a
          connection to inspect the relationship.
        </p>
      </div>
    );
  }

  if (edge) {
    const source = data.nodes.find((n) => n.id === edge.source);
    const target = data.nodes.find((n) => n.id === edge.target);
    return (
      <div className="panel p-4">
        <Header title="Relationship" onClose={onClose} />
        <p className="mt-3 font-mono text-sm text-primary">{EDGE_TYPE_LABEL[edge.type]}</p>
        <div className="mt-3 space-y-2">
          <Relation label="Source" node={source} onSelect={onSelectNode} />
          <Relation label="Target" node={target} onSelect={onSelectNode} />
        </div>
      </div>
    );
  }

  const current = node!;
  const incident = data.edges.filter((e) => e.source === current.id || e.target === current.id);
  const outgoing = incident.filter((e) => e.source === current.id);
  const incoming = incident.filter((e) => e.target === current.id);

  return (
    <div className="panel flex max-h-full flex-col p-4">
      <Header title={NODE_TYPE_LABEL[current.type]} onClose={onClose} />
      <h3 className="mt-2 break-all font-mono text-sm text-foreground">{current.label}</h3>
      {current.status && (
        <p className="mt-1 label-mono">
          Status <span className="text-foreground">{current.status}</span>
        </p>
      )}

      {current.metadata && Object.keys(current.metadata).length > 0 && (
        <dl className="mt-3 space-y-1 border-t border-border pt-3">
          {Object.entries(current.metadata).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3 font-mono text-[11px]">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="truncate text-right text-foreground">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      <button
        onClick={() => onExpand(current.id)}
        className="mt-3 flex items-center justify-center gap-2 border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Maximize2 className="h-3 w-3" /> Expand neighbourhood
      </button>

      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        <EdgeList
          title={`Outgoing (${outgoing.length})`}
          edges={outgoing}
          data={data}
          direction="target"
          onSelect={onSelectNode}
        />
        <EdgeList
          title={`Incoming (${incoming.length})`}
          edges={incoming}
          data={data}
          direction="source"
          onSelect={onSelectNode}
        />
      </div>
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="label-mono">{title}</p>
      <button
        onClick={onClose}
        aria-label="Close inspector"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Relation({
  label,
  node,
  onSelect,
}: {
  label: string;
  node: GraphNode | undefined;
  onSelect: (id: string) => void;
}) {
  if (!node) return null;
  return (
    <button
      onClick={() => onSelect(node.id)}
      className="flex w-full items-center justify-between gap-3 border border-border px-2 py-1.5 text-left hover:border-primary/50"
    >
      <span className="label-mono">{label}</span>
      <span className="truncate font-mono text-[11px] text-foreground">{node.label}</span>
    </button>
  );
}

function EdgeList({
  title,
  edges,
  data,
  direction,
  onSelect,
}: {
  title: string;
  edges: GraphEdge[];
  data: GraphData;
  direction: "source" | "target";
  onSelect: (id: string) => void;
}) {
  if (edges.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="label-mono mb-1">{title}</p>
      <ul className="space-y-0.5">
        {edges.slice(0, 40).map((e) => {
          const otherId = direction === "target" ? e.target : e.source;
          const other = data.nodes.find((n) => n.id === otherId);
          if (!other) return null;
          return (
            <li key={e.id}>
              <button
                onClick={() => onSelect(other.id)}
                className="flex w-full items-baseline justify-between gap-2 py-0.5 text-left font-mono text-[11px] hover:text-primary"
              >
                <span className="shrink-0 text-muted-foreground">{EDGE_TYPE_LABEL[e.type]}</span>
                <span className="truncate text-foreground">{other.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
