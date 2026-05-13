"use client";

import { type MouseEvent as ReactMouseEvent, useMemo } from "react";
import { toHex } from "@/lib/codebase/colors";
import type {
  Codebase,
  CodebaseFile,
  Folder,
  HoveredItem,
  Selection,
} from "@/lib/codebase/types";

// Three-column hierarchy view with curved gradient edges.
// Shows the flat top-level grouping (root → folder → file). For deep
// nested directories use the explorer view — this one is the
// at-a-glance shape of the codebase, not a file index.

// Visual spacing — generous on purpose so labels above each node have
// room to breathe and the gradient edges aren't on top of each other.
const ROW = 42;             // vertical pitch per file row
const FOLDER_GAP_ROWS = 3;  // empty rows inserted between adjacent folders
const COL_ROOT = 100;
const COL_FOLDER = 400;
const COL_FILE = 760;
const TOP = 110;
const BOTTOM = 90;
const WIDTH = 1080;

const ROOT_COLOR = 0x171717;
const TEXT_PRIMARY   = "#171717";

interface Layout {
  fileY: Map<number, number>;
  folderMid: Map<number, number>;
  totalHeight: number;
  rootY: number;
}

// Single-file folders would stack their dot tightly against the
// neighbouring folder's first row; pad them so each folder always has
// at least this many vertical slots.
const MIN_FOLDER_SLOTS = 2;

function computeLayout(folders: Folder[]): Layout {
  let row = 0;
  const fileY = new Map<number, number>();
  const folderMid = new Map<number, number>();

  folders.forEach((folder, fi) => {
    const start = row;
    folder.files.forEach((file) => {
      fileY.set(file.id, TOP + row * ROW);
      row++;
    });
    const slots = Math.max(folder.files.length, MIN_FOLDER_SLOTS);
    const end = start + slots - 1;
    folderMid.set(folder.id, TOP + ((start + end) / 2) * ROW);

    // Pad so the visual block reflects the slot count, then add the
    // inter-folder gutter.
    if (folder.files.length < slots) row += slots - folder.files.length;
    if (fi < folders.length - 1) row += FOLDER_GAP_ROWS;
  });

  const totalHeight = TOP + row * ROW + BOTTOM;
  const rootY = folders.length
    ? [...folderMid.values()].reduce((s, v) => s + v, 0) / folderMid.size
    : totalHeight / 2;

  return { fileY, folderMid, totalHeight, rootY };
}

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const cx1 = x1 + (x2 - x1) * 0.5;
  const cx2 = x2 - (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
}

interface TreeEdge {
  key: string;
  x1: number; y1: number; x2: number; y2: number;
  parentColor: number;
  childColor: number;
}

export interface HierarchyTreeViewProps {
  codebase: Codebase;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
  onHover?: (h: HoveredItem | null) => void;
  showEdges: boolean;
  showLabels: boolean;
  onFileContextMenu?: (e: ReactMouseEvent, file: CodebaseFile) => void;
  onFolderContextMenu?: (e: ReactMouseEvent, folder: Folder) => void;
}

