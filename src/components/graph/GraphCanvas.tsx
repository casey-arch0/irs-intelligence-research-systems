import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSimulation,
  downstream,
  neighborhood,
  reheat,
  stepSimulation,
  type SimEdge,
  type SimNode,
  type Simulation,
} from "@/lib/graph/layout";
import {
  edgeVisibleInMode,
  NODE_TYPE_TOKEN,
  type GraphData,
  type GraphMode,
} from "@/lib/graph/types";

export interface GraphViewApi {
  focusNode: (id: string, zoom?: number) => void;
  resetCamera: () => void;
  zoomBy: (factor: number) => void;
}

interface GraphCanvasProps {
  data: GraphData;
  mode: GraphMode;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  selectedEdgeId?: string | null;
  expanded: Set<string>;
  onExpand: (id: string) => void;
  /** 0..1 progress for timeline mode */
  timeline?: number;
  onReady?: (api: GraphViewApi) => void;
  className?: string;
}

function cssVar(el: HTMLElement, name: string, fallback = "#8ab") {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

export function GraphCanvas({
  data,
  mode,
  selectedId,
  onSelectNode,
  onSelectEdge,
  selectedEdgeId,
  expanded,
  onExpand,
  timeline = 1,
  onReady,
  className,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation | null>(null);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 0.85, targetZoom: 0.85, tx: 0, ty: 0 });
  const hoverRef = useRef<string | null>(null);
  const dragRef = useRef<{ node: SimNode | null; panning: boolean; lastX: number; lastY: number }>({
    node: null,
    panning: false,
    lastX: 0,
    lastY: 0,
  });
  const stateRef = useRef({ mode, selectedId, selectedEdgeId, expanded, timeline });
  stateRef.current = { mode, selectedId, selectedEdgeId, expanded, timeline };
  const [hoverLabel, setHoverLabel] = useState<{ x: number; y: number; text: string } | null>(null);

  const sim = useMemo(() => buildSimulation(data, simRef.current ?? undefined), [data]);
  simRef.current = sim;
  useEffect(() => {
    reheat(sim, 1);
  }, [sim]);

  const toWorld = useCallback((px: number, py: number) => {
    const cam = cameraRef.current;
    const el = containerRef.current!;
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      x: (px - w / 2) / cam.zoom + cam.x,
      y: (py - h / 2) / cam.zoom + cam.y,
    };
  }, []);

  const pickNode = useCallback(
    (px: number, py: number): SimNode | null => {
      const world = toWorld(px, py);
      const s = simRef.current;
      if (!s) return null;
      let best: SimNode | null = null;
      let bestDist = Infinity;
      for (const n of s.nodes) {
        const d = Math.hypot(n.x - world.x, n.y - world.y);
        const hit = n.r + 8 / cameraRef.current.zoom;
        if (d < hit && d < bestDist) {
          best = n;
          bestDist = d;
        }
      }
      return best;
    },
    [toWorld],
  );

  const pickEdge = useCallback(
    (px: number, py: number): SimEdge | null => {
      const world = toWorld(px, py);
      const s = simRef.current;
      if (!s) return null;
      const tol = 6 / cameraRef.current.zoom;
      for (const e of s.edges) {
        if (!edgeVisibleInMode(e.edge, stateRef.current.mode)) continue;
        const { source: a, target: b } = e;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((world.x - a.x) * dx + (world.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const cx = a.x + dx * t;
        const cy = a.y + dy * t;
        if (Math.hypot(world.x - cx, world.y - cy) < tol) return e;
      }
      return null;
    },
    [toWorld],
  );

  const focusNode = useCallback((id: string, zoom = 1.5) => {
    const n = simRef.current?.byId.get(id);
    if (!n) return;
    const cam = cameraRef.current;
    cam.tx = n.x;
    cam.ty = n.y;
    cam.targetZoom = zoom;
  }, []);

  const resetCamera = useCallback(() => {
    const cam = cameraRef.current;
    cam.tx = 0;
    cam.ty = 0;
    cam.targetZoom = 0.85;
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const cam = cameraRef.current;
    cam.targetZoom = Math.max(0.15, Math.min(4, cam.targetZoom * factor));
  }, []);

  useEffect(() => {
    onReady?.({ focusNode, resetCamera, zoomBy });
  }, [onReady, focusNode, resetCamera, zoomBy]);

  useEffect(() => {
    if (selectedId) focusNode(selectedId, Math.max(cameraRef.current.targetZoom, 1.2));
  }, [selectedId, focusNode]);

  // Native, non-passive wheel handling: zoom anchored at the cursor.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = Math.max(0.15, Math.min(4, cam.zoom * Math.exp(-dy * 0.0018)));
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const before = {
        x: (px - rect.width / 2) / cam.zoom + cam.x,
        y: (py - rect.height / 2) / cam.zoom + cam.y,
      };
      cam.zoom = next;
      cam.targetZoom = next;
      cam.x = before.x - (px - rect.width / 2) / next;
      cam.y = before.y - (py - rect.height / 2) / next;
      cam.tx = cam.x;
      cam.ty = cam.y;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Render + physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const palette = new Map<string, string>();
    const colorFor = (token: string) => {
      let c = palette.get(token);
      if (!c) {
        c = cssVar(container, token);
        palette.set(token, c);
      }
      return c;
    };

    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const s = simRef.current;
      if (!s) return;
      const { mode: m, selectedId: sel, selectedEdgeId: selEdge, timeline: tl } = stateRef.current;
      t += 1;

      stepSimulation(s);

      const cam = cameraRef.current;
      cam.x += (cam.tx - cam.x) * 0.12;
      cam.y += (cam.ty - cam.y) * 0.12;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;

      const w = container.clientWidth;
      const h = container.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // relationship focus sets
      const hover = hoverRef.current;
      const focusId = sel ?? hover;
      let focusSet: Set<string> | null = null;
      if (focusId) {
        focusSet =
          m === "impact" && sel
            ? downstream(s, sel)
            : neighborhood(s, focusId, sel && expandedHas(stateRef.current.expanded, focusId) ? 2 : 1);
      }

      const project = (n: SimNode) => {
        const depth = 1 + n.z * 0.16;
        return {
          x: (n.x - cam.x) * cam.zoom * depth + w / 2,
          y: (n.y - cam.y) * cam.zoom * depth + h / 2,
          scale: cam.zoom * depth,
        };
      };

      const cutoff = tl < 1 ? tl : 1;
      const nodeVisible = (n: SimNode) => {
        if (m === "timeline") {
          const order = n.node.metadata?.["order"];
          const rank = typeof order === "number" ? order : hashRank(n.id);
          return rank <= cutoff;
        }
        if (m === "activity") {
          return n.node.status === "active" || n.node.status === "degraded" || n.node.status === "failed"
            ? true
            : (s.neighbors.get(n.id)?.size ?? 0) > 0;
        }
        return true;
      };

      // edges
      ctx.lineCap = "round";
      for (const e of s.edges) {
        if (!edgeVisibleInMode(e.edge, m)) continue;
        if (!nodeVisible(e.source) || !nodeVisible(e.target)) continue;
        const a = project(e.source);
        const b = project(e.target);
        if (offscreen(a, b, w, h)) continue;

        const related =
          !focusSet || (focusSet.has(e.source.id) && focusSet.has(e.target.id));
        const isSelected = selEdge === e.id;
        const token =
          e.edge.type === "causes" || e.edge.type === "blocks"
            ? "--graph-alert"
            : e.edge.type === "sends-to" || e.edge.type === "receives-from"
              ? "--graph-edge-io"
              : e.edge.type === "contains"
                ? "--graph-structure"
                : "--graph-service";
        const color = colorFor(token);

        ctx.globalAlpha = isSelected ? 0.95 : related ? 0.42 : 0.07;
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 2.2 : related ? 1.1 : 0.7;
        if (e.edge.type === "depends-on" || e.edge.type === "imports") ctx.setLineDash([]);
        else if (e.edge.type === "related-to") ctx.setLineDash([3, 5]);
        else ctx.setLineDash([]);

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.06;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // animated flow pulse on active relationships
        if (related && (isSelected || e.edge.type === "sends-to" || e.edge.type === "calls")) {
          const p = ((t * 0.006 + hashRank(e.id)) % 1);
          const q = quadPoint(a, { x: mx, y: my }, b, p);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // nodes
      const zoom = cam.zoom;
      const showLabels = zoom > 0.55;
      for (const n of s.nodes) {
        if (!nodeVisible(n)) continue;
        const p = project(n);
        if (p.x < -80 || p.y < -80 || p.x > w + 80 || p.y > h + 80) continue;
        const inFocus = !focusSet || focusSet.has(n.id);
        const isSel = sel === n.id;
        const isHover = hover === n.id;
        const token = NODE_TYPE_TOKEN[n.node.type] ?? "--graph-structure";
        const color =
          n.node.status === "failed"
            ? colorFor("--graph-alert")
            : n.node.status === "degraded"
              ? colorFor("--graph-data")
              : colorFor(token);
        const r = Math.max(1.6, n.r * p.scale * 0.55);

        ctx.globalAlpha = inFocus ? 1 : 0.12;

        if (isSel || isHover || n.node.status === "failed") {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
          glow.addColorStop(0, color);
          glow.addColorStop(1, "transparent");
          ctx.globalAlpha = (inFocus ? 0.28 : 0.05) * (isSel ? 1.3 : 1);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = inFocus ? 1 : 0.12;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.lineWidth = isSel ? 2 : 1;
        ctx.strokeStyle = isSel ? colorFor("--signal") : "rgba(0,0,0,0.55)";
        ctx.stroke();

        if (isSel) {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = colorFor("--signal");
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 7 + Math.sin(t * 0.06) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (showLabels && (inFocus || isHover) && (r > 3.4 || isSel || isHover)) {
          ctx.globalAlpha = isSel || isHover ? 0.95 : 0.6;
          ctx.fillStyle = cssVarCached(container, palette, "--foreground");
          ctx.font = `${Math.max(9, Math.min(13, 11 * Math.sqrt(zoom)))}px "IBM Plex Mono", monospace`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(truncate(n.node.label, 26), p.x + r + 6, p.y);
        }
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const node = pickNode(px, py);
    (e.target as Element).setPointerCapture(e.pointerId);
    if (node) {
      node.fixed = true;
      dragRef.current = { node, panning: false, lastX: px, lastY: py };
    } else {
      dragRef.current = { node: null, panning: true, lastX: px, lastY: py };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const drag = dragRef.current;
    const cam = cameraRef.current;

    if (drag.node) {
      const world = toWorld(px, py);
      drag.node.x = world.x;
      drag.node.y = world.y;
      if (simRef.current) reheat(simRef.current, 0.35);
      return;
    }
    if (drag.panning) {
      cam.x -= (px - drag.lastX) / cam.zoom;
      cam.y -= (py - drag.lastY) / cam.zoom;
      cam.tx = cam.x;
      cam.ty = cam.y;
      drag.lastX = px;
      drag.lastY = py;
      return;
    }

    const node = pickNode(px, py);
    hoverRef.current = node?.id ?? null;
    setHoverLabel(node ? { x: px, y: py, text: node.node.label } : null);
    containerRef.current!.style.cursor = node ? "pointer" : "grab";
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.node) {
      drag.node.fixed = false;
      const rect = containerRef.current!.getBoundingClientRect();
      const moved = Math.hypot(e.clientX - rect.left - drag.lastX, e.clientY - rect.top - drag.lastY);
      if (moved < 4) {
        onSelectNode(drag.node.id);
        onSelectEdge(null);
      }
    } else if (drag.panning) {
      const rect = containerRef.current!.getBoundingClientRect();
      const moved = Math.hypot(e.clientX - rect.left - drag.lastX, e.clientY - rect.top - drag.lastY);
      if (moved < 4) {
        const edge = pickEdge(e.clientX - rect.left, e.clientY - rect.top);
        if (edge) {
          onSelectEdge(edge.id);
          onSelectNode(null);
        } else {
          onSelectNode(null);
          onSelectEdge(null);
        }
      }
    }
    dragRef.current = { node: null, panning: false, lastX: 0, lastY: 0 };
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const node = pickNode(e.clientX - rect.left, e.clientY - rect.top);
    if (node) {
      onExpand(node.id);
      onSelectNode(node.id);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ touchAction: "none", cursor: "grab" }}

      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        hoverRef.current = null;
        setHoverLabel(null);
      }}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {hoverLabel && (
        <div
          className="pointer-events-none absolute z-10 translate-x-3 translate-y-3 panel px-2 py-1 font-mono text-[11px] text-foreground"
          style={{ left: hoverLabel.x, top: hoverLabel.y }}
        >
          {hoverLabel.text}
        </div>
      )}
      <span className="sr-only">
        Interactive systems graph with {data.nodes.length} nodes and {data.edges.length} relationships.
      </span>
    </div>
  );
}

function expandedHas(expanded: Set<string>, id: string) {
  return expanded.has(id);
}

function hashRank(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return h / 1000;
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function offscreen(a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number) {
  return (
    (a.x < -200 && b.x < -200) ||
    (a.y < -200 && b.y < -200) ||
    (a.x > w + 200 && b.x > w + 200) ||
    (a.y > h + 200 && b.y > h + 200)
  );
}

function quadPoint(
  a: { x: number; y: number },
  c: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
    y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
  };
}

function cssVarCached(el: HTMLElement, cache: Map<string, string>, name: string) {
  let v = cache.get(name);
  if (!v) {
    v = cssVar(el, name, "#dde");
    cache.set(name, v);
  }
  return v;
}
