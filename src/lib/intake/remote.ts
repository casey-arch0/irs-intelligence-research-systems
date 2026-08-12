import { intakeZip } from "./local";
import type { IntakeProgress, IntakeResult } from "./types";

export interface RepoRef {
  host: "github" | "gitlab";
  owner: string;
  name: string;
  ref?: string;
}

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
  return { host, owner: parts[0], name: parts[1], ref };
}

/**
 * Public repositories are fetched as an archive and decoded locally.
 * Private repositories intentionally require an authorization layer that does
 * not exist yet — no credentials are requested or stored today.
 */
export async function intakeRepoUrl(
  input: string,
  onProgress?: IntakeProgress,
): Promise<IntakeResult> {
  const ref = parseRepoUrl(input);
  if (!ref) throw new Error("Unrecognized repository URL. Use a GitHub or GitLab URL.");

  const branches = ref.ref ? [ref.ref] : ["main", "master"];
  let lastStatus = 0;

  for (const branch of branches) {
    const url =
      ref.host === "github"
        ? `https://codeload.github.com/${ref.owner}/${ref.name}/zip/refs/heads/${branch}`
        : `https://gitlab.com/${ref.owner}/${ref.name}/-/archive/${branch}/${ref.name}-${branch}.zip`;

    onProgress?.(`Fetching ${ref.owner}/${ref.name}@${branch}`, 0.15);
    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new Error(
        "The repository host refused the request from the browser. Download the archive and use the ZIP intake instead.",
      );
    }
    if (!response.ok) {
      lastStatus = response.status;
      continue;
    }
    const blob = await response.blob();
    const file = new File([blob], `${ref.name}.zip`, { type: "application/zip" });
    const result = await intakeZip(file, onProgress, "repo-url");
    return { ...result, label: `${ref.owner}/${ref.name}` };
  }

  if (lastStatus === 404) {
    throw new Error(
      "Repository not found or not public. Private repository access requires an authorization layer that is not enabled yet.",
    );
  }
  throw new Error(`Could not retrieve the repository archive (status ${lastStatus || "unknown"}).`);
}