export function HierarchyTreeView({
  codebase,
  selected,
  onSelect,
  onHover,
  showEdges,
  showLabels,
  onFileContextMenu,
  onFolderContextMenu,
}: HierarchyTreeViewProps) {
  const { folders, allFiles } = codebase;
  const layout = useMemo(() => computeLayout(folders), [folders]);

  const edges = useMemo<TreeEdge[]>(() => {
    const list: TreeEdge[] = [];
    folders.forEach((folder) => {
      list.push({
        key: `r-${folder.id}`,
        x1: COL_ROOT, y1: layout.rootY,
        x2: COL_FOLDER, y2: layout.folderMid.get(folder.id)!,
        parentColor: ROOT_COLOR,
        childColor: folder.color,
      });
      folder.files.forEach((file) => {
        list.push({
          key: `f-${file.id}`,
          x1: COL_FOLDER, y1: layout.folderMid.get(folder.id)!,
          x2: COL_FILE,   y2: layout.fileY.get(file.id)!,
          parentColor: folder.color,
          childColor: file.color,
        });
      });
    });
    return list;
  }, [folders, layout]);

  const isSelFolder = (id: number) =>
    selected?.kind === "folder" && selected.id === id;
  const isSelFile = (id: number) =>
    selected?.kind === "file" && selected.id === id;

  const onFolderHover = (folder: Folder, e: ReactMouseEvent) => {
    const weightSum = codebase.folderEdges.reduce(
      (s, edge) => s + ((edge.source === folder.id || edge.target === folder.id) ? edge.weight : 0),
      0
    );
    onHover?.({
      name: folder.name,
      folderName: folder.name,
      color: folder.color,
      isFolder: true,
      fileCount: folder.fileCount,
      weightSum,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const onFileHover = (file: CodebaseFile, e: ReactMouseEvent) => {
    onHover?.({
      name: file.name,
      folderName: file.folderName,
      color: file.color,
      isFolder: false,
      degree: file.imports.length + file.importedBy.length,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <div className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto" style={{ width: WIDTH, paddingTop: 80, paddingBottom: 60 }}>
        <svg
          width={WIDTH}
          height={layout.totalHeight}
          style={{ display: "block", fontFamily: "var(--font-mono)" }}
        >
          <defs>
            {edges.map((e, i) => (
              <linearGradient
                key={e.key}
                id={`tg-${i}`}
                x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0"   stopColor={toHex(e.parentColor)} stopOpacity="0.95" />
                <stop offset="0.5" stopColor={toHex(e.parentColor)} stopOpacity="0.55" />
                <stop offset="0.5" stopColor={toHex(e.childColor)}  stopOpacity="0.55" />
                <stop offset="1"   stopColor={toHex(e.childColor)}  stopOpacity="0.95" />
              </linearGradient>
            ))}
          </defs>

          {showEdges && edges.map((e, i) => (
            <path
              key={e.key}
              d={edgePath(e.x1, e.y1, e.x2, e.y2)}
              stroke={`url(#tg-${i})`}
              strokeWidth="1.2"
              fill="none"
            />
          ))}

          <g transform={`translate(${COL_ROOT}, ${layout.rootY})`}>
            {showLabels && (
              <text x="0" y="-16" textAnchor="middle" fill={TEXT_PRIMARY} fontSize="11" fontWeight={500}>
                codebase
              </text>
            )}
            <circle r="14" fill={toHex(ROOT_COLOR)} opacity="0.06" />
            <circle r="8"  fill={toHex(ROOT_COLOR)} opacity="0.18" />
            <circle r="4"  fill={toHex(ROOT_COLOR)} />
          </g>

          {folders.map((folder) => {
            const y = layout.folderMid.get(folder.id)!;
            const hex = toHex(folder.color);
            const sel = isSelFolder(folder.id);
            return (
              <g
                key={folder.id}
                transform={`translate(${COL_FOLDER}, ${y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect({ kind: "folder", id: folder.id })}
                onContextMenu={(e) => onFolderContextMenu?.(e, folder)}
                onMouseMove={(e) => onFolderHover(folder, e)}
                onMouseLeave={() => onHover?.(null)}
              >
                {showLabels && (
                  <text x="0" y="-16" textAnchor="middle" fill={TEXT_PRIMARY} fontSize="11" fontWeight={500}>
                    {folder.name}
                  </text>
                )}
                <circle r="12" fill={hex} opacity="0.10" />
                <circle r="8"  fill={hex} opacity="0.30" />
                <circle r="5"  fill={hex} />
                {sel && (
                  <circle r="11" fill="none" stroke={hex} strokeWidth="1.4" opacity="0.95" />
                )}
              </g>
            );
          })}

          {allFiles.map((file) => {
            const y = layout.fileY.get(file.id)!;
            const hex = toHex(file.color);
            const sel = isSelFile(file.id);
            return (
              <g
                key={file.id}
                transform={`translate(${COL_FILE}, ${y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect({ kind: "file", id: file.id })}
                onContextMenu={(e) => onFileContextMenu?.(e, file)}
                onMouseMove={(e) => onFileHover(file, e)}
                onMouseLeave={() => onHover?.(null)}
              >
                {showLabels && (
                  <text x="0" y="-10" textAnchor="middle" fill={TEXT_PRIMARY} fontSize="10">
                    {file.name}
                  </text>
                )}
                <circle r="7" fill={hex} opacity="0.18" />
                <circle r="3" fill={hex} />
                {sel && (
                  <circle r="6" fill="none" stroke={hex} strokeWidth="1.3" opacity="0.95" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
