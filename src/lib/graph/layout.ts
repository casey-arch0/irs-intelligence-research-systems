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
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function buildSimulation(data: GraphData, previous?: Simulation): Simulation {
  const degree = new Map<string, number>();
  for (const e of data.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  const nodes: SimNode[] = data.nodes.map((n, i) => {
    const prev = previous?.byId.get(n.id);
    const seed = hash(n.id);
    const angle = seed * Math.PI * 2;
    const radius = 120 + (i % 17) * 34;
    const deg = degree.get(n.id) ?? 0;
    return {
      id: n.id,
      x: prev?.x ?? n.position?.x ?? Math.cos(angle) * radius,
      y: prev?.y ?? n.position?.y ?? Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      z: n.position?.z ?? (seed - 0.5) * 0.8,
      r: 5 + Math.min(14, Math.sqrt(deg) * 3) + (n.weight ?? 0) * 2,
      fixed: false,
      node: n,
      degree: deg,
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

  return { nodes, edges, byId, neighbors, incident, alpha: 1 };
}

const CELL = 90;

/** One physics step. Spatial hashing keeps repulsion near-linear for big graphs. */
export function stepSimulation(sim: Simulation, dt = 1) {
  const { nodes, edges } = sim;
  if (sim.alpha < 0.001) return;

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
          const f = repulsion / d2;
          const d = Math.sqrt(d2);
          n.vx += (ddx / d) * f * dt;
          n.vy += (ddy / d) * f * dt;
        }
      }
    }
    // gentle centering
    n.vx -= n.x * 0.0016;
    n.vy -= n.y * 0.0016;
  }

  for (const e of edges) {
    const { source: s, target: t } = e;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const rest = 70 + s.r + t.r;
    const f = (d - rest) * 0.012;
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

  const damping = 0.82;
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

  sim.alpha *= 0.994;
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
