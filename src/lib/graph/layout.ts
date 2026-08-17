import type { GraphData, GraphEdge, GraphNode } from "./types";

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** depth used for the 2.5D parallax layer */
  z: number;
  r: number;
  fixed: boolean;
  node: GraphNode;
  degree: number;
  /** Spatial grouping key — related nodes settle together. */
  cluster: string;
  /** 0 = primary structure … 3 = deep detail. Drives size and layout radius. */
  tier: number;
}

export interface LayoutOptions {
  clusterOf?: Map<string, string>;
  tierOf?: Map<string, number>;
}

export interface SimEdge {
  id: string;
  source: SimNode;
  target: SimNode;
  edge: GraphEdge;
}

export interface Simulation {
  nodes: SimNode[];
  edges: SimEdge[];
  byId: Map<string, SimNode>;
  neighbors: Map<string, Set<string>>;
  incident: Map<string, SimEdge[]>;
  alpha: number;
  /** Stable per-cluster anchor points used by the clustering force. */
  anchors: Map<string, { x: number; y: number }>;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function buildSimulation(
  data: GraphData,
  previous?: Simulation,
  options: LayoutOptions = {},
): Simulation {
  const degree = new Map<string, number>();
  for (const e of data.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  // Stable ring of cluster anchors: related nodes settle in their own region.
  const clusterKeys = [
    ...new Set(data.nodes.map((n) => options.clusterOf?.get(n.id) ?? "root")),
  ].sort();
  const anchors = new Map<string, { x: number; y: number }>();
  const ring = 300 + clusterKeys.length * 44;
  clusterKeys.forEach((key, i) => {
    if (key === "root") {
      anchors.set(key, { x: 0, y: 0 });
      return;
    }
    const a = (i / Math.max(1, clusterKeys.length)) * Math.PI * 2;
    anchors.set(key, { x: Math.cos(a) * ring, y: Math.sin(a) * ring });
  });

  const nodes: SimNode[] = data.nodes.map((n) => {
    const prev = previous?.byId.get(n.id);
    const seed = hash(n.id);
    const angle = seed * Math.PI * 2;
    const deg = degree.get(n.id) ?? 0;
    const cluster = options.clusterOf?.get(n.id) ?? "root";
    const tier = options.tierOf?.get(n.id) ?? 1;
    const anchor = anchors.get(cluster) ?? { x: 0, y: 0 };
    const spread = 60 + tier * 55;
    return {
      id: n.id,
      x: prev?.x ?? n.position?.x ?? anchor.x + Math.cos(angle) * spread,
      y: prev?.y ?? n.position?.y ?? anchor.y + Math.sin(angle) * spread,
      vx: 0,
      vy: 0,
      z: n.position?.z ?? (0.6 - tier * 0.28) * 0.7,
      r: (5 + Math.min(12, Math.sqrt(deg) * 2.6) + (n.weight ?? 0) * 2) * (tier === 0 ? 1.35 : tier === 1 ? 1.05 : 0.8),
      fixed: false,
      node: n,
      degree: deg,
      cluster,
      tier,
    };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges: SimEdge[] = [];
  const neighbors = new Map<string, Set<string>>();
  const incident = new Map<string, SimEdge[]>();

  for (const e of data.edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) continue;
    const se: SimEdge = { id: e.id, source: s, target: t, edge: e };
    edges.push(se);
    if (!neighbors.has(s.id)) neighbors.set(s.id, new Set());
    if (!neighbors.has(t.id)) neighbors.set(t.id, new Set());
    neighbors.get(s.id)!.add(t.id);
    neighbors.get(t.id)!.add(s.id);
    if (!incident.has(s.id)) incident.set(s.id, []);
    if (!incident.has(t.id)) incident.set(t.id, []);
    incident.get(s.id)!.push(se);
    incident.get(t.id)!.push(se);
  }

  return { nodes, edges, byId, neighbors, incident, alpha: 1, anchors };
}

const CELL = 110;

/** Below this the layout is considered settled and stops moving entirely. */
export const ALPHA_MIN = 0.012;

export function isSettled(sim: Simulation) {
  return sim.alpha < ALPHA_MIN;
}

/** One physics step. Spatial hashing keeps repulsion near-linear for big graphs. */
export function stepSimulation(sim: Simulation, dt = 1) {
  const { nodes, edges } = sim;
  if (sim.alpha < ALPHA_MIN) return;

  // Cluster centroids — recomputed each step, cheap and keeps groups cohesive.
  const centroids = new Map<string, { x: number; y: number; n: number }>();
  for (const n of nodes) {
    const c = centroids.get(n.cluster);
    if (c) {
      c.x += n.x;
      c.y += n.y;
      c.n++;
    } else centroids.set(n.cluster, { x: n.x, y: n.y, n: 1 });
  }
  for (const c of centroids.values()) {
    c.x /= c.n;
    c.y /= c.n;
  }

  const grid = new Map<string, SimNode[]>();
  for (const n of nodes) {
    const key = `${Math.round(n.x / CELL)}:${Math.round(n.y / CELL)}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(n);
    else grid.set(key, [n]);
  }

  const repulsion = 2600;
  for (const n of nodes) {
    const cx = Math.round(n.x / CELL);
    const cy = Math.round(n.y / CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get(`${cx + dx}:${cy + dy}`);
        if (!bucket) continue;
        for (const m of bucket) {
          if (m === n) continue;
          let ddx = n.x - m.x;
          let ddy = n.y - m.y;
          let d2 = ddx * ddx + ddy * ddy;
          if (d2 === 0) {
            ddx = (Math.random() - 0.5) * 0.5;
            ddy = (Math.random() - 0.5) * 0.5;
            d2 = 0.25;
          }
          if (d2 > CELL * CELL * 4) continue;
          const d = Math.sqrt(d2);
          // Radius-aware repulsion → real collision avoidance, plus extra
          // separation between unrelated clusters.
          const pad = n.r + m.r + 14;
          const strength = n.cluster === m.cluster ? repulsion : repulsion * 1.9;
          let f = strength / d2;
          if (d < pad) f += (pad - d) * 0.9;
          n.vx += (ddx / d) * f * dt;
          n.vy += (ddy / d) * f * dt;
        }
      }
    }

    // Cluster cohesion toward the group's own anchor + live centroid.
    const anchor = sim.anchors.get(n.cluster);
    const centroid = centroids.get(n.cluster);
    if (anchor) {
      n.vx += (anchor.x - n.x) * 0.0045;
      n.vy += (anchor.y - n.y) * 0.0045;
    }
    if (centroid) {
      n.vx += (centroid.x - n.x) * 0.006;
      n.vy += (centroid.y - n.y) * 0.006;
    }
    // Hierarchy: primary nodes hold the centre, detail drifts outward.
    const pull = n.tier === 0 ? 0.006 : n.tier === 1 ? 0.0022 : 0.0006;
    n.vx -= n.x * pull;
    n.vy -= n.y * pull;
  }

  for (const e of edges) {
    const { source: s, target: t } = e;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    // Containment binds tightly; loose relations stay long and quiet.
    const kind = e.edge.type;
    const base = kind === "contains" ? 58 : kind === "related-to" ? 130 : 96;
    const rest = base + s.r + t.r;
    const stiffness = kind === "contains" ? 0.02 : 0.009;
    const f = (d - rest) * stiffness;
    const fx = (dx / d) * f;
    const fy = (dy / d) * f;
    if (!s.fixed) {
      s.vx += fx;
      s.vy += fy;
    }
    if (!t.fixed) {
      t.vx -= fx;
      t.vy -= fy;
    }
  }

  const damping = 0.78;
  for (const n of nodes) {
    if (n.fixed) {
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx *= damping;
    n.vy *= damping;
    const speed = Math.hypot(n.vx, n.vy);
    const max = 22;
    if (speed > max) {
      n.vx = (n.vx / speed) * max;
      n.vy = (n.vy / speed) * max;
    }
    n.x += n.vx * sim.alpha * dt;
    n.y += n.vy * sim.alpha * dt;
  }

  sim.alpha *= 0.986;
  if (sim.alpha < ALPHA_MIN) sim.alpha = 0;
}

/** Bounding box of the settled layout — used for automatic camera framing. */
export function layoutBounds(sim: Simulation) {
  if (sim.nodes.length === 0) return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of sim.nodes) {
    minX = Math.min(minX, n.x - n.r);
    minY = Math.min(minY, n.y - n.r);
    maxX = Math.max(maxX, n.x + n.r);
    maxY = Math.max(maxY, n.y + n.r);
  }
  return { minX, minY, maxX, maxY };
}

/** Cluster hulls (centroid + radius) for the subtle containment halos. */
export function clusterRegions(sim: Simulation) {
  const groups = new Map<string, { x: number; y: number; r: number; count: number; tier: number }>();
  const acc = new Map<string, { x: number; y: number; n: number; tier: number }>();
  for (const n of sim.nodes) {
    const a = acc.get(n.cluster);
    if (a) {
      a.x += n.x;
      a.y += n.y;
      a.n++;
      a.tier = Math.min(a.tier, n.tier);
    } else acc.set(n.cluster, { x: n.x, y: n.y, n: 1, tier: n.tier });
  }
  for (const [key, a] of acc) {
    const cx = a.x / a.n;
    const cy = a.y / a.n;
    let r = 0;
    for (const n of sim.nodes) {
      if (n.cluster !== key) continue;
      r = Math.max(r, Math.hypot(n.x - cx, n.y - cy) + n.r);
    }
    groups.set(key, { x: cx, y: cy, r: r + 26, count: a.n, tier: a.tier });
  }
  return groups;
}

export function reheat(sim: Simulation, amount = 0.6) {
  sim.alpha = Math.max(sim.alpha, amount);
}

/** Nodes within `depth` hops of `id`. */
export function neighborhood(sim: Simulation, id: string, depth = 1): Set<string> {
  const seen = new Set<string>([id]);
  let frontier = [id];
  for (let i = 0; i < depth; i++) {
    const next: string[] = [];
    for (const cur of frontier) {
      for (const nb of sim.neighbors.get(cur) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

/** Downstream reachability — used by Impact mode. */
export function downstream(sim: Simulation, id: string, limit = 400): Set<string> {
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length && seen.size < limit) {
    const cur = queue.shift()!;
    for (const e of sim.incident.get(cur) ?? []) {
      if (e.source.id === cur && !seen.has(e.target.id)) {
        seen.add(e.target.id);
        queue.push(e.target.id);
      }
    }
  }
  return seen;
}
