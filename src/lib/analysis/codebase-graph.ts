import type { GraphData, GraphEdge, GraphNode, NodeType } from "@/lib/graph/types";
import type { IntakeResult } from "@/lib/intake/types";

export interface CodebaseSummary {
  files: number;
  directories: number;
  modules: number;
  dependencies: number;
  languages: { name: string; files: number }[];
  bytes: number;
  truncated: boolean;
}

export interface AnalysisResult {
  graph: GraphData;
  summary: CodebaseSummary;
}

const LANG_BY_EXT: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript",
  py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", swift: "Swift",
  php: "PHP", cs: "C#", c: "C", h: "C", cpp: "C++", sql: "SQL", css: "CSS", scss: "CSS",
  html: "HTML", md: "Markdown", json: "JSON", yml: "YAML", yaml: "YAML", vue: "Vue", svelte: "Svelte",
};

const IMPORT_RE =
  /(?:import\s[^'"]*from\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|^\s*from\s+([\w.]+)\s+import)/gm;
const FUNCTION_RE =
  /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|^\s*def\s+([A-Za-z_]\w*)/gm;
const CLASS_RE = /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const ROUTE_RE =
  /(?:app|router)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]|createFileRoute\(\s*['"]([^'"]+)['"]/gm;
const DB_RE = /(postgres|mysql|sqlite|mongodb|redis|clickhouse|supabase|prisma|dynamodb)/i;
const EXTERNAL_RE = /https?:\/\/(?:api|www)?\.?([a-z0-9-]+\.[a-z]{2,})/gi;

const MAX_DETAIL_FILES = 400;
const MAX_SYMBOLS_PER_FILE = 8;

/**
 * Static, dependency-free structural analysis. Runs entirely on the client:
 * nothing here writes to disk, transmits, or logs file contents.
 */
export function analyzeCodebase(intake: IntakeResult): AnalysisResult {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n.id;
  };
  let edgeSeq = 0;
  const seenEdges = new Set<string>();
  const addEdge = (source: string, target: string, type: GraphEdge["type"]) => {
    const key = `${source}|${target}|${type}`;
    if (source === target || seenEdges.has(key)) return;
    if (!nodes.has(source) || !nodes.has(target)) return;
    seenEdges.add(key);
    edges.push({ id: `e${edgeSeq++}`, source, target, type });
  };

  const repoId = "repo:" + intake.label;
  addNode({ id: repoId, type: "repository", label: intake.label, weight: 5 });

  const dirCounts = new Map<string, number>();
  const langCounts = new Map<string, number>();
  const packageDeps = new Set<string>();

  // Pass 1: structure
  for (const file of intake.files) {
    const segments = file.path.split("/");
    const fileName = segments.pop()!;
    let parent = repoId;
    let acc = "";
    for (const seg of segments.slice(0, 3)) {
      acc = acc ? `${acc}/${seg}` : seg;
      const id = `dir:${acc}`;
      addNode({ id, type: "directory", label: seg, metadata: { path: acc } });
      addEdge(parent, id, "contains");
      parent = id;
      dirCounts.set(acc, (dirCounts.get(acc) ?? 0) + 1);
    }
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const lang = LANG_BY_EXT[ext];
    if (lang) langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1);

    const fileId = `file:${file.path}`;
    addNode({
      id: fileId,
      type: "file",
      label: fileName,
      metadata: { path: file.path, bytes: file.size, language: lang ?? ext },
    });
    addEdge(parent, fileId, "contains");

    if (/^package\.json$/.test(fileName) && file.text) {
      try {
        const pkg = JSON.parse(file.text) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        for (const dep of Object.keys(pkg.dependencies ?? {})) packageDeps.add(dep);
        for (const dep of Object.keys(pkg.devDependencies ?? {})) packageDeps.add(dep);
      } catch {
        /* malformed manifest — ignored */
      }
    }
  }

  for (const dep of [...packageDeps].slice(0, 120)) {
    const id = `dep:${dep}`;
    addNode({ id, type: "dependency", label: dep });
    addEdge(repoId, id, "depends-on");
  }

  // Pass 2: symbols, relationships, IO surfaces (bounded for large repos)
  const detailFiles = intake.files
    .filter((f) => f.text && LANG_BY_EXT[f.path.split(".").pop()?.toLowerCase() ?? ""])
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_DETAIL_FILES);

  const pathIndex = new Map(intake.files.map((f) => [f.path, `file:${f.path}`]));

  for (const file of detailFiles) {
    const fileId = `file:${file.path}`;
    const text = file.text!;

    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(text))) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!spec) continue;
      if (spec.startsWith(".")) {
        const resolved = resolveRelative(file.path, spec, pathIndex);
        if (resolved) addEdge(fileId, resolved, "imports");
      } else {
        const pkgName = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
        const id = `dep:${pkgName}`;
        if (!nodes.has(id)) addNode({ id, type: "dependency", label: pkgName });
        addEdge(fileId, id, "depends-on");
      }
    }

    addSymbols(text, FUNCTION_RE, "function", file.path, fileId, addNode, addEdge);
    addSymbols(text, CLASS_RE, "class", file.path, fileId, addNode, addEdge);

    ROUTE_RE.lastIndex = 0;
    let routes = 0;
    while ((m = ROUTE_RE.exec(text)) && routes < 6) {
      const label = m[3] ?? `${(m[1] ?? "").toUpperCase()} ${m[2] ?? ""}`.trim();
      if (!label) continue;
      routes++;
      const id = `api:${label}`;
      addNode({ id, type: "api", label, status: "active", metadata: { file: file.path } });
      addEdge(id, fileId, "related-to");
    }

    const db = text.match(DB_RE);
    if (db) {
      const id = `db:${db[1]!.toLowerCase()}`;
      addNode({ id, type: "database", label: db[1]!.toLowerCase() });
      addEdge(fileId, id, "depends-on");
    }

    EXTERNAL_RE.lastIndex = 0;
    let externals = 0;
    while ((m = EXTERNAL_RE.exec(text)) && externals < 3) {
      const host = m[1]!.toLowerCase();
      if (host.endsWith("w3.org") || host.endsWith("schema.org")) continue;
      externals++;
      const id = `ext:${host}`;
      addNode({ id, type: "external", label: host });
      addEdge(fileId, id, "sends-to");
    }
  }

  const summary: CodebaseSummary = {
    files: intake.files.length,
    directories: dirCounts.size,
    modules: [...nodes.values()].filter((n) => n.type === "function" || n.type === "class").length,
    dependencies: [...nodes.values()].filter((n) => n.type === "dependency").length,
    languages: [...langCounts.entries()]
      .map(([name, files]) => ({ name, files }))
      .sort((a, b) => b.files - a.files)
      .slice(0, 6),
    bytes: intake.bytes,
    truncated: intake.truncated,
  };

  return {
    graph: {
      nodes: [...nodes.values()],
      edges,
      source: {
        kind: intake.provider,
        label: intake.label,
        generatedAt: Date.now(),
      },
    },
    summary,
  };
}

function addSymbols(
  text: string,
  re: RegExp,
  type: NodeType,
  path: string,
  fileId: string,
  addNode: (n: GraphNode) => string,
  addEdge: (s: string, t: string, type: GraphEdge["type"]) => void,
) {
  re.lastIndex = 0;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && count < MAX_SYMBOLS_PER_FILE) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!name || name.length < 2) continue;
    count++;
    const id = `${type}:${path}#${name}`;
    addNode({
      id,
      type,
      label: type === "function" ? `${name}()` : name,
      metadata: { file: path },
    });
    addEdge(fileId, id, "contains");
  }
}

function resolveRelative(
  from: string,
  spec: string,
  index: Map<string, string>,
): string | undefined {
  const base = from.split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  const target = base.join("/");
  const candidates = [
    target,
    ...["ts", "tsx", "js", "jsx", "py", "go", "rs"].flatMap((e) => [
      `${target}.${e}`,
      `${target}/index.${e}`,
    ]),
  ];
  for (const c of candidates) {
    const hit = index.get(c);
    if (hit) return hit;
  }
  return undefined;
}
