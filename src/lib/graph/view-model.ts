/**
 * Presentation-layer view model.
 *
 * The GraphData model and the analyzer are untouched: this module only decides
 * *how much* of a graph to show and with what visual weight, so that the
 * renderer can express FOCUS > CONTEXT > BACKGROUND instead of drawing every
 * relationship at equal strength.
 */
import type { GraphData, GraphMode, GraphNode, NodeType } from "./types";

/** 0 = primary structure, 1 = context, 2 = detail, 3 = deep detail. */
export type Tier = 0 | 1 | 2 | 3;

export interface GraphView {
  /** Filtered graph handed to the simulation / renderer. */
  data: GraphData;
  tier: Map<string, Tier>;
  cluster: Map<string, string>;
  /** Collapsed children per visible node — drives the "more inside" affordance. */
  hiddenChildren: Map<string, number>;
  degree: Map<string, number>;
  totalNodes: number;
  totalEdges: number;
}

const STRUCTURAL: NodeType[] = ["repository", "service", "database", "api", "external"];

const CLUSTER_BY_TYPE: Partial<Record<NodeType, string>> = {
  dependency: "dependencies",
  external: "external",
  database: "data",
  api: "interface",
  service: "services",
  error: "signals",
  issue: "signals",
  event: "signals",
  commit: "history",
  "pull-request": "history",
  user: "history",
};

/** Soft ceiling on nodes drawn at once; keeps large repositories legible. */
const BASE_BUDGET = 220;

export function buildGraphView(
  data: GraphData,
  options: {
    mode: GraphMode;
    expanded: Set<string>;
    focusId?: string | null;
  },
): GraphView {
  const { mode, expanded, focusId } = options;
  const byId = new Map(data.nodes.map((n) => [n.id, n]));

  const degree = new Map<string, number>();
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  const adjacency = new Map<string, Set<string>>();

  for (const e of data.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
    if (!adjacency.has(e.source)) adjacency.set(e.source, new Set());
    if (!adjacency.has(e.target)) adjacency.set(e.target, new Set());
    adjacency.get(e.source)!.add(e.target);
    adjacency.get(e.target)!.add(e.source);
    if (e.type === "contains" && !parentOf.has(e.target)) {
      parentOf.set(e.target, e.source);
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
      childrenOf.get(e.source)!.push(e.target);
    }
  }

  // Structural depth from the roots (repository / top-level).
  const depth = new Map<string, number>();
  const roots = data.nodes.filter((n) => !parentOf.has(n.id)).map((n) => n.id);
  const queue = [...roots];
  for (const r of roots) depth.set(r, 0);
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur) ?? 0;
    for (const child of childrenOf.get(cur) ?? []) {
      if (depth.has(child)) continue;
      depth.set(child, d + 1);
      queue.push(child);
    }
  }

  // Clusters: structural nodes group by their top-level ancestor, everything
  // else groups by kind. Gives the layout real spatial separation.
  const cluster = new Map<string, string>();
  const clusterFor = (id: string): string => {
    const cached = cluster.get(id);
    if (cached) return cached;
    const node = byId.get(id)!;
    const byType = CLUSTER_BY_TYPE[node.type];
    if (byType) {
      cluster.set(id, byType);
      return byType;
    }
    if (node.type === "repository") {
      cluster.set(id, "root");
      return "root";
    }
    const parent = parentOf.get(id);
    if (!parent) {
      cluster.set(id, "root");
      return "root";
    }
    const parentNode = byId.get(parent);
    const key =
      parentNode && parentNode.type === "repository" ? `group:${node.label}` : clusterFor(parent);
    cluster.set(id, key);
    return key;
  };
  for (const n of data.nodes) clusterFor(n.id);

  // Tiering.
  const topDependencies = new Set(
    data.nodes
      .filter((n) => n.type === "dependency")
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
      .slice(0, 12)
      .map((n) => n.id),
  );

  const tier = new Map<string, Tier>();
  for (const n of data.nodes) {
    tier.set(n.id, tierFor(n, depth.get(n.id) ?? 2, degree.get(n.id) ?? 0, topDependencies));
  }

  // Progressive disclosure: baseline is tier 0/1, expansion reveals the rest.
  const visible = new Set<string>();
  const reveal = (id: string) => {
    if (!byId.has(id)) return;
    visible.add(id);
    // Keep ancestors so the hierarchy never floats detached.
    let p = parentOf.get(id);
    let guard = 0;
    while (p && guard++ < 12) {
      visible.add(p);
      p = parentOf.get(p);
    }
  };

  const baseline = data.nodes
    .filter((n) => (tier.get(n.id) ?? 3) <= 1 && modeAllows(n, mode, degree.get(n.id) ?? 0))
    .sort(
      (a, b) =>
        (tier.get(a.id)! - tier.get(b.id)!) ||
        (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
    );

  const budget = Math.max(BASE_BUDGET, Math.min(420, Math.round(data.nodes.length * 0.25)));
  for (const n of baseline.slice(0, budget)) reveal(n.id);

  for (const id of expanded) {
    if (!byId.has(id)) continue;
    reveal(id);
    for (const child of childrenOf.get(id) ?? []) reveal(child);
    for (const nb of adjacency.get(id) ?? []) reveal(nb);
  }

  if (focusId && byId.has(focusId)) {
    reveal(focusId);
    for (const nb of adjacency.get(focusId) ?? []) reveal(nb);
  }

  const nodes = data.nodes.filter((n) => visible.has(n.id));
  const edges = data.edges.filter((e) => visible.has(e.source) && visible.has(e.target));

  const hiddenChildren = new Map<string, number>();
  for (const id of visible) {
    const kids = childrenOf.get(id);
    if (!kids) continue;
    const hidden = kids.filter((k) => !visible.has(k)).length;
    if (hidden > 0) hiddenChildren.set(id, hidden);
  }

  return {
    data: { nodes, edges, source: data.source },
    tier,
    cluster,
    hiddenChildren,
    degree,
    totalNodes: data.nodes.length,
    totalEdges: data.edges.length,
  };
}

function tierFor(
  node: GraphNode,
  depth: number,
  degree: number,
  topDependencies: Set<string>,
): Tier {
  if (node.type === "repository") return 0;
  if (STRUCTURAL.includes(node.type) && node.type !== "external") return depth <= 2 ? 0 : 1;
  if (node.type === "directory" || node.type === "module") return depth <= 2 ? 0 : 1;
  if (node.type === "external") return 1;
  if (node.type === "dependency") return topDependencies.has(node.id) ? 1 : 3;
  if (node.type === "file") return degree > 6 ? 1 : 2;
  if (node.type === "function" || node.type === "class") return 3;
  if (node.status === "failed" || node.status === "degraded") return 1;
  return 2;
}

function modeAllows(node: GraphNode, mode: GraphMode, degree: number): boolean {
  switch (mode) {
    case "architecture":
      return node.type !== "dependency" || degree > 2;
    case "dependency":
      return true;
    case "causality":
      return node.type !== "function" && node.type !== "class";
    case "activity":
      return (
        node.status === "active" ||
        node.status === "degraded" ||
        node.status === "failed" ||
        node.type === "repository" ||
        node.type === "directory" ||
        node.type === "service" ||
        node.type === "api"
      );
    default:
      return true;
  }
}

/** Visual weight multiplier used by the renderer. */
export const TIER_SCALE: Record<Tier, number> = { 0: 1.5, 1: 1.1, 2: 0.8, 3: 0.62 };
