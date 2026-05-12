import { getFileColor, getFolderColor } from "@/lib/codebase/colors";
import type { Codebase, CodebaseFile, Folder, FolderEdge, FolderKind } from "@/lib/codebase/types";
import { extractDescription } from "./header";

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? path : path.slice(i + 1);
}

function classifyFolder(name: string): FolderKind {
  const n = name.toLowerCase();
  if (/^(test|tests|__tests__|spec|specs|e2e|cypress|integration|unit)$/.test(n)) return "test";
  if (/^(examples?|samples?|demos?)$/.test(n)) return "examples";
  if (/^(docs?|website|site|guide|guides|book)$/.test(n)) return "docs";
  if (/^(scripts?|tools?|build|bin|ci)$/.test(n)) return "scripts";
  if (/^(images?|icons?|assets?|public|static|fonts?|media|gfx|img)$/.test(n)) return "assets";
  return "source";
}

function countLines(buf: Buffer | undefined): number {
  if (!buf) return 0;
  let n = 0;
  const len = buf.length;
  for (let i = 0; i < len; i++) {
    if (buf[i] === 10) n++;
  }
  return n + (len > 0 && buf[len - 1] !== 10 ? 1 : 0);
}

// Decide a folder name for a source file path.
// If every file lives under a single top-level dir (e.g. "src"), use
// the second segment as the folder so we don't render a single mega
// "src" node with hundreds of children. Otherwise use the top-level dir.
function makeFolderResolver(paths: string[]): (p: string) => string {
  const tops = new Set<string>();
  for (const p of paths) {
    const i = p.indexOf("/");
    tops.add(i < 0 ? "(root)" : p.slice(0, i));
  }
  const collapse = tops.size === 1 ? [...tops][0] : null;

  return (p) => {
    const parts = p.split("/");
    if (collapse && parts[0] === collapse) {
      return parts.length > 2 ? parts[1] : "(root)";
    }
    return parts.length > 1 ? parts[0] : "(root)";
  };
}

export interface BuildGraphOptions {
  maxFiles?: number;
}

export function buildGraph(
  filesMap: Map<string, Buffer>,
  importsMap: Map<string, string[]>,
  opts: BuildGraphOptions = {},
): Codebase {
  const maxFiles = opts.maxFiles ?? 1500;

  // Every text file the extractor kept becomes a node; the import map
  // only has entries for parseable source files, so non-JS/TS files
  // simply have no edges.
  const allPaths = [...filesMap.keys()].sort();
  const limited = allPaths.slice(0, maxFiles);

  const folderOf = makeFolderResolver(limited);

  const grouped = new Map<string, string[]>();
  for (const path of limited) {
    const name = folderOf(path);
    const arr = grouped.get(name) ?? [];
    arr.push(path);
    grouped.set(name, arr);
  }

  const folderEntries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

  const folders: Folder[] = folderEntries.map(([name, paths], idx) => ({
    id: idx,
    name,
    kind: classifyFolder(name),
    color: getFolderColor(idx, folderEntries.length),
    fileCount: paths.length,
    files: [],
  }));

  const fileByPath = new Map<string, number>();
  const allFiles: CodebaseFile[] = [];
  let fileId = 0;

  folders.forEach((folder, fi) => {
    const paths = folderEntries[fi][1];
    paths.forEach((path, idx) => {
      const buf = filesMap.get(path);
      const file: CodebaseFile = {
        id: fileId,
        name: basename(path),
        path,
        folderId: fi,
        folderName: folder.name,
        color: getFileColor(folder, idx),
        folderColor: folder.color,
        loc: countLines(buf),
        description: extractDescription(buf),
        imports: [],
        importedBy: [],
      };
      folder.files.push(file);
      allFiles.push(file);
      fileByPath.set(path, fileId);
      fileId++;
    });
  });

  for (const [path, targets] of importsMap.entries()) {
    const sourceId = fileByPath.get(path);
    if (sourceId === undefined) continue;
    const seen = new Set<number>();
    for (const target of targets) {
      const targetId = fileByPath.get(target);
      if (targetId === undefined || targetId === sourceId || seen.has(targetId)) continue;
      seen.add(targetId);
      allFiles[sourceId].imports.push(targetId);
      allFiles[targetId].importedBy.push(sourceId);
    }
  }

  const folderEdgeMap = new Map<string, number>();
  allFiles.forEach((file) => {
    file.imports.forEach((tid) => {
      const t = allFiles[tid];
      if (t.folderId !== file.folderId) {
        const key = file.folderId < t.folderId
          ? `${file.folderId}-${t.folderId}`
          : `${t.folderId}-${file.folderId}`;
        folderEdgeMap.set(key, (folderEdgeMap.get(key) ?? 0) + 1);
      }
    });
  });
  const folderEdges: FolderEdge[] = [...folderEdgeMap.entries()].map(([k, w]) => {
    const [s, t] = k.split("-").map(Number);
    return { source: s, target: t, weight: w };
  });

  return {
    folders,
    allFiles,
    folderEdges,
    readme: pickReadme(filesMap),
    truncated: allPaths.length > limited.length
      ? { total: allPaths.length, kept: limited.length }
      : null,
  };
}

// Top-level README — try a few common spellings, pick the largest
// (avoids picking up a near-empty stub README in a sub-folder).
function pickReadme(files: Map<string, Buffer>): string | null {
  const candidates = ["README.md", "readme.md", "README.MD", "Readme.md", "README.markdown", "README"];
  for (const name of candidates) {
    const buf = files.get(name);
    if (buf && buf.length > 0) return buf.toString("utf8");
  }
  return null;
}
