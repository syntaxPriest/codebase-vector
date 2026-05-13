import { ArrowLeft } from "lucide-react";
import { toHex } from "@/lib/codebase/colors";
import type { Folder, ViewMode } from "@/lib/codebase/types";

interface FoldersListProps {
  inRoot: boolean;
  mode: ViewMode;
  folders: Folder[];
  onSelect: (name: string) => void;
  onBack: () => void;
}

export function FoldersList({ inRoot, mode, folders, onSelect, onBack }: FoldersListProps) {
  const inTree = mode === "tree";

  if (!inTree && !inRoot) {
    return (
      <div className="absolute bottom-6 left-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[11px] px-3 py-1.5 border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.75} />
          <span>back to principal tree</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-6">
      <div className="pointer-events-none">
        <div className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase mb-3 font-mono">folders</div>
        <div className="space-y-1">
          {folders.map((m) => (
            <button
              key={m.name}
              onClick={() => onSelect(m.name)}
              className="flex items-center gap-2.5 text-[11px] pointer-events-auto hover:bg-neutral-100 px-1.5 py-0.5 -mx-1.5 transition-colors w-full text-left"
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: toHex(m.color) }}
              />
              <span className="text-neutral-800">{m.name}</span>
              <span className="text-neutral-400 ml-1 font-mono">{m.fileCount}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
