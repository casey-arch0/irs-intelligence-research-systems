import { unzip } from "fflate";
import {
  isIgnored,
  isTextPath,
  MAX_FILES,
  MAX_TEXT_BYTES,
  normalizePath,
  stripArchiveRoot,
  type IntakeFile,
  type IntakeProgress,
  type IntakeProviderId,
  type IntakeResult,
} from "./types";

/** ZIP / repository archive — decoded entirely in the browser. */
export async function intakeZip(
  file: File,
  onProgress?: IntakeProgress,
  provider: IntakeProviderId = "zip",
): Promise<IntakeResult> {
  onProgress?.(`Reading ${file.name}`, 0.1);
  const buffer = new Uint8Array(await file.arrayBuffer());
  onProgress?.("Decompressing archive", 0.35);

  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(buffer, (err, data) => (err ? reject(err) : resolve(data)));
  });

  const paths = Object.keys(entries).filter((p) => !p.endsWith("/"));
  const strip = stripArchiveRoot(paths);
  const decoder = new TextDecoder();
  const files: IntakeFile[] = [];
  let bytes = 0;
  let truncated = false;

  for (const raw of paths) {
    const path = normalizePath(strip(raw));
    if (!path || isIgnored(path)) continue;
    if (files.length >= MAX_FILES) {
      truncated = true;
      break;
    }
    const data = entries[raw];
    if (!data) continue;
    bytes += data.byteLength;
    files.push({
      path,
      size: data.byteLength,
      text:
        isTextPath(path) && data.byteLength < MAX_TEXT_BYTES ? decoder.decode(data) : undefined,
    });
  }

  onProgress?.(`Indexed ${files.length} files`, 0.8);
  return { label: file.name.replace(/\.zip$/i, ""), provider, files, truncated, bytes };
}

/** Local folder via the File System Access API. Source never leaves the device. */
export function supportsLocalFolder(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function intakeLocalFolder(onProgress?: IntakeProgress): Promise<IntakeResult> {
  const picker = (
    window as unknown as {
      showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  const root = await picker();

  const files: IntakeFile[] = [];
  let bytes = 0;
  let truncated = false;

  async function walk(dir: FileSystemDirectoryHandle, prefix: string) {
    for await (const [name, handle] of dir.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (isIgnored(path + "/")) continue;
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      if (handle.kind === "directory") {
        await walk(handle as FileSystemDirectoryHandle, path);
      } else {
        const file = await (handle as FileSystemFileHandle).getFile();
        bytes += file.size;
        files.push({
          path,
          size: file.size,
          text: isTextPath(path) && file.size < MAX_TEXT_BYTES ? await file.text() : undefined,
        });
        if (files.length % 200 === 0) onProgress?.(`Reading ${files.length} files`, 0.6);
      }
    }
  }

  onProgress?.("Reading local folder", 0.2);
  await walk(root, "");
  onProgress?.(`Indexed ${files.length} files`, 0.85);
  return { label: root.name, provider: "folder", files, truncated, bytes };
}
