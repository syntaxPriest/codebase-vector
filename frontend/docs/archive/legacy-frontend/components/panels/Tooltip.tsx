import { forwardRef } from "react";
import { toHex } from "@/lib/codebase/colors";
import type { HoveredItem } from "@/lib/codebase/types";

interface TooltipProps {
  hovered: HoveredItem | null;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip({ hovered }, ref) {
  if (!hovered) return null;
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-20 px-3 py-2 border border-neutral-200 bg-white shadow-sm"
      style={{
        left: hovered.x + 14,
        top: hovered.y + 14,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: toHex(hovered.color) }}
        />
        <div className="text-[11px] font-medium tracking-wide text-neutral-900">
          {hovered.name}
        </div>
      </div>
      {hovered.isFolder ? (
        <div className="mt-1 space-y-0.5 font-mono">
          <div className="text-[10px] text-neutral-500">folder · {hovered.fileCount} files</div>
          <div className="text-[10px] text-neutral-400">imports · {hovered.weightSum ?? 0}</div>
        </div>
      ) : (
        <div className="mt-1 space-y-0.5 font-mono">
          <div className="text-[10px] text-neutral-500">{hovered.folderName}</div>
          <div className="text-[10px] text-neutral-400">degree · {hovered.degree}</div>
        </div>
      )}
    </div>
  );
});
