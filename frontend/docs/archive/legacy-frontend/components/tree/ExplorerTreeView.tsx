"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useMemo,
  useState,
} from "react";
import { ChevronDown, ChevronRight, Folder as FolderIcon } from "lucide-react";
import { toHex } from "@/lib/codebase/colors";
import type {
  Codebase,
  CodebaseFile,
  Folder,
  HoveredItem,
  Selection,
} from "@/lib/codebase/types";

const ROW_HEIGHT = 26;
const INDENT = 18;
const PAD_LEFT = 16;
const WIDTH = 920;
const DIR_COLOR = 0x171717;

// ──────────────────────────────────────────────────────────────
// Tree model — built from full file paths so deep dirs (e.g.
// src/hooks/file.ts) render at their real depth.
// ──────────────────────────────────────────────────────────────
interface DirNode {
  kind: "dir";
  name: string;
  path: string;       // repo-relative directory path; "" for root
  depth: number;
  children: TreeNode[];
  fileCount: number;
  /** When this directory matches a flat codebase.folders entry. */
  folderRef?: Folder;
}

interface FileNode {
  kind: "file";
  name: string;
  path: string;       // repo-relative file path
  depth: number;
  file: CodebaseFile;
}

type TreeNode = DirNode | FileNode;

function buildTree(codebase: Codebase): DirNode {
  const root: DirNode = {
    kind: "dir",
    name: "codebase",
    path: "",
    depth: 0,
    children: [],
    fileCount: 0,
  };
  const dirByPath = new Map<string, DirNode>();
  dirByPath.set("", root);

  for (const file of codebase.allFiles) {
    const fullPath = file.path ?? file.name;
    const parts = fullPath.split("/");
    let current: DirNode = root;
    let currentPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      currentPath = currentPath ? `${currentPath}/${seg}` : seg;
      let next = dirByPath.get(currentPath);
      if (!next) {
        next = {
          kind: "dir",
          name: seg,
          path: currentPath,
          depth: current.depth + 1,
          children: [],
          fileCount: 0,
        };
        current.children.push(next);
        dirByPath.set(currentPath, next);
      }
      current = next;
    }
    current.children.push({
      kind: "file",
      name: parts[parts.length - 1],
      path: fullPath,
      depth: current.depth + 1,
      file,
    });
  }

  // Best-effort link to flat codebase.folders entries — tries both
  // the exact name and the full path so the click on a synthetic dir
  // can still surface real folder metadata when it matches.
  const folderByName = new Map<string, Folder>();
  for (const f of codebase.folders) folderByName.set(f.name, f);

  function annotate(node: DirNode): number {
    let count = 0;
    for (const child of node.children) {
      if (child.kind === "file") count++;
      else count += annotate(child);
    }
    node.fileCount = count;
    const ref = folderByName.get(node.path) ?? folderByName.get(node.name);
    if (ref) node.folderRef = ref;
    return count;
  }
  annotate(root);

  // Stable order: dirs first (alpha), then files (alpha).
  function sort(node: DirNode) {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) if (c.kind === "dir") sort(c);
  }
  sort(root);

  return root;
}

// ──────────────────────────────────────────────────────────────
// Flattening — produces the visible row sequence, respecting the
// expanded set. The synthetic root is always expanded.
// ──────────────────────────────────────────────────────────────
function flatten(root: DirNode, expanded: Set<string>): TreeNode[] {
  const out: TreeNode[] = [];
  function walk(node: TreeNode) {
    out.push(node);
    if (node.kind === "dir") {
      const open = node.depth === 0 || expanded.has(node.path);
      if (open) for (const c of node.children) walk(c);
    }
  }
  walk(root);
  return out;
}

export interface ExplorerTreeViewProps {
  codebase: Codebase;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
  onHover?: (h: HoveredItem | null) => void;
  showLabels: boolean;
  onFileContextMenu?: (e: ReactMouseEvent, file: CodebaseFile) => void;
  onFolderContextMenu?: (e: ReactMouseEvent, folder: Folder) => void;
}

