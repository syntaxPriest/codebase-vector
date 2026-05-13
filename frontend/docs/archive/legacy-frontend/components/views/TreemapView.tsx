"use client";

import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Boxes,
  FileText,
  Network,
  type LucideIcon,
} from "lucide-react";
import { toHex } from "@/lib/codebase/colors";
import { getLoc } from "@/lib/codebase/constants";
import { squarifiedTreemap, type TreemapResult } from "@/lib/layout/treemap";
import type {
  Codebase,
  CodebaseFile,
  Folder,
  HoveredItem,
  Selection,
} from "@/lib/codebase/types";

const CANVAS_W = 1100;
const CANVAS_H = 720;
const HEADER = 22;
const INNER_PAD = 4;

type Metric = "loc" | "files" | "degree";

interface MetricDef {
  key: Metric;
  label: string;
  Icon: LucideIcon;
}

const METRICS: MetricDef[] = [
  { key: "loc",    label: "loc",    Icon: FileText },
  { key: "files",  label: "files",  Icon: Boxes    },
  { key: "degree", label: "degree", Icon: Network  },
];

const METRIC_HEADLINE: Record<Metric, string> = {
  loc:    "lines of code",
  files:  "file count",
  degree: "total imports",
};

function folderValue(folder: Folder, metric: Metric): number {
  if (metric === "loc") return folder.files.reduce((s, f) => s + getLoc(f), 0);
  if (metric === "files") return folder.fileCount;
  return folder.files.reduce(
    (s, f) => s + f.imports.length + f.importedBy.length,
    0,
  );
}

function fileValue(file: CodebaseFile, metric: Metric): number {
  if (metric === "loc") return getLoc(file);
  if (metric === "files") return 1;
  return file.imports.length + file.importedBy.length;
}

function formatMetric(metric: Metric, n: number): string {
  if (metric === "loc") return `${n.toLocaleString()} loc`;
  if (metric === "files") return `${n} ${n === 1 ? "file" : "files"}`;
  return `deg ${n}`;
}

function rgbBrightness(hex: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8)  & 0xff;
  const b = hex & 0xff;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

interface TreemapViewProps {
  codebase: Codebase;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
  onHover?: (h: HoveredItem | null) => void;
  onFileContextMenu?: (e: ReactMouseEvent, file: CodebaseFile) => void;
  onFolderContextMenu?: (e: ReactMouseEvent, folder: Folder) => void;
}

interface FolderItem { folder: Folder; value: number }
interface FileItem   { file: CodebaseFile; value: number }

