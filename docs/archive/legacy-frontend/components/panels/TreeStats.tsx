import { Row } from "@/components/ui/Row";
import type { Codebase } from "@/lib/codebase/types";

interface TreeStatsProps {
  codebase: Codebase;
}

export function TreeStats({ codebase }: TreeStatsProps) {
  const imports = codebase.allFiles.reduce((s, f) => s + f.imports.length, 0);
  const cross = codebase.folderEdges.reduce((s, e) => s + e.weight, 0);

  return (
    <div className="absolute bottom-6 right-6 pointer-events-none text-right">
      <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">tree</div>
      <div className="space-y-1 text-[11px] mb-4 font-mono">
        <Row label="folders" value={codebase.folders.length.toString().padStart(4, "0")} />
        <Row label="files" value={codebase.allFiles.length.toString().padStart(4, "0")} />
        <Row label="imports" value={imports.toString().padStart(4, "0")} />
        <Row label="cross_folder" value={cross.toString().padStart(4, "0")} />
      </div>
    </div>
  );
}
