import { FolderOpen, Github, Loader2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { intakeLocalFolder, intakeZip, supportsLocalFolder } from "@/lib/intake/local";
import { intakeRepoUrl } from "@/lib/intake/remote";
import type { IntakeResult } from "@/lib/intake/types";
import { cn } from "@/lib/utils";

type Tab = "repo" | "zip" | "folder";

interface Props {
  onResult: (result: IntakeResult) => void;
  compact?: boolean;
}

export function CodebaseIntake({ onResult, compact = false }: Props) {
  const [tab, setTab] = useState<Tab>("repo");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ratio, setRatio] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [folderSupported, setFolderSupported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setFolderSupported(supportsLocalFolder()), []);

  const progress = useCallback((message: string, r?: number) => {
    setStatus(message);
    if (typeof r === "number") setRatio(r);
  }, []);

  const run = useCallback(
    async (task: () => Promise<IntakeResult>) => {
      setBusy(true);
      setError(null);
      setRatio(0.05);
      try {
        const result = await task();
        setStatus(`${result.files.length} files indexed`);
        setRatio(1);
        onResult(result);
      } catch (e) {
        const err = e as Error & { name?: string };
        if (err?.name === "AbortError") {
          setStatus(null);
        } else {
          setError(err?.message ?? "Intake failed.");
        }
      } finally {
        setBusy(false);
      }
    },
    [onResult],
  );

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      setError("Only .zip archives are supported for upload.");
      return;
    }
    void run(() => intakeZip(file, progress, "zip"));
  };

  const TABS: { id: Tab; label: string; icon: typeof Github }[] = [
    { id: "repo", label: "Repository URL", icon: Github },
    { id: "zip", label: "ZIP archive", icon: UploadCloud },
    { id: "folder", label: "Local folder", icon: FolderOpen },
  ];

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-mono">Codebase intake</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Processed in your browser
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setError(null);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
              tab === t.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "repo" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!url.trim() || busy) return;
              void run(() => intakeRepoUrl(url, progress));
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              aria-label="Public GitHub or GitLab repository URL"
              className="min-w-0 flex-1 border border-input bg-background/60 px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy || !url.trim()}
              className="inline-flex items-center justify-center gap-2 border border-primary/60 bg-primary/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Analyze
            </button>
          </form>
        )}

        {tab === "zip" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex flex-col items-center justify-center border border-dashed px-4 py-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drop a repository archive (.zip) here
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="mt-3 border border-primary/60 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 disabled:opacity-40"
            >
              Select archive
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {tab === "folder" && (
          <div className="border border-dashed border-border px-4 py-8 text-center">
            {folderSupported ? (
              <>
                <FolderOpen className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a folder on this device. Files are read locally and never uploaded.
                </p>
                <button
                  onClick={() => void run(() => intakeLocalFolder(progress))}
                  disabled={busy}
                  className="mt-3 border border-primary/60 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary hover:bg-primary/20 disabled:opacity-40"
                >
                  Choose folder
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This browser does not expose the File System Access API. Use a ZIP archive or a
                repository URL instead.
              </p>
            )}
          </div>
        )}
      </div>

      {(busy || status) && (
        <div className="mt-4">
          <div className="h-px w-full bg-border">
            <div
              className="h-px bg-primary transition-[width] duration-300"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{status}</p>
        </div>
      )}

      {error && (
        <p className="mt-3 border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-[11px] text-destructive-foreground">
          {error}
        </p>
      )}

      {!compact && (
        <p className="mt-4 font-mono text-[10px] leading-relaxed tracking-wide text-muted-foreground">
          No accounts. No uploads. No payment. Public repositories are fetched directly by your
          browser; archives and folders never leave the device.
        </p>
      )}
    </div>
  );
}
