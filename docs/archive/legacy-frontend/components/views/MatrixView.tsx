"use client";

import { type MouseEvent as ReactMouseEvent, useMemo, useState } from "react";
import type { Codebase, Folder, HoveredItem, Selection } from "@/lib/codebase/types";

const CELL = 28;
const LABEL_W = 140;
const LABEL_H = 140;

interface MatrixViewProps {
  codebase: Codebase;
  selected: Selection | null;
  onSelect: (s: Selection) => void;
  onHover?: (h: HoveredItem | null) => void;
  onFolderContextMenu?: (e: ReactMouseEvent, folder: Folder) => void;
}

interface HoverState {
  row?: number;
  col?: number;
}

// Folder × folder dependency heatmap.
// Off-diagonal cells = cross-folder import weight (undirected).
// Diagonal cells = file count for the folder.
export function MatrixView({ codebase, selected, onSelect, onHover, onFolderContextMenu }: MatrixViewProps) {
  const { folders, folderEdges } = codebase;
  const N = folders.length;

  const { matrix, max } = useMemo(() => {
    const m: number[][] = Array.from({ length: N }, () => new Array<number>(N).fill(0));
    let max = 0;
    for (const e of folderEdges) {
      m[e.source][e.target] = e.weight;
      m[e.target][e.source] = e.weight;
      if (e.weight > max) max = e.weight;
    }
    for (let i = 0; i < N; i++) {
      m[i][i] = folders[i].fileCount;
      if (folders[i].fileCount > max) max = folders[i].fileCount;
    }
    return { matrix: m, max };
  }, [folders, folderEdges, N]);

  const [hover, setHover] = useState<HoverState | null>(null);

  const isSelected = (i: number) =>
    selected !== null && selected.kind === "folder" && selected.id === i;

  const greyFor = (v: number) => {
    if (v === 0 || max === 0) return "#fafafa";
    const t = v / max;
    const g = Math.round(232 - t * 210);
    return `rgb(${g},${g},${g})`;
  };

  const reportHover = (ri: number, ci: number, evt: ReactMouseEvent) => {
    setHover({ row: ri, col: ci });
    if (!onHover) return;
    const v = matrix[ri][ci];
    if (v === 0) {
      onHover(null);
      return;
    }
    const isDiag = ri === ci;
    onHover({
      name: isDiag ? folders[ri].name : `${folders[ri].name} ↔ ${folders[ci].name}`,
      folderName: folders[ri].name,
      color: folders[ri].color,
      isFolder: true,
      fileCount: isDiag ? folders[ri].fileCount : v,
      weightSum: isDiag ? 0 : v,
      x: evt.clientX,
      y: evt.clientY,
    });
  };

  const totalW = LABEL_W + N * CELL + 4;

  return (
    <div className="absolute inset-0 overflow-auto bg-white">
      <div className="mx-auto" style={{ width: totalW, paddingTop: 96, paddingBottom: 60 }}>
        <div style={{ height: LABEL_H, position: "relative", marginLeft: LABEL_W, marginBottom: 4 }}>
          {folders.map((f, ci) => (
            <button
              key={ci}
              onClick={() => onSelect({ kind: "folder", id: ci })}
              onContextMenu={(e) => onFolderContextMenu?.(e, f)}
              onMouseEnter={() => setHover({ col: ci })}
              onMouseLeave={() => setHover(null)}
              style={{
                position: "absolute",
                left: ci * CELL + CELL / 2,
                bottom: 0,
                transform: "rotate(-45deg)",
                transformOrigin: "left bottom",
                whiteSpace: "nowrap",
                padding: "2px 4px",
              }}
              className={`text-[10px] font-mono cursor-pointer ${
                hover?.col === ci || isSelected(ci)
                  ? "text-neutral-900 font-medium"
                  : "text-neutral-500"
              } hover:text-neutral-900`}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="flex">
          <div style={{ width: LABEL_W }}>
            {folders.map((f, ri) => (
              <button
                key={ri}
                onClick={() => onSelect({ kind: "folder", id: ri })}
                onContextMenu={(e) => onFolderContextMenu?.(e, f)}
                onMouseEnter={() => setHover({ row: ri })}
                onMouseLeave={() => setHover(null)}
                style={{ height: CELL, lineHeight: `${CELL}px` }}
                className={`block text-[10px] font-mono text-right pr-2 truncate w-full cursor-pointer ${
                  hover?.row === ri || isSelected(ri)
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-500"
                } hover:text-neutral-900`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${N}, ${CELL}px)`,
              border: "1px solid #ebebeb",
              borderRight: "none",
              borderBottom: "none",
            }}
          >
            {matrix.map((row, ri) =>
              row.map((v, ci) => {
                const intense = v > 0 && max > 0 && v / max > 0.55;
                const isDiag = ri === ci;
                const highlighted = hover?.row === ri || hover?.col === ci;
                return (
                  <div
                    key={`${ri}-${ci}`}
                    onMouseEnter={(e) => reportHover(ri, ci, e)}
                    onMouseMove={(e) => reportHover(ri, ci, e)}
                    onMouseLeave={() => { setHover(null); onHover?.(null); }}
                    onClick={() => {
                      if (isDiag) onSelect({ kind: "folder", id: ri });
                      else if (v > 0) onSelect({ kind: "folder", id: ri });
                    }}
                    onContextMenu={(e) => {
                      if (isDiag) onFolderContextMenu?.(e, folders[ri]);
                    }}
                    style={{
                      width: CELL,
                      height: CELL,
                      background: greyFor(v),
                      borderRight: "1px solid #ebebeb",
                      borderBottom: "1px solid #ebebeb",
                      cursor: v > 0 ? "pointer" : "default",
                      outline: isDiag && isSelected(ri) ? "1.5px solid #171717" : "none",
                      outlineOffset: "-1.5px",
                      filter: highlighted && !isDiag ? "brightness(0.92)" : "none",
                    }}
                  >
                    {v > 0 && (
                      <div
                        className="text-[10px] font-mono text-center tabular-nums"
                        style={{
                          lineHeight: `${CELL}px`,
                          color: intense ? "#ffffff" : "#171717",
                        }}
                      >
                        {v}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 ml-[140px] flex items-center gap-2 text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
          <span>weight</span>
          <span style={{ width: 60, height: 6, background: "linear-gradient(90deg, #fafafa, #171717)" }} />
          <span>0 → {max}</span>
        </div>
      </div>
    </div>
  );
}
