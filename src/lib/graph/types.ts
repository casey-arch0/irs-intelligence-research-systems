/**
 * IRS Graph — data model.
 * Deliberately generic: any IRS product can emit a GraphData payload and the
 * renderer knows nothing about codebases, observability or anything else.
 */

export type NodeType =
  | "repository"
  | "directory"
  | "file"
  | "function"
  | "class"
  | "module"
  | "api"
  | "service"
  | "database"
  | "deployment"
  | "commit"
  | "pull-request"
  | "issue"
  | "user"
  | "event"
  | "error"
  | "dependency"
  | "external";

export type EdgeType =
  | "depends-on"
  | "imports"
  | "calls"
  | "sends-to"
  | "receives-from"
  | "created-by"
  | "changed-by"
  | "causes"
  | "blocks"
  | "deploys"
  | "contains"
  | "related-to";

export type ElementStatus = "nominal" | "active" | "degraded" | "failed" | "inactive";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  position?: { x: number; y: number; z?: number };
  status?: ElementStatus;
  /** Optional grouping key used for clustering / level-of-detail. */
  cluster?: string;
  /** Relative weight, drives node radius. */
  weight?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  metadata?: Record<string, string | number | boolean | undefined>;
  status?: ElementStatus;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Free-form info about where this graph came from. */
  source?: { kind: string; label: string; generatedAt?: number };
}

export type GraphMode =
  | "architecture"
  | "dependency"
  | "causality"
  | "activity"
  | "timeline"
  | "impact";

export const GRAPH_MODES: { id: GraphMode; label: string; description: string }[] = [
  { id: "architecture", label: "Architecture", description: "Structure of the system as built." },
  { id: "dependency", label: "Dependency", description: "What depends on what." },
  { id: "causality", label: "Causality", description: "What caused what." },
  { id: "activity", label: "Activity", description: "Active or changing components." },
  { id: "timeline", label: "Timeline", description: "Graph state across time." },
  { id: "impact", label: "Impact", description: "Blast radius if a node changes or fails." },
];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  repository: "Repository",
  directory: "Directory",
  file: "File",
  function: "Function",
  class: "Class",
  module: "Module",
  api: "API",
  service: "Service",
  database: "Database",
  deployment: "Deployment",
  commit: "Commit",
  "pull-request": "Pull Request",
  issue: "Issue",
  user: "User",
  event: "Event",
  error: "Error",
  dependency: "Dependency",
  external: "External Service",
};

export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  "depends-on": "depends on",
  imports: "imports",
  calls: "calls",
  "sends-to": "sends to",
  "receives-from": "receives from",
  "created-by": "created by",
  "changed-by": "changed by",
  causes: "causes",
  blocks: "blocks",
  deploys: "deploys",
  contains: "contains",
  "related-to": "related to",
};

/** Palette is resolved at render time from CSS tokens; these are token names. */
export const NODE_TYPE_TOKEN: Record<NodeType, string> = {
  repository: "--graph-root",
  directory: "--graph-structure",
  file: "--graph-structure",
  module: "--graph-module",
  function: "--graph-logic",
  class: "--graph-logic",
  api: "--graph-edge-io",
  service: "--graph-service",
  database: "--graph-data",
  deployment: "--graph-service",
  commit: "--graph-time",
  "pull-request": "--graph-time",
  issue: "--graph-alert",
  user: "--graph-time",
  event: "--graph-edge-io",
  error: "--graph-alert",
  dependency: "--graph-dependency",
  external: "--graph-external",
};

export function edgeVisibleInMode(edge: GraphEdge, mode: GraphMode): boolean {
  switch (mode) {
    case "dependency":
      return ["depends-on", "imports", "calls"].includes(edge.type);
    case "causality":
      return ["causes", "blocks", "sends-to", "receives-from"].includes(edge.type);
    case "architecture":
      return true;
    case "activity":
      return edge.status === "active" || edge.type === "sends-to" || edge.type === "calls";
    case "timeline":
      return true;
    case "impact":
      return true;
    default:
      return true;
  }
}
