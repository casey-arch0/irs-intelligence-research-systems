/**
 * Codebase intake — provider-agnostic contract.
 *
 * Every provider produces the same `IntakeResult`, so the analysis layer never
 * knows whether files came from a ZIP, the File System Access API or a host API.
 * Source text is kept in memory only; nothing is uploaded or persisted by IRS.
 */

export interface IntakeFile {
  path: string;
  size: number;
  /** Present only for text files small enough to analyze. */
  text?: string | undefined;
}

export interface IntakeResult {
  label: string;
  provider: IntakeProviderId;
  files: IntakeFile[];
  truncated: boolean;
  bytes: number;
}

export type IntakeProviderId = "repo-url" | "zip" | "folder" | "archive";

export interface IntakeProgress {
  (message: string, ratio?: number): void;
}

export const MAX_FILES = 4000;
export const MAX_TEXT_BYTES = 300_000;

const TEXT_EXT = new Set([
  "ts","tsx","js","jsx","mjs","cjs","json","md","mdx","css","scss","html","yml","yaml","toml",
  "py","rb","go","rs","java","kt","swift","php","cs","c","h","cpp","hpp","sql","sh","graphql","vue","svelte",
]);

const IGNORED = [
  "node_modules/", ".git/", "dist/", "build/", ".next/", ".turbo/", "vendor/", "target/",
  "coverage/", ".venv/", "__pycache__/", ".cache/",
];

export function isIgnored(path: string): boolean {
  return IGNORED.some((seg) => path.includes(seg));
}

export function isTextPath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXT.has(ext);
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
}

/** Drops the single top-level folder GitHub/GitLab archives wrap everything in. */
export function stripArchiveRoot(paths: string[]): (p: string) => string {
  const roots = new Set(paths.map((p) => p.split("/")[0]));
  if (roots.size === 1 && paths.every((p) => p.includes("/"))) {
    const root = [...roots][0] + "/";
    return (p) => (p.startsWith(root) ? p.slice(root.length) : p);
  }
  return (p) => p;
}
