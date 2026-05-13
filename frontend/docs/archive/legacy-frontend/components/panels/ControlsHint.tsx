import type { Selection, ViewMode } from "@/lib/codebase/types";

interface ControlsHintProps {
  selectedId: Selection | null;
  inRoot: boolean;
  mode: ViewMode;
}

export function ControlsHint({ selectedId, inRoot, mode }: ControlsHintProps) {
  const hasSelection = selectedId !== null;

  let lines: Array<[string, string]>;
  if (mode === "vector") {
    lines = [
      ["drag",   "rotate"],
      ["scroll", "zoom"],
      ["click",  "inspect"],
      ["esc",    hasSelection ? "clear selection" : inRoot ? "—" : "back to root"],
    ];
  } else if (mode === "tree") {
    lines = [
      ["click",  "inspect"],
      ["scroll", "pan"],
      ["esc",    hasSelection ? "clear selection" : "—"],
    ];
  } else {
    lines = [
      ["click", "inspect"],
      ["esc",   hasSelection ? "clear selection" : "—"],
    ];
  }

  return (
    <div className="absolute top-6 right-6 pointer-events-none text-right">
      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-2 font-mono">controls</div>
      <div className="text-[12px] text-neutral-600 space-y-0.5">
        {lines.map(([k, v]) => (
          <div key={k}>{k} · {v}</div>
        ))}
      </div>
    </div>
  );
}