export function TreemapView({
  codebase,
  selected,
  onSelect,
  onHover,
  onFileContextMenu,
  onFolderContextMenu,
}: TreemapViewProps) {
  const { folders, allFiles } = codebase;
  const [metric, setMetric] = useState<Metric>("loc");
  const [zoomFolderId, setZoomFolderId] = useState<number | null>(null);

  // Auto-clear zoom when the target disappears (e.g. test-filter toggled).
  useEffect(() => {
    if (zoomFolderId !== null && !folders[zoomFolderId]) {
      setZoomFolderId(null);
    }
  }, [zoomFolderId, folders]);

  const zoomFolder: Folder | null =
    zoomFolderId !== null ? (folders[zoomFolderId] ?? null) : null;

  const totalValue = useMemo(
    () => folders.reduce((s, f) => s + folderValue(f, metric), 0),
    [folders, metric],
  );

  type LaidOutFolder = TreemapResult<FolderItem>[number];
  type LaidOutFile   = TreemapResult<FileItem>[number];

  const layout = useMemo<{
    mode: "all" | "folder";
    folderRects: LaidOutFolder[];
    fileRects:   LaidOutFile[];
  }>(() => {
    if (zoomFolder) {
      const items: FileItem[] = zoomFolder.files.map((file) => ({
        file,
        value: Math.max(fileValue(file, metric), 1),
      }));
      const fileRects = squarifiedTreemap(items, 0, 0, CANVAS_W, CANVAS_H);
      return { mode: "folder", folderRects: [], fileRects };
    }

    const folderItems: FolderItem[] = folders.map((folder) => ({
      folder,
      value: Math.max(folderValue(folder, metric), 1),
    }));
    const folderRects = squarifiedTreemap(folderItems, 0, 0, CANVAS_W, CANVAS_H);

    const fileRects: LaidOutFile[] = [];
    for (const fr of folderRects) {
      const innerX = fr.x + INNER_PAD;
      const innerY = fr.y + HEADER + 2;
      const innerW = fr.w - INNER_PAD * 2;
      const innerH = fr.h - HEADER - INNER_PAD - 2;
      if (innerW < 8 || innerH < 8) continue;
      const fileItems: FileItem[] = fr.folder.files.map((file) => ({
        file,
        value: Math.max(fileValue(file, metric), 1),
      }));
      const placed = squarifiedTreemap(fileItems, innerX, innerY, innerW, innerH);
      fileRects.push(...placed);
    }
    return { mode: "all", folderRects, fileRects };
  }, [folders, metric, zoomFolder]);

  // When a file is selected, outline its imports + importedBy and dim the rest.
  const relatedIds = useMemo(() => {
    if (!selected || selected.kind !== "file") return null;
    const file = allFiles[selected.id];
    if (!file) return null;
    return new Set<number>([file.id, ...file.imports, ...file.importedBy]);
  }, [selected, allFiles]);

  const isSelectedFolder = (id: number) =>
    selected?.kind === "folder" && selected.id === id;
  const isSelectedFile = (id: number) =>
    selected?.kind === "file" && selected.id === id;

  const hoverFolder = (folder: Folder, e: ReactMouseEvent) => {
    if (!onHover) return;
    onHover({
      name: folder.name,
      folderName: folder.name,
      color: folder.color,
      isFolder: true,
      fileCount: folder.fileCount,
      weightSum: folderValue(folder, metric),
      x: e.clientX,
      y: e.clientY,
    });
  };

  const hoverFile = (file: CodebaseFile, e: ReactMouseEvent) => {
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

  return (
    <div className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto" style={{ width: CANVAS_W, paddingTop: 96, paddingBottom: 60 }}>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 text-[10px] tracking-[0.2em] uppercase font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            {zoomFolder ? (
              <>
                <button
                  onClick={() => setZoomFolderId(null)}
                  className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors"
                >
                  <ArrowLeft size={11} strokeWidth={1.75} />
                  <span>all folders</span>
                </button>
                <span>·</span>
                <span className="text-neutral-700">{zoomFolder.name}</span>
              </>
            ) : (
              <span>treemap · sized by {METRIC_HEADLINE[metric]}</span>
            )}
          </div>

          <div className="flex items-center gap-1 p-0.5 border border-neutral-200 bg-white">
            {METRICS.map(({ key, label, Icon }) => {
              const active = metric === key;
              return (
                <button
                  key={key}
                  onClick={() => setMetric(key)}
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

        {/* Canvas */}
        <div
          className="relative"
          style={{ width: CANVAS_W, height: CANVAS_H, border: "1px solid #ebebeb" }}
        >
          {layout.folderRects.map(({ folder, value, x, y, w, h }) => {
            const headerColor = toHex(folder.color);
            const labelColor = rgbBrightness(folder.color) > 130 ? "#171717" : "#ffffff";
            const sel = isSelectedFolder(folder.id);
            const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
            return (
              <button
                key={`folder-${folder.id}`}
                onClick={() => onSelect({ kind: "folder", id: folder.id })}
                onDoubleClick={() => setZoomFolderId(folder.id)}
                onContextMenu={(e) => onFolderContextMenu?.(e, folder)}
                onMouseMove={(e) => hoverFolder(folder, e)}
                onMouseLeave={() => onHover?.(null)}
                style={{
                  position: "absolute",
                  left: x, top: y, width: w, height: h,
                  background: "#ffffff",
                  border: sel ? "1.5px solid #171717" : "1px solid #ebebeb",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                  overflow: "hidden",
                }}
                title="double-click to zoom in"
              >
                <div
                  className="font-mono px-2 truncate flex items-center justify-between"
                  style={{
                    height: HEADER,
                    lineHeight: `${HEADER}px`,
                    background: headerColor,
                    color: labelColor,
                    fontSize: 10,
                  }}
                >
                  <span className="truncate">{folder.name}</span>
                  {w >= 140 && (
                    <span style={{ opacity: 0.65, marginLeft: 8, flexShrink: 0 }}>
                      {pct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {layout.fileRects.map(({ file, value, x, y, w, h }) => {
            const fill = toHex(file.color);
            const labelColor = rgbBrightness(file.color) > 150 ? "#171717" : "#ffffff";
            const sel = isSelectedFile(file.id);
            const isRelated = relatedIds?.has(file.id) ?? false;
            const dimmed = relatedIds !== null && !isRelated;
            return (
              <button
                key={`file-${file.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ kind: "file", id: file.id });
                }}
                onContextMenu={(e) => onFileContextMenu?.(e, file)}
                onMouseMove={(e) => hoverFile(file, e)}
                onMouseLeave={() => onHover?.(null)}
                style={{
                  position: "absolute",
                  left: x, top: y, width: w, height: h,
                  background: fill,
                  border: sel
                    ? "1.5px solid #171717"
                    : isRelated && !sel
                      ? "1.5px solid #525252"
                      : "1px solid #ffffff",
                  opacity: dimmed ? 0.32 : 1,
                  cursor: "pointer",
                  padding: 0,
                  overflow: "hidden",
                  textAlign: "left",
                  transition: "opacity 120ms",
                }}
              >
                {w >= 56 && h >= 14 && (
                  <div
                    className="font-mono truncate px-1"
                    style={{ color: labelColor, lineHeight: 1.5, fontSize: 9 }}
                  >
                    {file.name}
                  </div>
                )}
                {w >= 80 && h >= 30 && (
                  <div
                    className="font-mono px-1"
                    style={{ color: labelColor, opacity: 0.7, lineHeight: 1.3, fontSize: 8 }}
                  >
                    {formatMetric(metric, value)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-4 flex items-center justify-between text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
          <span>
            {zoomFolder
              ? "click to inspect"
              : "click · inspect  ·  double-click · zoom into folder"}
          </span>
          {selected?.kind === "file" && relatedIds && (
            <span className="text-neutral-600 normal-case tracking-normal">
              showing {relatedIds.size - 1} related ({allFiles[selected.id]?.imports.length ?? 0} out · {allFiles[selected.id]?.importedBy.length ?? 0} in)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
