import { intakeZip } from "./local";
import {
  isIgnored,
  isTextPath,
  MAX_FILES,
  MAX_TEXT_BYTES,
  normalizePath,
  type IntakeFile,
  type IntakeProgress,
  type IntakeResult,
} from "./types";

export interface RepoRef {
  host: "github" | "gitlab";
  owner: string;
  name: string;
  ref?: string | undefined;
}

/** Upper bound on individual source files fetched over the network. */
const MAX_REMOTE_TEXT_FILES = 600;
const FETCH_CONCURRENCY = 8;

export function parseRepoUrl(input: string): RepoRef | null {
  const value = input.trim().replace(/\.git$/, "");
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const host = url.hostname.includes("gitlab")
    ? "gitlab"
    : url.hostname.includes("github")
      ? "github"
      : null;
  if (!host) return null;
  const refIndex = parts.findIndex((p) => p === "tree" || p === "-");
  const ref =
    refIndex >= 0 ? parts.slice(refIndex + (parts[refIndex] === "-" ? 2 : 1))[0] : undefined;
  return { host, owner: parts[0]!, name: parts[1]!, ref };
}

interface RemoteEntry {
  path: string;
  size: number;
}

async function mapLimit<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++]!;
      await task(current);
    }
  });
  await Promise.all(workers);
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 404) {
    throw new Error(
      "Repository not found or not public. Private repository access requires an authorization layer that is not enabled yet.",
    );
  }
  if (response.status === 403 || response.status === 429) {
    throw new Error(
      "The repository host is rate-limiting anonymous requests right now. Try again shortly, or download the archive and use the ZIP intake.",
    );
  }
  if (!response.ok) {
    throw new Error(`Could not retrieve the repository (status ${response.status}).`);
  }
  return (await response.json()) as T;
}

async function listGithub(ref: RepoRef, onProgress?: IntakeProgress) {
  const base = `https://api.github.com/repos/${ref.owner}/${ref.name}`;
  const branch =
    ref.ref ?? (await json<{ default_branch: string }>(base)).default_branch ?? "main";
  onProgress?.(`Reading ${ref.owner}/${ref.name}@${branch}`, 0.15);
  const tree = await json<{
    tree: { path: string; type: string; size?: number }[];
    truncated?: boolean;
  }>(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const entries: RemoteEntry[] = tree.tree
    .filter((t) => t.type === "blob")
    .map((t) => ({ path: normalizePath(t.path), size: t.size ?? 0 }));
  const rawUrl = (path: string) =>
    `https://raw.githubusercontent.com/${ref.owner}/${ref.name}/${encodeURIComponent(branch)}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  return { entries, rawUrl, truncated: Boolean(tree.truncated) };
}

async function listGitlab(ref: RepoRef, onProgress?: IntakeProgress) {
  const id = encodeURIComponent(`${ref.owner}/${ref.name}`);
  const base = `https://gitlab.com/api/v4/projects/${id}`;
  const branch = ref.ref ?? (await json<{ default_branch: string }>(base)).default_branch ?? "main";
  onProgress?.(`Reading ${ref.owner}/${ref.name}@${branch}`, 0.15);

  const entries: RemoteEntry[] = [];
  let truncated = false;
  for (let page = 1; page <= 12; page++) {
    const batch = await json<{ path: string; type: string }[]>(
      `${base}/repository/tree?recursive=true&per_page=100&page=${page}&ref=${encodeURIComponent(branch)}`,
    );
    for (const item of batch) {
      if (item.type === "blob") entries.push({ path: normalizePath(item.path), size: 0 });
    }
    if (batch.length < 100) break;
    if (page === 12) truncated = true;
  }
  const rawUrl = (path: string) =>
    `${base}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(branch)}`;
  return { entries, rawUrl, truncated };
}

/**
 * Public repositories are read through the host's CORS-enabled APIs and
 * decoded entirely in the browser. Nothing is uploaded and no credentials are
 * requested or stored — private repositories need an authorization layer that
 * does not exist yet.
 */
export async function intakeRepoUrl(
  input: string,
  onProgress?: IntakeProgress,
): Promise<IntakeResult> {
  const ref = parseRepoUrl(input);
  if (!ref) throw new Error("Unrecognized repository URL. Use a GitHub or GitLab URL.");

  onProgress?.(`Resolving ${ref.owner}/${ref.name}`, 0.08);

  let listing: { entries: RemoteEntry[]; rawUrl: (p: string) => string; truncated: boolean };
  try {
    listing = ref.host === "github" ? await listGithub(ref, onProgress) : await listGitlab(ref, onProgress);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        "The repository host refused the request from the browser. Download the archive and use the ZIP intake instead.",
      );
    }
    throw e;
  }

  let truncated = listing.truncated;
  const kept = listing.entries.filter((e) => e.path && !isIgnored(e.path));
  if (kept.length > MAX_FILES) truncated = true;
  const files: IntakeFile[] = kept.slice(0, MAX_FILES).map((e) => ({ path: e.path, size: e.size }));

  const textTargets = files.filter(
    (f) => isTextPath(f.path) && (f.size === 0 || f.size < MAX_TEXT_BYTES),
  );
  if (textTargets.length > MAX_REMOTE_TEXT_FILES) truncated = true;
  const fetchList = textTargets.slice(0, MAX_REMOTE_TEXT_FILES);

  let done = 0;
  let bytes = 0;
  onProgress?.(`Reading ${fetchList.length} source files`, 0.25);
  await mapLimit(fetchList, FETCH_CONCURRENCY, async (file) => {
    try {
      const response = await fetch(listing.rawUrl(file.path));
      if (response.ok) {
        const text = await response.text();
        if (text.length < MAX_TEXT_BYTES) {
          file.text = text;
          if (!file.size) file.size = text.length;
        }
      }
    } catch {
      // A single unreadable file must not fail the whole intake.
    }
    done++;
    if (done % 25 === 0 || done === fetchList.length) {
      onProgress?.(
        `Read ${done}/${fetchList.length} source files`,
        0.25 + 0.6 * (done / Math.max(1, fetchList.length)),
      );
    }
  });

  for (const file of files) bytes += file.size;

  if (files.length === 0) {
    throw new Error("That repository contains no readable files.");
  }

  onProgress?.(`Indexed ${files.length} files`, 0.9);
  return {
    label: `${ref.owner}/${ref.name}`,
    provider: "repo-url",
    files,
    truncated,
    bytes,
  };
}

export { intakeZip };
