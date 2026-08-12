import type { GraphData } from "./types";

/**
 * Reference dataset used before a real codebase is ingested. It models a
 * plausible distributed system so every graph mode has something to say.
 */
export const referenceGraph: GraphData = (() => {
  const nodes: GraphData["nodes"] = [
    { id: "repo", type: "repository", label: "atlas-platform", weight: 4 },
    { id: "dir-api", type: "directory", label: "services/api", weight: 2 },
    { id: "dir-worker", type: "directory", label: "services/worker", weight: 2 },
    { id: "dir-web", type: "directory", label: "apps/web", weight: 2 },
    { id: "dir-core", type: "directory", label: "packages/core", weight: 2 },

    { id: "api-gateway", type: "api", label: "POST /v1/ingest", status: "active" },
    { id: "api-query", type: "api", label: "GET /v1/traces", status: "active" },
    { id: "svc-ingest", type: "service", label: "ingest-service", status: "active" },
    { id: "svc-index", type: "service", label: "index-service", status: "degraded" },
    { id: "svc-notify", type: "service", label: "notify-service", status: "nominal" },

    { id: "mod-schema", type: "module", label: "core/schema" },
    { id: "mod-transport", type: "module", label: "core/transport" },
    { id: "mod-auth", type: "module", label: "core/auth" },

    { id: "fn-parse", type: "function", label: "parseEnvelope()" },
    { id: "fn-batch", type: "function", label: "flushBatch()" },
    { id: "fn-index", type: "function", label: "writeSegment()" },
    { id: "cls-writer", type: "class", label: "SegmentWriter" },

    { id: "db-primary", type: "database", label: "postgres/primary" },
    { id: "db-segments", type: "database", label: "clickhouse/segments", status: "degraded" },
    { id: "ext-object", type: "external", label: "object-storage" },
    { id: "ext-mail", type: "external", label: "mail-provider" },

    { id: "dep-zod", type: "dependency", label: "zod@3" },
    { id: "dep-fflate", type: "dependency", label: "fflate@0.8" },

    { id: "deploy-prod", type: "deployment", label: "prod-eu-west", status: "active" },
    { id: "err-timeout", type: "error", label: "SegmentWriteTimeout", status: "failed" },
    { id: "evt-spike", type: "event", label: "ingest volume spike", status: "active" },
    { id: "issue-114", type: "issue", label: "#114 index lag" },
    { id: "pr-221", type: "pull-request", label: "#221 batch flush tuning" },
    { id: "user-rk", type: "user", label: "r.kessler" },
  ];

  type E = GraphData["edges"][number];
  const edges: [string, string, E["type"]][] = [
    ["repo", "dir-api", "contains"],
    ["repo", "dir-worker", "contains"],
    ["repo", "dir-web", "contains"],
    ["repo", "dir-core", "contains"],
    ["dir-api", "api-gateway", "contains"],
    ["dir-api", "api-query", "contains"],
    ["dir-worker", "svc-ingest", "contains"],
    ["dir-worker", "svc-index", "contains"],
    ["dir-worker", "svc-notify", "contains"],
    ["dir-core", "mod-schema", "contains"],
    ["dir-core", "mod-transport", "contains"],
    ["dir-core", "mod-auth", "contains"],
    ["mod-schema", "fn-parse", "contains"],
    ["svc-ingest", "fn-batch", "contains"],
    ["svc-index", "cls-writer", "contains"],
    ["cls-writer", "fn-index", "contains"],

    ["api-gateway", "svc-ingest", "sends-to"],
    ["api-query", "svc-index", "sends-to"],
    ["svc-ingest", "svc-index", "sends-to"],
    ["svc-index", "db-segments", "depends-on"],
    ["svc-ingest", "db-primary", "depends-on"],
    ["svc-notify", "ext-mail", "sends-to"],
    ["svc-index", "ext-object", "sends-to"],

    ["svc-ingest", "mod-schema", "imports"],
    ["svc-index", "mod-transport", "imports"],
    ["api-gateway", "mod-auth", "imports"],
    ["mod-schema", "dep-zod", "depends-on"],
    ["dir-web", "dep-fflate", "depends-on"],
    ["fn-batch", "fn-parse", "calls"],
    ["fn-index", "cls-writer", "calls"],

    ["deploy-prod", "svc-index", "deploys"],
    ["deploy-prod", "svc-ingest", "deploys"],
    ["evt-spike", "err-timeout", "causes"],
    ["err-timeout", "svc-index", "causes"],
    ["err-timeout", "issue-114", "related-to"],
    ["issue-114", "pr-221", "blocks"],
    ["pr-221", "user-rk", "created-by"],
    ["pr-221", "fn-batch", "changed-by"],
    ["db-segments", "err-timeout", "related-to"],
  ];

  return {
    nodes,
    edges: edges.map(([source, target, type], i) => ({
      id: `e${i}`,
      source,
      target,
      type,
    })),
    source: { kind: "reference", label: "atlas-platform (reference system)" },
  };
})();
