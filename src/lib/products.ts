/**
 * Product registry — data only. Adding an IRS product means adding an entry
 * here (and, when it exists, a route). No interface changes required.
 */

export type ProductStatus = "research" | "building" | "live";

export type ProductCategory =
  | "Observability"
  | "Analytics"
  | "Developer Tools"
  | "Infrastructure"
  | "Security"
  | "Collaboration"
  | "Reliability"
  | "Code Intelligence";

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  /** Internal route when the product is usable today. */
  href?: string;
  origin: string;
}

export const products: Product[] = [
  {
    id: "atlas",
    name: "ATLAS",
    tagline: "Codebase architecture, made visible.",
    description:
      "Takes the repository browser and turns it into a spatial architecture instrument: files, modules, symbols, dependencies and IO surfaces as one navigable system graph.",
    category: "Code Intelligence",
    status: "live",
    href: "/analyze",
    origin: "Source capability: repository file tree",
  },
  {
    id: "causal",
    name: "CAUSAL",
    tagline: "Error tracking as a causality engine.",
    description:
      "Instead of grouping stack traces, CAUSAL reconstructs the chain of events that produced a failure and lets you walk the causality graph backwards in time.",
    category: "Reliability",
    status: "building",
    origin: "Source capability: error tracking",
  },
  {
    id: "blast",
    name: "BLAST",
    tagline: "Impact analysis before you merge.",
    description:
      "Answers one question exhaustively: if this changes, what breaks? Static reachability, runtime call evidence and deployment topology in a single blast-radius view.",
    category: "Developer Tools",
    status: "building",
    origin: "Source capability: pull request diffs",
  },
  {
    id: "hookline",
    name: "HOOKLINE",
    tagline: "Webhooks as an observable protocol.",
    description:
      "Every delivery, retry, signature and downstream consequence rendered as a live topology instead of a log table.",
    category: "Observability",
    status: "research",
    origin: "Source capability: webhooks",
  },
  {
    id: "replay",
    name: "REPLAY-N",
    tagline: "Session replay for system state.",
    description:
      "Replays the state of a distributed system, not a browser tab: queue depth, request flow, deploy boundaries and error emergence over a scrubbable timeline.",
    category: "Observability",
    status: "research",
    origin: "Source capability: session replay",
  },
  {
    id: "surface",
    name: "SURFACE",
    tagline: "Your real attack surface, enumerated.",
    description:
      "Derives every externally reachable entry point from source, then models the trust boundaries each one crosses.",
    category: "Security",
    status: "research",
    origin: "Source capability: security scanning",
  },
  {
    id: "ledger",
    name: "LEDGER",
    tagline: "Infrastructure as a dependency organism.",
    description:
      "Treats cloud resources as a living dependency graph with drift, ownership and failure propagation modelled explicitly.",
    category: "Infrastructure",
    status: "research",
    origin: "Source capability: cloud console",
  },
  {
    id: "signal",
    name: "SIGNAL",
    tagline: "Analytics without the dashboard tax.",
    description:
      "Event analytics reframed around questions and relationships rather than pre-built charts nobody reads twice.",
    category: "Analytics",
    status: "research",
    origin: "Source capability: product analytics",
  },
  {
    id: "thread",
    name: "THREAD",
    tagline: "Issues as a dependency network.",
    description:
      "Work items connected by blocking, causal and structural relationships, so sequencing becomes visible instead of negotiated.",
    category: "Collaboration",
    status: "research",
    origin: "Source capability: issue tracker",
  },
];

export const STATUS_LABEL: Record<ProductStatus, string> = {
  research: "Research",
  building: "Building",
  live: "Live",
};

export const categories: ProductCategory[] = [
  "Code Intelligence",
  "Observability",
  "Reliability",
  "Developer Tools",
  "Infrastructure",
  "Security",
  "Analytics",
  "Collaboration",
];
