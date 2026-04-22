import { forwardRef } from "react";

export const Tooltip = forwardRef(function Tooltip({ hovered, mono }, ref) {
  if (!hovered) return null;
  const hex = hovered.color.toString(16).padStart(6, "0");
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-20 px-3 py-2 border border-white/20 bg-black/85 backdrop-blur-md"
      style={{
        left: hovered.x + 14,
        top: hovered.y + 14,
        boxShadow: `0 0 24px #${hex}33, 0 8px 32px rgba(0,0,0,0.6)`,
        ...mono,
      }}
    >
      {hovered.isFolder ? (
        <>
          <div className="text-[11px] font-medium tracking-wide">{hovered.name}</div>
          <div className="text-[10px] text-white/50 mt-0.5">folder · {hovered.fileCount} files</div>
          <div className="text-[10px] text-white/40 mt-1">imports · {hovered.weightSum || 0}</div>
          <div className="text-[10px] text-white/60 mt-1.5">↵ click to inspect</div>
        </>
      ) : (
        <>
          <div className="text-[11px] font-medium tracking-wide">{hovered.name}</div>
          <div className="text-[10px] text-white/50 mt-0.5">{hovered.folderName}</div>
          <div className="text-[10px] text-white/40 mt-1">degree · {hovered.degree}</div>
        </>
      )}
      <div className="h-[2px] mt-1.5" style={{
        background: `linear-gradient(90deg, transparent, #${hex}, transparent)`,
        boxShadow: `0 0 8px #${hex}`,
      }} />
    </div>
  );
});
