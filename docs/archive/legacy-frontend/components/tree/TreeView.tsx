"use client";

import { useState } from "react";
import { GitBranch, ListTree, type LucideIcon } from "lucide-react";
import { ExplorerTreeView } from "./ExplorerTreeView";
import { HierarchyTreeView } from "./HierarchyTreeView";
import type {
  Codebase,
  CodebaseFile,
  Folder,
  HoveredItem,
  Selection,
} from "@/lib/codebase/types";
import type { MouseEvent as ReactMouseEvent } from "react";

type Layout = "hierarchy" | "explorer";

interface LayoutDef {
  key: Layout;
  label: string;
  Icon: LucideIcon;
}

const LAYOUTS: LayoutDef[] = [
  { key: "hierarchy", label: "hierarchy", Icon: GitBranch },
  { key: "explorer",  label: "explorer",  Icon: ListTree  },
];

interface TreeViewProps {
  codebase: Codebase;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
  onHover?: (h: HoveredItem | null) => void;
  showEdges: boolean;
  showLabels: boolean;
  onFileContextMenu?: (e: ReactMouseEvent, file: CodebaseFile) => void;
  onFolderContextMenu?: (e: ReactMouseEvent, folder: Folder) => void;
}

// Two complementary views of the same codebase:
// - hierarchy: SVG curly-edge tree across three columns. The
//   at-a-glance shape of the project. Limited to two levels of
//   nesting (root → folder → file).
// - explorer: indented file-explorer-style listing. Shows the real
//   directory depth — every src/hooks/file.ts shows up where it
//   actually lives.
export function TreeView({
  codebase,
  selected,
  onSelect,
  onHover,
  showEdges,
  showLabels,
  onFileContextMenu,
  onFolderContextMenu,
}: TreeViewProps) {
  const [layout, setLayout] = useState<Layout>("hierarchy");

  return (
    <div className="absolute inset-0 bg-white">
      <div className="absolute z-10" style={{ top: 100, right: 24 }}>
        <div className="flex items-center gap-1 p-0.5 border border-neutral-200 bg-white">
          {LAYOUTS.map(({ key, label, Icon }) => {
            const active = layout === key;
            return (
              <button
                key={key}
                onClick={() => setLayout(key)}
                className={`flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-wide transition-colors ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
                aria-pressed={active}
              >
                <Icon size={11} strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {layout === "hierarchy" ? (
        <HierarchyTreeView
          codebase={codebase}
          selected={selected}
          onSelect={onSelect}
          onHover={onHover}
          showEdges={showEdges}
          showLabels={showLabels}
          onFileContextMenu={onFileContextMenu}
          onFolderContextMenu={onFolderContextMenu}
        />
      ) : (
        <ExplorerTreeView
          codebase={codebase}
          selected={selected}
          onSelect={onSelect}
          onHover={onHover}
          showLabels={showLabels}
          onFileContextMenu={onFileContextMenu}
          onFolderContextMenu={onFolderContextMenu}
        />
      )}
    </div>
  );
}