export function ExplorerTreeView({
  codebase,
  selected,
  onSelect,
  onHover,
  showLabels,
  onFileContextMenu,
  onFolderContextMenu,
}: ExplorerTreeViewProps) {
  const tree = useMemo(() => buildTree(codebase), [codebase]);
  const allDirPaths = useMemo(() => collectDirPaths(tree), [tree]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(allDirPaths));

  // When the underlying codebase changes (e.g. test-folder filter
  // toggle reshapes the tree), seed expanded with every dir again so
  // newly-arrived dirs default to open.
  useMemo(() => {
    setExpanded(new Set(allDirPaths));
  }, [allDirPaths]);

  const flat = useMemo(() => flatten(tree, expanded), [tree, expanded]);

  const isSelectedFile = (id: number) =>
    selected?.kind === "file" && selected.id === id;
  const isSelectedFolder = (id: number) =>
    selected?.kind === "folder" && selected.id === id;

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const onDirClick = (node: DirNode, e: ReactMouseEvent) => {
    if (node.depth === 0) return; // root not selectable
    if (e.altKey || e.metaKey) {
      // Modifier-click: toggle expand without selecting
      toggleDir(node.path);
      return;
    }
    if (node.folderRef) {
      onSelect({ kind: "folder", id: node.folderRef.id });
    } else {
      // Synthetic dir → just toggle
      toggleDir(node.path);
    }
  };

  const onDirChevron = (node: DirNode, e: ReactMouseEvent) => {
    e.stopPropagation();
    toggleDir(node.path);
  };

  const onFileClick = (file: CodebaseFile) => {
    onSelect({ kind: "file", id: file.id });
  };

  const onDirHover = (node: DirNode, e: ReactMouseEvent) => {
    if (!onHover) return;
    if (node.depth === 0) {
      onHover(null);
      return;
    }
    const ref = node.folderRef;
    onHover({
      name: node.path || node.name,
      folderName: node.name,
      color: ref?.color ?? DIR_COLOR,
      isFolder: true,
      fileCount: node.fileCount,
      weightSum: ref ? codebase.folderEdges
        .filter((e) => e.source === ref.id || e.target === ref.id)
        .reduce((s, e) => s + e.weight, 0) : 0,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const onFileHoverEvt = (file: CodebaseFile, e: ReactMouseEvent) => {
    if (!onHover) return;
    onHover({
      name: file.name,
      folderName: file.folderName,
      color: file.color,
      isFolder: false,
      degree: file.imports.length + file.importedBy.length,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const totalHeight = flat.length * ROW_HEIGHT + 80;

  return (
    <div className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto" style={{ width: WIDTH, paddingTop: 96, paddingBottom: 60, minHeight: totalHeight }}>
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono pl-4">
          tree · {codebase.allFiles.length} files in {countDirs(tree)} folders
        </div>
        <div role="tree" className="relative font-mono">
          {flat.map((node) => {
            if (node.kind === "dir") {
              const isOpen = node.depth === 0 || expanded.has(node.path);
              const isLeafDir = node.children.length === 0;
              const sel = node.folderRef ? isSelectedFolder(node.folderRef.id) : false;
              const color = node.folderRef ? toHex(node.folderRef.color) : toHex(DIR_COLOR);
              return (
                <div
                  key={`d-${node.path || "__root__"}`}
                  role="treeitem"
                  aria-expanded={isOpen}
                  onClick={(e) => onDirClick(node, e)}
                  onContextMenu={(e) => {
                    if (node.folderRef && onFolderContextMenu) onFolderContextMenu(e, node.folderRef);
                  }}
                  onMouseMove={(e) => onDirHover(node, e)}
                  onMouseLeave={() => onHover?.(null)}
                  className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                    sel ? "bg-neutral-100" : "hover:bg-neutral-50"
                  }`}
                  style={{
                    height: ROW_HEIGHT,
                    paddingLeft: PAD_LEFT + node.depth * INDENT,
                    paddingRight: 16,
                  }}
                >
                  {!isLeafDir ? (
                    <button
                      onClick={(e) => onDirChevron(node, e)}
                      className="w-3.5 h-3.5 flex items-center justify-center text-neutral-400 hover:text-neutral-900 flex-shrink-0"
                      aria-label={isOpen ? "collapse" : "expand"}
                    >
                      {isOpen
                        ? <ChevronDown size={11} strokeWidth={1.75} />
                        : <ChevronRight size={11} strokeWidth={1.75} />}
                    </button>
                  ) : (
                    <span className="w-3.5 h-3.5 flex-shrink-0" />
                  )}

                  {node.depth === 0 ? (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: toHex(DIR_COLOR) }}
                    />
                  ) : (
                    <FolderIcon
                      size={12}
                      strokeWidth={1.5}
                      className="flex-shrink-0"
                      style={{ color }}
                    />
                  )}

                  {showLabels && (
                    <>
                      <span className={`text-[12px] truncate ${
                        sel ? "text-neutral-900 font-medium" : "text-neutral-800"
                      }`}>
                        {node.depth === 0 ? "codebase" : node.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 ml-1 flex-shrink-0">
                        {node.fileCount}
                      </span>
                    </>
                  )}
                </div>
              );
            }

            const sel = isSelectedFile(node.file.id);
            return (
              <div
                key={`f-${node.file.id}`}
                role="treeitem"
                onClick={() => onFileClick(node.file)}
                onContextMenu={(e) => onFileContextMenu?.(e, node.file)}
                onMouseMove={(e) => onFileHoverEvt(node.file, e)}
                onMouseLeave={() => onHover?.(null)}
                className={`flex items-center gap-1.5 cursor-pointer transition-colors ${
                  sel ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: PAD_LEFT + node.depth * INDENT,
                  paddingRight: 16,
                }}
              >
                <span className="w-3.5 h-3.5 flex-shrink-0" />
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: toHex(node.file.color) }}
                />
                {showLabels && (
                  <>
                    <span className={`text-[12px] truncate ${
                      sel ? "text-neutral-900 font-medium" : "text-neutral-700"
                    }`}>
                      {node.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 ml-1 flex-shrink-0">
                      {node.file.loc} loc
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pl-4 text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
          click · inspect · ⌥click · toggle · click ▸ to expand
        </div>
      </div>
    </div>
  );
}

function collectDirPaths(node: DirNode, out: string[] = []): string[] {
  out.push(node.path);
  for (const c of node.children) {
    if (c.kind === "dir") collectDirPaths(c, out);
  }
  return out;
}

function countDirs(node: DirNode): number {
  let n = node.depth === 0 ? 0 : 1;
  for (const c of node.children) {
    if (c.kind === "dir") n += countDirs(c);
  }
  return n;
}
